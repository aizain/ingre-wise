// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 删除用户产品记录及其关联的图片
 * @param {object} event
 * @param {string} event.productId - 产品ID
 * @returns {Promise<object>}
 */
exports.main = async (event, context) => {
  const { productId } = event
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext

  if (!productId) {
    return {
      code: 1,
      message: '产品ID不能为空'
    }
  }

  try {
    // 1. 先查询产品记录，确认所有权并获取图片ID
    const product = await db.collection('ingre-wise_user_products')
      .doc(productId)
      .get()

    if (!product.data) {
      return {
        code: 1,
        message: '产品不存在'
      }
    }

    // 2. 验证所有权
    if (product.data.openid !== OPENID) {
      return {
        code: 1,
        message: '无权限删除此记录'
      }
    }

    // 3. 删除云存储中的图片
    if (product.data.imageID) {
      try {
        const deleteFileRes = await cloud.deleteFile({
          fileList: [product.data.imageID]
        })
        
        // 检查删除结果
        const fileDeleteResult = deleteFileRes.fileList[0]
        if (fileDeleteResult.status !== 0) {
          console.error('删除图片失败：', fileDeleteResult)
          // 继续执行，不影响数据库记录的删除
        }
      } catch (err) {
        console.error('删除图片失败：', err)
        // 继续执行，不影响数据库记录的删除
      }
    }

    // 4. 删除数据库记录
    try {
      await db.collection('ingre-wise_user_products')
        .doc(productId)
        .remove()

      return {
        code: 0,
        message: 'ok'
      }
    } catch (err) {
      console.error('删除数据库记录失败：', err)
      return {
        code: 1,
        message: err.errMsg || '删除记录失败'
      }
    }
  } catch (err) {
    console.error('删除产品失败：', err)
    
    // 根据错误类型返回不同的错误信息
    if (err.errCode === -502002) {
      return {
        code: 1,
        message: '产品不存在'
      }
    }
    
    return {
      code: 1,
      message: err.message || '删除失败'
    }
  }
}
