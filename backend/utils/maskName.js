'use strict';

/**
 * 名稱遮罩工具函式
 * 
 * maskName('王美玲') → '王O玲'
 * maskName('沈湘淇') → '沈O淇'
 * maskName('歐陽菲菲') → '歐O菲菲' (4字以上：第2字遮)
 * maskName('AB') → 'AO' (2字：遮最後)
 * maskName('A') → 'A' (1字不遮)
 */
function maskName(name) {
  if (!name || typeof name !== 'string') return name;
  const len = name.length;
  if (len <= 1) return name;
  if (len === 2) return name[0] + 'O';
  // 3字以上：中間字全部遮蔽
  return name[0] + 'O'.repeat(len - 2) + name[len - 1];
}

module.exports = { maskName };
