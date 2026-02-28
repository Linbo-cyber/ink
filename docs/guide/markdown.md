---
title: Markdown 扩展
order: 3
---

# Markdown 扩展

Ink 支持标准 GFM Markdown，并扩展了以下功能。

## 容器

```markdown
::: tip
这是一个提示
:::

::: warning
这是一个警告
:::

::: danger
这是一个危险提示
:::

::: info
这是一条信息
:::

::: details[点击展开]
折叠内容
:::
```

::: tip
这是一个提示
:::

::: warning
这是一个警告
:::

::: danger
这是一个危险提示
:::

::: info
这是一条信息
:::

::: details[点击展开]
这里是折叠的内容，点击上方标题展开。
:::

## 自定义容器标题

```markdown
::: tip[小贴士]
自定义标题的提示框
:::
```

::: tip[小贴士]
自定义标题的提示框
:::

## 徽章

```markdown
{% badge text="推荐" type="tip" %}
{% badge text="实验性" type="warning" %}
{% badge text="已废弃" type="danger" %}
```

稳定 API {% badge text="推荐" type="tip" %} 和实验性功能 {% badge text="实验性" type="warning" %}

## 选项卡

```markdown
{% tabs %}
{% tab "npm" %}
npm install ink-docs
{% endtab %}
{% tab "yarn" %}
yarn add ink-docs
{% endtab %}
{% tab "pnpm" %}
pnpm add ink-docs
{% endtab %}
{% endtabs %}
```

{% tabs %}
{% tab "npm" %}

```bash
npm install ink-docs
```

{% endtab %}
{% tab "yarn" %}

```bash
yarn add ink-docs
```

{% endtab %}
{% tab "pnpm" %}

```bash
pnpm add ink-docs
```

{% endtab %}
{% endtabs %}

## 代码块

代码块自动带语言标签和复制按钮（hover 显示）。

```js
const ink = require('ink-docs');
ink.build();
```

## 表格

| 功能 | 支持 |
|------|------|
| GFM 表格 | ✅ |
| 自动换行 | ✅ |
| 横向滚动 | ✅ |

## CJK 自动空格

中文English混排会自动加空格，代码块内不受影响。
