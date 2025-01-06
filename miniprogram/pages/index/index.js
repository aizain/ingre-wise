const app = getApp()

Page({
  data: {
    apps: [
      {
        id: 'ingre-wise',
        name: '会食',
        icon: '/images/icons/ingre-wise-logo.png',
        desc: '基于AI技术的个性化健康饮食管理助手，通过食品配料扫描、智能解析，帮助您做出更健康的饮食选择',
        tag: 'New',
        path: '/pages/ingre-wise/home/index'
      }
    ]
  },

  onLoad() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  // 跳转到应用
  onNavigateToApp(e) {
    const { id } = e.currentTarget.dataset
    const app = this.data.apps.find(item => item.id === id)
    if (app) {
      
      wx.navigateTo({
        url: app.path,
        success: () => {
          console.log('页面跳转成功')
        },
        fail: (err) => {
          console.error('跳转失败：', err)
          wx.showToast({
            title: '跳转失败',
            icon: 'error'
          })
        },
        complete: () => {
          console.log('页面跳转完成')
        }
      })
    }
  },

  onShareAppMessage() {
    return {
      title: 'AI 工坊',
      path: '/pages/index/index'
    }
  },

  onShareTimeline() {
    return {
      title: 'AI 工坊'
    }
  }
})
