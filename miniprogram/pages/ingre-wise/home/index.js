const app = getApp()

// 图片限制配置
const imageConfig = {
  maxSize: 1 * 1024 * 1024, // 1MB
  allowedTypes: ['jpg', 'jpeg', 'png'],
  minWidth: 200,
  minHeight: 200
}

Page({
  data: {
    isAnalyzing: false,
    loadingText: '',
    searchQuery: ''
  },

  onLoad() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  onReady() {
  },

  // 检查相机权限
  async checkCameraAuth() {
    try {
      // 先获取权限状态
      const setting = await wx.getSetting()
      
      // 如果之前未授权
      if (!setting.authSetting['scope.camera']) {
        try {
          // 尝试首次授权
          await wx.authorize({ scope: 'scope.camera' })
          return true
        } catch (err) {
          // 如果首次授权失败，引导用户去个人中心授权
          const { confirm } = await wx.showModal({
            title: '提示',
            content: '需要授权相机权限才能使用此功能，是否去个人中心设置？',
            confirmText: '去授权'
          })
          if (confirm) {
            // 跳转到个人中心页面
            wx.navigateTo({
              url: '/pages/ingre-wise/user-center/index'
            })
          }
          return false
        }
      }
      return true
    } catch (error) {
      console.error('相机权限检查失败:', error)
      wx.showToast({
        title: '权限检查失败',
        icon: 'error'
      })
      return false
    }
  },

  // 打开相机页面
  async onTakePhoto() {    
    // 检查相机权限
    if (await this.checkCameraAuth()) {
      wx.navigateTo({
        url: '/pages/ingre-wise/camera/index'
      })
    }
  },

  // 验证图片
  async validateImage(tempFilePath) {
    try {
      // 1. 检查文件大小
      const fsm = wx.getFileSystemManager()
      const stats = fsm.statSync(tempFilePath)
      if (stats.size > imageConfig.maxSize) {
        throw new Error(`图片大小不能超过${imageConfig.maxSize / 1024 / 1024}MB`)
      }

      // 2. 检查文件格式
      const ext = tempFilePath.split('.').pop().toLowerCase()
      if (!imageConfig.allowedTypes.includes(ext)) {
        throw new Error(`仅支持 ${imageConfig.allowedTypes.join('/')} 格式的图片`)
      }

      // 3. 检查图片尺寸
      const imageInfo = await new Promise((resolve, reject) => {
        wx.getImageInfo({
          src: tempFilePath,
          success: resolve,
          fail: reject
        })
      })

      if (imageInfo.width < imageConfig.minWidth || imageInfo.height < imageConfig.minHeight) {
        throw new Error(`图片尺寸太小，建议至少 ${imageConfig.minWidth}x${imageConfig.minHeight} 像素`)
      }

      return true
    } catch (error) {
      wx.showModal({
        title: '提示',
        content: error.message,
        showCancel: false
      })
      return false
    }
  },

  onShow() {
  },

  onHide() {
  },

  // 处理扫码结果
  async handleScanResult(barcode) {
    console.log('处理扫码结果：', barcode)
    if (this.data.isAnalyzing) return
    
    try {
      // 显示加载提示
      wx.showLoading({
        title: '查询商品...',
        mask: true
      })

      // 调用云函数获取商品信息
      const res = await wx.cloud.callFunction({
        name: 'ingre-wise',
        data: {
          type: 'getProductByBarcode',
          barcode
        }
      })

      wx.hideLoading()

      if (res.result.code === 0 && res.result.data) {
        const product = res.result.data
        wx.showModal({
          title: '商品信息',
          content: `商品名称：${product.goodsName}\n品牌：${product.brand}\n规格：${product.standard}\n供应商：${product.supplier}\n参考价格：${product.price}元`,
          showCancel: false
        })
      } else {
        wx.showModal({
          title: '提示',
          content: res.result.message || '未找到商品信息',
          showCancel: false
        })
      }
    } catch (err) {
      console.error('查询商品信息失败：', err)
      wx.hideLoading()
      wx.showModal({
        title: '提示',
        content: '查询商品信息失败，请重试',
        showCancel: false
      })
    }
  },

  // 处理拍照结果
  handlePhotoResult(tempFilePath) {
    console.log('处理拍照结果：', tempFilePath)
    this.processImage(tempFilePath)
  },

  // 从相册选择
  onChooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: async (res) => {
        console.log('选择图片成功：', res)
        const tempFilePath = res.tempFiles[0].tempFilePath
        // 验证图片
        if (await this.validateImage(tempFilePath)) {
          this.processImage(tempFilePath)
        }
      },
      fail: (err) => {
        console.error('选择图片失败：', err)
        wx.showToast({
          title: '选择失败，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 处理图片
  async processImage(tempFilePath) {
    if (this.data.isAnalyzing) return
    
    try {
      // 使用 Promise.all 并行处理验证和上传准备
      const [isValid, uploadInfo] = await Promise.all([
        this.validateImage(tempFilePath),
        this.prepareUploadPath(tempFilePath)
      ])

      if (!isValid) return

      // 1. 开始上传
      this.setData({ 
        isAnalyzing: true,
        loadingText: '正在处理...'
      })

      // 压缩图片
      const compressRes = await wx.compressImage({
        src: tempFilePath,
        quality: 80,  // 压缩质量0-100
        compressedWidth: 1280  // 压缩后的宽度（等比压缩）
      })

      // 2. 上传压缩后的图片到云存储
      this.setData({ loadingText: '正在上传...' })
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: uploadInfo.path,
        filePath: compressRes.tempFilePath  // 使用压缩后的图片路径
      })

      // 3. 调用云函数分析图片
      this.setData({ loadingText: 'AI分析中...' })

      // 获取当前选择的策略
      const strategy = app.globalData.recognitionStrategy || 'fast'
      console.log('strategy:', strategy)

      const analyzeRes = await wx.cloud.callFunction({
        name: 'ingre-wise',
        data: {
          type: 'analyzeUserProduct',
          fileID: uploadRes.fileID,
          strategy  // 传递策略参数
        }
      })

      if (analyzeRes.result.code !== 0) {
        throw new Error(analyzeRes.result.message)
      }

      const analysisResult = analyzeRes.result.data

      // 4. 处理分析结果
      this.setData({ isAnalyzing: false })

      // 5. 显示成功提示并跳转
      wx.showToast({
        title: '分析完成',
        icon: 'success',
        duration: 1500,
        mask: true
      })

      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/ingre-wise/detail/index?id=${analysisResult.productId}`,
          fail: (err) => {
            console.error('跳转失败：', err)
            wx.showToast({
              title: '跳转失败',
              icon: 'error'
            })
          }
        })
      }, 1500)

    } catch (err) {
      console.error('处理图片失败：', err)
      this.setData({ isAnalyzing: false })
      wx.showModal({
        title: '提示',
        content: err.message || '处理失败，请重试',
        showCancel: false
      })
    }
  },

  // 准备上传路径
  prepareUploadPath(tempFilePath) {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dir = `ingre-wise/${year}/${month}/${day}`
    const suffix = tempFilePath.split('.').pop().toLowerCase()
    const filename = `${Date.now()}-${Math.random().toString(36).slice(-6)}.${suffix}`
    
    return {
      dir,
      filename,
      path: `${dir}/${filename}`
    }
  },

  // 查看历史记录
  onViewHistory() {
    wx.navigateTo({
      url: '/pages/ingre-wise/history/index'
    })
  },

  onShareAppMessage() {
    return {
      title: '食品配料智能分析',
      path: '/pages/ingre-wise/home/index'
    }
  },

  onShareTimeline() {
    return {
      title: '食品配料智能分析'
    }
  },

  // 搜索输入处理
  onSearchInput(e) {
    this.setData({
      searchQuery: e.detail.value
    });
  },

  // 搜索确认处理
  onSearch(e) {
    const query = e.detail.value || this.data.searchQuery;
    if (!query.trim()) {
      wx.showToast({
        title: '请输入搜索内容',
        icon: 'none'
      });
      return;
    }

    // 显示加载提示
    wx.showLoading({
      title: '搜索中...',
      mask: true
    });

    // 调用搜索API
    wx.cloud.callFunction({
      name: 'ingre-wise',
      data: {
        type: 'searchIngredients',
        query: query
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.code === 0) {
        const ingredients = res.result.data;
        
        if (ingredients && ingredients.length > 0) {
          console.log('搜索结果：', ingredients[0]); // 调试日志
          // 找到成分，跳转到成分详情页
          wx.navigateTo({
            url: `/pages/ingre-wise/ingredient/index?id=${ingredients[0]._id}`,
            success: () => {
              // 清空搜索框
              this.setData({
                searchQuery: ''
              });
            },
            fail: (err) => {
              console.error('跳转失败：', err);
              wx.showToast({
                title: '页面跳转失败',
                icon: 'none'
              });
            }
          });
        } else {
          // 未找到成分
          wx.showToast({
            title: '未找到相关成分',
            icon: 'none'
          });
        }
      } else {
        // 搜索失败
        wx.showToast({
          title: res.result?.message || '搜索失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      console.error('搜索失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '搜索失败，请重试',
        icon: 'none'
      });
    });
  },

  // 跳转到个人中心
  onNavigateToUserCenter() {
    wx.navigateTo({
      url: '/pages/ingre-wise/user-center/index'
    })
  },

  // 跳转到健康挑战
  onNavigateToHealthChallenge() {
    wx.navigateTo({
      url: '/pages/ingre-wise/analysis/index'
    })
  }
}) 