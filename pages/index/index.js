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
        {id: 7, name: '其他物品', icon: '📦'}
      ],
      hasMore: true,
      page: 1,
      pageSize: 10
    },
  
    onLoad() {
      console.log('首页加载')
      this.loadProducts()
    },
  
    onPullDownRefresh() {
      console.log('下拉刷新')
      this.setData({
        page: 1,
        products: []
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
  
    // 加载商品列表
    async loadProducts() {
      wx.showLoading({
        title: '加载中...',
      })
  
      try {
        const db = wx.cloud.database()
        const result = await db.collection('products')
          .where({
            status: 1
          })
          .orderBy('createTime', 'desc')
          .skip((this.data.page - 1) * this.data.pageSize)
          .limit(this.data.pageSize)
          .get()
        
        console.log('加载的商品数据:', result.data)
        
        // 检查每个商品的图片数据
        if (result.data && result.data.length > 0) {
          result.data.forEach((product, index) => {
            console.log(`商品 ${index + 1}:`, {
              title: product.title,
              images: product.images,
              imagesLength: product.images ? product.images.length : 0,
              hasFirstImage: product.images && product.images.length > 0
            })
          })
        }
        
        const newProducts = result.data
        const allProducts = this.data.page === 1 ? newProducts : [...this.data.products, ...newProducts]
        
        this.setData({
          products: allProducts,
          hasMore: newProducts.length === this.data.pageSize
        })
  
        if (newProducts.length > 0) {
          this.setData({
            page: this.data.page + 1
          })
        }
      } catch (error) {
        console.error('加载商品失败:', error)
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      } finally {
        wx.hideLoading()
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