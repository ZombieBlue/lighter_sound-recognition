const util = require('../../utils/util.js')
const wxCharts = require('../../utils/wxcharts.js')

let dailyTrendChart = null
let hourlyDistributionChart = null
let deviceDistributionChart = null
let confidenceDistributionChart = null
let locationDistributionChart = null
let riskLevelChart = null

// 添加重试计数器和最大重试次数
let chartInitRetryCount = 0;
const MAX_RETRY_COUNT = 3;

Page({
  data: {
    loading: false,
    timeRange: '7',
    statistics: {
      todayCount: 0,
      weekCount: 0,
      avgConfidence: 0
    },
    windowWidth: 320,
    events: []
  },

  onLoad() {
    const systemInfo = wx.getSystemInfoSync()
    this.setData({
      windowWidth: systemInfo.windowWidth
    })
    
    this.fetchEvents()
  },
  
  onShow() {
    if (this.data.events.length === 0) {
      this.fetchEvents()
    }
    // 更新tabbar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      })
    }
  },
  
  onReady() {
    // 页面初次渲染完成，准备图表
    // 不再使用setTimeout，改为在数据加载完成后初始化图表
  },
  
  // 获取事件数据
  fetchEvents() {
    this.setData({
      loading: true
    })
    
    util.request('/api/events?limit=1000')
      .then(data => {
        this.setData({
          events: data
        })
        this.processData(data)
      })
      .catch(error => {
        console.error('获取事件数据失败', error)
        this.setData({
          loading: false
        })
        
        wx.showToast({
          title: '获取数据失败',
          icon: 'none'
        })
      })
  },
  
  // 处理事件数据
  processData(events) {
    if (!events || events.length === 0) {
      wx.showToast({
        title: '暂无检测事件数据',
        icon: 'none',
        duration: 2000
      })
      
      // 更新统计数据为0
      this.setData({
        'statistics.todayCount': 0,
        'statistics.weekCount': 0,
        'statistics.avgConfidence': 0,
        loading: false
      })
      
      // 创建空数据图表
      this.initEmptyCharts()
      
      return
    }
    
    // 计算统计数据
    this.calculateStatistics(events)
    
    // 更新图表
    if (dailyTrendChart) {
      this.updateCharts(events)
    } else {
      // 确保页面已经准备好再初始化图表
      wx.nextTick(() => {
        this.initCharts(events)
      })
    }
    
    this.setData({
      loading: false
    })
  },
  
  // 计算基础统计数据
  calculateStatistics(events) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000
    const weekStart = today - 6 * 24 * 60 * 60 // 简化为过去7天
    
    // 今日计数
    const todayEvents = events.filter(event => event.timestamp >= today)
    
    // 本周计数
    const weekEvents = events.filter(event => event.timestamp >= weekStart)
    
    // 平均置信度
    let avgConfidence = 0
    if (events.length > 0) {
      const sumConfidence = events.reduce((sum, event) => sum + event.confidence, 0)
      avgConfidence = (sumConfidence / events.length * 100).toFixed(1)
    }
    
    this.setData({
      'statistics.todayCount': todayEvents.length,
      'statistics.weekCount': weekEvents.length,
      'statistics.avgConfidence': avgConfidence
    })
  },
  
  // 初始化图表
  initCharts(events) {
    const { windowWidth } = this.data
    const chartWidth = windowWidth - 40
    
    // 如果没有数据，创建空图表
    if (!events || events.length === 0) {
      events = []
    }
    
    try {
      // 重置重试计数
      chartInitRetryCount = 0;
      this.tryInitCharts(events, chartWidth);
    } catch (error) {
      console.error('初始化图表失败', error)
      wx.showToast({
        title: '图表初始化失败',
        icon: 'none'
      })
    }
  },
  
  // 尝试初始化图表的方法，带有重试机制
  tryInitCharts(events, chartWidth) {
    // 使用setTimeout确保页面上的canvas元素已经渲染完成
    setTimeout(() => {
      const query = wx.createSelectorQuery()
      query.select('#dailyTrendChart').boundingClientRect()
      query.exec((res) => {
        // 检查canvas是否在视图中
        if (res && res[0]) {
          // canvas存在，初始化图表
          try {
            this.createDailyTrendChart(events, chartWidth)
            this.createHourlyDistributionChart(events, chartWidth)
            this.createDeviceDistributionChart(events, chartWidth)
            this.createConfidenceDistributionChart(events, chartWidth)
            this.createLocationDistributionChart(events, chartWidth)
            this.createRiskLevelChart(events, chartWidth)
            
            console.log('图表初始化成功')
            // 重置重试计数
            chartInitRetryCount = 0;
          } catch (error) {
            console.error('图表创建失败：', error);
            this.handleChartInitError(events, chartWidth);
          }
        } else {
          // canvas不存在，进行重试
          this.handleChartInitError(events, chartWidth);
        }
      })
    }, 100 + chartInitRetryCount * 200) // 随着重试次数增加等待时间
  },
  
  // 处理图表初始化错误
  handleChartInitError(events, chartWidth) {
    chartInitRetryCount++;
    console.warn(`Canvas元素不存在或图表创建失败，第${chartInitRetryCount}次重试`);
    
    if (chartInitRetryCount < MAX_RETRY_COUNT) {
      // 延迟再次尝试
      this.tryInitCharts(events, chartWidth);
    } else {
      console.error(`重试${MAX_RETRY_COUNT}次后仍然无法初始化图表`);
      wx.showToast({
        title: '图表加载失败，请刷新重试',
        icon: 'none',
        duration: 2000
      });
    }
  },
  
  // 更新图表
  updateCharts(events) {
    try {
      this.updateDailyTrendChart(events)
      this.updateHourlyDistributionChart(events)
      this.updateDeviceDistributionChart(events)
      this.updateConfidenceDistributionChart(events)
      this.updateLocationDistributionChart(events)
      this.updateRiskLevelChart(events)
    } catch (error) {
      console.error('更新图表失败', error)
    }
  },
  
  // 日趋势图表
  createDailyTrendChart(events, width) {
    const days = parseInt(this.data.timeRange || '7')
    const { dateLabels, dateCounts } = this.getDailyTrendData(events, days)
    
    dailyTrendChart = new wxCharts({
      canvasId: 'dailyTrendChart',
      type: 'line',
      categories: dateLabels,
      series: [{
        name: '检测次数',
        data: dateCounts,
        format: function (val) {
          return val;
        }
      }],
      yAxis: {
        title: '检测次数',
        format: function (val) {
          return val;
        },
        min: 0
      },
      width: width,
      height: 200
    })
  },
  
  // 获取日趋势数据
  getDailyTrendData(events, days) {
    const dateLabels = []
    const dateCounts = []
    
    // 创建日期范围
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      const dateLabel = `${date.getMonth() + 1}-${date.getDate()}`
      dateLabels.push(dateLabel)
      
      // 计算当天事件
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 1000
      const dayEnd = dayStart + 24 * 60 * 60
      
      const count = events.filter(event => 
        event.timestamp >= dayStart && event.timestamp < dayEnd
      ).length
      
      dateCounts.push(count)
    }
    
    return { dateLabels, dateCounts }
  },
  
  // 更新日趋势图表
  updateDailyTrendChart(events) {
    const days = parseInt(this.data.timeRange)
    const { dateLabels, dateCounts } = this.getDailyTrendData(events, days)
    
    dailyTrendChart.updateData({
      categories: dateLabels,
      series: [{
        name: '检测次数',
        data: dateCounts
      }]
    })
  },
  
  // 时段分布图表
  createHourlyDistributionChart(events, width) {
    const { hourLabels, hourCounts } = this.getHourlyDistributionData(events)
    
    hourlyDistributionChart = new wxCharts({
      canvasId: 'hourlyDistributionChart',
      type: 'column',
      categories: hourLabels,
      series: [{
        name: '检测次数',
        data: hourCounts
      }],
      yAxis: {
        title: '检测次数',
        min: 0
      },
      width: width,
      height: 200
    })
  },
  
  // 获取时段分布数据
  getHourlyDistributionData(events) {
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const hourLabels = hours.map(hour => `${hour}`)
    const hourCounts = Array(24).fill(0)
    
    // 统计每小时事件
    events.forEach(event => {
      const hour = new Date(event.timestamp * 1000).getHours()
      hourCounts[hour]++
    })
    
    return { hourLabels, hourCounts }
  },
  
  // 更新时段分布图表
  updateHourlyDistributionChart(events) {
    const { hourLabels, hourCounts } = this.getHourlyDistributionData(events)
    
    hourlyDistributionChart.updateData({
      categories: hourLabels,
      series: [{
        name: '检测次数',
        data: hourCounts
      }]
    })
  },
  
  // 设备分布图表
  createDeviceDistributionChart(events, width) {
    const deviceData = this.getDeviceDistributionData(events)
    
    deviceDistributionChart = new wxCharts({
      canvasId: 'deviceDistributionChart',
      type: 'pie',
      series: deviceData,
      width: width,
      height: 200,
      dataLabel: true
    })
  },
  
  // 获取设备分布数据
  getDeviceDistributionData(events) {
    // 按设备ID统计
    const deviceCounts = {}
    
    events.forEach(event => {
      const deviceId = event.device_id || '未知设备'
      deviceCounts[deviceId] = (deviceCounts[deviceId] || 0) + 1
    })
    
    return Object.entries(deviceCounts).map(([name, data]) => ({ name, data }))
  },
  
  // 更新设备分布图表
  updateDeviceDistributionChart(events) {
    const deviceData = this.getDeviceDistributionData(events)
    deviceDistributionChart.updateData({ series: deviceData })
  },
  
  // 置信度分布图表
  createConfidenceDistributionChart(events, width) {
    const confidenceData = this.getConfidenceDistributionData(events)
    
    confidenceDistributionChart = new wxCharts({
      canvasId: 'confidenceDistributionChart',
      type: 'pie',
      series: confidenceData,
      width: width,
      height: 200,
      dataLabel: true
    })
  },
  
  // 获取置信度分布数据
  getConfidenceDistributionData(events) {
    // 定义置信度范围
    const ranges = [
      { min: 0, max: 0.2, label: '0-20%' },
      { min: 0.2, max: 0.4, label: '20-40%' },
      { min: 0.4, max: 0.6, label: '40-60%' },
      { min: 0.6, max: 0.8, label: '60-80%' },
      { min: 0.8, max: 1, label: '80-100%' }
    ]
    
    return ranges.map(range => ({
      name: range.label,
      data: events.filter(event => 
        event.confidence >= range.min && event.confidence < range.max
      ).length
    }))
  },
  
  // 更新置信度分布图表
  updateConfidenceDistributionChart(events) {
    const confidenceData = this.getConfidenceDistributionData(events)
    confidenceDistributionChart.updateData({ series: confidenceData })
  },
  
  // 地点分布图表
  createLocationDistributionChart(events, width) {
    const locationData = this.getLocationDistributionData(events)
    
    locationDistributionChart = new wxCharts({
      canvasId: 'locationDistributionChart',
      type: 'pie',
      series: locationData,
      width: width,
      height: 200,
      dataLabel: true
    })
  },
  
  // 获取地点分布数据
  getLocationDistributionData(events) {
    // 按地点统计
    const locationCounts = {}
    
    events.forEach(event => {
      const location = event.location || '未知'
      locationCounts[location] = (locationCounts[location] || 0) + 1
    })
    
    return Object.entries(locationCounts).map(([name, data]) => ({ name, data }))
  },
  
  // 更新地点分布图表
  updateLocationDistributionChart(events) {
    const locationData = this.getLocationDistributionData(events)
    locationDistributionChart.updateData({ series: locationData })
  },
  
  // 风险级别图表
  createRiskLevelChart(events, width) {
    const riskData = this.getRiskLevelData(events)
    
    riskLevelChart = new wxCharts({
      canvasId: 'riskLevelChart',
      type: 'pie',
      series: riskData,
      width: width,
      height: 200,
      dataLabel: true
    })
  },
  
  // 获取风险级别数据
  getRiskLevelData(events) {
    // 风险级别统计
    const riskLevels = {
      'high': '高风险',
      'medium': '中风险',
      'low': '低风险',
      'unknown': '未知风险'
    }
    
    const result = []
    
    Object.entries(riskLevels).forEach(([key, label]) => {
      const count = events.filter(event => 
        (event.risk_level || 'unknown').toLowerCase() === key
      ).length
      
      if (count > 0) {
        result.push({
          name: label,
          data: count
        })
      }
    })
    
    return result
  },
  
  // 更新风险级别图表
  updateRiskLevelChart(events) {
    const riskData = this.getRiskLevelData(events)
    riskLevelChart.updateData({ series: riskData })
  },
  
  // 刷新数据
  refreshData() {
    // 清除旧图表实例
    dailyTrendChart = null;
    hourlyDistributionChart = null;
    deviceDistributionChart = null;
    confidenceDistributionChart = null;
    locationDistributionChart = null;
    riskLevelChart = null;
    
    // 显示加载提示
    wx.showLoading({
      title: '正在刷新数据',
      mask: true
    })
    
    // 获取新数据
    this.fetchEvents();
    
    // 添加成功提示
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '数据已更新',
        icon: 'success'
      });
    }, 500);
  },
  
  // 处理时间范围变更
  handleTimeRangeChange(e) {
    const value = e.detail.value
    const range = value === '0' ? '7' : '30'
    
    this.setData({
      timeRange: range
    })
    
    // 更新图表
    if (this.data.events.length > 0) {
      // 仅更新日趋势图表
      const { windowWidth } = this.data
      const chartWidth = windowWidth - 40
      
      // 先销毁旧的图表以避免出现问题
      if (dailyTrendChart) {
        dailyTrendChart = null
      }
      
      // 创建新的图表
      wx.nextTick(() => {
        this.createDailyTrendChart(this.data.events, chartWidth)
      })
    }
  },
  
  // 初始化空数据的图表
  initEmptyCharts() {
    const { windowWidth } = this.data
    const chartWidth = windowWidth - 40
    
    // 创建空数据提示
    const noDataText = '暂无数据'
    
    try {
      // 空日趋势图表
      dailyTrendChart = new wxCharts({
        canvasId: 'dailyTrendChart',
        type: 'line',
        categories: ['暂无数据'],
        series: [{
          name: '检测次数',
          data: [0],
          format: function (val) {
            return val;
          }
        }],
        yAxis: {
          title: '检测次数',
          format: function (val) {
            return val;
          },
          min: 0
        },
        width: chartWidth,
        height: 200,
        dataLabel: false,
        legend: false,
        extra: {
          lineStyle: 'curve'
        }
      });
      
      // 空小时图表
      hourlyDistributionChart = new wxCharts({
        canvasId: 'hourlyDistributionChart',
        type: 'column',
        categories: ['暂无数据'],
        series: [{
          name: '检测次数',
          data: [0]
        }],
        yAxis: {
          title: '检测次数',
          min: 0
        },
        width: chartWidth,
        height: 200
      });
      
      // 其他图表也使用相似的空数据创建
      deviceDistributionChart = new wxCharts({
        canvasId: 'deviceDistributionChart',
        type: 'pie',
        series: [{
          name: '暂无数据',
          data: 1
        }],
        width: chartWidth,
        height: 200,
        dataLabel: true
      });
      
      confidenceDistributionChart = new wxCharts({
        canvasId: 'confidenceDistributionChart',
        type: 'pie',
        series: [{
          name: '暂无数据',
          data: 1
        }],
        width: chartWidth,
        height: 200,
        dataLabel: true
      });
      
      locationDistributionChart = new wxCharts({
        canvasId: 'locationDistributionChart',
        type: 'pie',
        series: [{
          name: '暂无数据',
          data: 1
        }],
        width: chartWidth,
        height: 200,
        dataLabel: true
      });
      
      riskLevelChart = new wxCharts({
        canvasId: 'riskLevelChart',
        type: 'pie',
        series: [{
          name: '暂无数据',
          data: 1
        }],
        width: chartWidth,
        height: 200,
        dataLabel: true
      });
      
    } catch (error) {
      console.error('初始化空图表失败', error);
    }
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