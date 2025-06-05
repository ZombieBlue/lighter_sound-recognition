Page({
  data: {
    username: '',
    password: '',
    isLoading: false
  },

  // 更新表单数据
  onInputUsername(e) {
    this.setData({
      username: e.detail.value
    })
  },

  onInputPassword(e) {
    this.setData({
      password: e.detail.value
    })
  },

  // 登录操作
  login() {
    const { username, password } = this.data

    // 表单验证
    if (!username.trim()) {
      wx.showToast({
        title: '请输入用户名',
        icon: 'none'
      })
      return
    }

    if (!password.trim()) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      })
      return
    }

    this.setData({ isLoading: true })

    // 调用登录API
    wx.request({
      url: 'http://localhost:5000/api/login',
      method: 'POST',
      data: {
        username,
        password
      },
      header: {
        'content-type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // 登录成功，保存用户信息
          wx.setStorageSync('user', res.data)

          wx.showToast({
            title: '登录成功',
            icon: 'success'
          })

          // 根据角色跳转到不同页面
          if (res.data.role === 'inspector') {
            wx.switchTab({
              url: '/pages/inspector/inspector'
            })
          } else {
            // 普通用户，跳转到首页
            wx.switchTab({
              url: '/pages/index/index'
            })
          }
        } else {
          // 登录失败
          wx.showToast({
            title: res.data.error || '登录失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error('登录请求失败', err)
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        })
      },
      complete: () => {
        this.setData({ isLoading: false })
      }
    })
  },

  // 跳转到注册页面
  goToRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    })
  }
}) 