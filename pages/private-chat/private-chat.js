// pages/private-chat/private-chat.js
const db = wx.cloud.database()

// 时间格式化工具函数
function formatTime(time) {
  if (!time) return ''
  const now = new Date()
  const t = new Date(time)
  const diff = now - t
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前`
  
  const month = t.getMonth() + 1
  const day = t.getDate()
  const hour = t.getHours().toString().padStart(2, '0')
  const minute = t.getMinutes().toString().padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

Page({
  data: {
    inputContent: '',
    productId: '',
    sellerOpenId: '',
    currentUserId: '',
    messages: [],
    lastMessageId: '',
    watcher: null
  },

  onLoad(options) {
    const productId = options.productId
    if (!productId) {
      wx.showToast({ title: '无效商品', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    const app = getApp()
    const userInfo = app.globalData.userInfo
    if (!userInfo || !userInfo._openid) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    const conversationId = `private_${productId}`

    this.setData({
      productId,
      conversationId,
      currentUserId: userInfo._openid
    })

    this.loadSellerOpenId()
  },

  async loadSellerOpenId() {
    try {
      const res = await db.collection('products').doc(this.data.productId).get()
      const sellerOpenId = res.data._openid
      if (!sellerOpenId) throw new Error('卖家信息缺失')
      this.setData({ sellerOpenId })
      this.loadMessages()
      this.watchNewMessages()
    } catch (err) {
      console.error('获取卖家失败:', err)
      wx.showToast({ title: '商品异常', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
    }
  },

  // 加载历史消息
  async loadMessages() {
    try {
      const res = await db.collection('messages')
        .where({
          conversationId: this.data.conversationId,
          type: 'private'
        })
        .orderBy('createTime', 'asc')
        .get()

      const app = getApp()
      const currentUser = app.globalData.userInfo
      const messages = res.data.map(msg => ({
        ...msg,
        isMine: msg.senderOpenId === currentUser._openid,
        createTimeStr: formatTime(msg.createTime)
      }))

      const lastMessageId = messages.length > 0 ? messages[messages.length - 1]._id : ''
      this.setData({ messages, lastMessageId })
    } catch (err) {
      console.error('加载历史消息失败:', err)
    }
  },

  // 实时监听新消息
  watchNewMessages() {
    const watcher = db.collection('messages')
      .where({
        conversationId: this.data.conversationId,
        type: 'private'
      })
      .orderBy('createTime', 'asc')
      .watch({
        onChange: snapshot => {
          const app = getApp()
          const currentUser = app.globalData.userInfo
          const messages = snapshot.docs.map(doc => ({
            ...doc,
            isMine: doc.senderOpenId === currentUser._openid,
            createTimeStr: formatTime(doc.createTime)
          }))
          const lastMessageId = messages.length > 0 ? messages[messages.length - 1]._id : ''
          this.setData({ messages, lastMessageId })
        },
        onError: err => {
          console.error('消息监听失败:', err)
        }
      })

    this.setData({ watcher })
  },

  onInput(e) {
    this.setData({ inputContent: e.detail.value })
  },

  async sendMessage() {
    const content = this.data.inputContent.trim()
    if (!content) return

    const { conversationId, sellerOpenId, currentUserId } = this.data

    try {
      await db.collection('messages').add({
        data: {
          conversationId,
          type: 'private',
          productId: this.data.productId,
          senderOpenId: currentUserId,
          receiverOpenId: sellerOpenId,
          content,
          createTime: db.serverDate()
        }
      })
      this.setData({ inputContent: '' })
    } catch (err) {
      console.error('发送失败:', err)
      wx.showToast({ title: '发送失败', icon: 'none' })
    }
  },

  onUnload() {
    if (this.data.watcher) {
      this.data.watcher.close()
    }
  }
})