// 添加产品记录云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const productsCollection = db.collection('ingre-wise_user_products')

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { 
    openid,
    productName,
    imageID,
    imageUrl,
    ingredients,
    nutrition,
    imageDescription,
    suggestions,
    isIngredientLabel,
    recognitionStatus,
    failureReason,
    healthScore,
    healthPoints,
    ingredientsAnalysis,
    highRiskWarning
  } = event
  
  try {
    // 创建新的产品记录
    const result = await productsCollection.add({
      data: {
        openid: wxContext.OPENID || openid,
        productName,
        imageID,
        imageUrl,
        ingredients,
        nutrition,
        imageDescription,
        suggestions,
        isIngredientLabel,
        recognitionStatus,
        failureReason,
        healthScore,
        healthPoints,
        ingredientsAnalysis,
        highRiskWarning,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    })
    
    return {
      code: 0,
      data: {
        _id: result._id
      },
      message: '添加成功'
    }
  } catch (err) {
    return {
      code: -1,
      data: null,
      message: '添加失败：' + err.message
    }
  }
} 