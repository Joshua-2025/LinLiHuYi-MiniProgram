// pages/messages/messages.js
Page({
    data: {
      messages: []
    },
  
    onLoad() {
      this.checkLoginStatus()
    },
  
    onShow() {
      this.loadMyMessages()
    },
  
    onPullDownRefresh() {
      this.loadMyMessages().then(() => {
        wx.stopPullDownRefresh()
      })
    },
  
    // 检查登录状态
    checkLoginStatus() {
      const app = getApp()
      if (!app.globalData.userInfo || !app.globalData.userInfo.nickName) {
        wx.showModal({
          title: '提示',
          content: '查看消息需要先登录',
          showCancel: false,
          success: (res) => {
            if (res.confirm) {
              wx.switchTab({
                url: '/pages/profile/profile'
              })
            }
          }
        })
        return false
      }
      return true
    },
  
    // 加载我的消息
    async loadMyMessages() {
      if (!this.checkLoginStatus()) return
  
      wx.showLoading({
        title: '加载中...',
      })
  
      try {
        const db = wx.cloud.database()
        const app = getApp()
        const currentUser = app.globalData.userInfo
  
        // 查询我发布的商品
        const myProducts = await db.collection('products')
          .where({
            'sellerInfo.nickName': currentUser.nickName
          })
          .get()
  
        if (myProducts.data.length === 0) {
          this.setData({ messages: [] })
          return
        }
  
        // 获取商品ID列表
        const productIds = myProducts.data.map(product => product._id)
  
        // 查询这些商品的留言
        const messagesResult = await db.collection('messages')
          .where({
            productId: db.command.in(productIds)
          })
          .orderBy('createTime', 'desc')
          .get()
  
        // 关联商品信息
        const messagesWithProductInfo = await Promise.all(
          messagesResult.data.map(async (message) => {
            try {
              const productResult = await db.collection('products')
                .doc(message.productId)
                .get()
              
              return {
                ...message,
                productInfo: productResult.data
              }
            } catch (error) {
              console.error('获取商品信息失败:', error)
              return null
            }
          })
        )
  
        // 过滤无效数据
        const validMessages = messagesWithProductInfo.filter(item => item && item.productInfo)
  
        this.setData({
          messages: validMessages
        })
  
      } catch (error) {
        console.error('加载消息失败:', error)
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      } finally {
        wx.hideLoading()
      }
    },
  
    // 回复留言
    onReply(e) {
      const message = e.currentTarget.dataset.item
      wx.showModal({
        title: '回复留言',
        content: `回复给：${message.fromUserInfo.nickName}`,
        editable: true,
        placeholderText: '请输入回复内容...',
        success: async (res) => {
          if (res.confirm && res.content) {
            const replyContent = res.content.trim()
            if (!replyContent) {
              wx.showToast({
                title: '回复内容不能为空',
                icon: 'none'
              })
              return
            }
  
            await this.submitReply(message._id, replyContent)
          }
        }
      })
    },
  
    // 提交回复
    async submitReply(messageId, replyContent) {
      try {
        const db = wx.cloud.database()
        
        await db.collection('messages').doc(messageId).update({
          data: {
            reply: replyContent,
            replyTime: db.serverDate(),
            status: 1 // 标记为已读
          }
        })
  
        wx.showToast({
          title: '回复成功',
          icon: 'success'
        })
  
        // 重新加载消息
        this.loadMyMessages()
  
      } catch (error) {
        console.error('回复失败:', error)
        wx.showToast({
          title: '回复失败',
          icon: 'none'
        })
      }
    },
  
    // 跳转到商品详情
    goToProductDetail(e) {
      const productId = e.currentTarget.dataset.id
      wx.navigateTo({
        url: `/pages/detail/detail?id=${productId}`
      })
    },
  
    // 时间格式化
    formatTime(dateString) {
      if (!dateString) return '刚刚'
      try {
        const date = new Date(dateString)
        const month = date.getMonth() + 1
        const day = date.getDate()
        const hours = date.getHours().toString().padStart(2, '0')
        const minutes = date.getMinutes().toString().padStart(2, '0')
        return `${month}月${day}日 ${hours}:${minutes}`
      } catch (error) {
        return '刚刚'
      }
    }
  })