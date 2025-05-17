// install.js - 安装脚本
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('开始安装依赖...');

// 确保数据目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  console.log('创建数据目录...');
  fs.mkdirSync(dataDir, { recursive: true });
}

// 安装依赖
try {
  console.log('安装 npm 依赖...');
  execSync('npm install', { stdio: 'inherit' });
  console.log('依赖安装成功！');
} catch (error) {
  console.error('安装依赖时出错:', error.message);
  process.exit(1);
}

console.log('\n安装完成！');
console.log('现在您可以运行 "npm start" 启动服务器。');
