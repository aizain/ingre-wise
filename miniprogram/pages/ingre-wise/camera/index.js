Page({
  data: {
    isAnalyzing: false,
    cameraEnabled: false,
    showUI: true
  },

  onLoad() {
    this.setData({ showUI: true })
  },

  onShow() {
    // 等待页面动画完成后再初始化相机
    setTimeout(() => {
      this.setData({ cameraEnabled: true })
    }, 300)
  },

  onHide() {
    this.setData({ 
      cameraEnabled: false,
      showUI: false 
    })
  },

  onUnload() {
  },

  // 重新开启相机
  enableCamera() {
    if (!this.data.cameraEnabled && !this.data.isAnalyzing) {
      this.setData({ 
        showUI: true,
        cameraEnabled: true 
      })
    }
  },

  // 显示相机使用帮助
  showCameraHelp() {
    wx.showModal({
      title: '拍摄说明',
      content: '1. 请将配料表放置在画面中央\n2. 确保光线充足，文字清晰\n3. 避免反光和阴影\n4. 尽量保持画面稳定',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 扫描条形码
  onScanBarcode() {
    if (this.data.isAnalyzing) return
    if (!this.data.cameraEnabled) {
      this.enableCamera()
      return
    }

    this.setData({ 
      isAnalyzing: true,
      cameraEnabled: false  // 开始扫码前关闭相机
    })

    wx.scanCode({
      onlyFromCamera: true,
      scanType: ['barCode'],
      success: (res) => {
        console.log('条码扫描结果：', res)
        const pages = getCurrentPages()
        const prevPage = pages[pages.length - 2]
        prevPage.handleScanResult(res.result)
        wx.navigateBack()
      },
      fail: (err) => {
        console.error('扫码失败：', err)
        wx.showToast({
          title: '扫码失败，请重试',
          icon: 'none',
          duration: 1500,
          mask: true
        })
        // 扫码失败后重新开启相机
        this.setData({ isAnalyzing: false })
        this.enableCamera()
      },
      complete: () => {
        this.setData({ isAnalyzing: false })
      }
    })
  },

  // 拍照识别
  takePhoto() {
    if (this.data.isAnalyzing) return
    if (!this.data.cameraEnabled) {
      this.enableCamera()
      return
    }
    
    this.setData({ isAnalyzing: true })

    const camera = wx.createCameraContext()
    camera.takePhoto({
      quality: 'high',
      success: (res) => {
        console.log('拍照成功：', res.tempImagePath)
        // 拍照成功后关闭相机
        this.setData({ cameraEnabled: false })
        // 返回上一页并传递图片路径
        const pages = getCurrentPages()
        const prevPage = pages[pages.length - 2]
        prevPage.handlePhotoResult(res.tempImagePath)
        wx.navigateBack()
      },
      fail: (err) => {
        console.error('拍照失败：', err)
        // 关闭相机并返回上一页
        this.setData({ cameraEnabled: false })
        wx.showToast({
          title: '拍照失败，请重试',
          icon: 'none',
          complete: () => {
            wx.navigateBack()
          }
        })
      },
      complete: () => {
        this.setData({ isAnalyzing: false })
      }
    })
  }
}) 