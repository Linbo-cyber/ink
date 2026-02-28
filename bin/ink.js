#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
  build() {
    require(path.join(process.cwd(), 'build.js'));
  },

  dev() {
    const chokidar = require('chokidar');
    const http = require('http');
    const port = parseInt(args[0]) || 3000;

    this.build();

    const distDir = path.join(process.cwd(), 'dist');
    const mimeTypes = {
      '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
      '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2'
    };

    const server = http.createServer((req, res) => {
      let url = req.url.split('?')[0];
      if (url.endsWith('/')) url += 'index.html';
      if (!path.extname(url)) url += '.html';
      const filePath = path.join(distDir, url);
      try {
        const content = fs.readFileSync(filePath);
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        res.end(content);
      } catch {
        try {
          const html404 = fs.readFileSync(path.join(distDir, '404.html'));
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end(html404);
        } catch {
          res.writeHead(404);
          res.end('Not Found');
        }
      }
    });

    server.listen(port, () => {
      console.log(`\n  Ink dev server running at:\n  → http://localhost:${port}/\n`);
    });

    let building = false;
    chokidar.watch(['docs', 'themes', 'ink.config.js'], {
      ignoreInitial: true, ignored: /node_modules|dist/
    }).on('all', () => {
      if (building) return;
      building = true;
      setTimeout(() => {
        try {
          // Re-run build
          delete require.cache[path.join(process.cwd(), 'build.js')];
          delete require.cache[path.join(process.cwd(), 'ink.config.js')];
          require(path.join(process.cwd(), 'build.js'));
        } catch (e) { console.error(e.message); }
        building = false;
      }, 100);
    });
  },

  init() {
    const name = args[0] || 'my-docs';
    const dir = path.join(process.cwd(), name);
    if (fs.existsSync(dir)) { console.error(`Error: ${name}/ already exists`); process.exit(1); }

    console.log(`Creating ${name}/...`);
    execSync(`git clone --depth 1 https://github.com/Linbo-cyber/ink.git "${name}"`, { stdio: 'pipe' });
    fs.rmSync(path.join(dir, '.git'), { recursive: true, force: true });

    // Clean demo docs, keep structure
    console.log('Installing dependencies...');
    execSync('npm install', { cwd: dir, stdio: 'inherit' });
    console.log(`\n  Done! cd ${name} && npm run dev\n`);
  },

  new() {
    const filePath = args[0];
    if (!filePath) { console.error('Usage: ink new <path>'); process.exit(1); }
    const full = path.join(process.cwd(), 'docs', filePath.endsWith('.md') ? filePath : `${filePath}.md`);
    if (fs.existsSync(full)) { console.error(`File already exists: ${full}`); process.exit(1); }
    fs.mkdirSync(path.dirname(full), { recursive: true });
    const title = path.basename(filePath, '.md').replace(/-/g, ' ');
    fs.writeFileSync(full, `---\ntitle: ${title}\norder: 1\n---\n\n# ${title}\n\n`);
    console.log(`Created: ${full}`);
  },

  clean() {
    const dist = path.join(process.cwd(), 'dist');
    if (fs.existsSync(dist)) { fs.rmSync(dist, { recursive: true }); console.log('Cleaned dist/'); }
  },

  migrate() {
    const src = args[0];
    if (!src) { console.error('Usage: ink migrate <vitepress-dir>'); process.exit(1); }
    console.log('VitePress migration: coming soon');
  }
};

if (!cmd || cmd === '--help' || cmd === '-h') {
  console.log(`
  Ink — 极简文档框架

  Usage: ink <command>

  Commands:
    init [name]     Create new docs project
    new <path>      Create new doc page
    build           Build static site
    dev [port]      Dev server with hot reload
    clean           Remove dist/
    migrate <dir>   Migrate from VitePress
  `);
  process.exit(0);
}

if (commands[cmd]) commands[cmd]();
else { console.error(`Unknown command: ${cmd}`); process.exit(1); }
