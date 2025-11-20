// app.js
App({
    onLaunch: function () {
      // ✅ 替换为你自己的云环境 ID！
      const envId = "cloud1-1gpx6az0800f5616"; // ←←← 这里必须改！
  
      this.globalData = {
        env: envId
      };
  
      if (!wx.cloud) {
        console.error("请使用 2.2.3 或以上的基础库以使用云能力");
      } else {
        wx.cloud.init({
          env: envId, // ← 使用明确的 envId，不要依赖 globalData（避免异步问题）
          traceUser: true,
        });
      }
    },
  });
  
  