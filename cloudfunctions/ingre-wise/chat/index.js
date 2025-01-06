const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 模拟回复生成
function generateMockReply(message) {
  console.log('收到用户消息:', message) // 添加日志
  
  // 关键词匹配规则
  const rules = [
    {
      keywords: ['你好', '嗨', 'hi', 'hello'],
      replies: [
        '你好！我是食材小助手，很高兴为您服务。',
        '嗨！有什么可以帮您的吗？',
        '您好！请问有什么想了解的食材问题吗？'
      ]
    },
    {
      keywords: ['添加剂', '防腐剂', '色素'],
      replies: [
        '食品添加剂在安全剂量范围内使用是被允许的，但建议尽量选择添加剂较少的食品。',
        '常见的食品添加剂包括防腐剂、色素、甜味剂等，建议查看配料表了解具体成分。',
        '部分人群可能对某些添加剂较为敏感，建议根据自身情况选择食品。'
      ]
    },
    {
      keywords: ['营养', '健康', '建议'],
      replies: [
        '均衡饮食是健康的基础，建议多选择天然食材。',
        '可以关注食品的配料表，优先选择主料天然、配料简单的食品。',
        '建议根据个人情况选择适合的食品，如有疑虑可以咨询专业医生。'
      ]
    }
  ]

  // 默认回复
  const defaultReplies = [
    '抱歉，我可能没有完全理解您的问题。您可以换个方式问我，或者具体询问某种食材或添加剂的问题。',
    '这个问题有点复杂，建议您查看产品配料表或咨询专业人士。',
    '您说的很有趣，不过我们还是关注食品安全和营养价值吧。'
  ]

  // 查找匹配的规则
  for (const rule of rules) {
    if (rule.keywords.some(keyword => message.includes(keyword))) {
      const randomIndex = Math.floor(Math.random() * rule.replies.length)
      const reply = rule.replies[randomIndex]
      console.log('匹配到规则回复:', reply) // 添加日志
      return reply
    }
  }

  // 没有匹配规则时返回默认回复
  const randomIndex = Math.floor(Math.random() * defaultReplies.length)
  const reply = defaultReplies[randomIndex]
  console.log('使用默认回复:', reply) // 添加日志
  return reply
}

// 主函数
exports.main = async (event, context) => {
  console.log('云函数收到事件:', event) // 添加日志
  
  try {
    if (!event.data || !event.data.message) {
      throw new Error('消息内容不能为空')
    }

    const { message } = event.data
    
    // 生成模拟回复
    const reply = generateMockReply(message)

    console.log('生成回复成功:', reply) // 添加日志
    return {
      code: 0,
      message: 'success',
      reply
    }

  } catch (error) {
    console.error('生成回复失败:', error)
    return {
      code: -1,
      message: error.message || '聊天服务异常'
    }
  }
}
