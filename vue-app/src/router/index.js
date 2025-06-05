import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/events'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: {
      title: '登录',
      allowAnonymous: true
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: {
      title: '注册',
      allowAnonymous: true
    }
  },
  {
    path: '/events',
    name: 'RealTimeEvents',
    component: () => import('../views/RealTimeEvents.vue'),
    meta: {
      title: '实时事件',
      roles: ['user']
    }
  },
  {
    path: '/analytics',
    name: 'Analytics',
    component: () => import('../views/Analytics.vue'),
    meta: {
      title: '数据分析',
      roles: ['user']
    }
  },
  {
    path: '/inspector',
    name: 'Inspector',
    component: () => import('../views/Inspector.vue'),
    meta: {
      title: '巡检员监控',
      roles: ['inspector']
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title || '打火机声音检测系统'}`
  
  // 从localStorage获取用户信息
  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : null
  
  // 如果路由允许匿名访问，直接放行
  if (to.meta.allowAnonymous) {
    next()
    return
  }
  
  // 如果用户未登录，重定向到登录页
  if (!user) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }
  
  // 如果路由没有设置角色限制，允许访问
  if (!to.meta.roles) {
    next()
    return
  }
  
  // 如果用户角色与路由角色匹配，允许访问
  if (to.meta.roles.includes(user.role)) {
    next()
    return
  }
  
  // 默认重定向到首页或基于角色的首个可访问页面
  if (user.role === 'user') {
    next({ name: 'RealTimeEvents' })
  } else if (user.role === 'inspector') {
    next({ name: 'Inspector' })
  } else {
    next({ name: 'Login' })
  }
})

export default router 