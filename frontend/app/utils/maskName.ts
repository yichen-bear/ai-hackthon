/**
 * 名稱遮罩工具函式（前端）
 * 
 * maskName('王美玲') → '王O玲'
 * maskName('沈湘淇') → '沈O淇'
 * maskName('歐陽菲菲') → '歐OO菲' (4字以上：中間全遮)
 * maskName('AB') → 'AO' (2字：遮最後)
 * maskName('A') → 'A' (1字不遮)
 */
export function maskName(name: string | null | undefined): string {
  if (!name) return ''
  const len = name.length
  if (len <= 1) return name
  if (len === 2) return name[0] + 'O'
  return name[0] + 'O'.repeat(len - 2) + name[len - 1]
}
