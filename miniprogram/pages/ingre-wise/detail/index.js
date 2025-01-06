const app = getApp()

Page({
  data: {
    detail: null,
    id: '',
    imageLoadError: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id })
      this.loadDetail(options.id)
    }
  },

  // 加载详情
  async loadDetail(id) {
    try {
      wx.showLoading({ title: '加载中...' })

      const res = await wx.cloud.callFunction({
        name: 'ingre-wise',
        data: {
          type: 'getUserProduct',
          productId: id
        }
      })

      if (res.result.code !== 0) {
        throw new Error(res.result.message)
      }

      // 检查并格式化数据
      const data = res.result.data || {}
      const detail = {
        ...data,
        imageUrl: data.imageUrl || '/images/icons/empty.png',
        createdAtFormat: this.formatTime(data.createdAt),
        suggestions: data.suggestions ? data.suggestions.split('\n') : []
      }

      this.setData({ 
        detail,
        imageLoadError: false
      })
    } catch (err) {
      console.error('加载详情失败：', err)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 图片加载错误处理
  onImageError(e) {
    console.error('图片加载失败：', e)
    this.setData({
      imageLoadError: true,
      'detail.imageUrl': '/images/icons/empty.png'
    })
  },

  // 预览图片
  onPreviewImage() {
    const { imageUrl } = this.data.detail || {}
    if (!imageUrl || this.data.imageLoadError || imageUrl === '/images/icons/empty.png') {
      wx.showToast({
        title: '图片加载失败',
        icon: 'none'
      })
      return
    }

    wx.previewImage({
      urls: [imageUrl],
      fail: () => {
        wx.showToast({
          title: '预览失败',
          icon: 'none'
        })
      }
    })
  },

  // 删除记录
  async onDelete() {
    let loading = false
    try {
      const res = await wx.showModal({
        title: '确认删除',
        content: '删除后无法恢复，是否继续？',
        confirmText: '删除',
        confirmColor: '#ff4d4f'
      })

      if (res.confirm) {
        loading = true
        wx.showLoading({
          title: '删除中...',
          mask: true
        })

        const deleteRes = await wx.cloud.callFunction({
          name: 'ingre-wise',
          data: {
            type: 'deleteUserProduct',
            productId: this.data.id
          }
        })

        if (deleteRes.result.code !== 0) {
          throw new Error(deleteRes.result.message)
        }

        wx.showToast({
          title: '删除成功',
          icon: 'success'
        })

        // 返回上一页并刷新列表
        const pages = getCurrentPages()
        const prevPage = pages[pages.length - 2]
        if (prevPage) {
          prevPage.loadRecords()
        }
        wx.navigateBack()
      }
    } catch (err) {
      console.error('删除失败：', err)
      wx.showToast({
        title: err.message || '删除失败',
        icon: 'error'
      })
    } finally {
      if (loading) {
        wx.hideLoading()
      }
    }
  },

  // 格式化时间
  formatTime(timestamp) {
    if (!timestamp) return ''
    
    const date = new Date(timestamp)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  },

  onShareAppMessage() {
    const { detail } = this.data
    const defaultImage = '/images/share-default.png' // 添加默认分享图
    return {
      title: detail?.productName || '食品配料分析',
      path: `/pages/ingre-wise/detail/index?id=${this.data.id}`,
      imageUrl: detail?.imageUrl || defaultImage
    }
  },

  onShareTimeline() {
    const { detail } = this.data
    const defaultImage = '/images/share-default.png' // 添加默认分享图
    return {
      title: detail?.productName || '食品配料分析',
      query: `id=${this.data.id}`,
      imageUrl: detail?.imageUrl || defaultImage
    }
  },

  // 成分分析
  onAnalyzeIngredients() {
    const { id } = this.data
    wx.navigateTo({
      url: `/pages/ingre-wise/analysis/index?id=${id}`
    })
  }
})