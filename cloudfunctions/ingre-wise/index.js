// 云函数入口文件
const addUserProduct = require('./addUserProduct/index')
const analyzeUserProduct = require('./analyzeUserProduct/index')
const getUserProduct = require('./getUserProduct/index')
const queryUserProducts = require('./queryUserProducts/index')
const getImageUrl = require('./getImageUrl/index')
const deleteUserProduct = require('./deleteUserProduct/index')
const getProductByBarcode = require('./getProductByBarcode/index')
const chat = require('./chat/index')
const searchIngredients = require('./searchIngredients/index')
const getIngredientDetail = require('./getIngredientDetail/index')

// 云函数入口函数
exports.main = async (event, context) => {
  const { type } = event
  
  switch (type) {
    case 'addUserProduct':
      return await addUserProduct.main(event, context)
    case 'analyzeUserProduct':
      return await analyzeUserProduct.main(event, context)
    case 'getUserProduct':
      return await getUserProduct.main(event, context)
    case 'queryUserProducts':
      return await queryUserProducts.main(event, context)
    case 'getImageUrl':
      return await getImageUrl.main(event, context)
    case 'deleteUserProduct':
      return await deleteUserProduct.main(event, context)
    case 'getProductByBarcode':
      return await getProductByBarcode.main(event, context)
    case 'chat':
      return await chat.main(event, context)
    case 'searchIngredients':
      return await searchIngredients.main(event, context)
    case 'getIngredientDetail':
      return await getIngredientDetail.main(event, context)
    default:
      return {
        code: -1,
        message: '未知的操作类型'
      }
  }
}
