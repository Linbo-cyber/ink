---
title: 配置
order: 2
---

# 配置

所有配置在 `ink.config.js` 中完成。

## 基础配置

```js
module.exports = {
  title: 'My Docs',          // 站点标题
  description: '文档描述',    // SEO 描述
  basePath: '',               // 路径前缀（GitHub 项目页面填仓库名如 '/my-docs'）
  language: 'zh-CN',          // 语言
};
```

## 主题配置

```js
module.exports = {
  themeConfig: {
    // 顶部导航
    nav: [
      { text: '指南', link: '/guide/getting-started.html' },
      { text: 'GitHub', link: 'https://github.com/you/repo' }
    ],

    // 侧边栏：'auto' 自动从文件系统生成，或手动配置数组
    sidebar: 'auto',

    // 功能开关
    search: true,        // Ctrl+K 搜索
    darkMode: true,      // 暗色模式切换
    lastUpdated: true,   // 显示最后更新时间

    // 页脚
    footer: {
      message: 'Powered by Ink',
      copyright: '© 2026 Your Name'
    }
  }
};
```

## 侧边栏

### 自动模式

设置 `sidebar: 'auto'`，Ink 会根据 `docs/` 目录结构自动生成侧边栏：

- 子目录 → 分组标题
- `.md` 文件 → 侧边栏链接
- 通过 frontmatter 的 `order` 字段控制排序（默认 999）
- 分组标题取自目录下 `index.md` 的 `title`

### 手动模式

```js
sidebar: [
  { text: '首页', link: '/index.html' },
  {
    text: '指南',
    items: [
      { text: '快速开始', link: '/guide/getting-started.html' },
      { text: '配置', link: '/guide/configuration.html' }
    ]
  }
]
```

## Frontmatter

每个 `.md` 文件支持 YAML frontmatter：

```yaml
---
title: 页面标题        # 侧边栏和浏览器标题
description: 页面描述  # SEO meta description
order: 1              # 侧边栏排序（数字越小越靠前）
---
```
