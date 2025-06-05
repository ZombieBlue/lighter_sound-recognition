<template>
  <div class="login-container">
    <el-card class="login-card">
      <div class="login-header">
        <h2>登录</h2>
      </div>
      
      <el-form 
        :model="loginForm" 
        :rules="rules" 
        ref="loginFormRef"
        @submit.prevent="handleLogin"
        label-position="top"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="loginForm.username" placeholder="请输入用户名"></el-input>
        </el-form-item>
        
        <el-form-item label="密码" prop="password">
          <el-input v-model="loginForm.password" type="password" placeholder="请输入密码"></el-input>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleLogin" style="width: 100%;">登录</el-button>
        </el-form-item>
        
        <div class="form-footer">
          <p>没有账号？<router-link to="/register">立即注册</router-link></p>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'

export default {
  name: 'Login',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const loginFormRef = ref(null)
    const loading = ref(false)
    
    const loginForm = reactive({
      username: '',
      password: ''
    })
    
    const rules = {
      username: [
        { required: true, message: '请输入用户名', trigger: 'blur' }
      ],
      password: [
        { required: true, message: '请输入密码', trigger: 'blur' }
      ]
    }
    
    const handleLogin = async () => {
      if (!loginFormRef.value) return
      
      await loginFormRef.value.validate(async (valid) => {
        if (!valid) return
        
        loading.value = true
        
        try {
          const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginForm)
          })
          
          const data = await response.json()
          
          if (!response.ok) {
            throw new Error(data.error || '登录失败')
          }
          
          // 存储用户信息
          const userInfo = {
            username: data.username,
            role: data.role
          }
          localStorage.setItem('user', JSON.stringify(userInfo))
          
          // 确保存储完成后再跳转
          setTimeout(() => {
            ElMessage.success('登录成功')
            
            // 重定向到之前尝试访问的页面或基于角色的默认页面
            const redirectPath = route.query.redirect || (data.role === 'user' ? '/events' : '/inspector')
            router.push(redirectPath)
          }, 100)
        } catch (error) {
          ElMessage.error(error.message || '登录失败，请稍后重试')
        } finally {
          loading.value = false
        }
      })
    }
    
    return {
      loginForm,
      loginFormRef,
      rules,
      loading,
      handleLogin
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 20px;
}

.login-header h2 {
  color: #409EFF;
  font-weight: 500;
}

.form-footer {
  text-align: center;
  margin-top: 15px;
}
</style> 