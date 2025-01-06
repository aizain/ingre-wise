const app = getApp()
const PAGE_SIZE = 10

Page({
  data: {
    records: [],
    currentPage: 0,
    hasMore: true,
    isLoading: true,
    loadingMore: false
  },

  onLoad() {
    this.loadRecords()
  },

  // 加载记录
  async loadRecords(page = 0) {
    if (this.data.loadingMore) return

    try {
      if (page === 0) {
        this.setData({ isLoading: true })
      } else {
        this.setData({ loadingMore: true })
      }

      const res = await wx.cloud.callFunction({
        name: 'ingre-wise',
        data: {
          type: 'queryUserProducts',
          skip: page * PAGE_SIZE,
          limit: PAGE_SIZE
        }
      })

      if (res.result.code !== 0) {
        throw new Error(res.result.message)
      }

      // 格式化时间
      const records = res.result.data.map(record => ({
        ...record,
        createdAtFormat: this.formatTime(record.createdAt)
      }))

      this.setData({
        records: page === 0 ? records : [...this.data.records, ...records],
        currentPage: page,
        hasMore: records.length === PAGE_SIZE,
        isLoading: false,
        loadingMore: false
      })
    } catch (err) {
      console.error('加载记录失败：', err)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
      this.setData({ 
        isLoading: false,
        loadingMore: false
      })
    }
  },

  // 删除产品
  async onDeleteProduct(e) {
    const id = e.currentTarget.dataset.id
    
    try {
      const confirmed = await new Promise((resolve) => {
        wx.showModal({
          title: '确认删除',
          content: '确定要删除这条记录吗？',
          success: (res) => resolve(res.confirm)
        })
      })

      if (!confirmed) return

      wx.showLoading({
        title: '删除中...',
        mask: true
      })

      const res = await wx.cloud.callFunction({
        name: 'ingre-wise',
        data: {
          type: 'deleteUserProduct',
          productId: id
        }
      })

      if (res.result.code !== 0) {
        throw new Error(res.result.message || '删除失败')
      }

      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })

      // 重新加载数据
      this.loadRecords()
    } catch (err) {
      console.error('删除失败：', err)
      wx.showToast({
        title: err.message || '删除失败',
        icon: 'error'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 加载更多
  onLoadMore() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.loadRecords(this.data.currentPage + 1)
    }
  },

  // 查看详情
  onViewDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/ingre-wise/detail/index?id=${id}`
    })
  },

  // 成分分析
  onAnalyzeIngredients(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/ingre-wise/analysis/index?id=${id}`
    })
  },

  // 开始分析
  onStartAnalyze() {
    wx.navigateTo({
      url: '/pages/ingre-wise/home/index'
    })
  },

  // 格式化时间
  formatTime(timestamp) {
    if (!timestamp) return ''
    
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    
    return `${year}-${month}-${day} ${hour}:${minute}`
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadRecords()
    wx.stopPullDownRefresh()
  },

  // 触底加载
  onReachBottom() {
    this.onLoadMore()
  }
})