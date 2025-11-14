// pages/myProducts/myProducts.js
Page({
    data: {
      products: []
    },
  
    onLoad() {
      this.loadMyProducts()
    },
  
    onShow() {
      this.loadMyProducts()
    },
  
    // 加载我的商品
    async loadMyProducts() {
      wx.showLoading({
        title: '加载中...',
      })
  
      try {
        const db = wx.cloud.database()
        const app = getApp()
        
        // 获取当前用户信息
        let userInfo = app.globalData.userInfo
        if (!userInfo || !userInfo.nickName) {
          // 如果没有登录，尝试从缓存获取
          userInfo = wx.getStorageSync('userInfo') || { nickName: '微信用户' }
        }
  
        // 查询我发布的商品
        const result = await db.collection('products')
          .where({
            'sellerInfo._openid': userInfo._openid  // 🔧 修改：基于_openid查询
          })
          .orderBy('createTime', 'desc')
          .get()
  
        this.setData({
          products: result.data
        })
  
      } catch (error) {
        console.error('加载我的商品失败:', error)
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      } finally {
        wx.hideLoading()
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
  
    // 获取状态文本
    getStatusText(status) {
      const statusMap = {
        0: '已下架',
        1: '出售中', 
        2: '已售出'
      }
      return statusMap[status] || '未知状态'
    },
  
    // 获取状态样式类
    getStatusClass(status) {
      const classMap = {
        0: 'status-offline',
        1: 'status-online',
        2: 'status-sold'
      }
      return classMap[status] || 'status-offline'
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
  
    // 编辑商品
    onEditProduct(e) {
      const productId = e.currentTarget.dataset.id
      const product = this.data.products.find(item => item._id === productId)
      
      if (!product) return
      
      // 弹出编辑菜单
      wx.showActionSheet({
        itemList: ['修改价格', '修改描述', '修改联系方式'],
        success: async (res) => {
          const tapIndex = res.tapIndex
          
          if (tapIndex === 0) {
            // 修改价格
            this.editPrice(product)
          } else if (tapIndex === 1) {
            // 修改描述
            this.editDescription(product)
          } else if (tapIndex === 2) {
            // 修改联系方式
            this.editContact(product)
          }
        }
      })
    },
  
    // 修改价格
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
              wx.showToast({
                title: '请输入有效价格',
                icon: 'none'
              })
              return
            }
            
            await this.updateProduct(product._id, { price: newPrice })
          }
        }
      })
    },
  
    // 修改描述
    editDescription(product) {
      wx.showModal({
        title: '修改描述',
        content: '请输入新的商品描述',
        editable: true,
        placeholderText: product.description,
        success: async (res) => {
          if (res.confirm && res.content) {
            await this.updateProduct(product._id, { 
              description: res.content.trim() 
            })
          }
        }
      })
    },
  
    // 修改联系方式
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
              wx.showToast({
                title: '请输入有效手机号',
                icon: 'none'
              })
              return
            }
            
            await this.updateProduct(product._id, { 
              'sellerInfo.phone': phone 
            })
          }
        }
      })
    },
  
    // 更新商品信息
    async updateProduct(productId, updateData) {
      try {
        const db = wx.cloud.database()
        await db.collection('products').doc(productId).update({
          data: {
            ...updateData,
            updateTime: db.serverDate()
          }
        })
        
        wx.showToast({
          title: '修改成功',
          icon: 'success'
        })
        
        // 重新加载商品列表
        this.loadMyProducts()
        
      } catch (error) {
        console.error('修改商品失败:', error)
        wx.showToast({
          title: '修改失败',
          icon: 'none'
        })
      }
    },
  
    // 上架/下架商品
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
  
        // 重新加载商品列表
        this.loadMyProducts()
  
      } catch (error) {
        console.error('更新商品状态失败:', error)
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        })
      }
    },
  
    // 删除商品
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
  
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })
  
              // 重新加载商品列表
              this.loadMyProducts()
  
            } catch (error) {
              console.error('删除商品失败:', error)
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              })
            }
          }
        }
      })
    },
  
    // 跳转到发布页面
    goToPublish() {
      wx.switchTab({
        url: '/pages/publish/publish'
      })
    }
  })