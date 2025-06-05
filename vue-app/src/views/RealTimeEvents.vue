<template>
  <div class="real-time-events">
    <div class="page-header">
      <h2>打火机声音实时检测事件</h2>
      <el-button type="primary" @click="refreshData">
        <el-icon><Refresh /></el-icon>
        刷新数据
      </el-button>
    </div>
    
    <el-card class="event-card">
      <template #header>
        <div class="card-header">
          <span>最近检测事件</span>
          <el-tag type="success" v-if="autoRefresh">自动刷新：{{ refreshInterval }}秒</el-tag>
          <el-tag type="info" v-else>自动刷新已关闭</el-tag>
        </div>
      </template>
      
      <div class="controls">
        <el-switch
          v-model="autoRefresh"
          active-text="自动刷新"
          inactive-text="手动刷新"
          @change="handleAutoRefreshChange"
        />
        
        <el-select 
          v-model="limit" 
          placeholder="显示数量"
          @change="refreshData"
          style="width: 120px"
        >
          <el-option v-for="item in limitOptions" :key="item" :label="`显示 ${item} 条`" :value="item" />
        </el-select>

        <el-select
          v-model="selectedLocation"
          placeholder="按地点筛选"
          clearable
          @change="handleFilterChange"
          style="width: 150px; margin-left: 10px;"
        >
          <el-option 
            v-for="item in locationOptions" 
            :key="item" 
            :label="item" 
            :value="item" 
          />
          <el-option label="全部" value="" />
        </el-select>

        <el-select
          v-model="selectedRiskLevel"
          placeholder="按风险级别筛选"
          clearable
          @change="handleFilterChange"
          style="width: 150px; margin-left: 10px;"
        >
          <el-option 
            v-for="item in riskLevelOptions" 
            :key="item.value" 
            :label="item.label" 
            :value="item.value" 
          />
        </el-select>
      </div>
      
      <el-table 
        :data="paginatedEvents" 
        stripe 
        style="width: 100%"
        v-loading="loading"
        element-loading-text="加载中..."
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="formattedTime" label="时间戳" width="180" />
        <el-table-column prop="confidence" label="置信度" width="120">
          <template #default="scope">
            <el-progress 
              :percentage="scope.row.confidence * 100" 
              :color="getConfidenceColor(scope.row.confidence)"
              :format="formatConfidence"
            />
          </template>
        </el-table-column>
        <el-table-column prop="device_id" label="设备ID" width="120" />
        <el-table-column prop="location" label="检测地点" width="120" />
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
      </el-table>
      
      <div class="pagination-container" v-if="events.length > 0">
        <el-pagination
          :current-page="currentPage"
          :page-size="pageSize"
          :total="filteredEvents.length"
          layout="total, prev, pager, next, sizes"
          :page-sizes="[10, 20, 50, 100]"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
      
      <el-empty v-if="filteredEvents.length === 0" description="暂无检测事件" />
    </el-card>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { format } from 'date-fns'
import { Refresh } from '@element-plus/icons-vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

