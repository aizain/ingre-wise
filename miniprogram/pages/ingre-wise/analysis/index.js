const app = getApp()

Page({
  data: {
    isLoading: true,
    isExpanded: false,
    hasHighRiskIngredients: false,
    highRiskWarning: '',
    product: {
      id: '',
      imageUrl: '',
      name: '',
      brand: '',
      captureTime: ''
    },
    ingredients: [],
    healthScore: 0,
    healthPoints: [],
    // 添加剂分类
    additiveTypes: [],
    // 添加剂详情映射
    additiveMap: {},
    // 当前显示的添加剂详情
    currentAdditiveDetails: [],
    // 聊天相关数据
    isShowChat: false,
    inputMessage: '',
    messages: [],
    scrollToMessage: ''
  },

  onLoad: function(options) {
    const { id } = options
    if (id) {
      // 初始化欢迎消息
      this.setData({
        messages: [{
          type: 'bot',
          content: '你好！我是食材小助手，可以为您解答关于食品成分的问题。'
        }]
      })
      this.loadProductDetail(id)
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

  // 加载产品详情
  async loadProductDetail(id) {
    try {
      this.setData({ isLoading: true })
      
      const res = await wx.cloud.callFunction({
        name: 'ingre-wise',
        data: {
          type: 'getUserProduct',
          productId: id
        }
      })

      if (res.result.code !== 0) {
        throw new Error(res.result.message || '获取产品详情失败')
      }

      const data = res.result.data
      if (data) {
        // 解析添加剂信息
        const { additiveTypes, additiveMap } = this.parseAdditives(data.ingredientsAnalysis || [])
        
        this.setData({
          isLoading: false,
          product: {
            id: id,
            imageUrl: data.imageUrl,
            name: data.productName,
            brand: data.brand || '',
            captureTime: this.formatTime(data.createdAt)
          },
          ingredients: data.ingredientsAnalysis || [],
          healthScore: data.healthScore || 75,
          healthPoints: data.healthPoints || [],
          hasHighRiskIngredients: data.ingredientsAnalysis?.some(item => item.riskLevel === 'high') || false,
          highRiskWarning: data.highRiskWarning || '',
          additiveTypes,
          additiveMap,
          currentAdditiveDetails: []
        })
      }
    } catch (error) {
      console.error('加载产品详情失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
      this.setData({ isLoading: false })
    } finally {
      wx.hideLoading()
    }
  },

  // 解析配料表
  parseIngredients(ingredientsStr) {
    if (!ingredientsStr) return []
    return ingredientsStr.split('、').map(name => ({
      name,
      type: this.getIngredientType(name)
    }))
  },

  // 判断配料类型
  getIngredientType(name) {
    const artificialKeywords = ['人工', '添加剂', '防腐剂', '色素']
    return artificialKeywords.some(keyword => name.includes(keyword))
      ? 'artificial'
      : 'natural'
  },

  // 格式化时间
  formatTime(date) {
    if (!date) return ''
    date = new Date(date)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  },

  // 展开/收起配料表
  toggleIngredients() {
    this.setData({
      isExpanded: !this.data.isExpanded
    })
  },

  onShareAppMessage() {
    const { product } = this.data
    return {
      title: `${product.name}的配料分析`,
      path: '/pages/ingre-wise/analysis/index?id=' + product.id
    }
  },

  // 标签点击处理
  onTagTap(e) {
    const index = e.currentTarget.dataset.index
    const additiveTypes = this.data.additiveTypes.map((item, idx) => ({
      ...item,
      selected: idx === index ? !item.selected : false
    }))
    
    // 更新选中状态
    this.setData({ additiveTypes })

    // 更新显示的添加剂详情
    const selectedType = additiveTypes[index]
    const currentAdditiveDetails = selectedType.selected 
      ? this.data.additiveMap[selectedType.name] 
      : []
    
    this.setData({ currentAdditiveDetails })
  },

  // 解析添加剂信息
  parseAdditives(ingredients) {
    // 定义添加剂类型标签
    const additiveTags = ['防腐剂', '着色剂', '甜味剂', '香精', '增稠剂']
    const additiveMap = {}
    const usedTypes = new Set()

    // 初始化添加剂映射
    additiveTags.forEach(tag => {
      additiveMap[tag] = []
    })

    // 分类处理添加剂
    ingredients.forEach(ingredient => {
      if (additiveTags.includes(ingredient.tag)) {
        usedTypes.add(ingredient.tag)
        additiveMap[ingredient.tag].push({
          name: ingredient.name,
          description: `${ingredient.effect}`,
          usage: this.getRiskLevelDescription(ingredient.riskLevel),
          riskLevel: ingredient.riskLevel
        })
      }
    })

    // 只保留有数据的添加剂类型
    const additiveTypes = Array.from(usedTypes).map(name => ({
      name,
      selected: false
    }))

    return {
      additiveTypes,
      additiveMap
    }
  },

  // 获取风险等级描述
  getRiskLevelDescription(riskLevel) {
    const descriptions = {
      'low': '安全，可放心使用',
      'medium': '适量使用，注意用量',
      'high': '建议慎重使用，留意个人反应'
    }
    return descriptions[riskLevel] || '使用时请遵循食品安全建议'
  },

  // 切换聊天窗口
  toggleChat() {
    this.setData({
      isShowChat: !this.data.isShowChat
    })
  },

  // 输入框变化处理
  onInputChange(e) {
    this.setData({
      inputMessage: e.detail.value
    })
  },

  // 发送消息
  async sendMessage() {
    const { inputMessage, messages } = this.data
    if (!inputMessage.trim()) return

    // 添加用户消息
    const newMessages = [...messages, {
      type: 'user',
      content: inputMessage
    }]

    this.setData({
      messages: newMessages,
      inputMessage: '',
      scrollToMessage: `msg-${newMessages.length - 1}`
    })

    try {
      // 调用云函数
      const { result } = await wx.cloud.callFunction({
        name: 'ingre-wise',
        data: {
          type: 'chat',
          data: {
            message: inputMessage
          }
        }
      })

      if (result.code === 0) {
        // 添加机器人回复
        this.setData({
          messages: [...this.data.messages, {
            type: 'bot',
            content: result.reply
          }],
          scrollToMessage: `msg-${this.data.messages.length}`
        })
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('发送消息失败:', error)
      wx.showToast({
        title: '发送失败',
        icon: 'error'
      })
    }
  },

  // 处理成分点击
  onIngredientTap(e) {
    const name = e.currentTarget.dataset.name;
    if (!name.trim()) {
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
        query: name
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.code === 0) {
        const ingredients = res.result.data;
        
        if (ingredients && ingredients.length > 0) {
          // 找到成分，跳转到成分详情页
          wx.navigateTo({
            url: `/pages/ingre-wise/ingredient/index?id=${ingredients[0]._id}`,
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
  }
}) 