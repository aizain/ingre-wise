const app = getApp()

Page({
  data: {
    userInfo: {
      avatarUrl: '/images/icons/avatar.png',
      nickName: '点击登录',
      level: 0
    },
    stats: {
      checkInDays: 28,
      healthPoints: 1280,
      challengeCount: 12,
      finishedChallenges: 3,
      purchasedItems: 6,
      goalProgress: 68
    },
    permissions: {
      camera: false,
      album: false
    },
    hasUserInfo: false,
    canIUseGetUserProfile: false,
    currentStrategy: 'fast'  // 默认使用快速模式
  },

  onLoad: function() {
    // 检查是否支持 getUserProfile
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }
    
    // 获取当前的识别策略
    const strategy = wx.getStorageSync('recognitionStrategy') || 'fast'
    this.setData({ currentStrategy: strategy })
    
    // 检查本地存储中是否有用户信息
    const storedUserInfo = wx.getStorageSync('userInfo')
    if (storedUserInfo) {
      this.setData({
        userInfo: storedUserInfo,
        hasUserInfo: true
      })
    }
    
    this.getUserStats()
    this.checkPermissions()
  },

  // 获取用户信息
  getUserInfo: function() {
    if (!this.data.canIUseGetUserProfile) {
      wx.showToast({
        title: '您的微信版本过低，请升级后重试',
        icon: 'none'
      })
      return
    }

    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        const userInfo = {
          avatarUrl: res.userInfo.avatarUrl,
          nickName: res.userInfo.nickName,
          level: this.data.userInfo.level || 1
        }
        
        // 更新状态
        this.setData({
          userInfo: userInfo,
          hasUserInfo: true
        })
        
        // 保存到本地存储
        wx.setStorageSync('userInfo', userInfo)
        
        // 可以在这里调用云函数保存用户信息到数据库
        wx.cloud.callFunction({
          name: 'ingre-wise',
          data: {
            type: 'updateUserInfo',
            userInfo: userInfo
          }
        }).catch(console.error)
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err)
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        })
      }
    })
  },

  // 获取用户统计数据
  getUserStats: async function() {
    try {
      const db = wx.cloud.database()
      const { data } = await db.collection('ingre-wise_user_products').where({
        _openid: app.globalData.openid
      }).get()
      
      // 更新统计数据
      if (data.length > 0) {
        this.setData({
          'stats.purchasedItems': data.length
        })
      }
    } catch (error) {
      console.error('获取用户统计数据失败:', error)
    }
  },

  // 检查权限状态
  checkPermissions: function() {
    // 检查相机权限
    wx.getSetting({
      success: (res) => {
        this.setData({
          'permissions.camera': res.authSetting['scope.camera'] || false,
          'permissions.album': res.authSetting['scope.writePhotosAlbum'] || false
        })
      }
    })
  },

  // 请求权限
  requestPermission: function(e) {
    const type = e.currentTarget.dataset.type
    const scope = type === 'camera' ? 'scope.camera' : 'scope.writePhotosAlbum'
    const tipText = type === 'camera' ? '相机' : '相册'

    wx.authorize({
      scope: scope,
      success: () => {
        this.setData({
          [`permissions.${type}`]: true
        })
        wx.showToast({
          title: '授权成功',
          icon: 'success'
        })
      },
      fail: () => {
        wx.showModal({
          title: '提示',
          content: `需要您授权${tipText}权限才能使用此功能，是否去设置页面重新授权？`,
          success: (res) => {
            if (res.confirm) {
              wx.openSetting({
                success: (settingRes) => {
                  this.checkPermissions()
                }
              })
            }
          }
        })
      }
    })
  },

  // 页面导航
  navigateTo: function(e) {
    const path = e.currentTarget.dataset.path
    const routes = {
      challenge: '/pages/ingre-wise/challenge/index',
      meals: '/pages/ingre-wise/meals/index',
      report: '/pages/ingre-wise/report/index',
      goals: '/pages/ingre-wise/goals/index'
    }

    if (routes[path]) {
      wx.navigateTo({
        url: routes[path]
      })
    }
  },

  // 切换识别策略
  onStrategyChange(e) {
    const strategy = e.currentTarget.dataset.strategy
    this.setData({ currentStrategy: strategy })
    
    // 保存到本地存储和全局变量
    wx.setStorageSync('recognitionStrategy', strategy)
    if (app.globalData) {
      app.globalData.recognitionStrategy = strategy
    }

    // 显示提示
    wx.showToast({
      title: '设置已保存',
      icon: 'success',
      duration: 1500
    })
  }
}) 