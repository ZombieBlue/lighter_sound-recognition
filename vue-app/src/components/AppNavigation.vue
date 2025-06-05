<template>
  <el-menu
    :default-active="activeIndex"
    class="app-menu"
    mode="horizontal"
    router
    background-color="#24292f"
    text-color="#ffffff"
    active-text-color="#409EFF"
  >
    <el-menu-item index="/events">
      <el-icon><Clock /></el-icon>
      <span>实时事件</span>
    </el-menu-item>
    
    <el-menu-item index="/analytics">
      <el-icon><DataAnalysis /></el-icon>
      <span>数据分析</span>
    </el-menu-item>
    
    <el-menu-item index="/inspector">
      <el-icon><Warning /></el-icon>
      <span>巡检员监控</span>
    </el-menu-item>
  </el-menu>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Clock, DataAnalysis, Warning } from '@element-plus/icons-vue'

export default {
  name: 'AppNavigation',
  components: {
    Clock,
    DataAnalysis,
    Warning
  },
  setup() {
    const route = useRoute()
    const activeIndex = ref(route.path)
    
    // 当路由变化时更新活动菜单项
    watch(() => route.path, (newPath) => {
      activeIndex.value = newPath
    })
    
    return {
      activeIndex
    }
  }
}
</script>

<style scoped>
.app-menu {
  margin-bottom: 20px;
}
</style> 