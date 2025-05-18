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
    
    // 默认字段和顺序
    const defaultFields = [
      { key: 'id', name: 'ID', order: 10, visible: 1 },
      { key: 'date', name: 'Date', order: 20, visible: 1 },
      { key: 'CAS Name', name: 'CAS Name', order: 30, visible: 1 },
      { key: 'Product Family', name: 'Product Family', order: 40, visible: 1 },
      { key: 'Part Number', name: 'Part Number', order: 50, visible: 1 },
      { key: 'MAG', name: 'MAG', order: 60, visible: 1 },
      { key: 'average_score', name: 'Score', order: 70, visible: 1 }
    ];
    
    // 添加默认字段
    for (const field of defaultFields) {
      upsertFieldLabel(field.key, field.name, field.visible, field.order);
    }
    
    // 如果有样本数据，添加样本中的其他字段
    if (sampleData && typeof sampleData === 'object') {
      let order = 100;
      for (const key in sampleData) {
        // 跳过已添加的默认字段
        if (defaultFields.some(f => f.key === key)) {
          continue;
        }
        
        // 跳过不需要显示的字段
        if (['timestamp', 'result_key', 'data'].includes(key)) {
          continue;
        }
        
        // 添加其他字段，默认不可见
        upsertFieldLabel(key, key, 0, order++);
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
