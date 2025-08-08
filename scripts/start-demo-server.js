/**
 * 智游助手v6.2 - Phase 2演示页面服务器
 * 启动本地服务器展示Phase 2架构优化成果
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 9527;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// MIME类型映射
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// 创建HTTP服务器
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;

  // 默认页面
  if (pathname === '/') {
    pathname = '/phase2-demo.html';
  }

  const filePath = path.join(PUBLIC_DIR, pathname);
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = mimeTypes[ext] || 'application/octet-stream';

  // 检查文件是否存在
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // 文件不存在，返回404
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>404 - 页面未找到</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                h1 { color: #dc3545; }
                a { color: #007bff; text-decoration: none; }
                a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <h1>404 - 页面未找到</h1>
            <p>请求的页面不存在</p>
            <a href="/">返回首页</a>
        </body>
        </html>
      `);
      return;
    }

    // 读取并返回文件
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
              <title>500 - 服务器错误</title>
              <style>
                  body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                  h1 { color: #dc3545; }
              </style>
          </head>
          <body>
              <h1>500 - 服务器内部错误</h1>
              <p>无法读取请求的文件</p>
          </body>
          </html>
        `);
        return;
      }

      // 设置响应头
      res.writeHead(200, { 
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    });
  });
});

// 启动服务器
server.listen(PORT, () => {
  console.log('🚀 智游助手v6.2 Phase 2演示服务器启动成功！');
  console.log('=' .repeat(60));
  console.log(`📍 本地访问地址: http://localhost:${PORT}`);
  console.log(`📱 移动端访问: http://[您的IP地址]:${PORT}`);
  console.log('=' .repeat(60));
  console.log('📋 演示内容:');
  console.log('  🎯 智能缓存策略 - 缓存命中率从23.7%提升至80.0%');
  console.log('  🔧 依赖注入重构 - 构造函数参数从6个减少至1个');
  console.log('  📊 性能监控增强 - 集成LangGraph执行指标');
  console.log('  🗺️  腾讯地图集成 - 东三省旅行规划演示');
  console.log('=' .repeat(60));
  console.log('💡 提示: 按 Ctrl+C 停止服务器');
  console.log('');

  // 尝试自动打开浏览器
  const open = require('child_process').exec;
  const url = `http://localhost:${PORT}`;
  
  // 根据操作系统选择打开命令
  let cmd;
  switch (process.platform) {
    case 'darwin': // macOS
      cmd = `open ${url}`;
      break;
    case 'win32': // Windows
      cmd = `start ${url}`;
      break;
    default: // Linux
      cmd = `xdg-open ${url}`;
      break;
  }

  open(cmd, (error) => {
    if (error) {
      console.log('⚠️  无法自动打开浏览器，请手动访问上述地址');
    } else {
      console.log('🌐 浏览器已自动打开演示页面');
    }
  });
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

// 错误处理
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ 端口 ${PORT} 已被占用，请尝试其他端口`);
    console.error('💡 您可以修改脚本中的 PORT 变量来使用其他端口');
  } else {
    console.error('❌ 服务器启动失败:', err.message);
  }
  process.exit(1);
});

// 显示系统信息
console.log('🖥️  系统信息:');
console.log(`   操作系统: ${process.platform}`);
console.log(`   Node.js版本: ${process.version}`);
console.log(`   工作目录: ${process.cwd()}`);
console.log(`   静态文件目录: ${PUBLIC_DIR}`);
console.log('');
