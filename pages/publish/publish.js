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
      categories: ['家具家居', '数码电子', '服装配饰', '图书文具', '母婴用品', '运动户外', '其他'],
      communities: [
        { id: 1, name: '中海塞纳时光小区' },
        { id: 2, name: '中海康城国际' },
        { id: 3, name: '天豪华庭' },
        { id: 4, name: '京基御景中央' },
        { id: 6, name: '其它小区' }
      ],
      communityIndex: -1,
      selectedCommunity: null,
      showCustomInput: false,
      customCommunity: '',
      searchValue: '',
      filteredCommunities: [], // 筛选后的小区列表
      showSearchResults: false
    },
  
    onLoad(options) {
      // 检查用户是否登录
      this.checkLoginStatus()
      this.getUserInfo()
      
      // 加载自定义小区
      this.loadCustomCommunities()
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
  
    // 搜索小区
    onSearchInput(e) {
      const keyword = e.detail.value
      this.setData({
        searchValue: keyword
      })
      
      if (keyword) {
        const filtered = this.data.communities.filter(community => 
          community.name.includes(keyword)
        )
        this.setData({
          filteredCommunities: filtered,
          showSearchResults: true
        })
      } else {
        this.setData({
          showSearchResults: false
        })
      }
    },
  
    // 下拉选择变化
    onCommunityChange(e) {
      const index = parseInt(e.detail.value)
      this.setData({
        communityIndex: index,
        selectedCommunity: this.data.communities[index]
      })
    },
  
    // 切换到自定义输入
    switchToCustomInput() {
      console.log('切换到自定义输入模式')
      this.setData({
        showCustomInput: true,
        customCommunity: ''
      })
    },
  
    // 取消自定义输入
    cancelCustomInput() {
      this.setData({
        showCustomInput: false,
        customCommunity: ''
      })
    },
  
    // 自定义输入处理
    onCustomInput(e) {
      this.setData({
        customCommunity: e.detail.value
      })
    },
  
    // 确认自定义小区
    confirmCustomInput() {
      const customCommunity = this.data.customCommunity.trim()
      if (!customCommunity) {
        wx.showToast({
          title: '请输入小区名称',
          icon: 'none'
        })
        return
      }
  
      // 创建自定义小区对象
      const customCommunityObj = {
        id: 'custom', // 标识为自定义
        name: customCommunity
      }
  
      this.setData({
        selectedCommunity: customCommunityObj,
        showCustomInput: false,
        customCommunity: ''
      })
  
      wx.showToast({
        title: '已选择自定义小区',
        icon: 'success'
      })
    },
  
    // 保存自定义小区到本地缓存
    saveCustomCommunity(communityName) {
      try {
        const customCommunities = wx.getStorageSync('customCommunities') || []
        if (!customCommunities.includes(communityName)) {
          customCommunities.push(communityName)
          wx.setStorageSync('customCommunities', customCommunities)
        }
      } catch (error) {
        console.log('保存自定义小区失败:', error)
      }
    },
  
    // 页面加载时读取自定义小区
    loadCustomCommunities() {
      try {
        const customCommunities = wx.getStorageSync('customCommunities') || []
        if (customCommunities.length > 0) {
          // 可以将自定义小区也显示在下拉选项中
          const customOptions = customCommunities.map(name => ({
            id: 'custom_' + name,
            name: name + ' (自定义)'
          }))
          
          this.setData({
            communities: [...this.data.communities, ...customOptions]
          })
        }
      } catch (error) {
        console.log('读取自定义小区失败:', error)
      }
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
      const { images, title, description, price, category, phone, selectedCommunity } = this.data
  
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
  
      // 使用 selectedCommunity 而不是 community
      if (!selectedCommunity) {
        wx.showToast({ title: '请选择小区', icon: 'none' })
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
  
        // 使用新的数据结构，包含小区信息
        await db.collection('products').add({
          data: {
            title: this.data.title.trim(),
            description: this.data.description.trim(),
            price: parseFloat(this.data.price),
            originalPrice: this.data.originalPrice ? parseFloat(this.data.originalPrice) : null,
            category: this.data.category,
            images: this.data.images,
            // 新增小区字段
            community: this.data.selectedCommunity.name,
            communityId: this.data.selectedCommunity.id === 'custom' ? 'custom' : this.data.selectedCommunity.id,
            isCustomCommunity: this.data.selectedCommunity.id === 'custom',
            
            status: 1, // 上架状态
            sellerInfo: {
              nickName: userInfo.nickName,
              avatarUrl: userInfo.avatarUrl || '',
              phone: this.data.phone,
              community: this.data.selectedCommunity.name // 使用选择的小区
            },
            viewCount: 0,
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        })
  
        // 保存自定义小区到本地
        if (this.data.selectedCommunity.id === 'custom') {
          this.saveCustomCommunity(this.data.selectedCommunity.name)
        }
  
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