# 🎙️ AI 语音任务助手

一个基于 **Next.js + Soniox + OpenAI（ChatAnywhere 接口）** 的语音智能助手。  
用户上传音频文件后，系统会自动完成以下任务：

1. 🎧 **语音转文字** — 使用 Soniox 模型进行高质量语音识别  
2. 🧠 **摘要生成** — 调用大语言模型总结音频主要内容  
3. ✅ **层级待办清单生成** — 将音频内容拆解为主任务与子任务结构，清晰展示

---

## 🚀 在线体验


---

## 🛠️ 技术栈

| 模块 | 技术 |
|------|------|
| 前端 | Next.js (App Router), React, TailwindCSS |
| 后端 | Next.js API Routes |
| 语音识别 | [Soniox API](https://soniox.com) |
| 文本分析 | OpenAI GPT（通过 [ChatAnywhere](https://api.chatanywhere.tech) 转发） |
| 部署 | [Vercel](https://vercel.com) |
| 开发工具 | Cursor AI IDE |

---

## 📦 功能演示

- 上传音频文件（mp3 / m4a / wav）
- 实时显示上传进度与处理状态
- 转写完成后生成：
  - 📄 转录文本（Transcript）
  - ✨ 摘要（Highlights）
  - 🗂️ 层级待办清单（To-do）
- 支持复制 Markdown / JSON
- 移动端自适应（iPhone Safari 友好）

---

## ⚙️ 本地运行

```bash
# 1. 克隆仓库
git clone https://github.com/wxxz123/transcribe.git
cd transcribe

# 2. 安装依赖
npm install

# 3. 配置环境变量
# 新建 .env.local 并填入：
# SONIOX_API_KEY=你的Soniox密钥
# CHATANYWHERE_KEY=你的ChatAnywhere密钥

# 4. 启动开发环境
npm run dev

```
---


## 🪙 后续计划
 - [ ] 支持微信小程序版本

 - [ ] 接入腾讯混元 / 通义千问模型

 - [ ] 增加用户登录与历史记录

 - [ ] 支持多语言语音识别

---



