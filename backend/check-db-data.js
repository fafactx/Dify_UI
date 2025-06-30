const Database = require('better-sqlite3');

try {
    const db = new Database('./data/evaluations.db');

    // 检查表结构
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('数据库表:', tables);

    // 检查evaluations表结构
    const schema = db.prepare("PRAGMA table_info(evaluations)").all();
    console.log('evaluations表结构:', schema);

    // 检查evaluations表的记录数
    const count = db.prepare('SELECT COUNT(*) as count FROM evaluations').get();
    console.log('evaluations表记录数:', count.count);

    // 如果有数据，显示前几条
    if (count.count > 0) {
        const samples = db.prepare('SELECT * FROM evaluations LIMIT 3').all();
        console.log('示例数据:', samples);
    } else {
        console.log('数据库为空，需要添加测试数据');

        // 添加一些测试数据
        const insertStmt = db.prepare(`
            INSERT INTO evaluations (result_key, data, timestamp)
            VALUES (?, ?, ?)
        `);

        const testData = [
            {
                result_key: 'test_result_1',
                data: JSON.stringify({
                    'CAS Name': 'mia.zhang_1@nxp.com',
                    'Product Family': 'IVN',
                    'Part Number': 'TJA1145A',
                    'MAG': 'R16',
                    'Question': 'Why can\'t TJA1145 work?',
                    'Answer': 'The TJA1145 may not work due to several reasons...',
                    'hallucination_control': 85,
                    'quality': 78,
                    'professionalism': 92,
                    'usefulness': 88,
                    'average_score': 85.75
                }),
                timestamp: new Date().toISOString()
            },
            {
                result_key: 'test_result_2',
                data: JSON.stringify({
                    'CAS Name': 'john.doe_2@nxp.com',
                    'Product Family': 'MCU',
                    'Part Number': 'S32K144',
                    'MAG': 'R20',
                    'Question': 'How to configure S32K144 CAN?',
                    'Answer': 'To configure S32K144 CAN, you need to...',
                    'hallucination_control': 90,
                    'quality': 85,
                    'professionalism': 88,
                    'usefulness': 92,
                    'average_score': 88.75
                }),
                timestamp: new Date().toISOString()
            },
            {
                result_key: 'test_result_3',
                data: JSON.stringify({
                    'CAS Name': 'alice.smith_3@nxp.com',
                    'Product Family': 'RF',
                    'Part Number': 'MMPF0100',
                    'MAG': 'R18',
                    'Question': 'What is the power consumption of MMPF0100?',
                    'Answer': 'The MMPF0100 power consumption varies...',
                    'hallucination_control': 82,
                    'quality': 89,
                    'professionalism': 85,
                    'usefulness': 87,
                    'average_score': 85.75
                }),
                timestamp: new Date().toISOString()
            }
        ];

        testData.forEach(item => {
            insertStmt.run(item.result_key, item.data, item.timestamp);
        });

        console.log('已添加3条测试数据');

        // 再次检查记录数
        const newCount = db.prepare('SELECT COUNT(*) as count FROM evaluations').get();
        console.log('添加后的记录数:', newCount.count);
    }

    db.close();
    console.log('数据库检查完成');
} catch (error) {
    console.error('数据库操作错误:', error);
}
