<template>
  <div class="app-container">
    <el-container>
      <el-header>
        <div class="header-content">
          <div class="logo">
            <el-icon><Monitor /></el-icon>
            <h1>打火机声音识别管理系统</h1>
          </div>
          <el-menu
            v-if="isLoggedIn"
            :default-active="activeIndex"
            mode="horizontal"
            router
            background-color="#409EFF"
            text-color="#fff"
            active-text-color="#ffd04b"
          >
            <template v-if="userRole === 'user'">
              <el-menu-item index="/events">
                <el-icon><Document /></el-icon>
                <span>实时打火机监听事件</span>
              </el-menu-item>
              <el-menu-item index="/analytics">
                <el-icon><PieChart /></el-icon>
                <span>数据分析</span>
              </el-menu-item>
            </template>
            
            <template v-if="userRole === 'inspector'">
              <el-menu-item index="/inspector">
                <el-icon><Warning /></el-icon>
                <span>巡检员监控</span>
              </el-menu-item>
            </template>
            
            <el-sub-menu index="user" class="user-menu">
              <template #title>
                <el-icon><User /></el-icon>
                <span>{{ username }}</span>
              </template>
              <el-menu-item @click="handleLogout">
                <el-icon><SwitchButton /></el-icon>
                <span>退出登录</span>
              </el-menu-item>
            </el-sub-menu>
          </el-menu>
        </div>
      </el-header>
      
      <el-main>
        <router-view />
      </el-main>
      
      <el-footer>
        <div class="footer-content">
          <p>打火机声音识别管理系统 &copy; {{ new Date().getFullYear() }}</p>
        </div>
      </el-footer>
    </el-container>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Document, PieChart, Monitor, Warning, User, SwitchButton } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

export default {
  name: 'App',
  components: {
    Document,
    PieChart,
    Monitor,
    Warning,
    User,
    SwitchButton
  },
  setup() {
    const router = useRouter()
    const isLoggedIn = ref(false)
    const username = ref('')
    const userRole = ref('')
    
    const activeIndex = computed(() => {
      return router.currentRoute.value.path
    })
    
    // 检查用户登录状态
    const checkLoginStatus = () => {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        isLoggedIn.value = true
        username.value = user.username
        userRole.value = user.role
      } else {
        isLoggedIn.value = false
        username.value = ''
        userRole.value = ''
      }
    }
    
    // 退出登录
    const handleLogout = async () => {
      try {
        const response = await fetch('/api/logout', {
          method: 'POST'
        })
        
        // 无论服务器响应如何，清除本地存储
        localStorage.removeItem('user')
        isLoggedIn.value = false
        username.value = ''
        userRole.value = ''
        
        ElMessage.success('退出登录成功')
        router.push('/login')
      } catch (error) {
        console.error('退出登录失败:', error)
        // 即使API请求失败，也清除本地存储
        localStorage.removeItem('user')
        router.push('/login')
      }
    }
    
    // 监听路由变化
    watch(() => router.currentRoute.value, () => {
      checkLoginStatus()
    })
    
    onMounted(() => {
      checkLoginStatus()
      
      // 监听storage事件，处理多标签页同步登录状态
      window.addEventListener('storage', (event) => {
        if (event.key === 'user') {
          checkLoginStatus()
        }
      })
    })
    
    return {
      activeIndex,
      isLoggedIn,
      username,
      userRole,
      handleLogout
    }
  }
}
</script>

<style>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.el-container {
  height: 100%;
}

.el-header {
  padding: 0;
  background-color: #409EFF;
  color: #fff;
  line-height: 60px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  flex-wrap: wrap;
}

.logo {
  display: flex;
  align-items: center;
  margin-right: 20px;
}

.logo h1 {
  margin: 0 0 0 10px;
  font-size: 20px;
  font-weight: 600;
}

.el-menu.el-menu--horizontal {
  border-bottom: none;
  min-width: 300px;
}

.user-menu {
  float: right;
  margin-left: auto;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    padding: 10px 20px;
  }
  
  .logo {
    margin-bottom: 10px;
  }
  
  .el-menu.el-menu--horizontal {
    width: 100%;
  }
}

.el-main {
  padding: 20px;
  background-color: #f5f7fa;
}

.el-footer {
  background-color: #545c64;
  color: #fff;
  text-align: center;
  line-height: 60px;
}

.footer-content {
  padding: 0 20px;
}
</style> 