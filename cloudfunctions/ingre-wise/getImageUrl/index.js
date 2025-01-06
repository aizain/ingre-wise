const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

/**
 * 获取云存储文件访问链接
 * @param {object} event 
 * @param {string} event.fileID - 文件ID
 * @returns {Promise<object>}
 */
exports.main = async (event) => {
  try {
    const { fileID } = event

    if (!fileID) {
      return {
        code: 1,
        message: '文件ID不能为空'
      }
    }

    // 获取文件临时访问链接
    const result = await cloud.getTempFileURL({
      fileList: [fileID]
    })

    // 检查结果
    if (!result.fileList || result.fileList.length === 0) {
      return {
        code: 1,
        message: '获取文件链接失败'
      }
    }

    const fileInfo = result.fileList[0]
    if (fileInfo.status !== 0) {
      return {
        code: 1,
        message: fileInfo.errMsg || '获取文件链接失败'
      }
    }

    return {
      code: 0,
      message: 'ok',
      data: {
        tempFileURL: fileInfo.tempFileURL,
        fileID: fileInfo.fileID
      }
    }
  } catch (err) {
    console.error('[getImageUrl] 错误：', err)
    return {
      code: 1,
      message: err.message || '获取文件链接失败'
    }
  }
} 