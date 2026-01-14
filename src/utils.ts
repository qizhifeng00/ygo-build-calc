/**
 * 工具函数模块
 */

/**
 * 变量名转索引
 * @example
 * varToIndex('a') // 0
 * varToIndex('z') // 25
 * varToIndex('aa') // 26
 */
export function varToIndex(varName: string): number {
  const lc = varName.toLowerCase()
  
  // 单字母: a-z -> 0-25
  if (lc.length === 1) {
    const code = lc.charCodeAt(0) - 97
    if (code >= 0 && code < 26) return code
  }
  
  // 双字母: aa-ad -> 26-29
  if (lc.length === 2 && lc[0] === 'a') {
    const code = lc.charCodeAt(1) - 97
    if (code >= 0 && code < 4) return 26 + code
  }
  
  throw new Error(`无效的卡名称: ${varName}`)
}

/**
 * 索引转变量名
 * @example
 * indexToVar(0) // 'a'
 * indexToVar(25) // 'z'
 * indexToVar(26) // 'aa'
 */
export function indexToVar(index: number): string {
  if (index < 0 || index >= 30) {
    throw new Error(`索引超出范围: ${index}`)
  }
  
  if (index < 26) {
    return String.fromCharCode(97 + index)
  }
  
  return 'a' + String.fromCharCode(97 + index - 26)
}

/**
 * 索引转标签
 * @example
 * indexToLabel(0) // 'A'
 * indexToLabel(25) // 'Z'
 * indexToLabel(26) // 'AA'
 */
export function indexToLabel(index: number): string {
  if (index < 0 || index >= 30) {
    throw new Error(`索引超出范围: ${index}`)
  }
  
  if (index < 26) {
    return String.fromCharCode(65 + index)
  }
  
  return 'A' + String.fromCharCode(65 + index - 26)
}

/**
 * 组合数缓存
 */
const combinationCache = new Map<string, bigint>()

/**
 * 计算组合数 C(n, k)
 */
export function combination(n: number | bigint, k: number | bigint): bigint {
  const nBig = BigInt(n)
  const kBig = BigInt(k)
  
  if (kBig < 0n || kBig > nBig) return 0n
  if (kBig === 0n || kBig === nBig) return 1n
  
  const key = `${nBig},${kBig}`
  if (combinationCache.has(key)) {
    return combinationCache.get(key)!
  }
  
  let result = 1n
  for (let i = 1n; i <= kBig; i++) {
    result = result * (nBig - kBig + i) / i
  }
  
  combinationCache.set(key, result)
  return result
}

/**
 * 清除组合数缓存
 */
export function clearCombinationCache(): void {
  combinationCache.clear()
}

/**
 * 洗牌算法（Fisher-Yates）
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = result[i]
    result[i] = result[j]!
    result[j] = temp!
  }
  return result
}

/**
 * 从卡组中抽卡并统计
 */
export function drawCards(deck: number[], draws: number, cardTypeCount: number): number[] {
  const counts = Array(cardTypeCount).fill(0)
  const drawn = deck.slice(0, draws)
  drawn.forEach(idx => {
    counts[idx]++
  })
  return counts
}

/**
 * 创建卡组（扩展数组）
 */
export function createDeck(cardCounts: number[]): number[] {
  const deck: number[] = []
  for (let i = 0; i < cardCounts.length; i++) {
    const count = cardCounts[i]
    if (count !== undefined) {
      for (let j = 0; j < count; j++) {
        deck.push(i)
      }
    }
  }
  return deck
}

/**
 * 转义正则表达式特殊字符
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

