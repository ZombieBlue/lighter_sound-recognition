<template>
  <div class="analytics">
    <div class="page-header">
      <h2>打火机声音事件数据分析</h2>
      <el-button type="primary" @click="refreshData">
        <el-icon><Refresh /></el-icon>
        刷新数据
      </el-button>
    </div>
    
    <div class="dashboard-container">
      <el-row :gutter="20">
        <el-col :xs="24" :md="8">
          <el-card class="data-card">
            <template #header>
              <div class="card-header">
                <span>今日检测总数</span>
              </div>
            </template>
            <div class="data-value" v-loading="loading">
              <span class="number">{{ statistics.todayCount }}</span>
              <span class="label">事件</span>
            </div>
          </el-card>
        </el-col>
        
        <el-col :xs="24" :md="8">
          <el-card class="data-card">
            <template #header>
              <div class="card-header">
                <span>本周检测总数</span>
              </div>
            </template>
            <div class="data-value" v-loading="loading">
              <span class="number">{{ statistics.weekCount }}</span>
              <span class="label">事件</span>
            </div>
          </el-card>
        </el-col>
        
        <el-col :xs="24" :md="8">
          <el-card class="data-card">
            <template #header>
              <div class="card-header">
                <span>平均置信度</span>
              </div>
            </template>
            <div class="data-value" v-loading="loading">
              <span class="number">{{ statistics.avgConfidence }}%</span>
              <span class="label">平均</span>
            </div>
          </el-card>
        </el-col>
      </el-row>
      
      <el-row :gutter="20" class="chart-row">
        <el-col :xs="24" :lg="12">
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">
                <span>每日检测数量趋势</span>
                <el-radio-group v-model="timeRange" size="small" @change="refreshData">
                  <el-radio-button label="7">最近7天</el-radio-button>
                  <el-radio-button label="30">最近30天</el-radio-button>
                </el-radio-group>
              </div>
            </template>
            <div class="chart-container" ref="dailyTrendChart" v-loading="loading"></div>
          </el-card>
        </el-col>
        
        <el-col :xs="24" :lg="12">
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">
                <span>每小时检测分布</span>
              </div>
            </template>
            <div class="chart-container" ref="hourlyDistributionChart" v-loading="loading"></div>
          </el-card>
        </el-col>
      </el-row>
      
      <el-row :gutter="20" class="chart-row">
        <el-col :xs="24" :lg="12">
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">
                <span>设备检测分布</span>
              </div>
            </template>
            <div class="chart-container" ref="deviceDistributionChart" v-loading="loading"></div>
          </el-card>
        </el-col>
        
        <el-col :xs="24" :lg="12">
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">
                <span>置信度分布</span>
              </div>
            </template>
            <div class="chart-container" ref="confidenceDistributionChart" v-loading="loading"></div>
          </el-card>
        </el-col>
      </el-row>
      
      <el-row :gutter="20" class="chart-row">
        <el-col :xs="24" :lg="12">
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">
                <span>检测地点分布</span>
              </div>
            </template>
            <div class="chart-container" ref="locationDistributionChart" v-loading="loading"></div>
          </el-card>
        </el-col>
        
        <el-col :xs="24" :lg="12">
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">
                <span>风险级别分析</span>
              </div>
            </template>
            <div class="chart-container" ref="riskLevelChart" v-loading="loading"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { format, subDays, startOfDay, endOfDay, startOfWeek } from 'date-fns'

