---
title: 首页
order: 0
---

# Ink

极简文档框架。4 个依赖，200ms 构建，VitePress 的轻量替代。

## 为什么选 Ink？

- **极速构建** — 100 个文档页面 < 200ms，不需要 Vite/Webpack
- **零框架** — 不依赖 Vue/React，纯 Node.js + 原生 HTML/CSS/JS
- **4 个依赖** — marked + gray-matter + chokidar + feed，`node_modules` < 5MB
- **文件系统路由** — `docs/` 目录结构即导航，无需手动配置侧边栏
- **开箱即用** — 搜索、暗色模式、TOC、代码高亮、响应式，全部内置
- **AI 友好** — 内置 AI.md，让 AI 帮你一键部署

## 快速开始

```bash
git clone https://github.com/Linbo-cyber/ink.git my-docs
cd my-docs
npm install
npm run dev
```

或使用 GitHub 模板：点击仓库页面的 **Use this template** 按钮。

## 对比

| 特性 | Ink | VitePress | Docusaurus |
|------|-----|-----------|------------|
| 依赖数 | 4 | 100+ | 200+ |
| node_modules | ~5MB | ~200MB | ~400MB |
| 构建 100 页 | ~200ms | ~3s | ~10s |
| 框架 | 无 | Vue | React |
| 配置文件 | 1 个 JS | TypeScript | JS + 插件 |
| 学习曲线 | 5 分钟 | 30 分钟 | 1 小时 |