export default {
  name: 'RealTimeEvents',
  components: {
    Refresh
  },
  setup() {
    const events = ref([])
    const filteredEvents = ref([])
    const loading = ref(false)
    const autoRefresh = ref(true)
    const refreshInterval = ref(5)
    const refreshTimer = ref(null)
    const limit = ref(50)
    const limitOptions = [10, 20, 50, 100]
    const currentPage = ref(1)
    const pageSize = ref(10)
    const selectedLocation = ref('')
    const selectedRiskLevel = ref('')
    const locationOptions = ref([])
    const riskLevelOptions = [
      { value: '', label: '全部' },
      { value: 'high', label: '高风险' },
      { value: 'medium', label: '中风险' },
      { value: 'low', label: '低风险' },
      { value: null, label: '未知' }
    ]
    
    const paginatedEvents = computed(() => {
      const startIndex = (currentPage.value - 1) * pageSize.value
      const endIndex = startIndex + pageSize.value
      return filteredEvents.value.slice(startIndex, endIndex)
    })
    
    const fetchEvents = async () => {
      loading.value = true
      try {
        const response = await axios.get(`/api/events?limit=${limit.value}`)
        const responseData = response.data.map(event => ({
          ...event,
          formattedTime: formatTimestamp(event.timestamp)
        }))
        
        events.value = responseData
        
        // 初始化时设置filteredEvents与events相同
        if (!selectedLocation.value && selectedRiskLevel.value === '') {
          filteredEvents.value = responseData
        } else {
          // 有筛选条件时应用筛选
          applyFilters()
        }
        
        // 提取所有不同的位置选项
        updateLocationOptions()
      } catch (error) {
        console.error('获取事件数据失败:', error)
        ElMessage.error('获取事件数据失败，请稍后重试')
      } finally {
        loading.value = false
      }
    }
    
    const updateLocationOptions = () => {
      // 提取所有不同的位置
      const locations = [...new Set(events.value.map(event => event.location || '未知'))]
      locationOptions.value = locations
    }
    
    const applyFilters = () => {
      // 如果没有任何筛选条件，直接使用所有事件数据
      if (!selectedLocation.value && selectedRiskLevel.value === '') {
        filteredEvents.value = events.value
        return
      }
      
      filteredEvents.value = events.value.filter(event => {
        let matchesLocation = true
        let matchesRiskLevel = true
        
        if (selectedLocation.value) {
          matchesLocation = (event.location || '未知') === selectedLocation.value
        }
        
        if (selectedRiskLevel.value !== '') {
          matchesRiskLevel = (event.risk_level || null) === selectedRiskLevel.value
        }
        
        return matchesLocation && matchesRiskLevel
      })
      
      // 重置为第一页
      currentPage.value = 1
    }
    
    const handleFilterChange = () => {
      applyFilters()
    }
    
    const refreshData = () => {
      fetchEvents()
      currentPage.value = 1
    }
    
    const formatTimestamp = (timestamp) => {
      return format(new Date(timestamp * 1000), 'yyyy-MM-dd HH:mm:ss')
    }
    
    const getConfidenceColor = (confidence) => {
      if (confidence >= 0.8) return '#67C23A'
      if (confidence >= 0.6) return '#E6A23C'
      return '#F56C6C'
    }
    
    const formatConfidence = (percentage) => {
      return `${percentage.toFixed(1)}%`
    }
    
    const getRiskLevelType = (riskLevel) => {
      switch(riskLevel?.toLowerCase()) {
        case 'high': return 'danger'
        case 'medium': return 'warning'
        case 'low': return 'success'
        default: return 'info'
      }
    }
    
    const formatRiskLevel = (riskLevel) => {
      switch(riskLevel?.toLowerCase()) {
        case 'high': return '高风险'
        case 'medium': return '中风险'
        case 'low': return '低风险'
        default: return '未知'
      }
    }
    
    const handleAutoRefreshChange = (value) => {
      if (value) {
        setupAutoRefresh()
      } else {
        clearInterval(refreshTimer.value)
      }
    }
    
    const setupAutoRefresh = () => {
      clearInterval(refreshTimer.value)
      refreshTimer.value = setInterval(() => {
        fetchEvents()
      }, refreshInterval.value * 1000)
    }
    
    const handlePageChange = (page) => {
      currentPage.value = page
    }
    
    const handleSizeChange = (size) => {
      pageSize.value = size
      currentPage.value = 1
    }
    
    onMounted(() => {
      fetchEvents()
      if (autoRefresh.value) {
        setupAutoRefresh()
      }
    })
    
    onUnmounted(() => {
      clearInterval(refreshTimer.value)
    })
    
    return {
      events,
      filteredEvents,
      loading,
      autoRefresh,
      refreshInterval,
      limit,
      limitOptions,
      currentPage,
      pageSize,
      paginatedEvents,
      selectedLocation,
      selectedRiskLevel,
      locationOptions,
      riskLevelOptions,
      refreshData,
      getConfidenceColor,
      formatConfidence,
      getRiskLevelType,
      formatRiskLevel,
      handleAutoRefreshChange,
      handlePageChange,
      handleSizeChange,
      handleFilterChange
    }
  }
}
</script>

<style scoped>
.real-time-events {
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

.event-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style> 