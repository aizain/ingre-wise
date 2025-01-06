const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 接口配置
const API_CONFIG = {
  baseURL: 'https://www.mxnzp.com/api/barcode/goods/details',
  appId: 'xxx',
  appSecret: 'xxx'
}

/**
 * 获取商品条码信息
 * @param {object} event 
 * @param {string} event.barcode - 商品条码
 * @returns {Promise<object>}
 */
exports.main = async (event) => {
  try {
    const { barcode } = event

    if (!barcode) {
      return {
        code: 1,
        message: '条码不能为空'
      }
    }

    // 调用第三方接口获取商品信息
    const response = await axios.get(API_CONFIG.baseURL, {
      params: {
        barcode,
        app_id: API_CONFIG.appId,
        app_secret: API_CONFIG.appSecret
      }
    })

    // 检查接口返回状态
    if (response.data.code !== 1) {
      return {
        code: 1,
        message: response.data.msg || '获取商品信息失败'
      }
    }

    // 返回商品信息
    return {
      code: 0,
      message: 'ok',
      data: response.data.data
    }

  } catch (err) {
    console.error('[getProductByBarcode] 错误：', err)
    return {
      code: 1,
      message: err.message || '获取商品信息失败'
    }
  }
} 