#!/usr/bin/env node

/**
 * 生产环境启动脚本
 * 设置环境变量以减少日志输出，提高性能
 */

// 设置生产环境
process.env.NODE_ENV = 'production';

// 启动服务器
require('./server.js');
