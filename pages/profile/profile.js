// pages/profile/profile.js
Page({
    data: {
      userInfo: {},
      myProductsCount: 0,
      myFavoritesCount: 0,
      soldCount: 0,
      isLoggedIn: false
    },
  
    onLoad() {
      console.log('个人中心页面加载')
      this.checkLoginStatus()
    },
  
    onShow() {
      console.log('个人中心页面显示')
      this.checkLoginStatus()
      this.loadUserStats()
    },
  
    // 检查登录状态
    async checkLoginStatus() {
      const app = getApp()
      
      // 先检查本地是否有用户信息
      try {
        const cachedUserInfo = wx.getStorageSync('userInfo')
        if (cachedUserInfo && cachedUserInfo.nickName) {
          console.log('从缓存获取用户信息:', cachedUserInfo)
          this.setData({
            userInfo: cachedUserInfo,
            isLoggedIn: true
          })
          app.globalData.userInfo = cachedUserInfo
          return
        }
      } catch (error) {
        console.error('读取缓存失败:', error)
      }
      
      // 如果没有缓存，显示登录界面
      this.setData({
        userInfo: {},
        isLoggedIn: false
      })
    },
  
// 微信一键登录（简化版）
wechatLogin() {
    // 先获取用户信息（用户主动点击）
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: async (res) => {
        console.log('获取用户信息成功:', res.userInfo)
        
        let userInfo = res.userInfo;
        
        // 如果昵称是"微信用户"，提示用户设置昵称
        if (userInfo.nickName === '微信用户' || !userInfo.nickName) {
          userInfo = await this.setCustomNickName(userInfo);
          if (!userInfo) return; // 用户取消设置
        }
        
        try {
          wx.showLoading({
            title: '登录中...',
          })
  
          // 微信登录获取 code
          const loginRes = await wx.login()
          console.log('微信登录code:', loginRes.code)
          
          if (!loginRes.code) {
            throw new Error('获取登录code失败')
          }
  
          // 调用云函数
          const cloudRes = await wx.cloud.callFunction({
            name: 'login',
            data: {
              code: loginRes.code,
              userInfo: userInfo
            }
          })
          
          console.log('云函数返回:', cloudRes)
  
          if (cloudRes.result && cloudRes.result.success) {
            const finalUserInfo = cloudRes.result.userInfo
            this.handleLoginSuccess(finalUserInfo)
          } else {
            throw new Error('登录失败')
          }
  
        } catch (error) {
          console.error('微信登录失败:', error)
          wx.showToast({
            title: '登录失败，请重试',
            icon: 'none'
          })
        } finally {
          wx.hideLoading()
        }
      },
      fail: (error) => {
        console.error('获取用户信息失败:', error)
        wx.showToast({
          title: '授权失败',
          icon: 'none'
        })
      }
    })
  },
// 设置自定义昵称
setCustomNickName(baseUserInfo) {
    return new Promise((resolve) => {
      wx.showModal({
        title: '设置昵称',
        content: '请为您设置一个昵称',
        editable: true,
        placeholderText: '例如：邻居小明',
        confirmText: '确定',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm && res.content) {
            const nickName = res.content.trim()
            if (nickName) {
              // 使用用户输入的昵称
              baseUserInfo.nickName = nickName;
              resolve(baseUserInfo)
            } else {
              wx.showToast({
                title: '昵称不能为空',
                icon: 'none'
              })
              resolve(null)
            }
          } else {
            // 用户取消设置，仍然使用微信返回的信息
            resolve(baseUserInfo)
          }
        }
      })
    })
  },
