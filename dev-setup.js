// dev-setup.js
const fs = require('fs');
const path = require('path');
const os = require('os');

// 获取本地IP地址
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 跳过非IPv4和内部接口
      if (iface.family !== 'IPv4' || iface.internal !== false) {
        continue;
      }
      return iface.address;
    }
  }
  return '127.0.0.1';
}

// 主函数
async function main() {
  try {
    const localIp = getLocalIpAddress();
    console.log(`检测到本地IP地址: ${localIp}`);

    // 1. 更新backend/config.js中的publicUrl
    const configPath = path.join(__dirname, 'backend', 'config.js');
    let configContent = fs.readFileSync(configPath, 'utf8');
    configContent = configContent.replace(
      /publicUrl: process\.env\.PUBLIC_URL \|\| '.*?'/,
      `publicUrl: process.env.PUBLIC_URL || '${localIp}'`
    );
    fs.writeFileSync(configPath, configContent);
    console.log(`已更新backend/config.js中的publicUrl为${localIp}`);

    // 2. 创建前端配置文件
    const frontendConfigDir = path.join(__dirname, 'frontend-html', 'js');
    if (!fs.existsSync(frontendConfigDir)) {
      fs.mkdirSync(frontendConfigDir, { recursive: true });
    }
    
    const frontendConfigPath = path.join(frontendConfigDir, 'config.js');
    const frontendConfigContent = `// 自动生成的前端配置文件
window.appConfig = {
  apiBaseUrl: 'http://${localIp}:3000'
};
`;
    fs.writeFileSync(frontendConfigPath, frontendConfigContent);
    console.log(`已创建前端配置文件: frontend-html/js/config.js`);

    // 3. 修改前端HTML文件，引入配置文件
    const htmlPath = path.join(__dirname, 'frontend-html', 'raglim-dashboard.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // 检查是否已经引入了config.js
    if (!htmlContent.includes('<script src="js/config.js"></script>')) {
      // 在第一个script标签之前添加config.js
      htmlContent = htmlContent.replace(
        /<script/,
        '<script src="js/config.js"></script>\n    <script'
      );
      fs.writeFileSync(htmlPath, htmlContent);
      console.log(`已在HTML文件中引入config.js`);
    }

    // 4. 修改getApiBaseUrl函数
    if (htmlContent.includes('function getApiBaseUrl() {')) {
      htmlContent = htmlContent.replace(
        /function getApiBaseUrl\(\) \{\s*\/\/ 使用固定IP地址\s*return 'http:\/\/.*?:\d+';?\s*\}/,
        `function getApiBaseUrl() {
        // 使用配置文件中的API基础URL
        return window.appConfig.apiBaseUrl;
    }`
      );
      fs.writeFileSync(htmlPath, htmlContent);
      console.log(`已修改getApiBaseUrl函数，使用配置文件中的API基础URL`);
    }

    console.log('开发环境配置完成！');
    console.log(`前端URL: http://${localIp}:3001`);
    console.log(`后端URL: http://${localIp}:3000`);
    console.log('现在可以启动开发服务器了。');
  } catch (error) {
    console.error('配置开发环境时出错:', error);
  }
}

// 执行主函数
main();
