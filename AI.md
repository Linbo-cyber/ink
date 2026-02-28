# Ink 文档站 — AI 部署指南

你正在帮助用户部署一个 Ink 文档站点。请按以下步骤操作：

## 环境要求

- Node.js >= 18
- npm
- Git

## 部署步骤

### 1. 创建项目

```bash
git clone https://github.com/Linbo-cyber/ink.git my-docs
cd my-docs
rm -rf .git && git init
npm install
```

### 2. 配置站点

编辑 `ink.config.js`，询问用户以下信息：

| 字段 | 说明 | 示例 |
|------|------|------|
| `title` | 站点标题 | `'My Docs'` |
| `description` | 站点描述 | `'项目文档'` |
| `basePath` | 路径前缀（项目页面填仓库名，用户页面留空） | `'/my-docs'` 或 `''` |
| `language` | 语言 | `'zh-CN'` 或 `'en'` |

### 3. 编写文档

在 `docs/` 目录下创建 `.md` 文件，目录结构即导航结构：

```
docs/
├── index.md          # 首页
├── guide/
│   ├── getting-started.md
│   └── configuration.md
└── api/
    └── reference.md
```

每个文件需要 frontmatter：

```markdown
---
title: 页面标题
order: 1
---

# 页面标题

正文...
```

### 4. 构建验证

```bash
npm run build
```

确认 `dist/` 目录生成正常。

### 5. 推送到 GitHub

```bash
git add -A
git commit -m "init: my docs"
git remote add origin https://github.com/用户名/仓库名.git
git push -u origin main
```

### 6. 启用 GitHub Pages

告诉用户：
1. 进入 GitHub 仓库 → Settings → Pages
2. Source 选择 **GitHub Actions**
3. 等待 Actions 构建完成
4. 访问 `https://用户名.github.io/仓库名/`

## Markdown 扩展

```markdown
::: tip
提示框
:::

::: warning
警告框
:::

{% badge text="推荐" type="tip" %}

{% tabs %}
{% tab "npm" %}
npm install
{% endtab %}
{% tab "yarn" %}
yarn add
{% endtab %}
{% endtabs %}
```

## 注意事项

- `basePath` 必须正确，否则资源路径会 404
- 侧边栏默认自动生成，用 `order` 字段控制排序
- 支持 Ctrl+K 搜索、暗色模式、TOC、代码复制
