/**
 * 概率计算模块
 */

import type { CalculationResult, ProgressCallback, ConditionFunction } from './types'
import { combination, shuffleArray, drawCards, createDeck } from './utils'
import { compileConditionString } from './condition'

/**
 * 精确计算概率
 * @param cardCounts 各种卡牌的数量数组
 * @param draws 抽取的卡牌数
 * @param condition 条件表达式字符串
 * @param onProgress 进度回调
 */
export function calculateExact(
  cardCounts: number[],
  draws: number,
  condition: string,
  onProgress?: ProgressCallback
): CalculationResult {
  const totalCards = cardCounts.reduce((a, b) => a + b, 0)
  
  if (totalCards === 0) {
    throw new Error('卡组为空')
  }
  
  if (draws > totalCards) {
    throw new Error(`抽取数量(${draws})不能大于卡组总数(${totalCards})`)
  }
  
  // 编译条件
  const conditionFunc = compileConditionString(condition)
  
  let valid = 0n
  let total = 0n
  let lastReportedProgress = 0
  
  // 递归枚举所有可能的抽卡组合
  function recurse(index: number, counts: number[], remaining: number) {
    if (index === cardCounts.length) {
      if (remaining !== 0) return
      
      // 计算这种组合的数量
      let prob = 1n
      for (let i = 0; i < counts.length; i++) {
        const cardCount = cardCounts[i]
        const drawCount = counts[i]
        if (cardCount === undefined || drawCount === undefined) continue
        prob *= combination(cardCount, drawCount)
      }
      
      total += prob
      if (conditionFunc(counts)) {
        valid += prob
      }
      return
    }

    // 报告进度
    const progress = Math.min(100, Math.floor((index / cardCounts.length) * 100))
    if (progress > lastReportedProgress && onProgress) {
      lastReportedProgress = progress
      onProgress(progress, `精确计算中: ${progress}%`)
    }

    // 尝试从当前卡牌类型抽取 k 张
    const currentCount = cardCounts[index]
    if (currentCount === undefined) return
    
    const max = Math.min(currentCount, remaining)
    for (let k = 0; k <= max; k++) {
      counts[index] = k
      recurse(index + 1, [...counts], remaining - k)
    }
  }
  
  recurse(0, [], draws)
  
  if (onProgress) {
    onProgress(100, '精确计算完成')
  }
  
  return {
    valid,
    total,
    probability: Number((valid * 10000n) / total) / 100,
    calculationMethod: '精确计算'
  }
}

/**
 * 蒙特卡洛模拟计算概率
 * @param cardCounts 各种卡牌的数量数组
 * @param draws 抽取的卡牌数
 * @param condition 条件表达式字符串或条件函数
 * @param simulations 模拟次数（默认100000）
 * @param onProgress 进度回调
 */
export function calculateMonteCarlo(
  cardCounts: number[],
  draws: number,
  condition: string | ConditionFunction,
  simulations: number = 100000,
  onProgress?: ProgressCallback
): CalculationResult {
  const deck = createDeck(cardCounts)
  
  if (deck.length === 0) {
    throw new Error('卡组为空')
  }
  
  if (draws > deck.length) {
    throw new Error(`抽取数量(${draws})不能大于卡组总数(${deck.length})`)
  }
  
  // 编译条件
  const conditionFunc = typeof condition === 'string' 
    ? compileConditionString(condition)
    : condition
  
  let valid = 0
  let lastReportedProgress = 0
  
  for (let i = 0; i < simulations; i++) {
    const shuffled = shuffleArray(deck)
    const counts = drawCards(shuffled, draws, cardCounts.length)
    
    try {
      if (conditionFunc(counts)) {
        valid++
      }
    } catch (e) {
      // 忽略条件执行错误
    }
    
    // 报告进度
    const progress = Math.floor(((i + 1) / simulations) * 100)
    if (progress > lastReportedProgress && onProgress) {
      lastReportedProgress = progress
      onProgress(progress, `蒙特卡洛模拟: ${progress}%`)
    }
  }
  
  if (onProgress) {
    onProgress(100, '蒙特卡洛模拟完成')
  }
  
  return {
    valid,
    total: simulations,
    probability: (valid / simulations) * 100,
    calculationMethod: '蒙特卡洛模拟'
  }
}

/**
 * 快速蒙特卡洛计算（已编译的条件函数）
 * 主要用于优化器中大量重复计算
 */
export function quickMonteCarlo(
  cardCounts: number[],
  draws: number,
  conditionFunc: ConditionFunction,
  simulations: number
): number {
  const deck = createDeck(cardCounts)
  
  if (deck.length === 0 || deck.length < draws) {
    return 0
  }
  
  let valid = 0
  
  for (let i = 0; i < simulations; i++) {
    const shuffled = shuffleArray(deck)
    const counts = drawCards(shuffled, draws, cardCounts.length)
    
    try {
      if (conditionFunc(counts)) {
        valid++
      }
    } catch (e) {
      // 忽略条件执行错误
    }
  }
  
  return (valid / simulations) * 100
}

/**
 * 自动选择计算方法
 * 根据问题规模自动选择精确计算或蒙特卡洛模拟
 */
export function calculateAuto(
  cardCounts: number[],
  draws: number,
  condition: string,
  onProgress?: ProgressCallback
): CalculationResult {
  const totalCards = cardCounts.reduce((a, b) => a + b, 0)
  const nonZeroTypes = cardCounts.filter(c => c > 0).length
  
  // 估算计算复杂度
  // 如果卡组较小且卡牌类型较少，使用精确计算
  // 否则使用蒙特卡洛模拟
  const useExact = totalCards <= 40 && nonZeroTypes <= 10 && draws <= 6
  
  if (useExact) {
    return calculateExact(cardCounts, draws, condition, onProgress)
  } else {
    // 根据复杂度调整模拟次数
    const simulations = totalCards <= 60 ? 100000 : 500000
    return calculateMonteCarlo(cardCounts, draws, condition, simulations, onProgress)
  }
}

