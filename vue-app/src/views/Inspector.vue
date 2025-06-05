<template>
  <div class="inspector-view">
    <div class="page-header">
      <h2>巡检员监控页面</h2>
      <div class="monitor-controls">
        <div class="monitor-status" :class="{ active: monitoring }"></div>
        <el-button type="primary" @click="startMonitoring" v-if="!monitoring">
          <el-icon><VideoPlay /></el-icon>
          开始监控
        </el-button>
        <el-button type="danger" @click="stopMonitoring" v-else>
          <el-icon><VideoPause /></el-icon>
          停止监控
        </el-button>
      </div>
    </div>
    
    <el-row :gutter="20">
      <el-col :xs="24" :md="12">
        <el-card class="event-card">
          <template #header>
            <div class="card-header">
              <span>最近高风险事件</span>
              <el-tag type="success" v-if="monitoring">实时监控中</el-tag>
              <el-tag type="info" v-else>监控已停止</el-tag>
            </div>
          </template>
          
          <el-table 
            :data="recentHighRiskEvents" 
            style="width: 100%"
            v-loading="loading"
            element-loading-text="加载中..."
            empty-text="暂无高风险事件"
          >
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="formattedTime" label="时间" width="180" />
            <el-table-column prop="location" label="检测地点" width="120" />
            <el-table-column prop="confidence" label="置信度" width="120">
              <template #default="scope">
                <el-progress 
                  :percentage="scope.row.confidence * 100" 
                  :color="getConfidenceColor(scope.row.confidence)"
                  :format="formatConfidence"
                />
              </template>
            </el-table-column>
            <el-table-column prop="risk_level" label="风险级别" width="100">
              <template #default="scope">
                <el-tag 
                  :type="getRiskLevelType(scope.row.risk_level)" 
                  size="small"
                >
                  {{ formatRiskLevel(scope.row.risk_level) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="scope">
                <el-button 
                  size="small" 
                  type="primary" 
                  @click="markAsHandled(scope.row)"
                  :disabled="scope.row.handled === 1"
                  :loading="scope.row.handling"
                >
                  <span v-if="scope.row.handled === 1">已处理</span>
                  <span v-else-if="scope.row.handling">处理中</span>
                  <span v-else>标记处理</span>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :md="12">
        <el-card class="status-card">
          <template #header>
            <div class="card-header">
              <span>监控状态</span>
            </div>
          </template>
          
          <div class="status-info">
            <div class="status-item">
              <span class="label">监控状态：</span>
              <span class="value">
                <el-tag type="success" v-if="monitoring">监控中</el-tag>
                <el-tag type="info" v-else>已停止</el-tag>
              </span>
            </div>
            <div class="status-item">
              <span class="label">刷新间隔：</span>
              <span class="value">{{ monitoring ? '3秒' : '--' }}</span>
            </div>
            <div class="status-item">
              <span class="label">已处理事件：</span>
              <span class="value">{{ handledCount }}</span>
            </div>
            <div class="status-item">
              <span class="label">待处理事件：</span>
              <span class="value">{{ pendingCount }}</span>
            </div>
            <div class="status-item">
              <span class="label">最后更新：</span>
              <span class="value">{{ lastUpdateTime }}</span>
            </div>
          </div>
          
          <div class="latest-alert" v-if="lastNotification">
            <div class="alert-header">
              <h4>最新通知</h4>
              <span class="alert-time">{{ lastNotification.time }}</span>
            </div>
            <div class="alert-content">
              <div><strong>检测地点：</strong>{{ lastNotification.location }}</div>
              <div><strong>风险级别：</strong>{{ lastNotification.riskLevel }}</div>
              <div><strong>通知时间：</strong>{{ lastNotification.time }}</div>
            </div>
          </div>
          
          <div class="action-buttons">
            <el-button type="success" @click="refreshData" :disabled="loading">
              <el-icon><Refresh /></el-icon>
              刷新数据
            </el-button>
            <el-button type="warning" @click="testNotification">
              <el-icon><Bell /></el-icon>
              测试通知
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
  
  <!-- 高风险事件通知弹窗 -->
  <el-dialog
    v-model="notificationVisible"
    title="高风险事件预警"
    width="500px"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <div class="notification-content">
      <el-alert
        title="检测到高风险事件！"
        type="error"
        description="请立即前往检查"
        :closable="false"
        show-icon
      />
      
      <div class="event-details">
        <p><strong>检测地点：</strong>{{ currentEvent.location }}</p>
        <p><strong>风险级别：</strong>{{ formatRiskLevel(currentEvent.risk_level) }}</p>
        <p><strong>置信度：</strong>{{ formatConfidence(currentEvent.confidence * 100) }}</p>
        <p><strong>发生时间：</strong>{{ currentEvent.formattedTime }}</p>
      </div>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button type="primary" @click="acknowledgeNotification">确认并前往处理</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { VideoPlay, VideoPause, Refresh, Bell } from '@element-plus/icons-vue'
import { format } from 'date-fns'
import axios from 'axios'
import { ElMessage, ElNotification } from 'element-plus'

export default {
  name: 'Inspector',
  components: {
    VideoPlay,
    VideoPause,
    Refresh,
    Bell
  },
  setup() {
    const loading = ref(false)
    const events = ref([])
    const monitoring = ref(false)
    const monitorInterval = ref(null)
    const notificationVisible = ref(false)
    const currentEvent = ref({})
    const lastEventId = ref(0)
    const lastUpdateTime = ref('--')
    const lastNotification = ref(null)
    const monitoringStartTime = ref(0)
    
    // 过滤出高风险事件
    const recentHighRiskEvents = computed(() => {
      return events.value
        .filter(event => event.risk_level?.toLowerCase() === 'high')
        .sort((a, b) => b.timestamp - a.timestamp)
    })
    
    // 统计已处理和待处理事件
    const handledCount = computed(() => {
      return recentHighRiskEvents.value.filter(event => event.handled === 1).length
    })
    
    const pendingCount = computed(() => {
      return recentHighRiskEvents.value.filter(event => event.handled === 0).length
    })
    
    // 获取所有事件数据
    const fetchEvents = async () => {
      loading.value = true
      try {
        console.log(`[${format(new Date(), 'HH:mm:ss')}] 正在查询事件数据...`)
        const response = await axios.get('/api/events?limit=100')
        const formattedEvents = response.data.map(event => ({
          ...event,
          formattedTime: formatTimestamp(event.timestamp)
        }))
        
        events.value = formattedEvents
        
        // 检查是否有新的高风险事件
        checkForNewHighRiskEvents()
        
        // 更新最后更新时间
        lastUpdateTime.value = format(new Date(), 'yyyy-MM-dd HH:mm:ss')
        console.log(`[${format(new Date(), 'HH:mm:ss')}] 查询完成，获取到 ${response.data.length} 条事件`)
      } catch (error) {
        console.error('获取事件数据失败:', error)
        ElMessage.error('获取事件数据失败，请稍后重试')
      } finally {
        loading.value = false
      }
    }
    
    // 检查新的高风险事件
    const checkForNewHighRiskEvents = () => {
      if (!monitoring.value) return
      
      const highRiskEvents = events.value.filter(
        event => event.risk_level?.toLowerCase() === 'high' && event.handled === 0
      )
      
      // 找出ID大于上次检查的最新事件
      const newEvents = highRiskEvents.filter(event => event.id > lastEventId.value)
      
      if (newEvents.length > 0) {
        // 更新最后事件ID
        const maxId = Math.max(...newEvents.map(event => event.id))
        lastEventId.value = maxId
        
        // 只处理在监控开始后发生的事件
        const newEventsAfterMonitoring = newEvents.filter(event => {
          // 将事件时间戳与监控开始时间进行比较
          const eventTime = event.timestamp || 0
          return eventTime >= monitoringStartTime.value
        })
        
        // 如果有监控后的新事件，显示通知
        if (newEventsAfterMonitoring.length > 0) {
          // 显示最新的高风险事件通知
          showEventNotification(newEventsAfterMonitoring[0])
        }
      }
    }
    
    // 显示事件通知
    const showEventNotification = (event) => {
      currentEvent.value = event
      notificationVisible.value = true
      
      // 记录最后一条通知
      lastNotification.value = {
        location: event.location,
        riskLevel: formatRiskLevel(event.risk_level),
        time: format(new Date(), 'yyyy-MM-dd HH:mm:ss')
      }
      
      // 同时显示系统通知
      ElNotification({
        title: '高风险事件预警',
        message: `${event.location} 检测到高风险事件，置信度 ${formatConfidence(event.confidence * 100)}`,
        type: 'error',
        duration: 0
      })
    }
    
    // 确认通知
    const acknowledgeNotification = () => {
      notificationVisible.value = false
      
      if (currentEvent.value.id) {
        // 标记事件为已处理
        markAsHandled(currentEvent.value)
      }
    }
    
    // 标记事件为已处理
    const markAsHandled = async (event) => {
      try {
        loading.value = true
        
        // 先在UI中标记为正在处理
        const oldHandled = event.handled;
        event.handling = true;
        
        // 发送处理请求
        await axios.post(`/api/events/${event.id}/handle`)
        
        // 更新本地事件状态
        event.handled = 1
        event.handling = false
        
        // 更新统计
        ElMessage.success(`事件 #${event.id} 已标记为处理完成`)
      } catch (error) {
        console.error('标记事件失败:', error)
        
        // 恢复原始状态
        event.handled = oldHandled
        event.handling = false
        
        ElMessage.error('标记事件失败，请稍后重试')
      } finally {
        loading.value = false
      }
    }
    
    // 开始监控
    const startMonitoring = () => {
      // 记录开始监控的时间戳
      const now = Math.floor(Date.now() / 1000)
      monitoringStartTime.value = now
      
      monitoring.value = true
      
      // 获取当前最大事件ID作为基准
      if (events.value.length > 0) {
        const maxId = Math.max(...events.value.map(event => event.id))
        lastEventId.value = maxId
      }
      
      // 设置定时器，每3秒检查一次新事件
      monitorInterval.value = setInterval(() => {
        fetchEvents()
      }, 3000)
      
      // 立即获取一次
      fetchEvents()
      
      ElMessage.success('已开始实时监控高风险事件')
    }
    
    // 停止监控
    const stopMonitoring = () => {
      monitoring.value = false
      
      if (monitorInterval.value) {
        clearInterval(monitorInterval.value)
        monitorInterval.value = null
      }
      
      ElMessage.warning('已停止实时监控')
    }
    
    // 刷新数据
    const refreshData = () => {
      fetchEvents()
    }
    
    // 测试通知
    const testNotification = () => {
      const testEvent = {
        id: 0,
        location: '测试地点',
        risk_level: 'high',
        confidence: 0.95,
        timestamp: Math.floor(Date.now() / 1000),
        formattedTime: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        handled: 0
      }
      
      showEventNotification(testEvent)
    }
    
    // 格式化时间戳
    const formatTimestamp = (timestamp) => {
      return format(new Date(timestamp * 1000), 'yyyy-MM-dd HH:mm:ss')
    }
    
    // 获取置信度颜色
    const getConfidenceColor = (confidence) => {
      if (confidence >= 0.8) return '#67C23A'
      if (confidence >= 0.6) return '#E6A23C'
      return '#F56C6C'
    }
    
    // 格式化置信度显示
    const formatConfidence = (percentage) => {
      return `${percentage.toFixed(1)}%`
    }
    
    // 获取风险级别标签类型
    const getRiskLevelType = (riskLevel) => {
      switch(riskLevel?.toLowerCase()) {
        case 'high': return 'danger'
        case 'medium': return 'warning'
        case 'low': return 'success'
        default: return 'info'
      }
    }
    
    // 格式化风险级别显示
    const formatRiskLevel = (riskLevel) => {
      switch(riskLevel?.toLowerCase()) {
        case 'high': return '高风险'
        case 'medium': return '中风险'
        case 'low': return '低风险'
        default: return '未知'
      }
    }
    
    onMounted(() => {
      // 初始获取数据
      fetchEvents()
    })
    
    onUnmounted(() => {
      // 清理定时器
      if (monitorInterval.value) {
        clearInterval(monitorInterval.value)
      }
    })
    
    return {
      loading,
      monitoring,
      recentHighRiskEvents,
      notificationVisible,
      currentEvent,
      lastUpdateTime,
      handledCount,
      pendingCount,
      startMonitoring,
      stopMonitoring,
      refreshData,
      testNotification,
      acknowledgeNotification,
      markAsHandled,
      getConfidenceColor,
      formatConfidence,
      getRiskLevelType,
      formatRiskLevel,
      lastNotification
    }
  }
}
</script>

<style scoped>
.inspector-view {
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

.monitor-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.monitor-status {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #909399;
}

.monitor-status.active {
  background-color: #67C23A;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(103, 194, 58, 0.7);
  }
  70% {
    opacity: 0.7;
    box-shadow: 0 0 0 6px rgba(103, 194, 58, 0);
  }
  100% {
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(103, 194, 58, 0);
  }
}

.event-card, .status-card {
  margin-bottom: 20px;
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-info {
  padding: 20px 0;
}

.status-item {
  margin-bottom: 15px;
  display: flex;
  align-items: center;
}

.status-item .label {
  font-weight: bold;
  width: 120px;
}

.status-item .value {
  flex: 1;
}

.action-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.notification-content {
  margin-bottom: 20px;
}

.event-details {
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f8f8;
  border-radius: 4px;
}

.event-details p {
  margin: 10px 0;
}

.latest-alert {
  margin-bottom: 20px;
  padding: 10px;
  background-color: #f8f8f8;
  border-radius: 4px;
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.alert-header h4 {
  margin: 0;
}

.alert-time {
  font-size: 0.8em;
  color: #909399;
}

.alert-content {
  margin-top: 10px;
}

.alert-content div {
  margin-bottom: 5px;
}
</style> 