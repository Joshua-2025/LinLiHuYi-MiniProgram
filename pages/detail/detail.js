// pages/detail/detail.js
Page({
    data: {
      product: null,
      isFavorite: false,
      productId: '',
      messages: [],
      showMessages: false,
      currentUserId: '',
      isSeller: false // 新增：是否是卖家本人
    },
    startPrivateChat() {
        const productId = this.data.product._id
        if (!productId) {
          wx.showToast({ title: '商品ID无效', icon: 'none' })
          return
        }
        wx.navigateTo({
          url: `/pages/private-chat/private-chat?productId=${productId}`
        })
      },
  
    onLoad(options) {
        wx.setNavigationBarTitle({
            title: '商品详情'
          })
      if (options.id) {
        this.setData({ 
          productId: options.id,
          currentUserId: this.getCurrentUserId()
        })
        this.loadProductDetail(options.id)
      } else {
        wx.showToast({
          title: '商品不存在',
          icon: 'none',
          success: () => {
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          }
          
        })
      }
    },
  
    // 获取当前用户ID
    getCurrentUserId() {
      const app = getApp()
      return app.globalData.userInfo ? app.globalData.userInfo._openid : ''
    },
  
    // 加载商品详情
    async loadProductDetail(productId) {
      wx.showLoading({
        title: '加载中...',
      })
  
      try {
        const db = wx.cloud.database()        
        const result = await db.collection('products').doc(productId).get()        
        if (result.data) {
          const product = result.data
          // 在 const product = result.data 这行后面添加：
console.log('🔍 商品时间字段调试:')
console.log('createTime 值:', product.createTime)
console.log('createTime 类型:', typeof product.createTime)
console.log('所有商品字段:', Object.keys(product))
// 检查所有可能的时间字段
const timeFields = ['createTime', 'publishTime', 'timestamp', 'updateTime', 'createAt']
timeFields.forEach(field => {
  if (product[field]) {
    console.log(`字段 ${field}:`, product[field], '类型:', typeof product[field])
  }
})
          const app = getApp()
          const currentUser = app.globalData.userInfo
           // ✅ 安全判断是否是卖家：使用 _openid（强烈推荐）
const isSeller = product._openid === (currentUser ? currentUser._openid : '')

// ✅ 安全处理 createTime 字段（支持 Timestamp / Date / string）
let publishTimeStr = '刚刚'
if (product.createTime) {
  let dateObj = null
  const ct = product.createTime

  if (ct instanceof Date) {
    // 已经是 JS Date 对象
    dateObj = ct
  } else if (typeof ct === 'object' && ct !== null && typeof ct._seconds === 'number') {
    // 是云数据库的 Timestamp 对象
    dateObj = new Date(ct._seconds * 1000 + Math.floor((ct._nanoseconds || 0) / 1000000))
  } else if (typeof ct === 'string') {
    // 是 ISO 字符串或其他字符串
    dateObj = new Date(ct)
  }

  // 验证日期有效
  if (dateObj && !isNaN(dateObj.getTime())) {
    publishTimeStr = this.formatTime(dateObj.toISOString()) // 传 ISO 字符串给 formatTime
  }
}

// 添加调试日志
console.log('🔍 商品详情调试信息:')
console.log('当前用户:', currentUser)
console.log('商品卖家 openid:', product._openid)
console.log('当前用户 openid:', currentUser?._openid)
console.log('是否是卖家:', isSeller)
console.log('商品状态:', product.status)      
         
            this.setData({
            product: product,
            isSeller: isSeller,
            publishTime: publishTimeStr  // 直接设置格式化后的字符串
          })
          
          this.updateViewCount(productId)
          this.checkFavoriteStatus(productId)
          this.loadMessages(productId)
        } else {
          throw new Error('商品不存在')
        }
      } catch (error) {
        console.error('加载商品详情失败:', error)
        wx.showToast({
          title: '加载失败',
          icon: 'none',
          success: () => {
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          }
        })
      } finally {
        wx.hideLoading()
      }
      console.log('🔍 商品时间字段调试:')
    },
  
    // 加载留言记录
    // 加载留言记录
async loadMessages(productId) {
    try {
      const db = wx.cloud.database()
      const result = await db.collection('messages')
        .where({
          productId: productId
        })
        .orderBy('createTime', 'asc')
        .get()
  
      // 🔧 转换每条留言的 createTime 为 ISO 字符串，供 WXS 安全使用
      const messages = result.data.map(msg => {
        let formattedCreateTime = ''
        const ct = msg.createTime
  
        if (ct) {
          let dateObj = null
          if (ct instanceof Date) {
            dateObj = ct
          } else if (typeof ct === 'object' && ct !== null && typeof ct._seconds === 'number') {
            // 云数据库 Timestamp
            dateObj = new Date(ct._seconds * 1000 + Math.floor((ct._nanoseconds || 0) / 1000000))
          } else if (typeof ct === 'string') {
            dateObj = new Date(ct)
          }
  
          if (dateObj && !isNaN(dateObj.getTime())) {
            formattedCreateTime = dateObj.toISOString()
          }
        }
  
        return {
          ...msg,
          createTime: formattedCreateTime // 替换为标准 ISO 字符串
        }
      })
  
      this.setData({
        messages: messages,
        showMessages: messages.length > 0
      })
    } catch (error) {
      console.error('加载留言失败:', error)
    }
  },
  
    // 获取状态文本
    getStatusText(status) {
      const statusMap = {
        0: '待审核',
        1: '在售',
        2: '已下架', 
        3: '已售出'
      }
      return statusMap[status] || '未知状态'
    },
  
    // 获取状态类名
    getStatusClass(status) {
      const classMap = {
        0: 'status-pending',
        1: 'status-online',
        2: 'status-offline',
        3: 'status-sold'
      }
      return classMap[status] || 'status-unknown'
    },
  
    // 标记为已售出
    async markAsSold() {
      const that = this
        // 🔒 权限校验：仅商品创建者可操作
  if (!that.data.product || that.data.product._openid !== that.data.currentUserId) {
    wx.showToast({ title: '只有卖家可操作', icon: 'none' });
    return;
  }
      wx.showModal({
        title: '确认操作',
        content: '确定要将该商品标记为已售出吗？标记后其他用户将无法购买。',
        success: async function(res) {
          if (res.confirm) {
            try {
              const db = wx.cloud.database()
              await db.collection('products').doc(that.data.product._id).update({
                data: {
                  status: 3, // 3代表已售出
                  updateTime: db.serverDate()
                }
              })
              
              wx.showToast({
                title: '标记成功',
                icon: 'success'
              })
              
              // 刷新页面显示新状态
              that.loadProductDetail(that.data.product._id)
              
            } catch (error) {
              console.error('标记为已售出失败:', error)
              wx.showToast({
                title: '操作失败',
                icon: 'none'
              })
            }
          }
        }
      })
    },
  
    // 重新上架商品
    async relistProduct() {
      const that = this
      if (!that.data.product || that.data.product._openid !== that.data.currentUserId) {
        wx.showToast({ title: '只有卖家可操作', icon: 'none' });
        return;
      }
      wx.showModal({
        title: '确认操作',
        content: '确定要重新上架该商品吗？',
        success: async function(res) {
          if (res.confirm) {
            try {
              const db = wx.cloud.database()
              await db.collection('products').doc(that.data.product._id).update({
                data: {
                  status: 1, // 1代表在售
                  updateTime: db.serverDate()
                }
              })
  
              wx.showToast({
                title: '重新上架成功',
                icon: 'success'
              })
  
              // 刷新页面
              that.loadProductDetail(that.data.product._id)
              
            } catch (error) {
              console.error('重新上架失败:', error)
              wx.showToast({
                title: '操作失败',
                icon: 'none'
              })
            }
          }
        }
      })
    },
  
    // 下架商品
    async offlineProduct() {
      const that = this
      if (!that.data.product || that.data.product._openid !== that.data.currentUserId) {
        wx.showToast({ title: '只有卖家可操作', icon: 'none' });
        return;
      }
      wx.showModal({
        title: '确认操作',
        content: '确定要下架该商品吗？下架后其他用户将无法看到此商品。',
        success: async function(res) {
          if (res.confirm) {
            try {
              const db = wx.cloud.database()
              await db.collection('products').doc(that.data.product._id).update({
                data: {
                  status: 2, // 2代表已下架
                  updateTime: db.serverDate()
                }
              })
  
              wx.showToast({
                title: '下架成功',
                icon: 'success'
              })
  
              // 刷新页面
              that.loadProductDetail(that.data.product._id)
              
            } catch (error) {
              console.error('下架商品失败:', error)
              wx.showToast({
                title: '操作失败',
                icon: 'none'
              })
            }
          }
        }
      })
    },
  
    // 更新浏览数
    async updateViewCount(productId) {
      try {
        const db = wx.cloud.database()
        await db.collection('products').doc(productId).update({
          data: {
            viewCount: db.command.inc(1)
          }
        })
      } catch (error) {
        console.error('更新浏览数失败:', error)
      }
    },
  
    // 检查收藏状态
    async checkFavoriteStatus(productId) {
      try {
        const db = wx.cloud.database()
        const app = getApp()
        
        if (!app.globalData.userInfo || !app.globalData.userInfo._openid) {
          return
        }
        
        const result = await db.collection('favorites')
          .where({
            productId: productId,
            userId: app.globalData.userInfo._openid
          })
          .get()
        
        this.setData({
          isFavorite: result.data.length > 0
        })
      } catch (error) {
        console.error('检查收藏状态失败:', error)
      }
    },
  
    // 检查登录状态
    checkLoginStatus() {
      const app = getApp()
      if (!app.globalData.userInfo || !app.globalData.userInfo.nickName) {
        wx.showModal({
          title: '提示',
          content: '此功能需要先登录，是否立即登录？',
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
  
    // 时间格式化
    formatTime(input) {
        if (!input) return '刚刚'
        
        const date = new Date(input)
        if (isNaN(date.getTime())) {
          return '刚刚'
        }
      
        const month = date.getMonth() + 1
        const day = date.getDate()
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${month}月${day}日 ${hours}:${minutes}`
      },
  
    // 联系卖家 - 添加留言选项
    contactSeller() {
      if (!this.checkLoginStatus()) {
        return
      }
  
      const { product } = this.data
      if (!product || !product.sellerInfo.phone) {
        wx.showToast({
          title: '暂无联系方式',
          icon: 'none'
        })
        return
      }
  
      wx.showActionSheet({
        itemList: ['拨打电话', '复制手机号', '发送留言'],
        success: (res) => {
          if (res.tapIndex === 0) {
            // 拨打电话
            wx.makePhoneCall({
              phoneNumber: product.sellerInfo.phone
            })
          } else if (res.tapIndex === 1) {
            // 复制手机号
            wx.setClipboardData({
              data: product.sellerInfo.phone,
              success: () => {
                wx.showToast({
                  title: '手机号已复制',
                  icon: 'success'
                })
              }
            })
          } else if (res.tapIndex === 2) {
            // 发送留言
            this.sendMessage()
          }
        }
      })
    },
  
    // 发送留言
    async sendMessage() {
      const { product } = this.data
      const app = getApp()
      
      if (!app.globalData.userInfo) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        return
      }
  
      wx.showModal({
        title: '发送留言',
        content: '请输入您想对卖家说的话',
        editable: true,
        placeholderText: '例如：这个商品还在吗？可以便宜点吗？',
        success: async (res) => {
          if (res.confirm && res.content) {
            const content = res.content.trim()
            if (!content) {
              wx.showToast({
                title: '留言内容不能为空',
                icon: 'none'
              })
              return
            }
  
            try {
              const db = wx.cloud.database()
              
              // 保存留言
              await db.collection('messages').add({
                data: {
                  productId: this.data.productId,
                  fromUserId: app.globalData.userInfo._openid,
                  fromUserInfo: {
                    nickName: app.globalData.userInfo.nickName,
                    avatarUrl: app.globalData.userInfo.avatarUrl || ''
                  },
                  toUserId: 'seller_' + product.sellerInfo.nickName, // 简化处理，实际应该用卖家的用户ID
                  content: content,
                  status: 0, // 未读
                  createTime: db.serverDate()
                }
              })
  
              wx.showToast({
                title: '留言发送成功',
                icon: 'success'
              })
  
              // 重新加载留言记录
              this.loadMessages(this.data.productId)
  
            } catch (error) {
              console.error('发送留言失败:', error)
              wx.showToast({
                title: '发送失败',
                icon: 'none'
              })
            }
          }
        }
      })
    },
  
    // 收藏/取消收藏
    async toggleFavorite() {
      if (!this.checkLoginStatus()) {
        return
      }
  
      try {
        const db = wx.cloud.database()
        const app = getApp()
  
        if (this.data.isFavorite) {
          // 取消收藏
          await db.collection('favorites')
            .where({
              productId: this.data.productId,
              userId: app.globalData.userInfo._openid
            })
            .remove()
          
          this.setData({ isFavorite: false })
          wx.showToast({
            title: '已取消收藏',
            icon: 'success'
          })
        } else {
          // 添加收藏
          await db.collection('favorites').add({
            data: {
              productId: this.data.productId,
              userId: app.globalData.userInfo._openid,
              createTime: db.serverDate()
            }
          })
          
          this.setData({ isFavorite: true })
          wx.showToast({
            title: '收藏成功',
            icon: 'success'
          })
        }
      } catch (error) {
        console.error('收藏操作失败:', error)
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        })
      }
    },
  
    // 调试方法
    debugInfo() {
      console.log('=== 商品详情页调试信息 ===')
      console.log('当前页面数据:', this.data)
      console.log('全局用户信息:', getApp().globalData.userInfo)
      if (this.data.product) {
        console.log('商品信息:', this.data.product)
        console.log('商品状态:', this.data.product.status)
        console.log('状态文本:', this.getStatusText(this.data.product.status))
        console.log('状态类名:', this.getStatusClass(this.data.product.status))
      }
    }
  })