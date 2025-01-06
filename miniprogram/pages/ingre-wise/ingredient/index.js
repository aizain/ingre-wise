const app = getApp()

Page({
  data: {
    isLoading: true,
    ingredient: null
  },

  onLoad: function(options) {
    console.log('页面参数：', options); // 调试日志
    const { id } = options
    if (id) {
      this.fetchIngredientData(id)
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'error'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  fetchIngredientData: function(id) {
    console.log('获取成分详情，ID：', id); // 调试日志
    wx.showLoading({
      title: '加载中...',
      mask: true
    })

    wx.cloud.callFunction({
      name: 'ingre-wise',
      data: {
        type: 'getIngredientDetail',
        id: id
      }
    }).then(res => {
      console.log('获取成分详情结果：', res); // 调试日志
      if (res.result && res.result.code === 0 && res.result.data) {
        // 数据验证和处理
        const ingredient = res.result.data
        
        // 确保必要的字段存在
        if (!ingredient.name) {
          throw new Error('成分数据不完整')
        }

        // 处理别名数组
        console.log('原始别名数据：', ingredient.alias, typeof ingredient.alias);

        if (typeof ingredient.alias === 'string') {
          // 如果是字符串，先按顿号分割
          ingredient.alias = ingredient.alias.split('、')
            .map(item => item.trim())
            .filter(item => item.length > 0);
        } else if (Array.isArray(ingredient.alias)) {
          // 如果是数组，过滤空值并处理每一项
          ingredient.alias = ingredient.alias
            .map(item => (typeof item === 'string' ? item.trim() : String(item)))
            .filter(item => item.length > 0);
        } else {
          // 其他情况设为空数组
          ingredient.alias = [];
        }

        console.log('处理后的别名数组：', ingredient.alias);

        // 确保其他数组字段存在
        ingredient.sources = ingredient.sources || []
        ingredient.effects = ingredient.effects || []
        ingredient.cautions = ingredient.cautions || []
        
        // 设置默认值
        ingredient.safetyLevel = ingredient.safetyLevel || 0
        ingredient.safetyTag = ingredient.safetyTag || '未知'
        ingredient.safetyDescription = ingredient.safetyDescription || '暂无说明'
        ingredient.extraction = ingredient.extraction || '暂无说明'
        
        this.setData({
          isLoading: false,
          ingredient: ingredient
        }, () => {
          console.log('当前页面数据：', this.data); // 调试日志
        })
      } else {
        throw new Error(res.result?.message || '获取数据失败')
      }
    }).catch(err => {
      console.error('获取成分详情失败：', err)
      wx.showToast({
        title: err.message || '获取数据失败',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }).finally(() => {
      wx.hideLoading()
    })
  },

  // 分享功能
  onShareAppMessage: function() {
    const { ingredient } = this.data
    return {
      title: `${ingredient?.name || '成分'} - 成分详情`,
      path: `/pages/ingre-wise/ingredient/index?id=${ingredient?._id || ''}`
    }
  },

  onShareTimeline: function() {
    const { ingredient } = this.data
    return {
      title: `${ingredient?.name || '成分'} - 成分详情`,
      query: `id=${ingredient?._id || ''}`
    }
  }
}) 