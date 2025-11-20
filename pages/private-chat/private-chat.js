// 引入云数据库
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
    watcher: null,
    currentUserInfo: {},
    sellerUserInfo: {}
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
      currentUserId: userInfo._openid,
      currentUserInfo: userInfo
    })

    this.loadSellerOpenId()
  },

  async loadSellerOpenId() {
    try {
      const res = await db.collection('products').doc(this.data.productId).get()
      const sellerOpenId = res.data._openid
      if (!sellerOpenId) throw new Error('卖家信息缺失')

      // 获取卖家用户信息
      const sellerUserInfo = await this.getUserInfo(sellerOpenId)
      this.setData({ sellerOpenId, sellerUserInfo })
      this.loadMessages()
      this.watchNewMessages()
    } catch (err) {
      console.error('获取卖家失败:', err)
      wx.showToast({ title: '商品异常', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
    }
  },

  getUserInfo(openId) {
    return db.collection('users').where({ _openid: openId }).field({ avatarUrl: true, nickName: true }).get()
      .then(res => res.data[0] || {})
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

      const { currentUserInfo, sellerUserInfo } = this.data
      const messages = res.data.map(msg => {
        const isMine = msg.senderOpenId === currentUserInfo._openid
        const avatarUrl =
          msg.avatarUrl ||
          (isMine ? currentUserInfo.avatarUrl : sellerUserInfo.avatarUrl) ||
          '/images/default-avatar.png'

        const nickName =
          msg.nickName ||
          (isMine ? currentUserInfo.nickName : sellerUserInfo.nickName) ||
          '匿名'

        return {
          ...msg,
          isMine,
          avatarUrl,
          nickName,
          createTimeStr: formatTime(msg.createTime)
        }
      })

      const lastMessageId = messages.length > 0 ? messages[messages.length - 1]._id : ''
      this.setData({ messages, lastMessageId })
    } catch (err) {
      console.error('加载历史消息失败:', err)
    }
  },

  // 实时监听新消息（已修复 avatarUrl 问题）
  watchNewMessages() {
    // 防止重复监听
    if (this.data.watcher) return

    const { conversationId, currentUserInfo, sellerUserInfo } = this.data
    const watcher = db.collection('messages')
      .where({
        conversationId,
        type: 'private'
      })
      .orderBy('createTime', 'asc')
      .watch({
        onChange: snapshot => {
          const messages = snapshot.docs.map(doc => {
            const isMine = doc.senderOpenId === currentUserInfo._openid
            const avatarUrl =
              doc.avatarUrl ||
              (isMine ? currentUserInfo.avatarUrl : sellerUserInfo.avatarUrl) ||
              '/images/default-avatar.png'

            const nickName =
              doc.nickName ||
              (isMine ? currentUserInfo.nickName : sellerUserInfo.nickName) ||
              '匿名'

            return {
              ...doc,
              isMine,
              avatarUrl,
              nickName,
              createTimeStr: formatTime(doc.createTime)
            }
          })

          const lastMessageId = messages.length > 0 ? messages[messages.length - 1]._id : ''
          this.setData({ messages, lastMessageId })
        },
        onError: err => {
          console.error('消息监听失败:', err)
          wx.showToast({ title: '连接中断，正在重连...', icon: 'none' })
          this.setData({ watcher: null })
          // 可选：自动重连
          setTimeout(() => this.watchNewMessages(), 3000)
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

    const { conversationId, sellerOpenId, currentUserId, currentUserInfo } = this.data

    try {
      await db.collection('messages').add({
        data: {
          conversationId,
          type: 'private',
          productId: this.data.productId,
          senderOpenId: currentUserId,
          receiverOpenId: sellerOpenId,
          content,
          createTime: db.serverDate(),
          // 👇 关键：扁平化存储，确保 WXML 能直接读取
          avatarUrl: currentUserInfo.avatarUrl || '/images/default-avatar.png',
          nickName: currentUserInfo.nickName || '我'
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
      this.setData({ watcher: null })
    }
  }
})