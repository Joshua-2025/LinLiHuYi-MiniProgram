// pages/admin/admin.js
Page({
    data: {
      currentTab: 'users',
      users: [],
      products: [],
      stats: {
        totalUsers: 0,
        totalProducts: 0,
        activeProducts: 0,
        todayPosts: 0
      },
      searchKeyword: '',
      statusFilter: 0,
      categoryFilter: 0,
      statusOptions: ['全部状态', '在售', '已下架', '已售出'],
      categoryOptions: ['全部分类', '电子产品', '家居用品', '服装鞋帽', '图书文具', '其他']
    },
  
    onLoad(options) {
      console.log('管理后台页面加载')
      this.checkAdminPermission()
      this.loadInitialData()
    },
  
    onShow() {
      console.log('管理后台页面显示')
      this.refreshCurrentTab()
    },
  
    // 检查管理员权限
    async checkAdminPermission() {
      try {
        const app = getApp()
        const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')
        
        if (!userInfo || !userInfo.isAdmin) {
          wx.showToast({
            title: '权限不足',
            icon: 'none'
          })
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
          return false
        }
        
        console.log('管理员权限验证通过:', userInfo)
        return true
      } catch (error) {
        console.error('权限检查失败:', error)
        return false
      }
    },
  
    // 加载初始数据
    async loadInitialData() {
      wx.showLoading({
        title: '加载中...',
      })
  
      try {
        await Promise.all([
          this.loadUsers(),
          this.loadProducts(),
          this.loadStats()
        ])
      } catch (error) {
        console.error('加载数据失败:', error)
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      } finally {
        wx.hideLoading()
      }
    },
  
    // 切换标签页
    switchTab(e) {
      const tab = e.currentTarget.dataset.tab
      console.log('切换标签:', tab)
      
      this.setData({
        currentTab: tab
      })
  
      this.refreshCurrentTab()
    },
  
    // 刷新当前标签数据
    refreshCurrentTab() {
      switch (this.data.currentTab) {
        case 'users':
          this.loadUsers()
          break
        case 'products':
          this.loadProducts()
          break
        case 'stats':
          this.loadStats()
          break
      }
    },
  
    // 加载用户数据 - 修复数据完整性问题
    async loadUsers() {
      try {
        const db = wx.cloud.database()
        const res = await db.collection('users')
          .orderBy('createTime', 'desc')
          .get()
  
        console.log('加载用户数据:', res.data)
        
        // 处理用户数据，确保所有字段都有值
        const processedUsers = await Promise.all(
          res.data.map(async (user) => {
            // 获取用户商品数量
            let productCount = 0
            try {
              const productRes = await db.collection('products')
                .where({
                  'sellerInfo.nickName': user.nickName || '未知用户'
                })
                .count()
              productCount = productRes.total
            } catch (error) {
              console.error('获取用户商品数量失败:', error)
            }
  
            // 返回处理后的用户数据，确保所有字段都有默认值
            return {
              _id: user._id || '',
              _openid: user._openid || '未设置',
              nickName: user.nickName || '未设置昵称',
              avatarUrl: user.avatarUrl || '/images/default-avatar.png',
              phone: user.phone || '未绑定手机',
              community: user.community || '未设置小区',
              isAdmin: user.isAdmin || false,
              adminLevel: user.adminLevel || 0,
              createTime: user.createTime || Date.now(),
              productCount: productCount
            }
          })
        )
        
        this.setData({
          users: processedUsers
        })
        
        console.log('处理后的用户数据:', processedUsers)
  
      } catch (error) {
        console.error('加载用户数据失败:', error)
        wx.showToast({
          title: '加载用户失败',
          icon: 'none'
        })
      }
    },
  
    // 加载商品数据
    async loadProducts() {
      try {
        const db = wx.cloud.database()
        let query = {}
  
        // 状态筛选
        if (this.data.statusFilter > 0) {
          query.status = this.data.statusFilter - 1
        }
  
        const res = await db.collection('products')
          .where(query)
          .orderBy('createTime', 'desc')
          .get()
  
        console.log('加载商品数据:', res.data)
        
        // 处理商品数据，确保所有字段都有值
        const processedProducts = res.data.map(product => {
          return {
            _id: product._id || '',
            title: product.title || '未设置标题',
            price: product.price || 0,
            category: product.category || '未分类',
            images: product.images || ['/images/no-image.png'],
            status: product.status || 0,
            createTime: product.createTime || Date.now(),
            sellerInfo: {
              nickName: product.sellerInfo?.nickName || '未知卖家',
              avatarUrl: product.sellerInfo?.avatarUrl || '/images/default-avatar.png'
            }
          }
        })
        
        this.setData({
          products: processedProducts
        })
  
      } catch (error) {
        console.error('加载商品数据失败:', error)
        wx.showToast({
          title: '加载商品失败',
          icon: 'none'
        })
      }
    },
  
    // 加载统计数据
    async loadStats() {
      try {
        const db = wx.cloud.database()
        
        // 获取总用户数
        const usersRes = await db.collection('users').count()
        
        // 获取总商品数
        const productsRes = await db.collection('products').count()
        
        // 获取在售商品数
        const activeRes = await db.collection('products')
          .where({ status: 1 })
          .count()
  
        // 获取今日发布商品数
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayRes = await db.collection('products')
          .where({
            createTime: db.command.gte(today.getTime())
          })
          .count()
  
        this.setData({
          stats: {
            totalUsers: usersRes.total || 0,
            totalProducts: productsRes.total || 0,
            activeProducts: activeRes.total || 0,
            todayPosts: todayRes.total || 0
          }
        })
  
        console.log('统计数据:', this.data.stats)
  
      } catch (error) {
        console.error('加载统计数据失败:', error)
        // 设置默认统计数据
        this.setData({
          stats: {
            totalUsers: 0,
            totalProducts: 0,
            activeProducts: 0,
            todayPosts: 0
          }
        })
      }
    },
  
    // 搜索输入
    onSearchInput(e) {
      this.setData({
        searchKeyword: e.detail.value
      })
    },
  
    // 搜索用户
    async searchUsers() {
      const keyword = this.data.searchKeyword.trim()
      if (!keyword) {
        this.loadUsers()
        return
      }
  
      try {
        const db = wx.cloud.database()
        const res = await db.collection('users')
          .where({
            nickName: db.RegExp({
              regexp: keyword,
              options: 'i'
            })
          })
          .get()
  
        // 处理搜索结果
        const processedUsers = res.data.map(user => ({
          _id: user._id || '',
          _openid: user._openid || '未设置',
          nickName: user.nickName || '未设置昵称',
          avatarUrl: user.avatarUrl || '/images/default-avatar.png',
          phone: user.phone || '未绑定手机',
          community: user.community || '未设置小区',
          isAdmin: user.isAdmin || false,
          createTime: user.createTime || Date.now(),
          productCount: 0 // 搜索时暂时不加载商品数量
        }))
  
        this.setData({
          users: processedUsers
        })
  
        wx.showToast({
          title: `找到${res.data.length}个用户`,
          icon: 'none'
        })
      } catch (error) {
        console.error('搜索用户失败:', error)
        wx.showToast({
          title: '搜索失败',
          icon: 'none'
        })
      }
    },
  
    // 状态筛选变化
    onStatusFilterChange(e) {
      const index = parseInt(e.detail.value)
      this.setData({
        statusFilter: index
      })
      this.loadProducts()
    },
  
    // 分类筛选变化
    onCategoryFilterChange(e) {
      const index = parseInt(e.detail.value)
      this.setData({
        categoryFilter: index
      })
      this.loadProducts()
    },
  
    // 设为管理员
    async setAsAdmin(e) {
      const user = e.currentTarget.dataset.user
      console.log('设为管理员:', user)
  
      wx.showModal({
        title: '确认设置',
        content: `确定要将用户"${user.nickName}"设为管理员吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              const db = wx.cloud.database()
              await db.collection('users').doc(user._id).update({
                data: {
                  isAdmin: true,
                  adminLevel: 1
                }
              })
  
              wx.showToast({
                title: '设置成功',
                icon: 'success'
              })
  
              this.loadUsers()
            } catch (error) {
              console.error('设置管理员失败:', error)
              wx.showToast({
                title: '设置失败',
                icon: 'none'
              })
            }
          }
        }
      })
    },
  
    // 取消管理员
    async removeAdmin(e) {
      const user = e.currentTarget.dataset.user
      console.log('取消管理员:', user)
  
      wx.showModal({
        title: '确认取消',
        content: `确定要取消用户"${user.nickName}"的管理员权限吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              const db = wx.cloud.database()
              await db.collection('users').doc(user._id).update({
                data: {
                  isAdmin: false,
                  adminLevel: 0
                }
              })
  
              wx.showToast({
                title: '取消成功',
                icon: 'success'
              })
  
              this.loadUsers()
            } catch (error) {
              console.error('取消管理员失败:', error)
              wx.showToast({
                title: '取消失败',
                icon: 'none'
              })
            }
          }
        }
      })
    },
  
    // 编辑商品
    editProduct(e) {
      const product = e.currentTarget.dataset.product
      console.log('编辑商品:', product)
      
      wx.showModal({
        title: '编辑商品',
        content: '商品编辑功能开发中...',
        showCancel: false
      })
    },
  
    // 切换商品状态
    async toggleProductStatus(e) {
      const product = e.currentTarget.dataset.product
      const newStatus = product.status === 1 ? 2 : 1
      const action = newStatus === 1 ? '上架' : '下架'
  
      console.log(`${action}商品:`, product)
  
      wx.showModal({
        title: `确认${action}`,
        content: `确定要${action}商品"${product.title}"吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              const db = wx.cloud.database()
              await db.collection('products').doc(product._id).update({
                data: {
                  status: newStatus
                }
              })
  
              wx.showToast({
                title: `${action}成功`,
                icon: 'success'
              })
  
              this.loadProducts()
            } catch (error) {
              console.error(`${action}商品失败:`, error)
              wx.showToast({
                title: `${action}失败`,
                icon: 'none'
              })
            }
          }
        }
      })
    },
  
// 删除商品 - 使用云函数绕过权限限制
async deleteProduct(e) {
    const product = e.currentTarget.dataset.product
    console.log('删除商品:', product)
  
    wx.showModal({
      title: '确认删除',
      content: `确定要删除商品"${product.title}"吗？此操作不可恢复！`,
      confirmColor: '#ff3b30',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({
              title: '删除中...',
            })
  
            // 调用管理员删除云函数
            const result = await wx.cloud.callFunction({
              name: 'adminDeleteProduct',
              data: {
                productId: product._id
              }
            })
  
            console.log('云函数返回:', result)
  
            if (result.result.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success',
                duration: 2000
              })
              
              // 延迟刷新列表，让用户看到成功提示
              setTimeout(() => {
                this.loadProducts()
              }, 1500)
            } else {
              throw new Error(result.result.error || '删除失败')
            }
  
          } catch (error) {
            console.error('删除商品失败:', error)
            wx.showToast({
              title: error.message || '删除失败',
              icon: 'none',
              duration: 3000
            })
          } finally {
            wx.hideLoading()
          }
        }
      }
    })
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
  
    // 格式化时间 - 修复时间显示问题
    formatTime(timestamp) {
      if (!timestamp) return '未知时间'
      
      try {
        const date = new Date(timestamp)
        const now = new Date()
        
        // 检查日期是否有效
        if (isNaN(date.getTime())) {
          return '无效时间'
        }
        
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hour = String(date.getHours()).padStart(2, '0')
        const minute = String(date.getMinutes()).padStart(2, '0')
        
        // 如果是今天
        if (date.toDateString() === now.toDateString()) {
          return `今天 ${hour}:${minute}`
        }
        
        // 如果是昨天
        const yesterday = new Date(now)
        yesterday.setDate(now.getDate() - 1)
        if (date.toDateString() === yesterday.toDateString()) {
          return `昨天 ${hour}:${minute}`
        }
        
        // 如果是今年
        if (year === now.getFullYear()) {
          return `${month}-${day} ${hour}:${minute}`
        }
        
        return `${year}-${month}-${day}`
        
      } catch (error) {
        console.error('格式化时间失败:', error)
        return '时间错误'
      }
    },
  
    // 下拉刷新
    onPullDownRefresh() {
      console.log('下拉刷新')
      this.loadInitialData().then(() => {
        wx.stopPullDownRefresh()
      })
    }
  })