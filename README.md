# 🏥 AI健康管家

一款基于 React Native + Expo 开发的智能健康管理应用，集成了 AI 助手、用药管理、健康数据追踪、云端同步等功能。

## ✨ 功能特性

### 🤖 AI 智能助手
- **健康问答**：基于 SiliconFlow AI 的健康咨询服务
- **药物相互作用检查**：智能分析多种药物的相互作用风险
- **个性化健康建议**：根据用户数据生成定制化建议

### 💊 用药管理
- **OCR 识别**：拍照识别药品包装盒，自动提取药品信息（百度 OCR）
- **智能提醒**：支持多种用药模式（固定时间/每日N次/间隔小时/按需用药）
- **库存管理**：药品库存追踪、到期提醒、低库存提醒
- **用药历史**：完整的服药记录和统计分析
- **数据导出**：支持导出药品信息为 CSV 文件

### 📊 健康数据
- **多维度监测**：心率、血压、血糖、睡眠、运动等
- **可视化图表**：趋势分析和数据对比
- **设备数据导入**：支持从智能手表等设备导入数据

### 📱 健康报告
- **AI 分析**：基于健康数据生成智能分析报告
- **趋势预测**：健康指标的趋势分析

### ☁️ 云端同步
- **自动同步**：数据修改后自动上传到云端（2.5秒防抖）
- **用户隔离**：每个用户的数据完全隔离，登录时自动下载
- **冲突处理**：智能冲突检测和解决机制
- **账号管理**：注册、登录、修改密码、注销账号

## 🛠️ 技术栈

### 前端
- **React Native** 0.72.10 - 跨平台移动应用框架
- **Expo** ~49.0.0 - React Native 开发工具链
- **React Navigation** - 路由导航
- **React Native Paper** - Material Design UI 组件库
- **React Native SVG** - SVG 图标支持

### 后端服务
- **Node.js** - 运行环境
- **SQLite (better-sqlite3)** - 云端数据存储
- **JWT** - 用户认证

### AI & API 集成
- **SiliconFlow API** - AI 大语言模型
- **Baidu OCR API** - 文字识别
- **多个药品数据库 API** - 药品信息查询（聚合、天行、万维、极速）

## 📋 环境要求

- **Node.js** >= 14.0.0
- **npm** 或 **yarn**
- **Expo CLI** (自动安装)
- **浏览器** (Web 版开发)
- **Xcode** (iOS 开发，仅 macOS)
- **Android Studio** (Android 开发)

## 🚀 快速开始

### 1️⃣ 克隆项目

```bash
git clone <your-repo-url>
cd 软件大赛
```

### 2️⃣ 安装依赖

```bash
npm install
```

### 3️⃣ 配置环境变量

在项目根目录创建 `.env` 文件：

```env
# SiliconFlow AI API
EXPO_PUBLIC_SILICONFLOW_API_KEY=your_siliconflow_api_key
SILICONFLOW_API_KEY=your_siliconflow_api_key

# 云端服务器地址
EXPO_PUBLIC_CLOUD_API_BASE_URL=http://localhost:4000

# 百度 OCR API（可选）
BAIDU_OCR_API_KEY=your_baidu_ocr_api_key
BAIDU_OCR_SECRET_KEY=your_baidu_ocr_secret_key

# 药品数据库 API（可选）
JUHE_API_KEY=your_juhe_api_key
TIANAPI_KEY=your_tianapi_key
WANWEI_API_KEY=your_wanwei_api_key
JISU_API_KEY=your_jisu_api_key
```

> **注意**：至少需要配置 `SILICONFLOW_API_KEY` 才能使用 AI 功能。

### 4️⃣ 启动项目

#### 🌐 Web 版（推荐开发时使用）

```bash
# 启动 Expo 开发服务器
npm start

# 在浏览器中打开（按 'w' 或访问 http://localhost:19006）
```

#### 📱 移动端

