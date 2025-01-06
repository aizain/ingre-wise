// 产品分析主流程云函数
const cloud = require('wx-server-sdk')
const OpenAI = require('openai')
const { CozeAPI } = require('@coze/api')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 初始化 Coze API 客户端
const apiClient = new CozeAPI({
  token: 'xxx',
  baseURL: 'https://api.coze.cn'
})

// 获取模型密钥
async function getModelKey(modelName) {
  try {
    const result = await db.collection('sys_llm_models')
      .where({
        model: modelName
      })
      .get()
    
    if (result.data.length === 0) {
      throw new Error(`未找到模型：${modelName}`)
    }
    
    return result.data[0].key
  } catch (error) {
    throw new Error(`获取模型密钥失败：${error.message}`)
  }
}

// 初始化豆包模型客户端
let openai = null
async function initOpenAI() {
  if (openai) return
  
  const apiKey = await getModelKey('ep-20241217180248-hmtff')
  openai = new OpenAI({
    apiKey,
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3'
  })
}

// 使用豆包模型分析图片
async function analyzeWithDouBao(imageUrl) {
  try {
    await initOpenAI()
    
    const systemPrompt = `
# 食品营养分析专家

您是一位专业的食品营养分析师，擅长分析食品包装上的信息。请仔细观察图片，判断是否为食品配料表，并以JSON格式输出分析信息。

## 输出格式示例
1. 食品配料表示例：
\`\`\`json
{
  "isIngredientLabel": true,
  "recognitionStatus": "已识别",
  "failureReason": "",
  "productName": "康师傅老坛酸菜牛肉面",
  "ingredients": "面粉、植物油、食用盐、酱油、味精、白砂糖、老坛酸菜、牛肉粒、辣椒粉",
  "nutrition": "能量：395kcal、蛋白质：9.5g、脂肪：13g、碳水化合物：60g、钠：2100mg",
  "imageDescription": "这是一包康师傅老坛酸菜牛肉面的配料表和营养成分表照片，包含了配料清单和营养成分信息。",
  "suggestions": "1. 方便面钠含量较高，建议适量食用\\n2. 可以添加蔬菜和鸡蛋来补充营养\\n3. 建议每周食用不超过2次\\n4. 食用时注意保持适量，不宜过饱",
  "highRiskWarning": "该食品含有味精等调味料，钠含量较高，建议慎重选择",
  "ingredientsAnalysis": [
    {
      "name": "面粉",
      "tag": "主料",
      "riskLevel": "low",
      "effect": "提供碳水化合物，是主要能量来源"
    },
    {
      "name": "植物油",
      "tag": "油脂",
      "riskLevel": "medium",
      "effect": "提供必需脂肪酸，但过量摄入可能导致肥胖"
    },
    {
      "name": "食用盐",
      "tag": "调味料",
      "riskLevel": "medium",
      "effect": "增加咸味，但过量可能导致高血压"
    },
    {
      "name": "味精",
      "tag": "调味料",
      "riskLevel": "high",
      "effect": "增加鲜味，但可能引起部分人群不适"
    }
  ],
  "healthScore": 65,
  "healthPoints": [
    {
      "type": "success",
      "content": "使用天然酸菜提供风味"
    },
    {
      "type": "warn",
      "content": "钠含量偏高，建议少食"
    },
    {
      "type": "warn",
      "content": "含有味精等调味料，建议适量"
    }
  ]
}
\`\`\`

2. 非食品配料表示例：
\`\`\`json
{
  "isIngredientLabel": false,
  "recognitionStatus": "识别失败",
  "failureReason": "图片不是食品配料表，而是一张风景照片",
  "productName": "",
  "ingredients": "",
  "nutrition": "",
  "imageDescription": "这是一张户外风景照片，画面中有树木和山脉，没有任何食品配料相关信息。",
  "suggestions": "",
  "highRiskWarning": "",
  "ingredientsAnalysis": [],
  "healthScore": 0,
  "healthPoints": []
}
\`\`\`

## 注意事项
1. 所有信息必须严格遵循JSON格式
2. 必须首先判断图片是否为食品配料表（isIngredientLabel字段）
3. recognitionStatus 必须是 "已识别" 或 "识别失败"
4. 如果不是食品配料表，除了 imageDescription 外的食品相关字段返回空值
5. 对于食品配料表：
   - 配料表请按照含量由多到少的顺序列出
   - 营养成分请包含能量、蛋白质、脂肪、碳水化合物、钠等主要营养素
   - 建议至少提供3-4条具体的食用建议，包括食用频率、搭配建议等
   - 图片描述需要包含产品类型和主要信息内容
6. 成分分析要求：
   - ingredientsAnalysis 必须详细分析每种配料
   - 配料标签(tag)分类：主料、调味料、防腐剂、色素、甜味剂、香精、增稠剂、油脂等
   - 风险等级(riskLevel)分类：low(天然安全)、medium(适量安全)、high(慎重使用)
   - effect 需要说明该成分的作用和潜在影响
   - highRiskWarning 当存在高风险成分时必须给出警告说明
   - healthScore 根据配料的天然程度、风险等级评分(0-100)
   - healthPoints 至少提供2-3条健康提示，type分为success和warn
7. 如果图片中没有产品名称，你可以根据图片描述、配料表中的成分来推断产品名称，或者起一个名字
`

    const response = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: '请分析这张图片，判断是否为食品配料表，并提供详细信息。' },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
      model: 'ep-20241217180248-hmtff'
    })

    // 添加边界校验
    if (!response?.choices?.length) {
      throw new Error('模型返回结果为空')
    }

    const firstChoice = response.choices[0]
    if (!firstChoice?.message?.content) {
      throw new Error('模型返回内容为空')
    }

    const analysis = firstChoice.message.content.trim()
    if (!analysis) {
      throw new Error('模型返回内容为空字符串')
    }
    
    // 解析返回的JSON字符串
    try {
      let result
      let contentToparse = analysis

      // 1. 检查首字符，如果不是 { 或 [，尝试提取 JSON 内容
      if (!analysis.startsWith('{') && !analysis.startsWith('[')) {
        // 尝试提取 ```json 中的内容
        const jsonMatch = analysis.match(/```json\s*([\s\S]*?)\s*```/)
        if (jsonMatch) {
          contentToparse = jsonMatch[1].trim()
          if (!contentToparse) {
            throw new Error('提取的JSON内容为空')
          }
        } else {
          // 如果没有 ```json 标记，尝试找到第一个 { 或 [ 开始的位置
          const jsonStart = analysis.search(/[{[]/)
          if (jsonStart !== -1) {
            contentToparse = analysis.slice(jsonStart)
          } else {
            throw new Error('无法找到有效的JSON内容')
          }
        }
      }

      // 2. 尝试解析处理后的内容
      try {
        result = JSON.parse(contentToparse)
      } catch (parseError) {
        console.error('JSON解析失败，内容：', contentToparse)
        throw new Error('JSON解析失败：' + parseError.message)
      }

      // 3. 校验必要字段
      const requiredFields = ['isIngredientLabel', 'recognitionStatus', 'failureReason', 'imageDescription']
      const missingFields = requiredFields.filter(field => typeof result[field] === 'undefined')
      
      if (missingFields.length > 0) {
        throw new Error(`缺少必要字段：${missingFields.join(', ')}`)
      }

      // 4. 如果是食品配料表，还需要校验额外字段
      if (result.isIngredientLabel) {
        const foodFields = ['productName', 'ingredients']
        const missingFoodFields = foodFields.filter(field => !result[field])
        
        if (missingFoodFields.length > 0) {
          result.recognitionStatus = '识别失败'
          result.failureReason = `配料表解析不完整，缺少字段：${missingFoodFields.join(', ')}`
        }
      }
      
      return result
    } catch (parseError) {
      console.error('解析模型返回结果失败，原始内容：', analysis)
      throw new Error('解析模型返回结果失败：' + parseError.message)
    }
  } catch (error) {
    // 发生错误时，返回一个标准的失败结果
    return {
      isIngredientLabel: false,
      recognitionStatus: '识别失败',
      failureReason: error.message,
      productName: '',
      ingredients: '',
      nutrition: '',
      imageDescription: '图片分析过程中发生错误',
      suggestions: '',
      healthScore: 0,
      healthPoints: [],
      ingredientsAnalysis: [],
      highRiskWarning: ''
    }
  }
}

