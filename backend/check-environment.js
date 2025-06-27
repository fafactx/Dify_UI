// check-environment.js - 环境检查和自动修复脚本
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 开始环境检查...\n');

// 检查Node.js版本
function checkNodeVersion() {
  console.log('📋 检查Node.js版本...');
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  console.log(`   当前版本: ${nodeVersion}`);

  if (majorVersion < 14) {
    console.log('❌ Node.js版本过低，建议使用14.0.0或更高版本');
    return false;
  } else {
    console.log('✅ Node.js版本符合要求');
    return true;
  }
}

// 检查依赖包
function checkDependencies() {
  console.log('\n📦 检查依赖包...');

  const packageJsonPath = path.join(__dirname, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log('❌ package.json文件不存在');
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = packageJson.dependencies || {};

  console.log('   检查关键依赖:');

  const criticalDeps = [
    'better-sqlite3',
    'express',
    'cors',
    'body-parser'
  ];

  let allDepsOk = true;

  for (const dep of criticalDeps) {
    if (dependencies[dep]) {
      console.log(`   ✅ ${dep}: ${dependencies[dep]}`);
    } else {
      console.log(`   ❌ ${dep}: 缺失`);
      allDepsOk = false;
    }
  }

  // 检查node_modules
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('   ❌ node_modules目录不存在，需要运行npm install');
    allDepsOk = false;
  } else {
    console.log('   ✅ node_modules目录存在');
  }

  return allDepsOk;
}

