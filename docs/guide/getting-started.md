---
title: 快速开始
order: 1
---

# 快速开始

## 安装

```bash
git clone https://github.com/Linbo-cyber/ink.git my-docs
cd my-docs
npm install
```

## 开发

```bash
npm run dev
```

打开 `http://localhost:3000/` 即可预览。修改 `docs/` 下的文件会自动重新构建。

## 项目结构

```
my-docs/
├── docs/              # 文档目录（文件系统路由）
│   ├── index.md       # 首页
│   ├── guide/         # 分组：指南
│   │   ├── getting-started.md
│   │   └── configuration.md
│   └── reference/     # 分组：参考
│       └── config.md
├── themes/default/    # 主题
├── ink.config.js      # 配置文件
├── build.js           # 构建引擎
└── package.json
```

## 创建新页面

```bash
node bin/ink.js new guide/my-page
```

或手动在 `docs/` 下创建 `.md` 文件：

```markdown
---
title: 页面标题
order: 1
---

# 页面标题

正文内容...
```

## 构建

```bash
npm run build
```

输出到 `dist/` 目录，可直接部署到任何静态托管服务。

## 部署到 GitHub Pages

推送到 GitHub 后，仓库内置的 `.github/workflows/deploy.yml` 会自动构建并部署。

只需在 Settings → Pages 中将 Source 设为 **GitHub Actions** 即可。
