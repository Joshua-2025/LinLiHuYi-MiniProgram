// pages/index/index.js
Page({
    data: {
      searchValue: '',
      goodsList: [],
      loading: false,
      noMore: false,
      page: 1,
      pageSize: 10,
      
      // 筛选相关
      activeFilter: 'all', // all, community, category
      activeCategory: '',
      
      // 小区选择相关
      communities: [
        { id: 1, name: '中海塞纳时光小区' },
        { id: 2, name: '中海康城国际' },
        { id: 3, name: '天豪华庭' },
        { id: 4, name: '京基御景中央' },
        { id: 6, name: '其它小区' }
      ],
      communityIndex: -1,
      selectedCommunity: null,
      
      // 分类列表
      categories: [
        '家具家居', '数码电子', '服装配饰', '图书文具', 
        '母婴用品', '运动户外', '美妆个护', '家用电器',
        '手机平板', '电脑办公', '食品生鲜', '酒水饮料',
        '汽车用品', '宠物用品', '其他物品'
      ]
    },
  
    onLoad() {
      this.loadGoods()
      this.loadCustomCommunities()
    },
  
    onPullDownRefresh() {
      this.setData({
        page: 1,
        goodsList: [],
        noMore: false
      })
      this.loadGoods().then(() => {
        wx.stopPullDownRefresh()
      })
    },
  
    onReachBottom() {
      if (!this.data.noMore) {
        this.loadGoods()
      }
    },
  
    // 加载自定义小区
    loadCustomCommunities() {
      try {
        const customCommunities = wx.getStorageSync('customCommunities') || []
        if (customCommunities.length > 0) {
          const customOptions = customCommunities.map(name => ({
            id: 'custom_' + name,
            name: name
          }))
          
          this.setData({
            communities: [...this.data.communities, ...customOptions]
          })
        }
      } catch (error) {
        console.log('读取自定义小区失败:', error)
      }
    },
  
    // 搜索相关
    onSearchInput(e) {
      this.setData({
        searchValue: e.detail.value
      })
    },
  
    onSearchConfirm() {
      this.setData({
        page: 1,
        goodsList: [],
        noMore: false
      })
      this.loadGoods()
    },
  
    // 筛选切换
    onFilterChange(e) {
      const filter = e.currentTarget.dataset.filter
      this.setData({
        activeFilter: filter,
        selectedCommunity: filter === 'community' ? this.data.selectedCommunity : null,
        activeCategory: '',
        page: 1,
        goodsList: [],
        noMore: false
      })
      this.loadGoods()
    },
  
    // 小区下拉选择变化
    onCommunityPickerChange(e) {
      const index = parseInt(e.detail.value)
      const selectedCommunity = this.data.communities[index]
      
      this.setData({
        communityIndex: index,
        selectedCommunity: selectedCommunity,
        page: 1,
        goodsList: [],
        noMore: false
      })
      
      // 自动加载该小区的商品
      this.loadGoods()
    },
  
    // 清除小区筛选
    clearCommunityFilter() {
      this.setData({
        communityIndex: -1,
        selectedCommunity: null,
        page: 1,
        goodsList: [],
        noMore: false
      })
      this.loadGoods()
    },
  
    // 分类筛选
    onCategoryFilter(e) {
      const category = e.currentTarget.dataset.category
      this.setData({
        activeCategory: category,
        page: 1,
        goodsList: [],
        noMore: false
      })
      this.loadGoods()
    },
  
    // 加载商品
    async loadGoods() {
      if (this.data.loading || this.data.noMore) return
  
      this.setData({ loading: true })
  
      try {
        const db = wx.cloud.database()
        let query = db.collection('products').where({
          status: 1 // 上架状态
        })
  
        // 搜索条件
        if (this.data.searchValue) {
          query = query.where({
            title: db.RegExp({
              regexp: this.data.searchValue,
              options: 'i'
            })
          })
        }
  
        // 小区筛选
        if (this.data.activeFilter === 'community' && this.data.selectedCommunity) {
          query = query.where({
            community: this.data.selectedCommunity.name
          })
        }
  
        // 分类筛选
        if (this.data.activeFilter === 'category' && this.data.activeCategory) {
          query = query.where({
            category: this.data.activeCategory
          })
        }
  
        const res = await query
          .orderBy('createTime', 'desc')
          .skip((this.data.page - 1) * this.data.pageSize)
          .limit(this.data.pageSize)
          .get()
  
        const newGoods = res.data
        const allGoods = [...this.data.goodsList, ...newGoods]
  
        this.setData({
          goodsList: allGoods,
          loading: false,
          noMore: newGoods.length < this.data.pageSize
        })
  
        if (newGoods.length > 0) {
          this.setData({
            page: this.data.page + 1
          })
        }
  
      } catch (error) {
        console.error('加载商品失败:', error)
        this.setData({ loading: false })
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      }
    },
  
    // 商品点击
    onGoodsClick(e) {
      const goodsId = e.currentTarget.dataset.id
      wx.navigateTo({
        url: `/pages/detail/detail?id=${goodsId}`
      })
    }
  })