// app.js
import { userApi } from './utils/cloudApi';

App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: "test-5g91mw2d82f950f1",
        traceUser: true,
      });

      // 尝试自动登录
      this.autoLogin();
    }

    this.globalData = {};
  },

  // 自动登录方法
  autoLogin: function () {
    // 检查是否已有openid
    const openid = wx.getStorageSync('openid');
    if (openid) {
      console.log('用户已登录，OpenID:', openid);
      return;
    }

    // 尝试静默登录，不获取用户信息
    userApi.login()
      .then(result => {
        if (result.success) {
          // 保存用户标识
          wx.setStorageSync('openid', result.data.openid);
          if (result.data.userData) {
            wx.setStorageSync('userData', result.data.userData);
          }
          console.log('自动登录成功');
        } else {
          console.warn('自动登录失败:', result.message);
        }
      })
      .catch(err => {
        console.error('自动登录失败:', err);
      });
  }
});
