// 数据库测试脚本 - 直接查询数据库并输出结果
const path = require('path');
const fs = require('fs');

// 检查数据库文件是否存在
const dbPath = path.join(__dirname, 'data', 'evaluations.db');
console.log(`检查数据库文件: ${dbPath}`);

if (!fs.existsSync(dbPath)) {
  console.error(`错误: 数据库文件不存在: ${dbPath}`);
  process.exit(1);
}

console.log(`数据库文件存在: ${dbPath}`);
console.log(`文件大小: ${(fs.statSync(dbPath).size / 1024).toFixed(2)} KB`);

// 加载数据库
try {
  const { getDatabase } = require('./database');
  const db = getDatabase(dbPath);
  console.log('成功连接到数据库');

  // 查询表
  const tablesStmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table'");
  const tables = tablesStmt.all();
  
  console.log('\n数据库中的表:');
  tables.forEach(table => {
    console.log(`- ${table.name}`);
  });

  // 查询评估数据总数
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM evaluations');
  const { count } = countStmt.get();
  console.log(`\n评估数据总数: ${count}`);

  if (count === 0) {
    console.log('警告: 数据库中没有评估数据');
  } else {
    // 查询最新的5条评估数据
    const recentStmt = db.prepare(`
      SELECT id, result_key, timestamp, date, data
      FROM evaluations
      ORDER BY timestamp DESC
      LIMIT 5
    `);
    
    const recentData = recentStmt.all();
    console.log('\n最新的5条评估数据:');
    
    recentData.forEach((row, index) => {
      const data = JSON.parse(row.data);
      console.log(`\n[${index + 1}] ID: ${row.id}, 结果键: ${row.result_key}, 日期: ${row.date}`);
      console.log(`  CAS名称: ${data['CAS Name'] || 'N/A'}`);
      console.log(`  产品系列: ${data['Product Family'] || 'N/A'}`);
      console.log(`  零件编号: ${data['Part Number'] || 'N/A'}`);
      console.log(`  平均分: ${data.average_score || 'N/A'}`);
      
      // 检查维度字段
      const dimensions = ['hallucination_control', 'quality', 'professionalism', 'usefulness'];
      const dimensionValues = dimensions.map(dim => `${dim}: ${data[dim] || 'N/A'}`).join(', ');
      console.log(`  维度: ${dimensionValues}`);
    });
  }

  // 检查数据结构
  if (count > 0) {
    const sampleStmt = db.prepare(`
      SELECT data FROM evaluations LIMIT 1
    `);
    
    const sample = sampleStmt.get();
    const sampleData = JSON.parse(sample.data);
    
    console.log('\n数据结构示例:');
    console.log(JSON.stringify(sampleData, null, 2));
  }

} catch (error) {
  console.error(`数据库查询出错: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}

console.log('\n数据库测试完成');
