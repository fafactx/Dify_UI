// 简单的网络连接测试脚本
const http = require('http');
const config = require('./backend/config');

const HOST = config.server.host;
const PORT = config.server.port;
const PUBLIC_URL = config.server.publicUrl;

console.log('🔍 网络连接测试');
console.log('================');
console.log(`配置的主机: ${HOST}`);
console.log(`配置的端口: ${PORT}`);
console.log(`公共URL: ${PUBLIC_URL}`);
console.log('');

// 测试本地连接
function testConnection(host, port, description) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      port: port,
      path: '/api/stats',
      method: 'GET',
      timeout: 5000
    };

    console.log(`测试 ${description}: http://${host}:${port}/api/stats`);

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`✅ ${description} - 状态: ${res.statusCode}`);
        console.log(`   响应长度: ${data.length} 字节`);
        
        try {
          const jsonData = JSON.parse(data);
          console.log(`   数据格式: 有效JSON`);
          console.log(`   统计数据:`, jsonData.stats ? '存在' : '不存在');
          if (jsonData.stats) {
            console.log(`   记录数量: ${jsonData.stats.count || 0}`);
            console.log(`   平均分: ${jsonData.stats.overall_average || 0}`);
          }
        } catch (parseError) {
          console.log(`   数据格式: 无效JSON - ${parseError.message}`);
          console.log(`   原始响应: ${data.substring(0, 200)}...`);
        }
        
        resolve({ success: true, status: res.statusCode, data });
      });
    });

    req.on('error', (err) => {
      console.log(`❌ ${description} - 错误: ${err.message}`);
      resolve({ success: false, error: err.message });
    });

    req.on('timeout', () => {
      console.log(`⏰ ${description} - 超时`);
      req.destroy();
      resolve({ success: false, error: 'timeout' });
    });

    req.end();
  });
}

async function runTests() {
  console.log('开始连接测试...\n');

  // 测试不同的连接方式
  await testConnection('localhost', PORT, 'localhost连接');
  await testConnection('127.0.0.1', PORT, '127.0.0.1连接');
  await testConnection(PUBLIC_URL, PORT, `${PUBLIC_URL}连接`);
  
  // 如果HOST不是0.0.0.0，也测试HOST
  if (HOST !== '0.0.0.0' && HOST !== 'localhost' && HOST !== '127.0.0.1' && HOST !== PUBLIC_URL) {
    await testConnection(HOST, PORT, `${HOST}连接`);
  }

  console.log('\n测试完成！');
  console.log('\n💡 建议:');
  console.log('1. 确保服务器正在运行');
  console.log('2. 检查防火墙设置');
  console.log('3. 确认前端配置文件中的API地址正确');
  console.log(`4. 前端应该使用: http://${PUBLIC_URL}:${PORT}`);
}

runTests().catch(console.error);
