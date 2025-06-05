const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('-')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

// 格式化时间戳
const formatTimestamp = timestamp => {
  return formatTime(new Date(timestamp * 1000))
}

// 获取风险级别标签类型
const getRiskLevelType = riskLevel => {
  switch(riskLevel?.toLowerCase()) {
    case 'high': return 'danger'
    case 'medium': return 'warning'
    case 'low': return 'success'
    default: return 'info'
  }
}

// 格式化风险级别显示
const formatRiskLevel = riskLevel => {
  switch(riskLevel?.toLowerCase()) {
    case 'high': return '高风险'
    case 'medium': return '中风险'
    case 'low': return '低风险'
    default: return '未知'
  }
}

// 获取置信度颜色
const getConfidenceColor = confidence => {
  if (confidence >= 0.8) return '#67C23A'
  if (confidence >= 0.6) return '#E6A23C'
  return '#F56C6C'
}

// 格式化置信度显示
const formatConfidence = percentage => {
  return `${percentage.toFixed(1)}%`
}

// 请求接口封装
const request = (url, method = 'GET', data = {}) => {
  return new Promise((resolve, reject) => {
    const app = getApp()
    
    wx.request({
      url: `${app.globalData.serverUrl}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json'
      },
      success: res => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          wx.showToast({
            title: `请求失败：${res.statusCode}`,
            icon: 'none'
          })
          reject(res)
        }
      },
      fail: err => {
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        })
        reject(err)
      }
    })
  })
}

module.exports = {
  formatTime,
  formatTimestamp,
  getRiskLevelType,
  formatRiskLevel,
  getConfidenceColor,
  formatConfidence,
  request
} 