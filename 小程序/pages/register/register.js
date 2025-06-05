Page({
  data: {
    username: '',
    password: '',
    confirmPassword: '',
    role: 'user',  // 默认普通用户
    roles: [
      { name: '普通用户', value: 'user' },
      { name: '巡检员', value: 'inspector' }
    ],
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

  onInputConfirmPassword(e) {
    this.setData({
      confirmPassword: e.detail.value
    })
  },

  onRoleChange(e) {
    this.setData({
      role: e.detail.value
    })
  },

  // 注册操作
  register() {
    const { username, password, confirmPassword, role } = this.data

    // 表单验证
    if (!username.trim()) {
      wx.showToast({
        title: '请输入用户名',
        icon: 'none'
      })
      return
    }

    if (username.length < 3) {
      wx.showToast({
        title: '用户名至少需要3个字符',
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

    if (password.length < 6) {
      wx.showToast({
        title: '密码至少需要6个字符',
        icon: 'none'
      })
      return
    }

    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次输入的密码不一致',
        icon: 'none'
      })
      return
    }

    this.setData({ isLoading: true })

    // 调用注册API
    wx.request({
      url: 'http://localhost:5000/api/register',
      method: 'POST',
      data: {
        username,
        password,
        role
      },
      header: {
        'content-type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 201) {
          // 注册成功
          wx.showToast({
            title: '注册成功',
            icon: 'success'
          })

          // 延迟跳转到登录页面
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
        } else {
          // 注册失败
          wx.showToast({
            title: res.data.error || '注册失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error('注册请求失败', err)
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

  // 返回登录页面
  goBack() {
    wx.navigateBack()
  }
}) 