```bash
# 启动 Expo 开发服务器
npm start

# iOS 模拟器（仅 macOS）
按 'i'

# Android 模拟器
按 'a'

# 使用 Expo Go 扫描二维码
在手机上安装 Expo Go，扫描终端中的二维码
```

### 5️⃣ 启动云端服务（必需）

**方式一：本地开发**

```bash
# 启动本地云端服务器
npm run cloud

# 服务器将运行在 http://localhost:4000
```

**方式二：部署到远程服务器**

参见下方 [云端服务器部署](#☁️-云端服务器部署) 章节。

### 6️⃣ 启动代理服务器（Web 开发需要）

```bash
# 新开一个终端窗口
npm run proxy

# 代理服务器将运行在 http://localhost:3001
```

> **为什么需要代理？** Web 版需要代理服务器来避免 CORS 和 Mixed Content 问题（第三方 API 调用）。

## ☁️ 云端服务器部署

### Ubuntu 服务器部署步骤

#### 1. 上传文件到服务器

```bash
# 压缩云端相关文件
tar -czf cloud_deploy.tgz cloud-server.js cloud/ package.json package-lock.json

# 上传到服务器
scp cloud_deploy.tgz user@your-server-ip:/path/to/deploy
```

#### 2. 在服务器上安装依赖

```bash
ssh user@your-server-ip
cd /path/to/deploy
tar -xzf cloud_deploy.tgz

# 安装 Node.js（如果未安装）
sudo apt update
sudo apt install nodejs npm

# 安装依赖
npm ci --production
```

#### 3. 配置环境变量

```bash
# 创建 .env 文件
cat > .env << 'EOF'
CLOUD_PORT=4000
CLOUD_JWT_SECRET=your_random_secret_key_here
CLOUD_DB_PATH=./cloud-data/cloud.db
EOF
```

#### 4. 配置 systemd 服务（持久化运行）

```bash
sudo nano /etc/systemd/system/ai-health-cloud.service
```

写入以下内容：

```ini
[Unit]
Description=AI Health Cloud Server
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/deploy
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node cloud-server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable ai-health-cloud
sudo systemctl start ai-health-cloud
sudo systemctl status ai-health-cloud
```

#### 5. 更新客户端配置

修改本地项目的 `app.json`：

```json
{
  "expo": {
    "extra": {
      "CLOUD_API_BASE_URL": "http://your-server-ip:4000",
      "SILICONFLOW_API_KEY": "your_api_key"
    }
  }
}
```

或者修改 `.env` 文件：

```env
EXPO_PUBLIC_CLOUD_API_BASE_URL=http://your-server-ip:4000
```

## 📁 项目结构

```
软件大赛/
├── App.js                      # 应用入口
├── app.json                    # Expo 配置
├── package.json                # 依赖配置
├── webpack.config.js           # Web 打包配置
├── proxy-server.js             # Web 代理服务器
├── cloud-server.js             # 云端数据服务器
├── assets/                     # 静态资源
│   ├── bk_1.png               # 背景图
│   ├── logo_1.png             # Logo
│   └── logo_2.png             # Header Logo
├── cloud/                      # 云端服务模块
│   └── db.js                  # SQLite 数据库操作
├── cloud-data/                 # 云端数据存储
│   └── cloud.db               # SQLite 数据库文件
└── src/
    ├── components/            # 可复用组件
    │   └── AIIcon.js         # AI 机器人图标
    ├── config/               # 配置文件
    │   ├── ai.js            # AI 服务配置
    │   ├── baiduOCR.js      # 百度 OCR 配置
    │   ├── cloud.js         # 云端服务配置
    │   ├── medicineDB.js    # 药品数据库配置
    │   └── webProxy.js      # Web 代理配置
    ├── screens/              # 页面组件
    │   ├── AIScreen.js      # AI 助手页面
    │   ├── AuthScreen.js    # 登录/注册页面
    │   ├── DeviceScreen.js  # 健康数据页面
    │   ├── HomeScreen.js    # 首页
    │   ├── MedicineScreen.js # 药品管理页面
    │   └── ReportScreen.js  # 健康报告页面
    ├── services/             # 业务逻辑服务
    │   ├── AIService.js           # AI 服务
    │   ├── AuthService.js         # 认证服务
    │   ├── AutoCloudSyncService.js # 自动云同步
    │   ├── CloudSyncService.js    # 手动云同步
    │   ├── DeviceService.js       # 设备数据服务
    │   ├── EncryptionService.js   # 加密服务
    │   ├── ExportService.js       # 数据导出服务
    │   ├── KeyManager.js          # 密钥管理
    │   ├── MedicineDBService.js   # 药品数据库查询
    │   ├── MedicineService.js     # 药品管理服务
    │   ├── OCRService.js          # OCR 识别服务
    │   └── ReportService.js       # 报告生成服务
    ├── utils/                # 工具函数
    │   ├── secureStorage.js  # 安全存储（加密）
    │   ├── storage.js        # 普通存储
    │   ├── validation.js     # 数据验证
    │   └── webStorage.js     # Web 存储适配
    └── theme.js              # 主题配置
```

## 🔑 API 密钥获取

### SiliconFlow API（必需）
1. 访问 [SiliconFlow 官网](https://siliconflow.cn/)
2. 注册账号并登录
3. 进入控制台创建 API Key
4. 复制 API Key 到 `.env` 文件

### 百度 OCR API（可选）
1. 访问 [百度智能云](https://cloud.baidu.com/)
2. 创建文字识别应用
3. 获取 API Key 和 Secret Key

### 药品数据库 API（可选）
- [聚合数据](https://www.juhe.cn/)
- [天行数据](https://www.tianapi.com/)
- 万维数据
- 极速数据

## 🐛 常见问题

### 1. `npm install` 失败

```bash
# 清除缓存重试
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 2. Expo 启动失败

```bash
# 重置 Expo 缓存
npx expo start -c
```

### 3. Web 版 CORS 错误

确保 `proxy-server.js` 正在运行：

```bash
npm run proxy
```

### 4. 云端连接失败

- 检查 `EXPO_PUBLIC_CLOUD_API_BASE_URL` 配置是否正确
- 确保云端服务器正在运行：`npm run cloud`
- 测试连接：`curl http://localhost:4000/health`

### 5. AI 服务未配置

- 检查 `.env` 文件中的 `EXPO_PUBLIC_SILICONFLOW_API_KEY`
- 或在 `app.json` 中配置 `expo.extra.SILICONFLOW_API_KEY`

### 6. 图片资源加载失败

Web 版开发时图片可能加载失败，这是正常的。在生产构建或移动端不会有此问题。

### 7. 浏览器标签显示 "undefined"

刷新浏览器或重启 Expo Web 服务器：

```bash
# Ctrl+C 停止服务
npm start
# 按 'w' 打开 Web
```

## 📱 构建生产版本

### Web 版

```bash
npx expo export:web
# 输出目录：web-build/
```

### Android APK

```bash
# 安装 EAS CLI
npm install -g eas-cli

# 登录 Expo 账号
eas login

# 构建 APK
eas build -p android --profile preview
```

### iOS IPA

```bash
# 需要 Apple Developer 账号
eas build -p ios --profile preview
```

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 👨‍💻 开发者

- 项目作者：[Your Name]
- 联系方式：[Your Email]

## 🙏 致谢

- [Expo](https://expo.dev/) - 跨平台开发框架
- [SiliconFlow](https://siliconflow.cn/) - AI 服务提供商
- [React Native Paper](https://callstack.github.io/react-native-paper/) - UI 组件库
- [百度智能云](https://cloud.baidu.com/) - OCR 服务

---

**注意**：本项目仅供学习交流使用，生成的健康建议不能替代专业医疗意见，重要问题请咨询医生。
