// field-labels-dal.js - 字段标签数据访问层

const path = require('path');
const { getDatabase } = require('./database');

// 数据库路径
const dbPath = path.join(__dirname, '..', 'data', 'evaluations.db');

/**
 * 获取所有字段标签
 */
function getAllFieldLabels() {
  try {
    const db = getDatabase(dbPath);
    const stmt = db.prepare(`
      SELECT field_key, display_name, is_visible, display_order
      FROM field_labels
      ORDER BY display_order ASC
    `);

    return stmt.all();
  } catch (error) {
    console.error('获取字段标签失败:', error);
    return [];
  }
}

/**
 * 获取可见的字段标签
 */
function getVisibleFieldLabels() {
  try {
    const db = getDatabase(dbPath);
    const stmt = db.prepare(`
      SELECT field_key, display_name, display_order
      FROM field_labels
      WHERE is_visible = 1
      ORDER BY display_order ASC
    `);

    return stmt.all();
  } catch (error) {
    console.error('获取可见字段标签失败:', error);
    return [];
  }
}

/**
 * 添加或更新字段标签
 */
function upsertFieldLabel(fieldKey, displayName, isVisible = 1, displayOrder = 999) {
  try {
    const db = getDatabase(dbPath);
    const timestamp = Date.now();

    const stmt = db.prepare(`
      INSERT INTO field_labels (field_key, display_name, is_visible, display_order, last_updated)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(field_key) DO UPDATE SET
        display_name = excluded.display_name,
        is_visible = excluded.is_visible,
        display_order = excluded.display_order,
        last_updated = excluded.last_updated
    `);

    const result = stmt.run(fieldKey, displayName, isVisible, displayOrder, timestamp);
    return result.changes > 0;
  } catch (error) {
    console.error(`添加/更新字段标签失败 [${fieldKey}]:`, error);
    return false;
  }
}

/**
 * 删除字段标签
 */
function deleteFieldLabel(fieldKey) {
  try {
    const db = getDatabase(dbPath);
    const stmt = db.prepare('DELETE FROM field_labels WHERE field_key = ?');
    const result = stmt.run(fieldKey);
    return result.changes > 0;
  } catch (error) {
    console.error(`删除字段标签失败 [${fieldKey}]:`, error);
    return false;
  }
}

/**
 * 检查字段标签表是否为空
 */
function isFieldLabelsEmpty() {
  try {
    const db = getDatabase(dbPath);
    const stmt = db.prepare('SELECT COUNT(*) as count FROM field_labels');
    const result = stmt.get();
    return result.count === 0;
  } catch (error) {
    console.error('检查字段标签表是否为空失败:', error);
    return true; // 出错时假设为空
  }
}

/**
 * 从样本数据初始化字段标签
 */
function initializeFieldLabelsFromSample(sampleData) {
  try {
    // 检查是否已有标签
    if (!isFieldLabelsEmpty()) {
      console.log('字段标签表已有数据，跳过初始化');
      return true;
    }

    console.log('从样本数据初始化字段标签...');

    // 默认字段和顺序 - 包含所有19个字段
    const defaultFields = [
      { key: 'id', name: 'ID', order: 10, visible: 1 },
      { key: 'date', name: 'Date', order: 20, visible: 1 },
      { key: 'CAS Name', name: 'CAS Name', order: 30, visible: 1 },
      { key: 'Product Family', name: 'Product Family', order: 40, visible: 1 },
      { key: 'MAG', name: 'MAG', order: 50, visible: 1 },
      { key: 'Part Number', name: 'Part Number', order: 60, visible: 1 },
      { key: 'Question', name: 'Question', order: 70, visible: 1 },
      { key: 'Answer', name: 'Answer', order: 80, visible: 1 },
      { key: 'Question Scenario', name: 'Question Scenario', order: 90, visible: 1 },
      { key: 'Answer Source', name: 'Answer Source', order: 100, visible: 1 },
      { key: 'Question Complexity', name: 'Question Complexity', order: 110, visible: 1 },
      { key: 'Question Frequency', name: 'Question Frequency', order: 120, visible: 1 },
      { key: 'Question Category', name: 'Question Category', order: 130, visible: 1 },
      { key: 'Source Category', name: 'Source Category', order: 140, visible: 1 },
      { key: 'hallucination_control', name: 'Hallucination Control', order: 150, visible: 1 },
      { key: 'quality', name: 'Quality', order: 160, visible: 1 },
      { key: 'professionalism', name: 'Professionalism', order: 170, visible: 1 },
      { key: 'usefulness', name: 'Usefulness', order: 180, visible: 1 },
      { key: 'average_score', name: 'Score', order: 190, visible: 1 },
      { key: 'summary', name: 'Summary', order: 200, visible: 1 },
      { key: 'LLM_ANSWER', name: 'LLM Answer', order: 210, visible: 1 }
    ];

    // 添加默认字段
    for (const field of defaultFields) {
      upsertFieldLabel(field.key, field.name, field.visible, field.order);
    }

    // 如果有样本数据，更新第一个样本中的字段标签
    if (sampleData && typeof sampleData === 'object') {
      // 遍历样本数据中的字段
      for (const key in sampleData) {
        // 跳过不需要显示的字段
        if (['timestamp', 'result_key', 'data'].includes(key)) {
          continue;
        }

        // 查找默认字段中是否已存在该字段
        const existingField = defaultFields.find(f => f.key === key);

        if (existingField) {
          // 如果字段已存在，使用样本中的值作为显示名称（如果样本中的值是字符串）
          if (typeof sampleData[key] === 'string' && sampleData[key].trim() !== '') {
            upsertFieldLabel(key, sampleData[key], existingField.visible, existingField.order);
          }
        } else {
          // 如果字段不存在，添加为新字段
          let order = 300; // 为新字段设置较高的顺序值
          upsertFieldLabel(key, key, 0, order++);
        }
      }
    }

    console.log('字段标签初始化完成');
    return true;
  } catch (error) {
    console.error('初始化字段标签失败:', error);
    return false;
  }
}

module.exports = {
  getAllFieldLabels,
  getVisibleFieldLabels,
  upsertFieldLabel,
  deleteFieldLabel,
  isFieldLabelsEmpty,
  initializeFieldLabelsFromSample
};
