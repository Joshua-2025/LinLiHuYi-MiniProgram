// pages/myFavorites/myFavorites.js
Page({
    data: {
      favorites: []
    },
  
    onLoad() {
      this.loadMyFavorites()
    },
  
    onShow() {
      this.loadMyFavorites()
    },
  
    // 加载我的收藏
    async loadMyFavorites() {
      wx.showLoading({
        title: '加载中...',
      })
  
      try {
        const db = wx.cloud.database()
        const app = getApp()
        
        // 获取当前用户信息
        let userInfo = app.globalData.userInfo
        if (!userInfo || !userInfo._openid) {
          // 如果没有登录，尝试从缓存获取或创建临时用户
          userInfo = wx.getStorageSync('userInfo') || { 
            nickName: '微信用户',
            _openid: 'temp_user_' + Date.now()
          }
          app.globalData.userInfo = userInfo
        }
  
        // 查询收藏记录
        const favoritesResult = await db.collection('favorites')
          .where({
            userId: userInfo._openid
          })
          .orderBy('createTime', 'desc')
          .get()
  
        console.log('收藏记录:', favoritesResult.data)
  
        // 获取收藏的商品详情
        const favoritesWithDetails = await Promise.all(
          favoritesResult.data.map(async (favorite) => {
            try {
              const productResult = await db.collection('products')
                .doc(favorite.productId)
                .get()
              
              return {
                ...favorite,
                productInfo: productResult.data
              }
            } catch (error) {
              console.error('获取商品详情失败:', error)
              return null
            }
          })
        )
  
        // 过滤掉无效的记录
        const validFavorites = favoritesWithDetails.filter(item => item && item.productInfo)
  
        console.log('有效收藏记录:', validFavorites)
  
        this.setData({
          favorites: validFavorites
        })
  
      } catch (error) {
        console.error('加载收藏列表失败:', error)
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
  
    // 点击商品查看详情
    onProductTap(e) {
      const productId = e.currentTarget.dataset.id
      console.log('点击商品，ID:', productId)
      if (productId) {
        wx.navigateTo({
          url: `/pages/detail/detail?id=${productId}`
        })
      }
    },
  
    // 取消收藏
    async onUnfavorite(e) {
      console.log('取消收藏事件:', e)
      const favoriteId = e.currentTarget.dataset.id
      console.log('要取消的收藏ID:', favoriteId)
  
      if (!favoriteId) {
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        })
        return
      }
  
      wx.showModal({
        title: '取消收藏',
        content: '确定要取消收藏这个商品吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              const db = wx.cloud.database()
              console.log('开始删除收藏记录:', favoriteId)
              
              await db.collection('favorites').doc(favoriteId).remove()
  
              console.log('删除成功')
              
              wx.showToast({
                title: '已取消收藏',
                icon: 'success'
              })
  
              // 重新加载收藏列表
              this.loadMyFavorites()
  
            } catch (error) {
              console.error('取消收藏失败:', error)
              wx.showToast({
                title: '取消收藏失败',
                icon: 'none'
              })
            }
          }
        }
      })
    }
  })