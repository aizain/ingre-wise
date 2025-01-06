// 云函数逻辑
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { id } = event
  
  try {
    if (!id) {
      throw new Error('缺少成分ID')
    }

    const result = await db.collection('ingre-wise_ingredients')
      .doc(id)
      .get()

    if (!result.data) {
      throw new Error('未找到该成分')
    }

    return {
      code: 0,
      message: 'success',
      data: result.data
    }
  } catch (err) {
    console.error('获取成分详情失败：', err)
    return {
      code: -1,
      message: err.message || '获取成分详情失败',
      error: err
    }
  }
} 