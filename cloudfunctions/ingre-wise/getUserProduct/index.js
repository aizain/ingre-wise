// 获取单个产品详情云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const productsCollection = db.collection('ingre-wise_user_products')

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { productId } = event
  
  try {
    // 获取产品详情
    const result = await productsCollection.doc(productId).get()
    
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