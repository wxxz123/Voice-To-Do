# Voice To-Do - 语音清单 🎙️

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.19-646CFF.svg)](https://vitejs.dev/)

> **说出来，马上整理成待办** | Upload or record your thoughts, get transcript and to-do instantly.

一个基于 AI 的语音转待办清单工具，支持语音录制、文件上传、自动转写、智能摘要和结构化待办事项生成。

## ✨ 功能特性

### 🎯 核心功能
- **语音录制** - 浏览器内直接录音（最长 3 分钟）
- **文件上传** - 支持 m4a、mp3、wav、aac、3gp 格式（≤50MB）
- **自动转写** - 基于 Soniox API 的高精度语音识别
- **智能分析** - 使用 OpenAI 兼容 API 生成摘要和待办事项
- **结构化输出** - 层级化待办清单，支持优先级和分类

### 📋 输出格式
- **转写文本** - 完整的语音转文字内容
- **智能摘要** - 提取关键信息的简明摘要
- **待办清单** - 结构化的任务列表，支持：
  - 层级嵌套（主任务 → 子任务）
  - 优先级标记（高/中/低）
  - 分类标签（工作/个人/学习等）
  - 一键复制（Markdown/JSON 格式）

### 🎨 用户体验
- **响应式设计** - 完美适配桌面端和移动端
- **现代 UI** - 基于 shadcn/ui 的精美界面
- **实时反馈** - 处理进度可视化
- **暗色模式** - 支持主题切换

## 🚀 在线演示

[🔗 立即体验 Voice To-Do](https://voice-to-do.vercel.app)

*注：演示版本使用模拟数据，完整功能需要配置 API 密钥*

## 🛠️ 技术栈

### 前端框架
- **React 18.3.1** - 用户界面构建
- **TypeScript 5.8.3** - 类型安全的 JavaScript
- **Vite 5.4.19** - 快速构建工具

### UI 组件
- **shadcn/ui** - 现代化组件库
- **Tailwind CSS 3.4.17** - 原子化 CSS 框架
- **Lucide React** - 精美的图标库
- **Radix UI** - 无障碍的底层组件

### 核心依赖
- **React Hook Form** - 表单状态管理
- **React Query** - 数据获取和缓存
- **React Router** - 客户端路由
- **Sonner** - 优雅的通知组件

### API 集成
- **Soniox API** - 语音转文字服务
- **OpenAI 兼容 API** - AI 分析和摘要生成（通过可配置的新公益 API）

## 📦 本地开发

### 环境要求
- Node.js 18+ 
- npm 或 yarn

### 快速开始

1. **克隆仓库**
```bash
git clone https://github.com/wxxz123/Voice-To-Do.git
cd Voice-To-Do
```

2. **安装依赖**
```bash
npm install
```

3. **环境配置**
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，添加必要的 API 密钥
NEWAPI_API_KEY=your_newapi_key
NEWAPI_BASE_URL=https://your-newapi-host/v1
VITE_NEWAPI_MODEL=gpt-4.1
VITE_SONIOX_API_KEY=your_soniox_api_key
VITE_SONIOX_MODEL=stt-async-preview
```

4. **启动开发服务器**
```bash
npm run dev
```

5. **访问应用**
打开浏览器访问 `http://localhost:8080`

### 可用脚本

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run build:dev    # 构建开发版本
npm run preview      # 预览构建结果
npm run lint         # 代码检查
```

## 🔧 配置说明

### API 密钥配置

在 `.env.local` 文件中配置以下环境变量（开发环境）：

```env
# NewAPI（OpenAI 兼容服务）
NEWAPI_API_KEY=sk-your-key-here
NEWAPI_BASE_URL=https://x666.me/v1
VITE_NEWAPI_MODEL=gpt-4.1

# Soniox API Key（语音转写）
VITE_SONIOX_API_KEY=your-soniox-key
VITE_SONIOX_MODEL=stt-async-preview
```

### 获取 API 密钥

1. **NewAPI**: 访问你的服务提供商控制台（例如 x666.me），获取密钥与 BaseURL
2. **Soniox**: 访问 [Soniox](https://soniox.com/) 申请语音识别服务

## 🚀 部署

### Vercel 部署（推荐）

1. Fork 本仓库到你的 GitHub 账户
2. 在 [Vercel](https://vercel.com) 中导入项目
3. 配置环境变量
4. 点击部署

### 其他平台

项目支持部署到任何支持 Node.js 的静态托管平台：
- Netlify
- GitHub Pages
- Cloudflare Pages
- Railway

## 📱 使用指南

### 基本流程

1. **选择输入方式**
   - 📁 上传音频文件
   - 🎙️ 浏览器录音

2. **自动处理**
   - 语音转写（Soniox）
   - AI 分析（NewAPI / OpenAI 兼容）
   - 生成摘要和待办

3. **查看结果**
   - 转写文本
   - 智能摘要  
   - 结构化待办清单

4. **导出使用**
   - 一键复制 Markdown
   - 导出 JSON 格式

### 最佳实践

- **录音建议**：清晰表达，避免背景噪音
- **内容结构**：明确说明任务、时间、优先级
- **语言支持**：目前主要支持中文，英文支持有限

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 代码规范

- 使用 TypeScript 进行类型检查
- 遵循 ESLint 配置
- 组件使用 PascalCase 命名
- 文件使用 kebab-case 命名

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源协议。

## 📞 联系方式

- **邮箱**: [xiaolaythe@outlook.com](mailto:xiaolaythe@outlook.com)
- **GitHub**: [@wxxz123](https://github.com/wxxz123)
- **项目地址**: [Voice-To-Do](https://github.com/wxxz123/Voice-To-Do)

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐ Star 支持一下！**

Made with ❤️ by [wxxz123](https://github.com/wxxz123)

</div>
