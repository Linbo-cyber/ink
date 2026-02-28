---
title: 配置参考
order: 1
---

# 配置参考

`ink.config.js` 完整配置项。

## 顶层配置

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | `string` | `'Ink Docs'` | 站点标题 |
| `description` | `string` | `'Documentation powered by Ink'` | SEO 描述 |
| `basePath` | `string` | `''` | URL 路径前缀 |
| `language` | `string` | `'zh-CN'` | HTML lang 属性 |

## themeConfig

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `nav` | `Array<{text, link}>` | `[]` | 顶部导航链接 |
| `sidebar` | `'auto' \| Array` | `'auto'` | 侧边栏配置 |
| `search` | `boolean` | `true` | 启用搜索 |
| `darkMode` | `boolean` | `true` | 启用暗色模式 |
| `lastUpdated` | `boolean` | `true` | 显示最后更新时间 |
| `editLink` | `string` | `''` | 编辑链接前缀 |
| `footer.message` | `string` | `'Powered by Ink'` | 页脚信息 |
| `footer.copyright` | `string` | `''` | 版权信息 |

## Frontmatter

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | `string` | 页面标题 |
| `description` | `string` | 页面描述 |
| `order` | `number` | 侧边栏排序（默认 999） |

## CLI 命令

| 命令 | 说明 |
|------|------|
| `ink init [name]` | 创建新项目 |
| `ink new <path>` | 创建新文档页面 |
| `ink build` | 构建静态站点 |
| `ink dev [port]` | 启动开发服务器 |
| `ink clean` | 清理 dist/ |
| `ink migrate <dir>` | 从 VitePress 迁移 |
