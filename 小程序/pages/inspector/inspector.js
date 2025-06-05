const util = require('../../utils/util.js')

Page({
  data: {
    events: [],
    loading: false,
    monitoring: false,
    monitorInterval: null,
    lastEventId: 0,
    lastUpdateTime: '--',
    notificationVisible: false,
    currentEvent: {},
    handledCount: 0,
    pendingCount: 0,
    lastNotification: null,
    monitoringStartTime: 0 // 添加监控开始时间戳
  },

  onLoad() {
    this.fetchEvents()
  },
  
  onShow() {
    this.fetchEvents()
    
    // 更新tabbar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      })
    }
  },
  
  onHide() {
    this.stopMonitoring()
  },
  
  onUnload() {
    this.stopMonitoring()
  },
  
  // 获取所有事件
  fetchEvents() {
    this.setData({
      loading: true
    })
    
    util.request('/api/events?limit=100')
      .then(data => {
        // 格式化事件数据
        const formattedEvents = data.map(event => ({
          ...event,
          formattedTime: util.formatTimestamp(event.timestamp),
          // 确保风险级别字段存在且规范化
          risk_level: event.risk_level ? event.risk_level.toLowerCase() : 'unknown'
        }))
        
        // 更新事件列表
        this.setData({
          events: formattedEvents,
          loading: false,
          lastUpdateTime: util.formatTime(new Date())
        })
        
        // 更新统计数据
        this.updateStatistics()
        
        // 检查新的高风险事件
        if (this.data.monitoring) {
          this.checkForNewHighRiskEvents()
        }
      })
      .catch(error => {
        console.error('获取事件数据失败', error)
        this.setData({
          loading: false
        })
      })
  },
  
  // 更新统计数据
  updateStatistics() {
    const highRiskEvents = this.getHighRiskEvents()
    
    this.setData({
      handledCount: highRiskEvents.filter(event => event.handled === 1).length,
      pendingCount: highRiskEvents.filter(event => event.handled === 0).length
    })
  },
  
  // 获取高风险事件
  getHighRiskEvents() {
    return this.data.events.filter(event => 
      event.risk_level === 'high'
    )
  },
  
  // 检查新的高风险事件
  checkForNewHighRiskEvents() {
    // 获取未处理的高风险事件
    const highRiskEvents = this.data.events.filter(
      event => event.risk_level === 'high' && event.handled === 0
    )
    
    // 找出ID大于上次检查的最新事件
    const newEvents = highRiskEvents.filter(event => event.id > this.data.lastEventId)
    
    if (newEvents.length > 0) {
      // 更新最后事件ID
      const maxId = Math.max(...newEvents.map(event => event.id))
      
      this.setData({
        lastEventId: maxId
      })
      
      // 只处理在开始监控后发生的事件
      const newEventsAfterMonitoring = newEvents.filter(event => {
        // 将事件时间戳与监控开始时间进行比较
        const eventTime = event.timestamp || 0
        return eventTime >= this.data.monitoringStartTime
      })
      
      // 如果有监控后的新事件，显示通知
      if (newEventsAfterMonitoring.length > 0) {
        // 显示最新的高风险事件通知
        this.showEventNotification(newEventsAfterMonitoring[0])
      }
    }
  },
  
  // 显示事件通知
  showEventNotification(event) {
    this.setData({
      currentEvent: event,
      notificationVisible: true,
      lastNotification: {
        location: event.location,
        riskLevel: util.formatRiskLevel(event.risk_level),
        time: util.formatTime(new Date())
      }
    })
    
    // 振动提醒
    wx.vibrateLong()
    
    // 播放提示音
    const innerAudioContext = wx.createInnerAudioContext()
    innerAudioContext.src = '/images/alert.mp3'
    innerAudioContext.play()
  },
  
  // 确认通知
  acknowledgeNotification() {
    this.setData({
      notificationVisible: false
    })
    
    if (this.data.currentEvent.id) {
      // 标记事件为已处理
      this.markAsHandled(this.data.currentEvent)
    }
  },
  
  // 开始监控
  startMonitoring() {
    // 记录开始监控的时间戳
    const now = Math.floor(Date.now() / 1000)
    
    this.setData({
      monitoring: true,
      monitoringStartTime: now // 更新监控开始时间
    })
    
    // 获取当前最大事件ID作为基准
    if (this.data.events.length > 0) {
      const maxId = Math.max(...this.data.events.map(event => event.id))
      this.setData({
        lastEventId: maxId
      })
    }
    
    // 设置定时器，每3秒检查一次
    const intervalId = setInterval(() => {
      this.fetchEvents()
    }, 3000)
    
    this.setData({
      monitorInterval: intervalId
    })
    
    // 立即更新一次
    this.fetchEvents()
    
    wx.showToast({
      title: '已开始实时监控',
      icon: 'success'
    })
  },
  
  // 停止监控
  stopMonitoring() {
    if (this.data.monitoring) {
      clearInterval(this.data.monitorInterval)
      
      this.setData({
        monitoring: false,
        monitorInterval: null
      })
      
      wx.showToast({
        title: '已停止监控',
        icon: 'none'
      })
    }
  },
  
  // 标记事件为已处理
  markAsHandled(e) {
    // 检查是否是事件对象还是event对象，处理两种情况
    let event = e;
    if (e && e.currentTarget && e.currentTarget.dataset) {
      event = e.currentTarget.dataset.event;
    }
    
    if (!event || !event.id) {
      console.error('无效的事件数据', event);
      return;
    }
    
    this.setData({
      loading: true
    })
    
    // 在UI中先标记处理状态
    const events = this.data.events.map(item => {
      if (item.id === event.id) {
        return { ...item, handling: true }
      }
      return item
    })
    
    this.setData({ events })
    
    // 发送处理请求
    util.request(`/api/events/${event.id}/handle`, 'POST')
      .then(() => {
        // 更新本地事件状态
        const updatedEvents = this.data.events.map(item => {
          if (item.id === event.id) {
            return { ...item, handled: 1, handling: false }
          }
          return item
        })
        
        this.setData({
          events: updatedEvents,
          loading: false
        })
        
        // 更新统计
        this.updateStatistics()
        
        wx.showToast({
          title: `事件 #${event.id} 已处理`,
          icon: 'success'
        })
      })
      .catch(error => {
        console.error('标记事件失败', error)
        
        // 恢复原始状态
        const revertedEvents = this.data.events.map(item => {
          if (item.id === event.id) {
            return { ...item, handling: false }
          }
          return item
        })
        
        this.setData({
          events: revertedEvents,
          loading: false
        })
        
        wx.showToast({
          title: '标记失败，请重试',
          icon: 'none'
        })
      })
  },
  
  // 刷新数据
  refreshData() {
    this.fetchEvents()
  },
  
  // 测试通知
  testNotification() {
    const testEvent = {
      id: 0,
      location: '测试地点',
      risk_level: 'high',
      confidence: 0.95,
      timestamp: Math.floor(Date.now() / 1000),
      formattedTime: util.formatTime(new Date()),
      handled: 0
    }
    
    this.showEventNotification(testEvent)
  },
  
  // 关闭通知弹窗
  closeNotification() {
    this.setData({
      notificationVisible: false
    })
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