// 新的方法：通过按钮获取用户信息
getUserProfileWithButton() {
    return new Promise((resolve, reject) => {
      // 先隐藏loading，因为下面要显示授权按钮
      wx.hideLoading()
      
      wx.showModal({
        title: '授权用户信息',
        content: '需要获取您的昵称和头像来完善资料',
        confirmText: '授权',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            // 用户点击授权后，再调用getUserProfile
            wx.getUserProfile({
              desc: '用于完善会员资料',
              success: (res) => {
                console.log('获取用户信息成功:', res.userInfo)
                resolve(res.userInfo)
                // 重新显示loading
                wx.showLoading({
                  title: '登录中...',
                })
              },
              fail: (error) => {
                console.error('获取用户信息失败:', error)
                reject(error)
              }
            })
          } else {
            reject(new Error('用户取消授权'))
          }
        }
      })
    })
  },
  
    // 获取用户信息（适配新版微信API）
    getUserProfile() {
      return new Promise((resolve, reject) => {
        wx.getUserProfile({
          desc: '用于完善会员资料',
          success: (res) => {
            console.log('获取用户信息成功:', res.userInfo)
            resolve(res.userInfo)
          },
          fail: (error) => {
            console.error('获取用户信息失败:', error)
            reject(error)
          }
        })
      })
    },
  
    // 处理登录成功
    handleLoginSuccess(userInfo) {
      const app = getApp()
      
      console.log('登录成功，用户信息:', userInfo)
      
      this.setData({
        userInfo: userInfo,
        isLoggedIn: true
      })
      
      // 保存到全局和缓存
      app.globalData.userInfo = userInfo
      wx.setStorageSync('userInfo', userInfo)
      
      // 更新统计信息
      this.loadUserStats()
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })
  
      // 登录后提示设置小区（如果还没有设置）
      if (!userInfo.community) {
        setTimeout(() => {
          this.showSetCommunityDialog()
        }, 1000)
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
        avatarUrl: '/images/default-avatar.png',
        _openid: 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        community: '',
        isCustom: true,
        isAdmin: false,
        adminLevel: 0
      }
      
      this.handleLoginSuccess(userInfo)
    },
  
    // 显示登录选择
    showLoginOptions() {
        this.wechatLogin()
    },
      //wx.showActionSheet({
        //itemList: ['微信一键登录', '自定义昵称登录'],
        //success: (res) => {
          //const tapIndex = res.tapIndex
          //if (tapIndex === 0) {
           // this.wechatLogin()
         // } else if (tapIndex === 1) {
          //  this.customLogin()
         // }
       // },
        //fail: (error) => {
          //console.error('选择登录方式失败:', error)
        //}
      //})
    // },
  
    // 退出登录
    onLogout() {
      wx.showModal({
        title: '确认退出',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            this.setData({
              userInfo: {},
              isLoggedIn: false,
              myProductsCount: 0,
              myFavoritesCount: 0,
              soldCount: 0
            })
            
            const app = getApp()
            app.globalData.userInfo = null
            wx.removeStorageSync('userInfo')
            
            wx.showToast({
              title: '已退出登录',
              icon: 'success'
            })
          }
        }
      })
    },
  
    // 设置小区
    onSetCommunity() {
      if (!this.data.isLoggedIn) {
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
    if (!this.data.isLoggedIn) {
      console.log('用户未登录，跳过统计加载')
      return
    }
  
    try {
      const db = wx.cloud.database()
      
      console.log('🔍 调试用户信息:', {
        nickName: this.data.userInfo.nickName,
        _openid: this.data.userInfo._openid
      })
      
      // 获取我发布的商品数量
      const productsRes = await db.collection('products')
        .where({
          'sellerInfo._openid': this.data.userInfo._openid
        })
        .count()
      
      console.log('🔍 总商品查询结果:', {
        查询条件: 'sellerInfo._openid = ' + this.data.userInfo._openid,
        找到数量: productsRes.total
      })
  
      // 获取收藏数量
      const favoritesRes = await db.collection('favorites')
        .where({
          userId: this.data.userInfo._openid
        })
        .count()
  
      console.log('🔍 收藏查询结果:', {
        查询条件: 'userId = ' + this.data.userInfo._openid,
        找到数量: favoritesRes.total
      })
  
      // 获取已售出数量 - 添加详细调试
      const soldProducts = await db.collection('products')
        .where({
          'sellerInfo._openid': this.data.userInfo._openid,
          status: 2
        })
        .get()
      
      console.log('🔍 已售出商品调试:', {
        查询条件: 'sellerInfo._openid = ' + this.data.userInfo._openid + ' AND status = 2',
        找到数量: soldProducts.data.length,
        商品列表: soldProducts.data.map(item => ({
          id: item._id,
          title: item.title,
          status: item.status
        }))
      })
  
      const soldRes = await db.collection('products')
        .where({
          'sellerInfo._openid': this.data.userInfo._openid,
          status: 2
        })
        .count()
  
      console.log('🔍 已售出统计结果:', {
        数量: soldRes.total
      })
  
      this.setData({
        myProductsCount: productsRes.total || 0,
        myFavoritesCount: favoritesRes.total || 0,
        soldCount: soldRes.total || 0
      })
  
      console.log('🎯 最终统计数据:', {
        我的发布: this.data.myProductsCount,
        我的收藏: this.data.myFavoritesCount,
        已售出: this.data.soldCount
      })
  
    } catch (error) {
      console.error('加载用户统计失败:', error)
    }
  },
  
    // 跳转到我的发布
    navigateToMyProducts() {
      if (!this.data.isLoggedIn) {
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
      if (!this.data.isLoggedIn) {
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
      if (!this.data.isLoggedIn) {
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
      if (!this.data.isLoggedIn) {
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