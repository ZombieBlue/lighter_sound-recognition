Component({
  data: {
    selected: 0,
    color: "#999",
    selectedColor: "#409EFF",
    list: []
  },
  
  lifetimes: {
    attached() {
      this.setData({
        selected: 0
      })
      this.updateTabBar()
    }
  },
  
  pageLifetimes: {
    show() {
      // 获取当前页面路径，设置选中项
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      const route = currentPage.route
      
      const tabList = this.data.list
      const selected = tabList.findIndex(item => '/' + route === item.pagePath)
      this.setData({ selected: selected !== -1 ? selected : 0 })
      
      // 每次页面显示时更新tabbar
      this.updateTabBar()
    }
  },
  
  methods: {
    updateTabBar() {
      // 从缓存获取用户信息
      const user = wx.getStorageSync('user')
      
      if (!user) {
        // 未登录情况下不显示任何tab
        this.setData({
          list: []
        })
        return
      }
      
      // 根据用户角色设置不同的tabbar
      if (user.role === 'inspector') {
        // 巡检员tabbar
        this.setData({
          list: [{
            pagePath: "/pages/inspector/inspector",
            text: "巡检员"
          }]
        })
      } else {
        // 普通用户tabbar
        this.setData({
          list: [
            {
              pagePath: "/pages/index/index",
              text: "实时事件"
            },
            {
              pagePath: "/pages/analytics/analytics",
              text: "数据分析"
            }
          ]
        })
      }
    },
    
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      
      wx.switchTab({
        url
      })
      
      this.setData({
        selected: data.index
      })
    }
  }
}) 