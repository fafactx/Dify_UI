// port-manager.js - 端口管理工具
const { execSync } = require('child_process');

class PortManager {
  constructor(port = 3000) {
    this.port = port;
    this.platform = process.platform;
  }

  // 检查端口是否被占用
  isPortInUse() {
    try {
      if (this.platform === 'win32') {
        const result = execSync(`netstat -ano | findstr :${this.port}`, { encoding: 'utf8' });
        return result.trim().length > 0;
      } else {
        const result = execSync(`lsof -ti:${this.port} 2>/dev/null || true`, { encoding: 'utf8' });
        return result.trim().length > 0;
      }
    } catch (error) {
      // 如果命令执行失败，通常表示端口未被占用
      return false;
    }
  }

  // 获取占用端口的进程ID
  getPortPids() {
    try {
      if (this.platform === 'win32') {
        const result = execSync(`netstat -ano | findstr :${this.port}`, { encoding: 'utf8' });
        if (!result.trim()) return [];
        
        const lines = result.trim().split('\n');
        const pids = lines.map(line => {
          const parts = line.trim().split(/\s+/);
          return parts[parts.length - 1];
        }).filter(pid => pid && !isNaN(pid));
        
        return [...new Set(pids)]; // 去重
      } else {
        const result = execSync(`lsof -ti:${this.port} 2>/dev/null || true`, { encoding: 'utf8' });
        if (!result.trim()) return [];
        
        return result.trim().split('\n').filter(pid => pid);
      }
    } catch (error) {
      return [];
    }
  }

  // 获取进程详细信息
  getProcessInfo(pid) {
    try {
      if (this.platform === 'win32') {
        const result = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV`, { encoding: 'utf8' });
        const lines = result.trim().split('\n');
        if (lines.length > 1) {
          const data = lines[1].split(',').map(item => item.replace(/"/g, ''));
          return {
            pid: pid,
            name: data[0],
            memory: data[4]
          };
        }
      } else {
        const result = execSync(`ps -p ${pid} -o pid,comm,rss --no-headers 2>/dev/null || true`, { encoding: 'utf8' });
        if (result.trim()) {
          const parts = result.trim().split(/\s+/);
          return {
            pid: parts[0],
            name: parts[1],
            memory: parts[2] + 'KB'
          };
        }
      }
    } catch (error) {
      return { pid: pid, name: 'Unknown', memory: 'Unknown' };
    }
    return null;
  }

  // 终止进程
  killProcess(pid, force = false) {
    try {
      if (this.platform === 'win32') {
        const command = force ? `taskkill /PID ${pid} /F` : `taskkill /PID ${pid}`;
        execSync(command, { stdio: 'ignore' });
      } else {
        const signal = force ? '-9' : '-15';
        execSync(`kill ${signal} ${pid}`, { stdio: 'ignore' });
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  // 清理端口占用
  async clearPort(options = {}) {
    const { 
      force = false, 
      waitTime = 2000, 
      maxRetries = 3,
      verbose = true 
    } = options;

    if (verbose) {
      console.log(`🔍 检查端口 ${this.port} 占用情况...`);
    }

    if (!this.isPortInUse()) {
      if (verbose) {
        console.log(`✅ 端口 ${this.port} 可用`);
      }
      return { success: true, message: '端口可用' };
    }

    const pids = this.getPortPids();
    if (pids.length === 0) {
      if (verbose) {
        console.log(`✅ 端口 ${this.port} 可用`);
      }
      return { success: true, message: '端口可用' };
    }

    if (verbose) {
      console.log(`⚠️  发现端口 ${this.port} 被 ${pids.length} 个进程占用`);
      
      // 显示进程信息
      for (const pid of pids) {
        const info = this.getProcessInfo(pid);
        if (info) {
          console.log(`   - PID: ${info.pid}, 进程: ${info.name}, 内存: ${info.memory}`);
        }
      }
    }

    // 尝试终止进程
    let attempt = 0;
    while (attempt < maxRetries && this.isPortInUse()) {
      attempt++;
      
      if (verbose) {
        console.log(`🔧 尝试终止占用进程 (第 ${attempt}/${maxRetries} 次)...`);
      }

      const currentPids = this.getPortPids();
      let killSuccess = true;

      for (const pid of currentPids) {
        const useForce = force || attempt > 1;
        const success = this.killProcess(pid, useForce);
        
        if (verbose) {
          const method = useForce ? '强制终止' : '优雅终止';
          console.log(`   ${success ? '✅' : '❌'} ${method} 进程 ${pid}: ${success ? '成功' : '失败'}`);
        }
        
        if (!success) {
          killSuccess = false;
        }
      }

      // 等待进程终止
      if (killSuccess) {
        await this.sleep(waitTime);
      }

      // 检查是否还有进程占用端口
      if (!this.isPortInUse()) {
        if (verbose) {
          console.log(`✅ 成功清理端口 ${this.port}`);
        }
        return { success: true, message: '端口清理成功' };
      }
    }

    // 最终检查
    if (this.isPortInUse()) {
      const remainingPids = this.getPortPids();
      const message = `无法清理端口 ${this.port}，仍有进程占用: ${remainingPids.join(', ')}`;
      
      if (verbose) {
        console.log(`❌ ${message}`);
        console.log('💡 可能需要管理员权限或手动终止进程');
      }
      
      return { 
        success: false, 
        message: message,
        remainingPids: remainingPids
      };
    }

    if (verbose) {
      console.log(`✅ 端口 ${this.port} 现在可用`);
    }
    return { success: true, message: '端口清理成功' };
  }

  // 查找可用端口
  findAvailablePort(startPort = this.port, maxPort = this.port + 100) {
    for (let port = startPort; port <= maxPort; port++) {
      const manager = new PortManager(port);
      if (!manager.isPortInUse()) {
        return port;
      }
    }
    return null;
  }

  // 辅助方法：睡眠
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 获取端口状态报告
  getPortReport() {
    const isInUse = this.isPortInUse();
    const pids = this.getPortPids();
    
    const report = {
      port: this.port,
      isInUse: isInUse,
      pids: pids,
      processes: []
    };

    if (isInUse && pids.length > 0) {
      report.processes = pids.map(pid => this.getProcessInfo(pid)).filter(info => info);
    }

    return report;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const port = process.argv[2] ? parseInt(process.argv[2]) : 3000;
  const manager = new PortManager(port);
  
  console.log(`🔍 端口 ${port} 状态检查`);
  console.log('========================');
  
  const report = manager.getPortReport();
  
  if (report.isInUse) {
    console.log(`❌ 端口 ${port} 被占用`);
    console.log(`占用进程数: ${report.pids.length}`);
    
    report.processes.forEach((proc, index) => {
      console.log(`${index + 1}. PID: ${proc.pid}, 进程: ${proc.name}, 内存: ${proc.memory}`);
    });
    
    console.log('\n是否要清理此端口? (y/N)');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('> ', async (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        const result = await manager.clearPort({ force: true });
        console.log(result.success ? '✅ 端口清理成功' : `❌ ${result.message}`);
      }
      rl.close();
    });
  } else {
    console.log(`✅ 端口 ${port} 可用`);
  }
}

module.exports = PortManager;
