// app.js
App({
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    serverUrl: 'http://localhost:5000'
  },
  
  onLaunch() {
    // 检查登录状态
    this.checkLoginStatus()
  },
  
  // 检查登录状态
  checkLoginStatus() {
    const user = wx.getStorageSync('user')
    if (user) {
      this.globalData.userInfo = user
      this.globalData.isLoggedIn = true
    } else {
      this.globalData.userInfo = null
      this.globalData.isLoggedIn = false
    }
  },
  
  // 登录方法
  login(username, password) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.globalData.serverUrl}/api/login`,
        method: 'POST',
        data: { username, password },
        header: { 'content-type': 'application/json' },
        success: (res) => {
          if (res.statusCode === 200) {
            // 登录成功，保存用户信息
            this.globalData.userInfo = res.data
            this.globalData.isLoggedIn = true
            wx.setStorageSync('user', res.data)
            resolve(res.data)
          } else {
            reject(res.data.error || '登录失败')
          }
        },
        fail: (err) => {
          reject('网络错误，请稍后重试')
        }
      })
    })
  },
  
  // 注册方法
  register(userData) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.globalData.serverUrl}/api/register`,
        method: 'POST',
        data: userData,
        header: { 'content-type': 'application/json' },
        success: (res) => {
          if (res.statusCode === 201) {
            resolve(res.data)
          } else {
            reject(res.data.error || '注册失败')
          }
        },
        fail: (err) => {
          reject('网络错误，请稍后重试')
        }
      })
    })
  },
  
  // 退出登录
  logout() {
    return new Promise((resolve) => {
      // 清除存储的用户信息
      wx.removeStorageSync('user')
      this.globalData.userInfo = null
      this.globalData.isLoggedIn = false
      
      // 发送退出登录请求
      wx.request({
        url: `${this.globalData.serverUrl}/api/logout`,
        method: 'POST',
        complete: () => {
          resolve()
        }
      })
    })
  },
  
  // 检查权限，判断用户是否有权限访问特定页面
  checkPermission(requiredRole) {
    const user = this.globalData.userInfo
    if (!user) return false
    return user.role === requiredRole
  }
}) 