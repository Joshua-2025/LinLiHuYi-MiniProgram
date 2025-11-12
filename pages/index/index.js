// pages/index/index.js
Page({
    data: {
      products: [],
      categories: [
        {id: 1, name: '家具家居', icon: '🛋️'},
        {id: 2, name: '数码电子', icon: '📱'},
        {id: 3, name: '服装配饰', icon: '👕'},
        {id: 4, name: '图书文具', icon: '📚'},
        {id: 5, name: '母婴用品', icon: '👶'},
        {id: 6, name: '运动户外', icon: '⚽'},
        {id: 7, name: '文艺创作', icon: '🎨'},
        {id: 8, name: '其它物品', icon: '📦'}
      ],
      hasMore: true,
      page: 1,
      pageSize: 10,
      
      // === 小区筛选相关 ===
      communityList: ['全部小区', '中海塞纳', '中海康城', '天昊华庭', '京基御景', '其它'],
      selectedCommunityIndex: 0,
      selectedCommunity: ''
    },
  
    onLoad() {
      console.log('首页加载')
      this.loadProducts()
    },
  
    onPullDownRefresh() {
      console.log('下拉刷新')
      this.setData({
        page: 1,
        products: [],
        selectedCommunityIndex: 0,
        selectedCommunity: ''
      })
      this.loadProducts().then(() => {
        wx.stopPullDownRefresh()
      })
    },
  
    onReachBottom() {
      console.log('上拉加载更多')
      if (this.data.hasMore) {
        this.loadProducts()
      }
    },
  
    // 小区选择变化
    onCommunityChange(e) {
      const index = parseInt(e.detail.value)
      const selectedCommunity = index === 0 ? '' : this.data.communityList[index]
      
      console.log('选择小区:', selectedCommunity)
      
      this.setData({
        selectedCommunityIndex: index,
        selectedCommunity: selectedCommunity,
        page: 1,
        products: []
      })
      
      this.loadProducts()
    },
  
    // 清除小区筛选
    clearCommunityFilter() {
      console.log('清除小区筛选')
      this.setData({
        selectedCommunityIndex: 0,
        selectedCommunity: '',
        page: 1,
        products: []
      })
      this.loadProducts()
    },
  
    // 加载商品列表 - 修复"其它"小区筛选
    async loadProducts() {
      wx.showLoading({
        title: '加载中...',
      })
  
      try {
        const db = wx.cloud.database()
        
        // 先查询所有商品用于调试
        const allProducts = await db.collection('products')
          .where({ status: 1 })
          .get()
        
        console.log('=== 所有商品的小区信息 ===')
        allProducts.data.forEach((product, index) => {
          console.log(`商品${index + 1}:`, {
            title: product.title,
            community: product.sellerInfo?.community,
            isPreset: ['中海塞纳', '中海康城', '天昊华庭', '京基御景'].includes(product.sellerInfo?.community)
          })
        })
        
        // 构建查询条件
        let query = {
          status: 1
        }
        
        // === 修复：正确的"其它"小区筛选逻辑 ===
        if (this.data.selectedCommunity) {
          if (this.data.selectedCommunity === '其它') {
            // 选择"其它"时，查询不在预设小区列表中的商品
            const presetCommunities = ['中海塞纳', '中海康城', '天昊华庭', '京基御景']
            
            // 方法1：使用多个不等于条件
            query['sellerInfo.community'] = db.command.and([
              db.command.neq('中海塞纳'),
              db.command.neq('中海康城'),
              db.command.neq('天昊华庭'),
              db.command.neq('京基御景')
            ])
            
            console.log('其它小区查询条件:', query)
          } else {
            // 选择具体小区时，精确匹配
            query['sellerInfo.community'] = this.data.selectedCommunity
          }
        }
        
        const result = await db.collection('products')
          .where(query)
          .orderBy('createTime', 'desc')
          .skip((this.data.page - 1) * this.data.pageSize)
          .limit(this.data.pageSize)
          .get()
        
        console.log('筛选结果:', {
          筛选条件: this.data.selectedCommunity,
          查询条件: query,
          返回数量: result.data.length,
          商品列表: result.data.map(p => p.title)
        })
        
        const newProducts = result.data
        const allProductsList = this.data.page === 1 ? newProducts : [...this.data.products, ...newProducts]
        
        this.setData({
          products: allProductsList,
          hasMore: newProducts.length === this.data.pageSize
        })
  
        if (newProducts.length > 0) {
          this.setData({
            page: this.data.page + 1
          })
        }
      } catch (error) {
        console.error('加载商品失败:', error)
        // 如果上面的查询失败，使用备选方案
        await this.loadProductsAlternative()
      } finally {
        wx.hideLoading()
      }
    },
  
    // 备选加载方案 - 本地筛选（确保能工作）
    async loadProductsAlternative() {
      try {
        const db = wx.cloud.database()
        
        // 先查询所有上架商品
        const result = await db.collection('products')
          .where({ status: 1 })
          .orderBy('createTime', 'desc')
          .get()
        
        let filteredProducts = result.data
        
        // 在本地进行小区筛选
        if (this.data.selectedCommunity) {
          if (this.data.selectedCommunity === '其它') {
            // 选择"其它"时，显示不在预设小区列表中的商品
            const presetCommunities = ['中海塞纳', '中海康城', '天昊华庭', '京基御景']
            filteredProducts = filteredProducts.filter(product => {
              const productCommunity = product.sellerInfo?.community
              return productCommunity && !presetCommunities.includes(productCommunity)
            })
          } else {
            // 选择具体小区时，精确匹配
            filteredProducts = filteredProducts.filter(product => 
              product.sellerInfo?.community === this.data.selectedCommunity
            )
          }
        }
        
        // 分页处理
        const startIndex = (this.data.page - 1) * this.data.pageSize
        const paginatedProducts = filteredProducts.slice(startIndex, startIndex + this.data.pageSize)
        
        console.log('备选方案 - 筛选结果:', {
          筛选条件: this.data.selectedCommunity,
          总数: filteredProducts.length,
          当前页: paginatedProducts.length,
          商品: paginatedProducts.map(p => p.title)
        })
        
        const newProducts = paginatedProducts
        const allProducts = this.data.page === 1 ? newProducts : [...this.data.products, ...newProducts]
        
        this.setData({
          products: allProducts,
          hasMore: (startIndex + this.data.pageSize) < filteredProducts.length
        })
  
        if (newProducts.length > 0) {
          this.setData({
            page: this.data.page + 1
          })
        }
      } catch (error) {
        console.error('备选方案加载失败:', error)
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      }
    },
  
    // 时间格式化
    formatTime(dateString) {
      if (!dateString) return '刚刚'
      try {
        const date = new Date(dateString)
        const month = date.getMonth() + 1
        const day = date.getDate()
        return `${month}月${day}日`
      } catch (error) {
        return '刚刚'
      }
    },
  
    // 搜索点击
    onSearchTap() {
      wx.navigateTo({
        url: '/pages/category/category?type=search'
      })
    },
  
    // 分类点击
    onCategoryTap(e) {
      const categoryId = e.currentTarget.dataset.id
      const category = this.data.categories.find(item => item.id === categoryId)
      wx.navigateTo({
        url: `/pages/category/category?category=${category.name}`
      })
    },
  
    // 商品点击
    onProductTap(e) {
      const productId = e.currentTarget.dataset.id
      wx.navigateTo({
        url: `/pages/detail/detail?id=${productId}`
      })
    }
  })