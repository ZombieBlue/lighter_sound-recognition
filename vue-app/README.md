# 打火机声音检测系统前端

这是一个用Vue 3构建的打火机声音检测系统前端应用，提供实时事件监控和数据分析功能。

## 功能特点

- 实时显示打火机声音检测事件
- 数据自动刷新/手动刷新
- 多种数据可视化图表展示
- 响应式设计，适配不同设备屏幕

## 技术栈

- Vue 3 (Composition API)
- Vue Router
- Element Plus UI组件库
- ECharts 数据可视化
- Axios HTTP客户端
- Vite 构建工具

## 安装和运行

### 安装依赖

```bash
cd vue-app
npm install
```

### 开发模式运行

```bash
npm run serve
```

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 项目结构

```
vue-app/
├── public/                  # 静态资源
├── src/
│   ├── assets/              # 资源文件
│   ├── components/          # 组件
│   ├── views/               # 页面
│   │   ├── RealTimeEvents.vue  # 实时事件页面
│   │   └── Analytics.vue    # 数据分析页面
│   ├── router/              # 路由配置
│   ├── App.vue              # 根组件
│   └── main.js              # 应用入口
├── index.html               # HTML模板
├── vite.config.js           # Vite配置
└── package.json             # 依赖管理
```

## 后端API

应用需要连接到后端API，默认配置为与Flask后端通信，API端点：

- 获取事件：`/api/events` 