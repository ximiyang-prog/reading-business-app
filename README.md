# 真读｜读书分享商业化应用

零依赖响应式静态网页，可直接部署到 GitHub Pages。

## 本地运行

直接打开 `index.html`，或在目录中启动任意静态文件服务器。

## 功能

- 输入书名和目标用户
- 上传 TXT、Markdown、PDF、DOC、DOCX 书籍材料（静态版直接提取文本格式，二进制文档预留后端解析）
- 生成用户洞察与 5 个内容选题
- 生成 10 个面向目标用户的观点二创金句
- 在主题详情中按相关度推荐最多 5 本书，已拆历史可跳转关联主题页
- 将主题加入持久化待办，支持按添加时间正反序、书名和相关度排序
- “我的案例”支持文字与浏览器语音转文字记录
- 案例可关联当前/历史书籍及具体主题，并从时间线跳转回关联内容
- 每条金句可生成 1080×1440 社交媒体图片，并按目标用户匹配背景视觉风格
- 按综合推荐、容易拍、适合变现筛选
- 查看完整选题分析
- 复制内容与保存最近一次历史记录

真实 AI 模式通过服务端 API/Serverless Function 调用，API Key 不进入前端。用户上传的文档会在浏览器中提取文字，并仅在用户点击生成时发送到配置的 Worker。

## 真实 AI 服务

`worker/` 包含 Cloudflare Worker 服务端：

- 先通过 Google Books 与 Open Library 匹配公开书目资料；
- 没有可靠内容时返回 `NO_CONTENT`，前端询问用户是否授权网页搜索；
- 用户授权后才调用 Responses API 的网页搜索；
- TXT、Markdown、PDF、DOCX 在浏览器本地提取文本，再发送到 Worker 分析；
- `OPENAI_API_KEY` 仅配置为 Worker secret，禁止写入源码；
- `OPENAI_MODEL` 配置为 Worker 环境变量。

发布 Worker 后，将服务地址写入网页的 `window.TRUE_READ_API_BASE`，或在浏览器本地存储中设置 `trueReadApiBase`。