export default {
  name: 'Analytics',
  components: {
    Refresh
  },
  setup() {
    const loading = ref(false)
    const timeRange = ref('7')
    const statistics = reactive({
      todayCount: 0,
      weekCount: 0,
      avgConfidence: 0
    })
    
    // Chart references
    const dailyTrendChart = ref(null)
    const hourlyDistributionChart = ref(null)
    const deviceDistributionChart = ref(null)
    const confidenceDistributionChart = ref(null)
    const locationDistributionChart = ref(null)
    const riskLevelChart = ref(null)
    
    // Chart instances
    let dailyTrendChartInstance = null
    let hourlyDistributionChartInstance = null
    let deviceDistributionChartInstance = null
    let confidenceDistributionChartInstance = null
    let locationDistributionChartInstance = null
    let riskLevelChartInstance = null
    
    // Get all events
    const fetchEvents = async () => {
      loading.value = true
      try {
        const response = await axios.get('/api/events?limit=1000')
        processData(response.data)
      } catch (error) {
        console.error('获取事件数据失败:', error)
        ElMessage.error('获取事件数据失败，请稍后重试')
      } finally {
        loading.value = false
      }
    }
    
    // Process event data for charts
    const processData = (events) => {
      if (!events || events.length === 0) {
        ElMessage.warning('暂无检测事件数据')
        return
      }
      
      // Calculate statistics
      calculateStatistics(events)
      
      // Init and update charts
      initCharts()
      updateCharts(events)
    }
    
    // Calculate basic statistics
    const calculateStatistics = (events) => {
      const now = new Date()
      const today = startOfDay(now)
      const startOfWeekDate = startOfWeek(now)
      
      // Today's count
      const todayEvents = events.filter(event => 
        new Date(event.timestamp * 1000) >= today
      )
      statistics.todayCount = todayEvents.length
      
      // Week's count
      const weekEvents = events.filter(event => 
        new Date(event.timestamp * 1000) >= startOfWeekDate
      )
      statistics.weekCount = weekEvents.length
      
      // Average confidence
      if (events.length > 0) {
        const sumConfidence = events.reduce((sum, event) => sum + event.confidence, 0)
        statistics.avgConfidence = ((sumConfidence / events.length) * 100).toFixed(1)
      } else {
        statistics.avgConfidence = 0
      }
    }
    
    // Initialize chart instances
    const initCharts = () => {
      // Daily trend chart
      if (!dailyTrendChartInstance) {
        dailyTrendChartInstance = echarts.init(dailyTrendChart.value)
      }
      
      // Hourly distribution chart
      if (!hourlyDistributionChartInstance) {
        hourlyDistributionChartInstance = echarts.init(hourlyDistributionChart.value)
      }
      
      // Device distribution chart
      if (!deviceDistributionChartInstance) {
        deviceDistributionChartInstance = echarts.init(deviceDistributionChart.value)
      }
      
      // Confidence distribution chart
      if (!confidenceDistributionChartInstance) {
        confidenceDistributionChartInstance = echarts.init(confidenceDistributionChart.value)
      }
      
      // Location distribution chart
      if (!locationDistributionChartInstance) {
        locationDistributionChartInstance = echarts.init(locationDistributionChart.value)
      }
      
      // Risk level chart
      if (!riskLevelChartInstance) {
        riskLevelChartInstance = echarts.init(riskLevelChart.value)
      }
      
      window.addEventListener('resize', resizeCharts)
    }
    
    // Update charts with data
    const updateCharts = (events) => {
      updateDailyTrendChart(events)
      updateHourlyDistributionChart(events)
      updateDeviceDistributionChart(events)
      updateConfidenceDistributionChart(events)
      updateLocationDistributionChart(events)
      updateRiskLevelChart(events)
    }
    
    // Update daily trend chart
    const updateDailyTrendChart = (events) => {
      const days = parseInt(timeRange.value)
      const dateLabels = []
      const dateCounts = []
      
      // Create date range
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i)
        const dateLabel = format(date, 'MM-dd')
        dateLabels.push(dateLabel)
        
        // Count events for this day
        const dayStart = startOfDay(date).getTime() / 1000
        const dayEnd = endOfDay(date).getTime() / 1000
        
        const count = events.filter(event => 
          event.timestamp >= dayStart && event.timestamp <= dayEnd
        ).length
        
        dateCounts.push(count)
      }
      
      const option = {
        tooltip: {
          trigger: 'axis',
          formatter: '{b}: {c} 次检测'
        },
        xAxis: {
          type: 'category',
          data: dateLabels,
          axisLabel: {
            rotate: 45
          }
        },
        yAxis: {
          type: 'value',
          minInterval: 1
        },
        series: [
          {
            name: '检测次数',
            type: 'line',
            data: dateCounts,
            smooth: true,
            lineStyle: {
              width: 3,
              color: '#409EFF'
            },
            itemStyle: {
              color: '#409EFF'
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(64, 158, 255, 0.7)' },
                { offset: 1, color: 'rgba(64, 158, 255, 0.1)' }
              ])
            }
          }
        ],
        grid: {
          left: '3%',
          right: '4%',
          bottom: '10%',
          top: '10%',
          containLabel: true
        }
      }
      
      dailyTrendChartInstance.setOption(option)
    }
    
    // Update hourly distribution chart
    const updateHourlyDistributionChart = (events) => {
      const hours = Array.from({ length: 24 }, (_, i) => i)
      const hourLabels = hours.map(hour => `${hour}:00`)
      const hourCounts = Array(24).fill(0)
      
      // Count events per hour
      events.forEach(event => {
        const hour = new Date(event.timestamp * 1000).getHours()
        hourCounts[hour]++
      })
      
      const option = {
        tooltip: {
          trigger: 'axis',
          formatter: '{b}: {c} 次检测'
        },
        xAxis: {
          type: 'category',
          data: hourLabels,
        },
        yAxis: {
          type: 'value',
          minInterval: 1
        },
        series: [
          {
            name: '每小时检测',
            type: 'bar',
            data: hourCounts,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#83bff6' },
                { offset: 0.5, color: '#409EFF' },
                { offset: 1, color: '#2a6cc6' }
              ])
            }
          }
        ],
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '3%',
          containLabel: true
        }
      }
      
      hourlyDistributionChartInstance.setOption(option)
    }
    
    // Update device distribution chart
    const updateDeviceDistributionChart = (events) => {
      // Count by device ID
      const deviceCounts = {}
      
      events.forEach(event => {
        const deviceId = event.device_id || '未知设备'
        deviceCounts[deviceId] = (deviceCounts[deviceId] || 0) + 1
      })
      
      const deviceData = Object.entries(deviceCounts).map(([name, value]) => ({ name, value }))
      
      const option = {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c} 次 ({d}%)'
        },
        legend: {
          orient: 'vertical',
          right: 10,
          top: 'center',
          type: 'scroll'
        },
        series: [
          {
            name: '设备分布',
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 10,
              borderColor: '#fff',
              borderWidth: 2
            },
            label: {
              show: false,
              position: 'center'
            },
            emphasis: {
              label: {
                show: true,
                fontSize: '16',
                fontWeight: 'bold'
              }
            },
            labelLine: {
              show: false
            },
            data: deviceData
          }
        ]
      }
      
      deviceDistributionChartInstance.setOption(option)
    }
    
    // Update confidence distribution chart
    const updateConfidenceDistributionChart = (events) => {
      // Define confidence ranges
      const ranges = [
        { min: 0, max: 0.2, label: '0-20%' },
        { min: 0.2, max: 0.4, label: '20-40%' },
        { min: 0.4, max: 0.6, label: '40-60%' },
        { min: 0.6, max: 0.8, label: '60-80%' },
        { min: 0.8, max: 1, label: '80-100%' }
      ]
      
      const confidenceCounts = ranges.map(range => ({
        name: range.label,
        value: events.filter(event => 
          event.confidence >= range.min && event.confidence < range.max
        ).length
      }))
      
      const option = {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c} 次 ({d}%)'
        },
        legend: {
          bottom: '0%',
          left: 'center'
        },
        color: ['#F56C6C', '#E6A23C', '#909399', '#67C23A', '#409EFF'],
        series: [
          {
            name: '置信度分布',
            type: 'pie',
            radius: '70%',
            center: ['50%', '45%'],
            data: confidenceCounts,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            label: {
              formatter: '{b}: {c} 次'
            }
          }
        ]
      }
      
      confidenceDistributionChartInstance.setOption(option)
    }
    
    // Update location distribution chart
    const updateLocationDistributionChart = (events) => {
      // Group by location
      const locationCounts = {}
      events.forEach(event => {
        const location = event.location || '未知'
        locationCounts[location] = (locationCounts[location] || 0) + 1
      })
      
      // Convert to arrays for chart
      const locations = Object.keys(locationCounts)
      const counts = Object.values(locationCounts)
      
      const option = {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c} ({d}%)'
        },
        legend: {
          type: 'scroll',
          orient: 'vertical',
          right: 10,
          top: 20,
          bottom: 20,
          data: locations
        },
        series: [
          {
            name: '检测地点',
            type: 'pie',
            radius: '55%',
            center: ['40%', '50%'],
            data: locations.map((name, index) => ({ name, value: counts[index] })),
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }
        ]
      }
      
      locationDistributionChartInstance.setOption(option)
    }
    
    // Update risk level chart 
    const updateRiskLevelChart = (events) => {
      // Group by risk level and location
      const riskData = []
      const locationSet = new Set()
      const riskLevels = ['high', 'medium', 'low', 'unknown']
      
      // Get all unique locations
      events.forEach(event => {
        locationSet.add(event.location || '未知')
      })
      
      const locations = Array.from(locationSet)
      
      // Process data for stacked bar chart
      riskLevels.forEach(risk => {
        const riskName = formatRiskLevel(risk)
        const locationData = []
        
        locations.forEach(location => {
          const count = events.filter(e => 
            (e.location || '未知') === location && 
            (e.risk_level || 'unknown').toLowerCase() === risk
          ).length
          
          locationData.push(count)
        })
        
        if (locationData.some(val => val > 0)) {
          riskData.push({
            name: riskName,
            type: 'bar',
            stack: '总量',
            label: {
              show: true,
              position: 'insideRight'
            },
            data: locationData
          })
        }
      })
      
      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        legend: {
          data: riskData.map(item => item.name)
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'value'
        },
        yAxis: {
          type: 'category',
          data: locations
        },
        series: riskData
      }
      
      riskLevelChartInstance.setOption(option)
    }
    
    const formatRiskLevel = (riskLevel) => {
      switch(riskLevel?.toLowerCase()) {
        case 'high': return '高风险'
        case 'medium': return '中风险'
        case 'low': return '低风险'
        default: return '未知风险'
      }
    }
    
    // Resize all charts
    const resizeCharts = () => {
      dailyTrendChartInstance?.resize()
      hourlyDistributionChartInstance?.resize()
      deviceDistributionChartInstance?.resize()
      confidenceDistributionChartInstance?.resize()
      locationDistributionChartInstance?.resize()
      riskLevelChartInstance?.resize()
    }
    
    const refreshData = () => {
      fetchEvents()
    }
    
    onMounted(() => {
      fetchEvents()
    })
    
    onUnmounted(() => {
      window.removeEventListener('resize', resizeCharts)
      dailyTrendChartInstance && dailyTrendChartInstance.dispose()
      hourlyDistributionChartInstance && hourlyDistributionChartInstance.dispose()
      deviceDistributionChartInstance && deviceDistributionChartInstance.dispose()
      confidenceDistributionChartInstance && confidenceDistributionChartInstance.dispose()
      locationDistributionChartInstance && locationDistributionChartInstance.dispose()
      riskLevelChartInstance && riskLevelChartInstance.dispose()
    })
    
    return {
      loading,
      timeRange,
      statistics,
      dailyTrendChart,
      hourlyDistributionChart,
      deviceDistributionChart,
      confidenceDistributionChart,
      locationDistributionChart,
      riskLevelChart,
      refreshData
    }
  }
}
</script>

<style scoped>
.analytics {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: var(--text-color);
}

.dashboard-container {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.data-card {
  margin-bottom: 20px;
  height: 180px;
}

.data-value {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100px;
}

.data-value .number {
  font-size: 36px;
  font-weight: 600;
  color: #409EFF;
}

.data-value .label {
  margin-top: 10px;
  color: var(--text-color-secondary);
}

.chart-row {
  margin-bottom: 20px;
}

.chart-card {
  margin-bottom: 20px;
}

.chart-container {
  height: 350px;
}
</style> 