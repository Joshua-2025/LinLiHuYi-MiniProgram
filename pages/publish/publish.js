// pages/publish/publish.js
Page({
    data: {
      images: [],
      title: '',
      description: '',
      price: '',
      originalPrice: '',
      category: '',
      categoryIndex: -1,
      phone: '',
      community: '',
      categories: ['家具家居', '数码电子', '服装配饰', '图书文具', '母婴用品', '运动户外', '其他']
    },
  
    onLoad() {
      // 检查用户是否登录
      this.checkLoginStatus()
      this.getUserInfo()
    },
  
    // 检查登录状态
    checkLoginStatus() {
      const app = getApp()
      if (!app.globalData.userInfo || !app.globalData.userInfo.nickName) {
        // 如果没有登录，提示并跳转到个人中心
        wx.showModal({
          title: '提示',
          content: '发布商品需要先登录，是否立即登录？',
          success: (res) => {
            if (res.confirm) {
              // 跳转到个人中心登录
              wx.switchTab({
                url: '/pages/profile/profile'
              })
            } else {
              // 用户取消，返回首页
              wx.switchTab({
                url: '/pages/index/index'
              })
            }
          }
        })
        return false
      }
      return true
    },
  
    getUserInfo() {
      const app = getApp()
      if (app.globalData.userInfo) {
        // 如果已登录，自动填充用户信息
        this.setData({
          phone: app.globalData.userInfo.phone || '',
          community: app.globalData.userInfo.community || ''
        })
      }
    },
  
    onInput(e) {
      const { field } = e.currentTarget.dataset
      this.setData({
        [field]: e.detail.value
      })
    },
  
    onCategoryChange(e) {
      const index = e.detail.value
      this.setData({
        categoryIndex: index,
        category: this.data.categories[index]
      })
    },
  
    async chooseImage() {
      // 检查登录状态
      if (!this.checkLoginStatus()) return
  
      try {
        const res = await wx.chooseMedia({
          count: 9 - this.data.images.length,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
          maxDuration: 30,
          camera: 'back'
        })
  
        wx.showLoading({
          title: '上传中...',
        })
  
        const uploadTasks = res.tempFiles.map(file => {
          return wx.cloud.uploadFile({
            cloudPath: `products/${Date.now()}-${Math.random().toString(36).substr(2)}.jpg`,
            filePath: file.tempFilePath
          })
        })
  
        const results = await Promise.all(uploadTasks)
        const fileIDs = results.map(res => res.fileID)
        
        this.setData({
          images: [...this.data.images, ...fileIDs]
        })
  
        wx.hideLoading()
      } catch (error) {
        console.error('选择图片失败:', error)
        wx.hideLoading()
        if (error.errMsg !== 'chooseMedia:fail cancel') {
          wx.showToast({
            title: '选择图片失败',
            icon: 'none'
          })
        }
      }
    },
  
    deleteImage(e) {
      const { index } = e.currentTarget.dataset
      const images = this.data.images
      images.splice(index, 1)
      this.setData({ images })
    },
  
    validateForm() {
      const { images, title, description, price, category, phone, community } = this.data
  
      // 检查登录状态
      if (!this.checkLoginStatus()) {
        return false
      }
  
      if (images.length === 0) {
        wx.showToast({ title: '请上传商品图片', icon: 'none' })
        return false
      }
  
      if (!title.trim()) {
        wx.showToast({ title: '请输入商品标题', icon: 'none' })
        return false
      }
  
      if (!description.trim()) {
        wx.showToast({ title: '请输入商品描述', icon: 'none' })
        return false
      }
  
      if (!price) {
        wx.showToast({ title: '请输入商品价格', icon: 'none' })
        return false
      }
  
      if (!category) {
        wx.showToast({ title: '请选择商品分类', icon: 'none' })
        return false
      }
  
      if (!phone) {
        wx.showToast({ title: '请输入联系方式', icon: 'none' })
        return false
      }
  
      if (!community.trim()) {
        wx.showToast({ title: '请输入所在小区', icon: 'none' })
        return false
      }
  
      return true
    },
  
    // 提交表单
    async submitForm() {
      // 在提交前再次检查登录状态
      if (!this.checkLoginStatus()) {
        return
      }
  
      if (!this.validateForm()) return
  
      wx.showLoading({
        title: '发布中...',
      })
  
      try {
        const db = wx.cloud.database()
        const app = getApp()
        
        // 获取用户信息
        let userInfo = app.globalData.userInfo
        if (!userInfo) {
          wx.showToast({
            title: '请先登录',
            icon: 'none'
          })
          return
        }
  
        // 保存商品数据
        await db.collection('products').add({
          data: {
            title: this.data.title.trim(),
            description: this.data.description.trim(),
            price: parseFloat(this.data.price),
            originalPrice: this.data.originalPrice ? parseFloat(this.data.originalPrice) : null,
            category: this.data.category,
            images: this.data.images,
            status: 1, // 上架状态
            sellerInfo: {
              nickName: userInfo.nickName,
              avatarUrl: userInfo.avatarUrl || '',
              phone: this.data.phone,
              community: this.data.community.trim()
            },
            viewCount: 0,
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        })
  
        wx.hideLoading()
        wx.showToast({
          title: '发布成功',
          success: () => {
            setTimeout(() => {
              wx.switchTab({
                url: '/pages/index/index'
              })
            }, 1500)
          }
        })
  
      } catch (error) {
        console.error('发布失败:', error)
        wx.hideLoading()
        wx.showToast({
          title: '发布失败，请重试',
          icon: 'none'
        })
      }
    }
  })