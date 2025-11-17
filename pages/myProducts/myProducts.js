// pages/myProducts/myProducts.js
Page({
    data: {
      products: [],
      isLoading: true,
      isSoldView: false, // 是否是“已售出”视图
      viewTitle: '我的发布'
    },
  
    // ✅ 修正：接收 options 参数
    onLoad(options) {
      const isSold = options?.view === 'sold'
      this.setData({
        isSoldView: isSold,
        viewTitle: isSold ? '已售出' : '我的发布'
      })
      // 页面首次加载时就加载数据（避免 onShow 重复加载）
      this.loadMyProducts()
    },
  
    // 如果你希望从其他页面返回时刷新，可以保留 onShow；否则可删掉
    onShow() {
      // 注意：如果从编辑页返回，可能需要刷新，但要避免重复加载
      // 这里我们只在非首次加载时才调用（可选优化）
      if (this.data.products.length === 0) {
        this.loadMyProducts()
      }
    },
  
    // 加载我的商品（支持按状态过滤）
    async loadMyProducts() {
      wx.showLoading({ title: '加载中...' })
  
      try {
        const db = wx.cloud.database()
        const app = getApp()
        let userInfo = app.globalData.userInfo
  
        if (!userInfo || !userInfo._openid) {
          userInfo = wx.getStorageSync('userInfo') || {}
        }
  
        if (!userInfo._openid) {
          wx.showToast({ title: '请先登录', icon: 'none' })
          return
        }
  
        // 构建查询条件
        const query = db.collection('products')
          .where({
            'sellerInfo._openid': userInfo._openid
          })
  
        // ✅ 关键：如果是“已售出”视图，只查 status: 2
        if (this.data.isSoldView) {
          query.where({ status: 2 }) // 已售出
        } else {
          query.where({ status: 1 }) // 默认只显示“出售中”（可按需改为 .neq(2) 显示非已售出）
        }
  
        const result = await query.orderBy('createTime', 'desc').get()
  
        this.setData({
          products: result.data,
          isLoading: false
        })
  
      } catch (error) {
        console.error('加载我的商品失败:', error)
        wx.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        wx.hideLoading()
      }
    },
  
    // ===== 以下方法保持不变 =====
  
    onProductTap(e) {
      const productId = e.currentTarget.dataset.id
      if (productId) {
        wx.navigateTo({ url: `/pages/detail/detail?id=${productId}` })
      }
    },
  
    getStatusText(status) {
      const statusMap = {
        0: '已下架',
        1: '出售中', 
        2: '已售出'
      }
      return statusMap[status] || '未知状态'
    },
  
    getStatusClass(status) {
      const classMap = {
        0: 'status-offline',
        1: 'status-online',
        2: 'status-sold'
      }
      return classMap[status] || 'status-offline'
    },
  
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
  
    onEditProduct(e) {
      const productId = e.currentTarget.dataset.id
      const product = this.data.products.find(item => item._id === productId)
      if (!product) return
  
      wx.showActionSheet({
        itemList: ['修改价格', '修改描述', '修改联系方式'],
        success: async (res) => {
          const tapIndex = res.tapIndex
          if (tapIndex === 0) {
            this.editPrice(product)
          } else if (tapIndex === 1) {
            this.editDescription(product)
          } else if (tapIndex === 2) {
            this.editContact(product)
          }
        }
      })
    },
  
    editPrice(product) {
      wx.showModal({
        title: '修改价格',
        content: '请输入新的价格',
        editable: true,
        placeholderText: `当前价格: ¥${product.price}`,
        success: async (res) => {
          if (res.confirm && res.content) {
            const newPrice = parseFloat(res.content)
            if (isNaN(newPrice) || newPrice <= 0) {
              wx.showToast({ title: '请输入有效价格', icon: 'none' })
              return
            }
            await this.updateProduct(product._id, { price: newPrice })
          }
        }
      })
    },
  
    editDescription(product) {
      wx.showModal({
        title: '修改描述',
        content: '请输入新的商品描述',
        editable: true,
        placeholderText: product.description,
        success: async (res) => {
          if (res.confirm && res.content) {
            await this.updateProduct(product._id, { description: res.content.trim() })
          }
        }
      })
    },
  
    editContact(product) {
      wx.showModal({
        title: '修改联系方式',
        content: '请输入新的手机号码',
        editable: true,
        placeholderText: product.sellerInfo.phone,
        success: async (res) => {
          if (res.confirm && res.content) {
            const phone = res.content.trim()
            if (!/^1[3-9]\d{9}$/.test(phone)) {
              wx.showToast({ title: '请输入有效手机号', icon: 'none' })
              return
            }
            await this.updateProduct(product._id, { 'sellerInfo.phone': phone })
          }
        }
      })
    },
  
    async updateProduct(productId, updateData) {
      try {
        const db = wx.cloud.database()
        await db.collection('products').doc(productId).update({
          data: {
            ...updateData,
            updateTime: db.serverDate()
          }
        })
        wx.showToast({ title: '修改成功', icon: 'success' })
        this.loadMyProducts()
      } catch (error) {
        console.error('修改商品失败:', error)
        wx.showToast({ title: '修改失败', icon: 'none' })
      }
    },
  
    async onToggleStatus(e) {
      const productId = e.currentTarget.dataset.id
      const currentStatus = parseInt(e.currentTarget.dataset.status)
      const newStatus = currentStatus === 1 ? 0 : 1
  
      try {
        const db = wx.cloud.database()
        await db.collection('products').doc(productId).update({
          data: {
            status: newStatus,
            updateTime: db.serverDate()
          }
        })
        wx.showToast({
          title: newStatus === 1 ? '商品已上架' : '商品已下架',
          icon: 'success'
        })
        this.loadMyProducts()
      } catch (error) {
        console.error('更新商品状态失败:', error)
        wx.showToast({ title: '操作失败', icon: 'none' })
      }
    },
  
    async onDeleteProduct(e) {
      const productId = e.currentTarget.dataset.id
      wx.showModal({
        title: '确认删除',
        content: '删除后无法恢复，确定要删除这个商品吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              const db = wx.cloud.database()
              await db.collection('products').doc(productId).remove()
              wx.showToast({ title: '删除成功', icon: 'success' })
              this.loadMyProducts()
            } catch (error) {
              console.error('删除商品失败:', error)
              wx.showToast({ title: '删除失败', icon: 'none' })
            }
          }
        }
      })
    },
  
    goToPublish() {
      wx.switchTab({ url: '/pages/publish/publish' })
    }
  })