// 使用 Coze API 分析图片
async function analyzeWithCoze(imageUrl) {
  try {
    const res = await apiClient.workflows.runs.create({
      workflow_id: '7456421477173723155',
      parameters: {
        input: imageUrl
      },
    })

    // 检查返回结果
    if (!res || !res.data) {
      throw new Error('Coze API 返回结果为空')
    }

    return res.data
  } catch (error) {
    console.error('Coze API 调用失败:', error)
    // 返回标准的失败结果
    return {
      isIngredientLabel: false,
      recognitionStatus: '识别失败',
      failureReason: error.message || 'Coze API 调用失败',
      productName: '',
      ingredients: '',
      nutrition: '',
      imageDescription: '图片分析过程中发生错误',
      suggestions: '',
      healthScore: 0,
      healthPoints: [],
      ingredientsAnalysis: [],
      highRiskWarning: ''
    }
  }
}


// 主函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { fileID, strategy = 'fast' } = event
  
  try {
    // 1. 获取图片临时访问链接
    const res = await cloud.getTempFileURL({
      fileList: [fileID]
    })
    const imageUrl = res.fileList[0].tempFileURL

    // 2. 根据策略选择分析方法
    let analysisResult
    if (strategy === 'ai') {
      // 使用 Coze API 进行智能分析
      analysisResult = await analyzeWithCoze(imageUrl)
    } else {
      // 使用豆包模型进行分析
      analysisResult = await analyzeWithDouBao(imageUrl)
    }

    // 3. 保存分析结果到数据库
    const addResult = await cloud.callFunction({
      name: 'ingre-wise',
      data: {
        type: 'addUserProduct',
        openid: wxContext.OPENID,
        productName: analysisResult.productName,
        imageID: fileID,
        imageUrl: imageUrl,
        ingredients: analysisResult.ingredients,
        nutrition: analysisResult.nutrition,
        imageDescription: analysisResult.imageDescription,
        suggestions: analysisResult.suggestions,
        isIngredientLabel: analysisResult.isIngredientLabel,
        recognitionStatus: analysisResult.recognitionStatus,
        failureReason: analysisResult.failureReason,
        healthScore: analysisResult.healthScore,
        healthPoints: analysisResult.healthPoints,
        ingredientsAnalysis: analysisResult.ingredientsAnalysis,
        highRiskWarning: analysisResult.highRiskWarning,
        strategy
      }
    })

    if (addResult.result.code !== 0) {
      throw new Error(addResult.result.message)
    }

    return {
      code: 0,
      data: {
        productId: addResult.result.data._id,
        ...analysisResult
      },
      message: '分析完成'
    }

  } catch (error) {
    console.error('分析失败:', error)
    return {
      code: -1,
      message: error.message || '分析失败',
      error
    }
  }
} 