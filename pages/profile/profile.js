// pages/profile/profile.js
Page({
    data: {
      userInfo: {},
      myProductsCount: 0,
      myFavoritesCount: 0,
      soldCount: 0
    },
  
    onLoad() {
      console.log('个人中心页面加载')
      this.getUserInfo()
    },
  
    onShow() {
      console.log('个人中心页面显示')
      this.getUserInfo()
      setTimeout(() => {
        this.loadUserStats()
      }, 500)
    },
  
    // 获取用户信息 - 从数据库读取
    async getUserInfo() {
      const app = getApp()
      
      try {
        const db = wx.cloud.database()
        
        // 从数据库查询用户信息
        const userRes = await db.collection('users')
          .where({
            _openid: 'user_1762788028810_s8qfk5t22' // 使用你的管理员openid
          })
          .get()
        
        console.log('数据库查询结果:', userRes)
        
        if (userRes.data.length > 0) {
          const dbUserInfo = userRes.data[0]
          console.log('从数据库获取用户信息:', dbUserInfo)
          console.log('管理员状态 - isAdmin:', dbUserInfo.isAdmin, 'adminLevel:', dbUserInfo.adminLevel)
          
          this.setData({
            userInfo: dbUserInfo
          })
          
          // 更新全局和缓存
          app.globalData.userInfo = dbUserInfo
          wx.setStorageSync('userInfo', dbUserInfo)
          
          this.loadUserStats()
        } else {
          console.log('数据库中未找到用户信息')
          // 使用本地缓存
          this.getUserInfoFromCache()
        }
      } catch (error) {
        console.error('从数据库获取用户信息失败:', error)
        // 出错时使用本地缓存
        this.getUserInfoFromCache()
      }
    },
  
    // 从缓存获取用户信息（备用）
    getUserInfoFromCache() {
      const app = getApp()
      
      if (app.globalData.userInfo && app.globalData.userInfo._openid) {
        console.log('从全局获取用户信息:', app.globalData.userInfo)
        this.setData({
          userInfo: app.globalData.userInfo
        })
        this.loadUserStats()
      } else {
        try {
          const userInfo = wx.getStorageSync('userInfo')
          if (userInfo) {
            console.log('从缓存获取用户信息:', userInfo)
            this.setData({ userInfo })
            app.globalData.userInfo = userInfo
            this.loadUserStats()
          } else {
            console.log('没有找到任何用户信息')
          }
        } catch (error) {
          console.error('获取用户信息失败:', error)
        }
      }
    },
  
    // 自定义昵称登录
    customLogin() {
      wx.showModal({
        title: '设置昵称',
        content: '请输入您的昵称',
        editable: true,
        placeholderText: '例如：邻居小明',
        success: (res) => {
          if (res.confirm && res.content) {
            const nickName = res.content.trim()
            if (nickName) {
              this.createUserWithCustomNickName(nickName)
            } else {
              wx.showToast({
                title: '昵称不能为空',
                icon: 'none'
              })
            }
          }
        }
      })
    },
  
    // 创建自定义昵称用户
    createUserWithCustomNickName(nickName) {
      const userInfo = {
        nickName: nickName,
        avatarUrl: '',
        _openid: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        community: '',
        isCustom: true,
        isAdmin: false,
        adminLevel: 0
      }
      
      console.log('创建自定义用户:', userInfo)
      
      this.setData({ userInfo })
      
      // 保存到全局和缓存
      const app = getApp()
      app.globalData.userInfo = userInfo
      wx.setStorageSync('userInfo', userInfo)
      
      // 更新用户统计
      this.loadUserStats()
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })
  
      // 登录后提示设置小区
      setTimeout(() => {
        this.showSetCommunityDialog()
      }, 1000)
    },
  
    // 微信授权登录
    wechatLogin() {
      wx.getUserProfile({
        desc: '用于完善会员资料',
        success: async (res) => {
          const userInfo = res.userInfo
          userInfo._openid = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
          userInfo.community = userInfo.community || ''
          userInfo.isCustom = false
          userInfo.isAdmin = false
          userInfo.adminLevel = 0
          
          console.log('微信登录成功:', userInfo)
          
          try {
            const db = wx.cloud.database()
            const app = getApp()
            
            // 检查是否是管理员用户
            const adminRes = await db.collection('users')
              .where({
                _openid: 'user_1762788028810_s8qfk5t22'
              })
              .get()
            
            if (adminRes.data.length > 0 && adminRes.data[0].isAdmin) {
              // 如果是管理员，使用管理员信息
              const adminUserInfo = adminRes.data[0]
              console.log('使用管理员账号:', adminUserInfo)
              this.setData({ userInfo: adminUserInfo })
              app.globalData.userInfo = adminUserInfo
              wx.setStorageSync('userInfo', adminUserInfo)
            } else {
              // 普通用户
              this.setData({ userInfo })
              app.globalData.userInfo = userInfo
              wx.setStorageSync('userInfo', userInfo)
            }
            
            this.loadUserStats()
            
            wx.showToast({
              title: '登录成功',
              icon: 'success'
            })
  
            setTimeout(() => {
              this.showSetCommunityDialog()
            }, 1000)
            
          } catch (error) {
            console.error('登录处理失败:', error)
            wx.showToast({
              title: '登录失败',
              icon: 'none'
            })
          }
        },
        fail: (error) => {
          console.error('微信登录失败:', error)
          wx.showToast({
            title: '登录失败',
            icon: 'none'
          })
        }
      })
    },
  
    // 显示登录选择
    getUserProfile() {
      wx.showActionSheet({
        itemList: ['微信一键登录', '自定义昵称登录'],
        success: (res) => {
          const tapIndex = res.tapIndex
          if (tapIndex === 0) {
            // 微信登录
            this.wechatLogin()
          } else if (tapIndex === 1) {
            // 自定义昵称登录
            this.customLogin()
          }
        },
        fail: (error) =>{
          console.error('选择登录方式失败:', error)
        }
      })
    },
  
    // 退出登录
    onLogout() {
      wx.showModal({
        title: '确认退出',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            this.setData({
              userInfo: {}
            })
            
            const app = getApp()
            app.globalData.userInfo = null
            wx.removeStorageSync('userInfo')
            
            wx.showToast({
              title: '已退出登录',
              icon: 'success'
            })
            
            setTimeout(() => {
              this.getUserInfo()
            }, 500)
          }
        }
      })
    },
  
    // 设置小区
    onSetCommunity() {
      if (!this.data.userInfo.nickName) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        return
      }
      
      this.showSetCommunityDialog()
    },
  
    // 显示设置小区对话框
    showSetCommunityDialog() {
      wx.showModal({
        title: '设置小区',
        content: '请输入您所在的小区名称',
        editable: true,
        placeholderText: this.data.userInfo.community || '例如：幸福小区',
        success: (res) => {
          if (res.confirm && res.content) {
            const community = res.content.trim()
            if (community) {
              this.updateUserCommunity(community)
            }
          }
        }
      })
    },
  
    // 更新用户小区信息
    updateUserCommunity(community) {
      const updatedUserInfo = {
        ...this.data.userInfo,
        community: community
      }
      
      this.setData({
        userInfo: updatedUserInfo
      })
      
      const app = getApp()
      app.globalData.userInfo = updatedUserInfo
      wx.setStorageSync('userInfo', updatedUserInfo)
      
      wx.showToast({
        title: '小区设置成功',
        icon: 'success'
      })
    },
  
    // 加载用户统计数据
    async loadUserStats() {
      if (!this.data.userInfo.nickName) {
        console.log('用户未登录，跳过统计加载')
        return
      }
  
      try {
        const db = wx.cloud.database()
        const app = getApp()
        
        let userId = app.globalData.userInfo._openid
        if (!userId) {
          const cachedUser = wx.getStorageSync('userInfo')
          userId = cachedUser ? cachedUser._openid : 'temp_user_' + this.data.userInfo.nickName
        }
        
        console.log('当前用户ID:', userId)
        
        // 获取我发布的商品数量
        const productsRes = await db.collection('products')
          .where({
            'sellerInfo.nickName': this.data.userInfo.nickName
          })
          .count()
        
        console.log('发布的商品数量:', productsRes.total)
        
        // 获取收藏数量
        const favoritesRes = await db.collection('favorites')
          .where({
            userId: userId
          })
          .count()
  
        console.log('收藏数量:', favoritesRes.total)
  
        // 获取已售出数量
        const soldRes = await db.collection('products')
          .where({
            'sellerInfo.nickName': this.data.userInfo.nickName,
            status: 2
          })
          .count()
  
        console.log('已售出数量:', soldRes.total)
  
        this.setData({
          myProductsCount: productsRes.total,
          myFavoritesCount: favoritesRes.total,
          soldCount: soldRes.total
        })
  
      } catch (error) {
        console.error('加载用户统计失败:', error)
        this.setData({
          myProductsCount: 0,
          myFavoritesCount: 0,
          soldCount: 0
        })
      }
    },
  
    // 跳转到我的发布
    navigateToMyProducts() {
      if (!this.data.userInfo.nickName) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        return
      }
      wx.navigateTo({
        url: '/pages/myProducts/myProducts'
      })
    },
  
    // 跳转到我的收藏
    navigateToMyFavorites() {
      if (!this.data.userInfo.nickName) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        return
      }
      wx.navigateTo({
        url: '/pages/myFavorites/myFavorites'
      })
    },
  
    // 跳转到消息页面
    navigateToMessages() {
      if (!this.data.userInfo.nickName) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        return
      }
      wx.navigateTo({
        url: '/pages/messages/messages'
      })
    },
  
    // 跳转到管理后台
    navigateToAdmin() {
      console.log('点击管理后台，用户信息:', this.data.userInfo)
      if (!this.data.userInfo.isAdmin) {
        wx.showToast({
          title: '权限不足',
          icon: 'none'
        })
        return
      }
      wx.navigateTo({
        url: '/pages/admin/admin'
      })
    },
  
    // 修改个人信息
    updateUserInfo() {
      if (!this.data.userInfo.nickName) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        return
      }
      
      wx.showActionSheet({
        itemList: ['修改昵称', '设置小区'],
        success: (res) => {
          const tapIndex = res.tapIndex
          if (tapIndex === 0) {
            // 修改昵称
            this.showEditNickNameDialog()
          } else if (tapIndex === 1) {
            // 设置小区
            this.showSetCommunityDialog()
          }
        }
      })
    },
  
    // 显示修改昵称对话框
    showEditNickNameDialog() {
      wx.showModal({
        title: '修改昵称',
        content: '请输入新的昵称',
        editable: true,
        placeholderText: this.data.userInfo.nickName,
        success: (res) => {
          if (res.confirm && res.content) {
            const newNickName = res.content.trim()
            if (newNickName) {
              this.updateUserNickName(newNickName)
            } else {
              wx.showToast({
                title: '昵称不能为空',
                icon: 'none'
              })
            }
          }
        }
      })
    },
  
    // 更新用户昵称
    updateUserNickName(nickName) {
      const updatedUserInfo = {
        ...this.data.userInfo,
        nickName: nickName
      }
      
      this.setData({
        userInfo: updatedUserInfo
      })
      
      const app = getApp()
      app.globalData.userInfo = updatedUserInfo
      wx.setStorageSync('userInfo', updatedUserInfo)
      
      wx.showToast({
        title: '昵称修改成功',
        icon: 'success'
      })
    },
  
    // 联系客服
    contactCustomerService() {
      wx.makePhoneCall({
        phoneNumber: '400-000-0000'
      })
    },
  
    // 关于应用
    aboutApp() {
      wx.showModal({
        title: '关于邻里互易',
        content: '邻里互易是一个专注于小区二手物品交易的平台，让闲置物品在邻里之间流通起来，促进社区资源共享。',
        showCancel: false,
        confirmText: '知道了'
      })
    }
  })