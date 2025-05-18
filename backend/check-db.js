// 数据库检查工具
const path = require('path');
const fs = require('fs');
const { getDatabase } = require('./database');
const config = require('./config');

// 获取数据库路径
let dbPath;
if (path.isAbsolute(config.storage.dataDir)) {
  dbPath = path.join(config.storage.dataDir, 'evaluations.db');
  console.log(`使用绝对路径构建数据库路径: ${dbPath}`);
} else {
  dbPath = path.join(__dirname, config.storage.dataDir, 'evaluations.db');
  console.log(`使用相对路径构建数据库路径: ${dbPath}`);
}

console.log(`连接到数据库: ${dbPath}`);

// 检查数据库文件是否存在
if (fs.existsSync(dbPath)) {
  const stats = fs.statSync(dbPath);
  console.log(`数据库文件存在: ${dbPath}`);
  console.log(`- 大小: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`- 权限: ${stats.mode.toString(8)}`);

  // 在 Linux 环境中显示用户和组信息
  if (process.platform !== 'win32') {
    console.log(`- 用户: ${stats.uid}`);
    console.log(`- 组: ${stats.gid}`);
  }

  console.log(`- 最后修改时间: ${stats.mtime}`);
} else {
  console.warn(`数据库文件不存在: ${dbPath}`);
  console.warn('将尝试创建数据库文件');

  // 确保数据目录存在
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    console.log(`数据目录不存在，正在创建: ${dbDir}`);
    fs.mkdirSync(dbDir, { recursive: true, mode: 0o755 });
  }

  // 创建空数据库文件
  try {
    fs.writeFileSync(dbPath, '', { mode: 0o666 });
    console.log(`创建空数据库文件: ${dbPath}`);
  } catch (createError) {
    console.error(`创建空数据库文件失败: ${createError.message}`);
  }
}

// 检查数据目录
const dbDir = path.dirname(dbPath);
if (fs.existsSync(dbDir)) {
  const dirStats = fs.statSync(dbDir);
  console.log(`数据目录存在: ${dbDir}`);
  console.log(`- 权限: ${dirStats.mode.toString(8)}`);

  // 列出目录内容
  try {
    const dirContents = fs.readdirSync(dbDir);
    console.log(`- 目录内容: ${dirContents.join(', ') || '(空)'}`);
  } catch (readError) {
    console.error(`无法读取目录内容: ${readError.message}`);
  }
} else {
  console.warn(`数据目录不存在: ${dbDir}`);
}

// 获取数据库连接
const db = getDatabase(dbPath);

// 查询评估数据总数
const countStmt = db.prepare('SELECT COUNT(*) as count FROM evaluations');
const { count } = countStmt.get();
console.log(`数据库中共有 ${count} 条评估数据`);

// 查询最新的10条评估数据
console.log('\n最新的10条评估数据:');
const recentStmt = db.prepare(`
  SELECT id, result_key, date, json_extract(data, '$."CAS Name"') as cas_name,
         json_extract(data, '$."Product Family"') as product_family,
         json_extract(data, '$."Part Number"') as part_number,
         json_extract(data, '$.average_score') as average_score
  FROM evaluations
  ORDER BY timestamp DESC
  LIMIT 10
`);

const recentData = recentStmt.all();
recentData.forEach(row => {
  console.log(`ID: ${row.id}, 结果键: ${row.result_key}, 日期: ${row.date}`);
  console.log(`  CAS名称: ${row.cas_name}, 产品系列: ${row.product_family}, 零件编号: ${row.part_number}`);
  console.log(`  平均分: ${row.average_score}`);
  console.log('-----------------------------------');
});

// 查看表结构
console.log('\n数据库表结构:');
const tablesStmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table'");
const tables = tablesStmt.all();
tables.forEach(table => {
  console.log(`\n表名: ${table.name}`);
  const columnsStmt = db.prepare(`PRAGMA table_info(${table.name})`);
  const columns = columnsStmt.all();
  columns.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });
});

// 检查是否有数据格式问题
console.log('\n检查数据格式问题:');
try {
  const invalidDataStmt = db.prepare(`
    SELECT id, result_key
    FROM evaluations
    WHERE json_valid(data) = 0
  `);
  const invalidData = invalidDataStmt.all();

  if (invalidData.length > 0) {
    console.log(`发现 ${invalidData.length} 条无效的JSON数据:`);
    invalidData.forEach(row => {
      console.log(`  ID: ${row.id}, 结果键: ${row.result_key}`);
    });
  } else {
    console.log('所有数据格式正确');
  }
} catch (error) {
  console.log('检查数据格式时出错:', error.message);
}

// 检查维度字段
console.log('\n检查维度字段:');
try {
  const dimensionsStmt = db.prepare(`
    SELECT id, result_key,
           json_extract(data, '$.hallucination_control') as hallucination_control,
           json_extract(data, '$.quality') as quality,
           json_extract(data, '$.professionalism') as professionalism,
           json_extract(data, '$.usefulness') as usefulness
    FROM evaluations
    LIMIT 5
  `);

  const dimensionsData = dimensionsStmt.all();
  dimensionsData.forEach(row => {
    console.log(`ID: ${row.id}, 结果键: ${row.result_key}`);
    console.log(`  幻觉控制: ${row.hallucination_control}, 质量: ${row.quality}`);
    console.log(`  专业性: ${row.professionalism}, 有用性: ${row.usefulness}`);
    console.log('-----------------------------------');
  });
} catch (error) {
  console.log('检查维度字段时出错:', error.message);
}

// 检查是否有 JSON 文件
console.log('\n检查 JSON 文件:');
const jsonFiles = fs.readdirSync(dbDir).filter(file =>
  file.endsWith('.json') && (file.startsWith('evaluation_') || file === 'index.json')
);

if (jsonFiles.length > 0) {
  console.warn(`发现 ${jsonFiles.length} 个 JSON 文件，这些文件不应该存在:`);
  jsonFiles.forEach(file => {
    console.warn(`- ${file}`);
  });

  console.log('这些 JSON 文件可能会导致系统行为异常，建议删除它们');

  // 询问是否删除这些文件
  console.log('如果要删除这些 JSON 文件，请手动执行以下命令:');
  jsonFiles.forEach(file => {
    console.log(`rm "${path.join(dbDir, file)}"`);
  });
} else {
  console.log('未发现 JSON 文件，系统正确使用 SQLite 数据库');
}

console.log('\n数据库检查完成');
