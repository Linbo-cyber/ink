module.exports = {
  title: 'Ink',
  description: '极简文档框架 — 4 个依赖，200ms 构建',
  basePath: '/ink',
  language: 'zh-CN',
  themeConfig: {
    nav: [
      { text: '指南', link: '/ink/guide/getting-started.html' },
      { text: '参考', link: '/ink/reference/config.html' },
      { text: 'GitHub', link: 'https://github.com/Linbo-cyber/ink' }
    ],
    sidebar: 'auto',
    search: true,
    darkMode: true,
    editLink: 'https://github.com/Linbo-cyber/ink/edit/main/docs/',
    lastUpdated: true,
    footer: {
      message: 'Powered by <a href="https://github.com/Linbo-cyber/ink">Ink</a>',
      copyright: '© 2026 Lin Bo'
    }
  }
};
