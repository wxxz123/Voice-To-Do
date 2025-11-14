
> 建议先看看这篇原帖（启发意义挺大）：  
> 🔗 [The Ultimate Vibe Coding Guide](https://www.reddit.com/r/ClaudeAI/comments/1kivv0w/the_ultimate_vibe_coding_guide/)
> https://www.reddit.com/r/ClaudeAI/comments/1kivv0w/the_ultimate_vibe_coding_guide/

---

##  一、确定 PRD（产品定义阶段）

1. **先确定自己的 idea**

 一定要有一个雏形。如果还不完善，可以请 GPT 帮忙“引导式补全”，让它帮你把概念变清晰。

2. **让 GPT 生成 PRD（产品需求文档）**

让它扮演产品经理，帮你找刚刚生成的prd的漏洞、补充功能点。

 举例 Prompt：
 
 > “请你作为产品经理，为以下想法生成一份完整的 PRD。  
 > 并指出这个想法在可行性、目标用户、流程设计上的不足。”

3. **用 Gemini 2.5 Pro 或 Claude 再生成 PRD**（普通用户就用gemini就行）

你可以让 Gemini 帮你写更贴近 AI 项目场景的版本，比如： 
 > “请为一个适合 AI agenda、vibe coding 的项目生成一份完整 PRD。”

<font color="#c0504d">2和3可以来回重复，得到一个比较满意的prd即可</font>。

4. **将最终 PRD 交给 ai 编辑器**
    
    - Prompt 示例：
        
        `基于这份 PRD，请为我规划详细的开发步骤， 并生成一个 Markdown 格式的进度文档。 文档需要包含模块拆分、每个模块的功能、开发顺序和状态列 （如：未开始、进行中、已完成）。 在后续开发过程中，你需要在这份文档中同步更新任务状态。`
        
    
    >  如果编辑器一开始没生成代码，而是生成了 README，也没关系，  
    > 那通常是它在“自建项目框架”，可以看看是否需要调整。
    

---

##  二、UI 页面阶段

1. 先写一段“UI 页面描述”
  可以让 Gemini 2.5 Pro 结合你的 PRD 生成完整描述。

  例如：“请为这个语音待办项目生成一个网站的 UI 描述，包括颜色风格、布局、主要组件。”
 
2. 用工具生成界面（把刚刚的提示词丢进对话框就行）
    
    - 推荐平台：
        
        - **Lovable**（最省事）
            
        - **v0** (也不错，新手就用lovable和这个就行)
            
        - **Hercules**
            
        - **Figma**（建议了解 Figma 的基本操作）
            
3. 把生成的代码导入ai 编辑器，让编辑器整理并显示页面。此时页面主要是视觉展示，功能还未接入。
 

---

##  三、开发阶段（接入逻辑 & API）

1. 当页面搭好后，直接让编辑器根据进度文档**逐模块开发**。
    
2. 有 API 接入任务时(建议大家都尝试接入以下ai api)：
    
    - 提前准备好各模型的 Key。
        
    - 到对应的任务模块，让编辑器去实现接口请求逻辑。
        
    - 你只需提供：
        
        -  **接口 URL**（例如：`https://api.chatanywhere.tech/v1/chat/completions`）
            
        -  **请求体（request body）** 示例
3. 如果接口出错，先看本地 Network 调试面板：
    
    - 打开网页按 **F12**； 
    - 查看 **Console** 是否有红字报错；
    - 切到 **Network** → 找红色的请求；
    - 看 **Status Code**：
        - `4xx` → 前端/请求错误；
        - `5xx` → 后端逻辑错误；
    - 点开 **Response** 查看详细错误提示。
        
4. 把错误内容（包括 URL、状态码、堆栈）复制给编辑器或 AI 助手，并说明：
    
    > “这个接口在 Network 返回 XXX 错误，Console 显示 fetch failed，请帮我检查后端的 POST 逻辑。”
    

---

##  四、推送到 GitHub(这里注意密钥不要暴露出来，大家可以让trae/cursor直接保护起来然后推送到github)

这个步骤网上资料非常多，不再赘述(大家可以询问chatgpt就行，他能教大家基本的操作，这就够用了)  或者如果你不熟命令行，可以使用 **GitHub Desktop**，图形化界面更简单。(网上也有教程，可以简单学习一下)
主要步骤：

1. 初始化项目（`git init`）；
    
2. 添加远程仓库；
    
3. `git add .` → `git commit` → `git push`。
    

---

##  五、部署阶段（上线）

| 类型       | 推荐平台         | 注意事项             |
| -------- | ------------ | ---------------- |
| 静态网站     | GitHub Pages | 无需后端即可用          |
| 有交互/提交功能 | **Vercel**   | 要配置环境变量（API、Key） |
我使用的是vercel来部署。我遇到的错误提醒：
有时本地运行没问题，部署后却报错。  
是因为 新部署版本没生效；

>  解决办法：手动 **Redeploy 一次**。