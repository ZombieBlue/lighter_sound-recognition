const util = require('../../utils/util.js')

Page({
  data: {
    events: [],
    filteredEvents: [],
    loading: false,
    currentPage: 1,
    pageSize: 10,
    limit: 50,
    autoRefresh: true,
    refreshInterval: 5,
    limitOptions: [10, 20, 50, 100],
    limitIndex: 2, // 默认选中50
    locationOptions: [], // 地点选项
    locationIndex: -1, // -1表示全部
    riskLevelOptions: [
      { value: '', label: '全部' },
      { value: 'high', label: '高风险' },
      { value: 'medium', label: '中风险' },
      { value: 'low', label: '低风险' },
      { value: null, label: '未知' }
    ],
    riskLevelIndex: -1, // -1表示全部
    selectedLocation: '',
    selectedRiskLevel: ''
  },

  onLoad() {
    this.fetchEvents()
    
    // 设置自动刷新
    if (this.data.autoRefresh) {
      this.setupAutoRefresh()
    }
  },
  
  onShow() {
    // 进入页面时刷新数据
    this.fetchEvents()
    
    // 更新tabbar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      })
    }
  },
  
  onHide() {
    // 离开页面时清除定时器
    this.clearRefreshTimer()
  },
  
  onUnload() {
    // 页面卸载时清除定时器
    this.clearRefreshTimer()
  },
  
  // 获取事件列表数据
  fetchEvents() {
    this.setData({
      loading: true
    })
    
    util.request(`/api/events?limit=${this.data.limit}`)
      .then(data => {
        // 格式化事件数据
        const formattedEvents = data.map(event => ({
          ...event,
          formattedTime: util.formatTimestamp(event.timestamp),
          // 确保风险级别字段存在且规范化
          risk_level: event.risk_level ? event.risk_level.toLowerCase() : 'unknown'
        }))
        
        console.log('获取到的事件数据:', formattedEvents) // 添加日志
        
        this.setData({
          events: formattedEvents,
          filteredEvents: formattedEvents,  // 初始化时设置filteredEvents与events相同
          loading: false,
          // 重置为第一页
          currentPage: 1
        })
        
        // 提取位置选项
        this.updateLocationOptions()
        
        // 应用筛选（如果有筛选条件）
        if (this.data.selectedLocation || this.data.selectedRiskLevel !== '') {
          this.applyFilters()
        }
      })
      .catch(error => {
        console.error('获取事件数据失败', error)
        this.setData({
          loading: false
        })
      })
  },
  
  // 提取位置选项
  updateLocationOptions() {
    // 从事件数据中提取所有不同的位置
    const locationSet = new Set()
    
    this.data.events.forEach(event => {
      locationSet.add(event.location || '未知')
    })
    
    const locationOptions = Array.from(locationSet)
    
    this.setData({
      locationOptions
    })
  },
  
  // 应用筛选条件
  applyFilters() {
    const { events, selectedLocation, selectedRiskLevel } = this.data
    
    // 如果没有任何筛选条件，直接使用所有事件数据
    if (!selectedLocation && selectedRiskLevel === '') {
      this.setData({
        filteredEvents: events,
        currentPage: 1
      })
      return
    }
    
    const filteredEvents = events.filter(event => {
      let matchesLocation = true
      let matchesRiskLevel = true
      
      if (selectedLocation) {
        matchesLocation = (event.location || '未知') === selectedLocation
      }
      
      if (selectedRiskLevel !== '') {
        // 对比时统一使用小写进行匹配
        const eventRiskLevel = (event.risk_level || '').toLowerCase()
        const filterRiskLevel = selectedRiskLevel.toLowerCase()
        matchesRiskLevel = eventRiskLevel === filterRiskLevel
      }
      
      return matchesLocation && matchesRiskLevel
    })
    
    this.setData({
      filteredEvents,
      currentPage: 1
    })
  },
  
  // 处理地点选择变化
  handleLocationChange(e) {
    const index = parseInt(e.detail.value)
    
    this.setData({
      locationIndex: index,
      selectedLocation: index === -1 ? '' : this.data.locationOptions[index],
    })
    
    this.applyFilters()
  },
  
  // 处理风险级别选择变化
  handleRiskLevelChange(e) {
    const index = parseInt(e.detail.value)
    
    this.setData({
      riskLevelIndex: index,
      selectedRiskLevel: index === -1 ? '' : this.data.riskLevelOptions[index].value,
    })
    
    this.applyFilters()
  },
  
  // 刷新数据
  refreshData() {
    this.fetchEvents()
  },
  
  // 设置自动刷新
  setupAutoRefresh() {
    // 清除旧的定时器
    this.clearRefreshTimer()
    
    // 设置新的定时器
    this.refreshTimer = setInterval(() => {
      this.fetchEvents()
    }, this.data.refreshInterval * 1000)
  },
  
  // 清除刷新定时器
  clearRefreshTimer() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  },
  
  // 自动刷新开关切换
  handleAutoRefreshChange(e) {
    const value = e.detail.value
    
    this.setData({
      autoRefresh: value
    })
    
    if (value) {
      this.setupAutoRefresh()
    } else {
      this.clearRefreshTimer()
    }
  },
  
  // 处理页面切换
  handlePageChange(e) {
    // 检查是点了上一页还是下一页
    const current = this.data.currentPage;
    const isNext = e.currentTarget.dataset && e.currentTarget.dataset.type === 'next';
    
    this.setData({
      currentPage: isNext ? current + 1 : current - 1
    });
  },
  
  // 获取当前分页的数据
  getPaginatedEvents() {
    const { filteredEvents, currentPage, pageSize } = this.data
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    
    return filteredEvents.slice(startIndex, endIndex)
  },
  
  // 监听每页条数变化
  handleLimitChange(e) {
    const index = parseInt(e.detail.value)
    const value = this.data.limitOptions[index]
    
    this.setData({
      limit: value,
      limitIndex: index
    })
    
    this.fetchEvents()
  },
  
  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地用户信息
          wx.removeStorageSync('user')
          
          // 提示退出成功
          wx.showToast({
            title: '已退出登录',
            icon: 'success',
            duration: 1500
          })
          
          // 延迟跳转到登录页
          setTimeout(() => {
            wx.redirectTo({
              url: '/pages/login/login'
            })
          }, 1500)
        }
      }
    })
  }
}) 