// 检查Better-SQLite3编译
function checkBetterSqlite3() {
  console.log('\n🗄️  检查Better-SQLite3编译状态...');

  try {
    const sqlite3 = require('better-sqlite3');
    console.log('   ✅ Better-SQLite3加载成功');

    // 测试创建内存数据库
    const testDb = sqlite3(':memory:');
    testDb.exec('CREATE TABLE test (id INTEGER PRIMARY KEY)');
    testDb.exec('INSERT INTO test (id) VALUES (1)');
    const result = testDb.prepare('SELECT COUNT(*) as count FROM test').get();
    testDb.close();

    if (result.count === 1) {
      console.log('   ✅ Better-SQLite3功能测试通过');
      return true;
    } else {
      console.log('   ❌ Better-SQLite3功能测试失败');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Better-SQLite3加载失败: ${error.message}`);

    // 检查是否是段错误相关
    if (error.message.includes('segmentation fault') ||
        error.message.includes('SIGSEGV') ||
        error.message.includes('Module did not self-register')) {
      console.log('   🚨 检测到段错误或模块注册问题');
      console.log('   💡 启动脚本将自动重新编译Better-SQLite3');
    } else {
      console.log('   💡 可能需要重新编译，尝试运行: npm rebuild better-sqlite3');
    }
    return false;
  }
}

// 检查数据目录
function checkDataDirectory() {
  console.log('\n📁 检查数据目录...');

  const dataDir = path.join(__dirname, 'data');

  if (!fs.existsSync(dataDir)) {
    console.log('   ⚠️  数据目录不存在，正在创建...');
    try {
      fs.mkdirSync(dataDir, { recursive: true, mode: 0o755 });
      console.log('   ✅ 数据目录创建成功');
    } catch (error) {
      console.log(`   ❌ 数据目录创建失败: ${error.message}`);
      return false;
    }
  } else {
    console.log('   ✅ 数据目录存在');
  }

  // 检查权限
  try {
    fs.accessSync(dataDir, fs.constants.R_OK | fs.constants.W_OK);
    console.log('   ✅ 数据目录权限正常');
    return true;
  } catch (error) {
    console.log(`   ❌ 数据目录权限不足: ${error.message}`);
    return false;
  }
}

// 检查配置文件
function checkConfigFiles() {
  console.log('\n⚙️  检查配置文件...');

  const configPath = path.join(__dirname, 'config.js');
  if (!fs.existsSync(configPath)) {
    console.log('   ❌ config.js文件不存在');
    return false;
  } else {
    console.log('   ✅ config.js文件存在');
  }

  // 检查前端配置
  const frontendConfigPath = path.join(__dirname, '../frontend-html/js/config.js');
  if (!fs.existsSync(frontendConfigPath)) {
    console.log('   ❌ 前端config.js文件不存在');
    return false;
  } else {
    console.log('   ✅ 前端config.js文件存在');

    // 检查IP配置
    const frontendConfig = fs.readFileSync(frontendConfigPath, 'utf8');
    if (frontendConfig.includes('10.193.21.115')) {
      console.log('   ✅ 前端IP配置正确 (10.193.21.115)');
    } else {
      console.log('   ⚠️  前端IP配置可能需要更新');
    }
  }

  return true;
}

// 检查端口占用
function checkPortAvailability() {
  console.log('\n🔌 检查端口3000占用情况...');

  try {
    if (process.platform === 'win32') {
      // Windows系统
      const result = execSync('netstat -ano | findstr :3000', { encoding: 'utf8' });
      if (result.trim()) {
        const lines = result.trim().split('\n');
        const pids = lines.map(line => {
          const parts = line.trim().split(/\s+/);
          return parts[parts.length - 1];
        }).filter(pid => pid && !isNaN(pid));

        if (pids.length > 0) {
          console.log(`   ⚠️  端口3000被以下进程占用: ${pids.join(', ')}`);
          console.log('   💡 启动脚本会自动终止这些进程');
          return false;
        }
      }
    } else {
      // Linux/macOS系统
      const result = execSync('lsof -ti:3000 2>/dev/null || true', { encoding: 'utf8' });
      if (result.trim()) {
        const pids = result.trim().split('\n').filter(pid => pid);
        console.log(`   ⚠️  端口3000被以下进程占用: ${pids.join(', ')}`);
        console.log('   💡 启动脚本会自动终止这些进程');
        return false;
      }
    }

    console.log('   ✅ 端口3000可用');
    return true;
  } catch (error) {
    console.log('   ✅ 端口3000可用 (检查命令执行失败，但这通常表示端口未被占用)');
    return true;
  }
}

// 自动修复函数
function autoFix() {
  console.log('\n🔧 开始自动修复...\n');

  // 检查是否需要清理重装
  const needsCleanInstall = !checkBetterSqlite3();

  if (needsCleanInstall) {
    console.log('🧹 检测到严重问题，执行完全清理重装...');

    // 清理node_modules
    const nodeModulesPath = path.join(__dirname, 'node_modules');
    const packageLockPath = path.join(__dirname, 'package-lock.json');

    try {
      if (fs.existsSync(nodeModulesPath)) {
        console.log('   删除node_modules目录...');
        fs.rmSync(nodeModulesPath, { recursive: true, force: true });
      }

      if (fs.existsSync(packageLockPath)) {
        console.log('   删除package-lock.json...');
        fs.unlinkSync(packageLockPath);
      }
    } catch (error) {
      console.log('⚠️  清理文件时出错:', error.message);
    }
  }

  // 修复依赖
  console.log('📦 安装/更新依赖包...');
  try {
    execSync('npm install', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ 依赖包安装完成');
  } catch (error) {
    console.log('❌ 依赖包安装失败:', error.message);
    return false;
  }

  // 重新编译Better-SQLite3
  console.log('\n🔨 重新编译Better-SQLite3...');
  try {
    execSync('npm rebuild better-sqlite3', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ Better-SQLite3重新编译完成');

    // 测试编译结果
    if (!checkBetterSqlite3()) {
      console.log('⚠️  编译完成但测试失败，尝试使用稳定版本...');

      // 尝试使用稳定版本
      execSync('npm uninstall better-sqlite3', { stdio: 'inherit', cwd: __dirname });
      execSync('npm install better-sqlite3@8.4.0', { stdio: 'inherit', cwd: __dirname });

      if (!checkBetterSqlite3()) {
        console.log('❌ 使用稳定版本仍然失败');
        return false;
      } else {
        console.log('✅ 稳定版本安装成功');
      }
    }
  } catch (error) {
    console.log('❌ Better-SQLite3重新编译失败:', error.message);
    console.log('💡 请确保系统已安装编译工具:');
    console.log('   Windows: npm install --global windows-build-tools');
    console.log('   Ubuntu/Debian: sudo apt-get install build-essential python3');
    console.log('   CentOS/RHEL: sudo yum groupinstall "Development Tools"');

    // 尝试使用预编译版本作为备选
    console.log('\n🔄 尝试使用预编译版本...');
    try {
      execSync('npm uninstall better-sqlite3', { stdio: 'inherit', cwd: __dirname });
      execSync('npm install better-sqlite3@8.4.0', { stdio: 'inherit', cwd: __dirname });

      if (checkBetterSqlite3()) {
        console.log('✅ 预编译版本安装成功');
      } else {
        return false;
      }
    } catch (fallbackError) {
      console.log('❌ 预编译版本也失败:', fallbackError.message);
      return false;
    }
  }

  // 修复npm安全漏洞
  console.log('\n🔒 修复npm安全漏洞...');
  try {
    execSync('npm audit fix --force', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ 安全漏洞修复完成');
  } catch (error) {
    console.log('⚠️  安全漏洞修复失败，但不影响系统运行:', error.message);
  }

  return true;
}

// 主函数
function main() {
  console.log('🚀 RAGLLM评估系统环境检查工具\n');

  const checks = [
    { name: 'Node.js版本', fn: checkNodeVersion },
    { name: '依赖包', fn: checkDependencies },
    { name: 'Better-SQLite3', fn: checkBetterSqlite3 },
    { name: '数据目录', fn: checkDataDirectory },
    { name: '配置文件', fn: checkConfigFiles },
    { name: '端口可用性', fn: checkPortAvailability }
  ];

  let allPassed = true;
  const failedChecks = [];

  for (const check of checks) {
    if (!check.fn()) {
      allPassed = false;
      failedChecks.push(check.name);
    }
  }

  console.log('\n📊 检查结果:');
  if (allPassed) {
    console.log('🎉 所有检查都通过了！系统应该可以正常运行。');
    console.log('\n🚀 现在可以启动服务器:');
    console.log('   node server.js');
  } else {
    console.log(`❌ 发现 ${failedChecks.length} 个问题: ${failedChecks.join(', ')}`);

    // 询问是否自动修复
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('\n🔧 是否尝试自动修复这些问题? (y/N): ', (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        if (autoFix()) {
          console.log('\n🎉 自动修复完成！请重新运行检查脚本验证。');
        } else {
          console.log('\n❌ 自动修复失败，请手动解决问题。');
        }
      } else {
        console.log('\n💡 请手动解决上述问题后重新运行检查。');
      }
      rl.close();
    });
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  checkNodeVersion,
  checkDependencies,
  checkBetterSqlite3,
  checkDataDirectory,
  checkConfigFiles,
  checkPortAvailability,
  autoFix
};
