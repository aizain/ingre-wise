// 云函数逻辑
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 移除字符串中的括号内容
function removeParentheses(str) {
  return str.replace(/\([^)]*\)/g, '').trim()
}

// 随机打乱数组
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

// 计算编辑距离
function levenshteinDistance(str1, str2) {
  const m = str1.length
  const n = str2.length
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) {
    dp[i][0] = i
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1,
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1
        )
      }
    }
  }
  return dp[m][n]
}

exports.main = async (event, context) => {
  const { query } = event
  
  try {
    const cleanQuery = removeParentheses(query)
    const queryReg = db.RegExp({
      regexp: cleanQuery,
      options: 'i',
    })

    // 在成分表中搜索
    const { data } = await db.collection('ingre-wise_ingredients')
      .where(_.or([
        { name: query }, // 完全匹配
        { alias: query }, // 完全匹配别名
        { name: queryReg }, // 模糊匹配名称
        { alias: queryReg } // 模糊匹配别名
      ]))
      .limit(5) // 增加限制以便后续筛选
      .get()

    // 对结果进行分类和排序
    const results = data.map(item => {
      const cleanName = removeParentheses(item.name)
      let priority = 3 // 默认优先级最低
      
      // 计算编辑距离
      const nameDistance = levenshteinDistance(item.name, query)
      const aliasDistance = item.alias ? levenshteinDistance(item.alias, query) : Infinity
      const minDistance = Math.min(nameDistance, aliasDistance)
      
      // 判断匹配级别
      if (item.name === query || item.alias === query) {
        priority = 0 // 完全匹配
      } else if (cleanName === cleanQuery) {
        priority = 1 // 去括号后完全匹配
      } else if (item.name.includes(query) || item.alias.includes(query)) {
        priority = 2 // 部分匹配
      }

      return {
        ...item,
        _id: item._id.toString(),
        priority,
        nameDistance,
        aliasDistance,
        minDistance
      }
    })

    // 按优先级分组并在每个组内按编辑距离排序
    const groupedResults = results.reduce((acc, item) => {
      if (!acc[item.priority]) {
        acc[item.priority] = []
      }
      acc[item.priority].push(item)
      return acc
    }, {})

    // 对每个优先级组内按编辑距离排序
    Object.keys(groupedResults).forEach(priority => {
      groupedResults[priority].sort((a, b) => {
        // 如果主名称编辑距离相同，比较别名编辑距离
        if (a.nameDistance === b.nameDistance) {
          return a.aliasDistance - b.aliasDistance
        }
        // 否则按主名称编辑距离排序
        return a.nameDistance - b.nameDistance
      })
    })

    // 合并所有结果
    let finalResults = []
    for (let i = 0; i <= 3; i++) {
      if (groupedResults[i]) {
        finalResults = finalResults.concat(groupedResults[i])
      }
    }

    return {
      code: 0,
      message: 'success',
      data: finalResults.slice(0, 1) // 只返回前10个结果
    }
  } catch (err) {
    console.error('搜索成分失败：', err)
    return {
      code: -1,
      message: '搜索失败',
      error: err
    }
  }
} 