// pages/category/category.js
Page({
    data: {
      products: [],
      currentCategory: '',
      searchValue: '',
      isSearching: false,
      hasMore: true,
      page: 1,
      pageSize: 10
    },
  
    onLoad(options) {
      console.log('分类页面加载，参数:', options)
      if (options.category) {
        this.setData({
          currentCategory: options.category
        })
        this.loadProductsByCategory(options.category)
      }
    },
  
    // 按分类加载商品
    async loadProductsByCategory(category) {
      wx.showLoading({
        title: '加载中...',
      })
  
      try {
        const db = wx.cloud.database()
        const result = await db.collection('products')
          .where({
            category: category,
            status: 1
          })
          .orderBy('createTime', 'desc')
          .skip((this.data.page - 1) * this.data.pageSize)
          .limit(this.data.pageSize)
          .get()
        
        console.log('分类浏览 - 商品数据:', result.data)
        
        // 检查每个商品的图片数据
        if (result.data && result.data.length > 0) {
          result.data.forEach((product, index) => {
            console.log(`分类浏览 - 商品 ${index + 1}:`, {
              title: product.title,
              images: product.images,
              imagesLength: product.images ? product.images.length : 0,
              hasFirstImage: product.images && product.images.length > 0,
              firstImageUrl: product.images && product.images.length > 0 ? product.images[0] : '无图片'
            })
          })
        } else {
          console.log('分类浏览 - 没有找到商品数据')
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
        console.error('加载分类商品失败:', error)
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      } finally {
        wx.hideLoading()
      }
    },
  
    // 搜索商品
    async searchProducts(keyword) {
      wx.showLoading({
        title: '搜索中...',
      })
  
      try {
        const db = wx.cloud.database()
        const result = await db.collection('products')
          .where({
            status: 1,
            title: db.RegExp({
              regexp: keyword,
              options: 'i'
            })
          })
          .orderBy('createTime', 'desc')
          .get()
        
        console.log('搜索 - 商品数据:', result.data)
        
        // 检查搜索结果的图片数据
        if (result.data && result.data.length > 0) {
          result.data.forEach((product, index) => {
            console.log(`搜索 - 商品 ${index + 1}:`, {
              title: product.title,
              images: product.images,
              imagesLength: product.images ? product.images.length : 0,
              hasFirstImage: product.images && product.images.length > 0,
              firstImageUrl: product.images && product.images.length > 0 ? product.images[0] : '无图片'
            })
          })
        } else {
          console.log('搜索 - 没有找到相关商品')
        }
        
        this.setData({
          products: result.data,
          hasMore: false
        })
      } catch (error) {
        console.error('搜索商品失败:', error)
        wx.showToast({
          title: '搜索失败',
          icon: 'none'
        })
      } finally {
        wx.hideLoading()
      }
    },
  
    // 搜索输入
    onSearchInput(e) {
      this.setData({
        searchValue: e.detail.value
      })
    },
  
    // 搜索确认
    onSearchConfirm() {
      const keyword = this.data.searchValue.trim()
      if (!keyword) return
  
      this.setData({
        isSearching: true,
        page: 1,
        products: []
      })
      this.searchProducts(keyword)
    },
  
    // 取消搜索
    onCancelSearch() {
      this.setData({
        searchValue: '',
        isSearching: false,
        page: 1,
        products: []
      })
      if (this.data.currentCategory) {
        this.loadProductsByCategory(this.data.currentCategory)
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
  
    // 商品点击
    onProductTap(e) {
      const productId = e.currentTarget.dataset.id
      console.log('点击商品，ID:', productId)
      if (productId) {
        wx.navigateTo({
          url: `/pages/detail/detail?id=${productId}`
        })
      }
    },
  
    onReachBottom() {
      if (this.data.hasMore && !this.data.isSearching) {
        this.loadProductsByCategory(this.data.currentCategory)
      }
    }
  })