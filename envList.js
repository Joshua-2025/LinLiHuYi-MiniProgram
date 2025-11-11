// app.js
App({
    onLaunch: function () {
      // 初始化云开发
      if (!wx.cloud) {
        console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      } else {
        wx.cloud.init({
          env: '你的云环境ID', // 这里替换成你的云环境ID
          traceUser: true,
        })
      }
  
      // 获取用户信息
      this.getUserInfo()
    },
  
    globalData: {
      userInfo: null,
      openid: null
    },
  
    // 获取用户信息
    getUserInfo() {
      const that = this
      wx.getSetting({
        success: res => {
          if (res.authSetting['scope.userInfo']) {
            // 已经授权，可以直接调用 getUserInfo 获取头像昵称，不会弹框
            wx.getUserInfo({
              success: res => {
                that.globalData.userInfo = res.userInfo
                
                // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
                // 所以此处加入 callback 以防止这种情况
                if (that.userInfoReadyCallback) {
                  that.userInfoReadyCallback(res)
                }
              }
            })
          }
        }
      })
    }
  })