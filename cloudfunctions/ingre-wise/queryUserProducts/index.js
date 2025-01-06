// 查询产品记录云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const productsCollection = db.collection('ingre-wise_user_products')

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { skip = 0, limit = 10 } = event
  
  try {
    // 获取用户的产品记录
    const result = await productsCollection
      .where({
        openid: wxContext.OPENID
      })
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(limit)
      .get()

    // 隐藏 openid
    result.data.forEach(record => {
      record.openid = null
    })
    
    return {
      code: 0,
      data: result.data,
      message: '查询成功'
    }
  } catch (err) {
    return {
      code: -1,
      data: null,
      message: '查询失败：' + err.message
    }
  }
} 