// 数据库检查工具
const path = require('path');
const { getDatabase } = require('./database');

// 获取数据库连接
const dbPath = path.join(__dirname, 'data', 'evaluations.db');
console.log(`连接到数据库: ${dbPath}`);
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

console.log('\n数据库检查完成');
