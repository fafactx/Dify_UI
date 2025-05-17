/**
 * 项目设置脚本
 * 
 * 此脚本帮助用户设置项目，包括：
 * 1. 创建必要的目录
 * 2. 复制配置文件模板
 * 3. 提示用户设置身份验证凭据
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 项目根目录
const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const dataDir = path.join(backendDir, 'data');

// 确保数据目录存在
if (!fs.existsSync(dataDir)) {
  console.log('创建数据目录...');
  fs.mkdirSync(dataDir, { recursive: true });
}

// 检查配置文件是否存在
const configExamplePath = path.join(backendDir, 'config.example.js');
const configPath = path.join(backendDir, 'config.js');

if (!fs.existsSync(configExamplePath)) {
  console.error('错误: 配置文件模板不存在!');
  process.exit(1);
}

// 如果配置文件不存在，创建它
if (!fs.existsSync(configPath)) {
  console.log('配置文件不存在，将创建新的配置文件...');
  
  rl.question('请输入用户名 (默认: admin): ', (username) => {
    username = username || 'admin';
    
    rl.question('请输入密码 (默认: admin): ', (password) => {
      password = password || 'admin';
      
      // 读取配置模板
      const configExample = fs.readFileSync(configExamplePath, 'utf8');
      
      // 替换用户名和密码
      const config = configExample
        .replace('your_username', username)
        .replace('your_password', password);
      
      // 写入配置文件
      fs.writeFileSync(configPath, config);
      
      console.log('\n配置文件已创建!');
      console.log(`用户名: ${username}`);
      console.log(`密码: ${'*'.repeat(password.length)}`);
      console.log('\n您可以随时编辑 backend/config.js 文件修改这些设置。');
      
      rl.close();
    });
  });
} else {
  console.log('配置文件已存在，跳过创建...');
  console.log('如需重新配置，请删除 backend/config.js 文件后重新运行此脚本。');
  rl.close();
}

// 监听关闭事件
rl.on('close', () => {
  console.log('\n设置完成!');
  console.log('您现在可以运行以下命令启动项目:');
  console.log('  npm run install:all  # 安装所有依赖');
  console.log('  npm run start        # 启动后端和前端');
});
