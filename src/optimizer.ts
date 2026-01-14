/**
 * 卡组优化器模块
 */

import type { Card, OptimizationResult, OptimizationOptions, OptimizationPlan } from './types'
import { quickMonteCarlo } from './calculator'
import { compileConditionString, parseConditionVariables } from './condition'

/**
 * 生成卡组优化方案
 * @param cards 卡牌列表
 * @param condition 条件表达式
 * @param draws 抽卡数
 * @param targetRate 目标启动率（0-100）
 * @param options 优化选项
 */
export function optimize(
  cards: Card[],
  condition: string,
  draws: number,
  targetRate: number,
  options: OptimizationOptions = {}
): OptimizationResult {
  const { simulations = 30000, onProgress } = options
  
  // 获取当前卡组数据
  const currentCounts = cards.map(c => c.count)
  const totalCards = currentCounts.reduce((a, b) => a + b, 0)

  if (totalCards === 0) {
    throw new Error('卡组为空，请先添加卡牌')
  }

  if (!condition || condition.trim() === '') {
    throw new Error('请先设置展开条件')
  }

  // 编译条件函数
  onProgress?.(5, '编译条件表达式...')
  const conditionFunc = compileConditionString(condition)

  // 计算当前概率
  onProgress?.(10, '计算当前启动率...')
  const currentRate = quickMonteCarlo(currentCounts, draws, conditionFunc, simulations)
  
  // 自动判断优化方向：当前概率 < 目标概率时提高，否则降低
  const direction = currentRate < targetRate ? 'increase' : 'decrease'
  
  onProgress?.(15, `分析卡组结构（${direction === 'increase' ? '提高' : '降低'}模式）...`)

  // 解析条件中使用的卡牌
  const conditionVars = parseConditionVariables(condition)
  
  // 找出关键卡和非关键卡
  interface CardInfo {
    index: number
    card: Card
    isKey: boolean
  }
  
  const keyCards: CardInfo[] = []
  const nonKeyCards: CardInfo[] = []
  
  cards.forEach((card, index) => {
    if (!card) return
    if (card.count > 0) {
      if (conditionVars.includes(index)) {
        keyCards.push({ index, card, isKey: true })
      } else {
        nonKeyCards.push({ index, card, isKey: false })
      }
    }
  })

  onProgress?.(20, '生成调整方案...')

  // 生成调整方案
  const plans: OptimizationPlan[] = []

  if (direction === 'increase') {
    // ===== 提高启动率的方案 =====
    generateIncreasePlans(plans, keyCards, nonKeyCards, currentCounts, totalCards)
  } else {
    // ===== 降低启动率的方案 =====
    generateDecreasePlans(plans, keyCards, nonKeyCards, currentCounts, totalCards)
  }

  onProgress?.(30, `评估方案效果 (0/${plans.length})...`)

  // 计算每个方案的概率
  const totalPlans = plans.length
  for (let i = 0; i < totalPlans; i++) {
    const plan = plans[i]
    if (!plan) continue
    
    const newTotal = plan.newCounts.reduce((a, b) => a + b, 0)
    const actualDraws = Math.min(draws, newTotal)
    plan.newRate = quickMonteCarlo(plan.newCounts, actualDraws, conditionFunc, Math.floor(simulations / 2))
    plan.improvement = plan.newRate - currentRate
    
    // 根据优化方向判断是否达标
    plan.reachTarget = direction === 'increase' 
      ? plan.newRate >= targetRate
      : plan.newRate <= targetRate

    // 每处理5个方案汇报一次进度
    if (i % 5 === 0 || i === totalPlans - 1) {
      const progress = 30 + Math.floor(((i + 1) / totalPlans) * 65)
      onProgress?.(progress, `评估方案效果 (${i + 1}/${totalPlans})...`)
    }
  }

  onProgress?.(95, '整理结果...')

  // 根据优化方向过滤方案
  const validPlans = plans.filter(p => 
    direction === 'increase' ? p.improvement > 0.1 : p.improvement < -0.1
  )

  // 按类型分组
  const keepDeckPlans = validPlans.filter(p => 
    direction === 'increase' 
      ? (p.type === 'increase_key' || p.type === 'increase_multi_key')
      : (p.type === 'decrease_key' || p.type === 'decrease_multi_key')
  )
  const expandDeckPlans = validPlans.filter(p => p.type === 'expand_deck')
  const reduceDeckPlans = validPlans.filter(p => p.type === 'reduce_deck')

  // 排序函数：最接近目标的在前，达到目标的优先
  const sortPlans = (arr: OptimizationPlan[]) => {
    return arr.sort((a, b) => {
      // 达到目标的优先
      if (a.reachTarget !== b.reachTarget) {
        return a.reachTarget ? -1 : 1
      }
      // 越接近目标越靠前（差距小的在前）
      const diffA = Math.abs(targetRate - a.newRate)
      const diffB = Math.abs(targetRate - b.newRate)
      return diffA - diffB
    })
  }

  // 对每组方案排序
  sortPlans(keepDeckPlans)
  sortPlans(expandDeckPlans)
  sortPlans(reduceDeckPlans)

  // 标记每组的最佳方案
  if (keepDeckPlans.length > 0 && keepDeckPlans[0]) keepDeckPlans[0].isBest = true
  if (expandDeckPlans.length > 0 && expandDeckPlans[0]) expandDeckPlans[0].isBest = true
  if (reduceDeckPlans.length > 0 && reduceDeckPlans[0]) reduceDeckPlans[0].isBest = true

  // 限制每组数量
  const maxPerGroup = 10

  onProgress?.(100, '完成！')

  return {
    currentRate,
    targetRate,
    direction,
    keepDeckPlans: keepDeckPlans.slice(0, maxPerGroup),
    expandDeckPlans: expandDeckPlans.slice(0, maxPerGroup),
    reduceDeckPlans: reduceDeckPlans.slice(0, maxPerGroup),
    totalPlansCount: validPlans.length
  }
}

/**
 * 生成提高启动率的方案
 */
function generateIncreasePlans(
  plans: OptimizationPlan[],
  keyCards: Array<{ index: number; card: Card; isKey: boolean }>,
  nonKeyCards: Array<{ index: number; card: Card; isKey: boolean }>,
  currentCounts: number[],
  totalCards: number
) {
  // 方案类型1：增加关键卡数量
  for (const keyCard of keyCards) {
    if (!keyCard) continue
    const keyMaxCount = keyCard.card.maxCount ?? 3
    if (keyCard.card.count < keyMaxCount) {
      const maxAdd = keyMaxCount - keyCard.card.count
      for (let add = 1; add <= maxAdd; add++) {
        for (const nonKey of nonKeyCards) {
          if (!nonKey) continue
          if (nonKey.card.count >= add) {
            const newCounts = [...currentCounts]
            const keyIdx = keyCard.index
            const nonKeyIdx = nonKey.index
            if (newCounts[keyIdx] !== undefined) newCounts[keyIdx] += add
            if (newCounts[nonKeyIdx] !== undefined) newCounts[nonKeyIdx] -= add

            plans.push({
              type: 'increase_key',
              description: `增加「${keyCard.card.name || keyCard.card.label}」${add}张，减少「${nonKey.card.name || nonKey.card.label}」${add}张`,
              changes: [
                { card: keyCard.card, change: +add },
                { card: nonKey.card, change: -add }
              ],
              newCounts,
              newRate: 0,
              improvement: 0,
              reachTarget: false,
              priority: 1
            })
          }
        }
      }
    }
  }

  // 方案类型2：多个关键卡同时增加
  if (keyCards.length >= 2) {
    for (let i = 0; i < keyCards.length; i++) {
      for (let j = i + 1; j < keyCards.length; j++) {
        const card1 = keyCards[i]
        const card2 = keyCards[j]
        if (!card1 || !card2) continue
        
        const card1MaxCount = card1.card.maxCount ?? 3
        const card2MaxCount = card2.card.maxCount ?? 3
        if (card1.card.count < card1MaxCount && card2.card.count < card2MaxCount) {
          const totalReduce = 2
          for (const nonKey of nonKeyCards) {
            if (!nonKey) continue
            if (nonKey.card.count >= totalReduce) {
              const newCounts = [...currentCounts]
              const idx1 = card1.index
              const idx2 = card2.index
              const idxNonKey = nonKey.index
              if (newCounts[idx1] !== undefined) newCounts[idx1] += 1
              if (newCounts[idx2] !== undefined) newCounts[idx2] += 1
              if (newCounts[idxNonKey] !== undefined) newCounts[idxNonKey] -= totalReduce

              plans.push({
                type: 'increase_multi_key',
                description: `增加「${card1.card.name || card1.card.label}」1张 + 「${card2.card.name || card2.card.label}」1张，减少「${nonKey.card.name || nonKey.card.label}」2张`,
                changes: [
                  { card: card1.card, change: +1 },
                  { card: card2.card, change: +1 },
                  { card: nonKey.card, change: -2 }
                ],
                newCounts,
                newRate: 0,
                improvement: 0,
                reachTarget: false,
                priority: 2
              })
            }
          }
        }
      }
    }
  }

  // 方案类型3：扩充卡组（不超过60张上限）
  if (totalCards < 60) {
    for (const keyCard of keyCards) {
      if (!keyCard) continue
      const keyMaxCount = keyCard.card.maxCount ?? 3
      if (keyCard.card.count < keyMaxCount) {
        const maxByCard = keyMaxCount - keyCard.card.count
        const maxByDeck = 60 - totalCards
        const maxAdd = Math.min(maxByCard, maxByDeck, 2)
        
        if (maxAdd > 0) {
          for (let add = 1; add <= maxAdd; add++) {
            const newCounts = [...currentCounts]
            const idx = keyCard.index
            if (newCounts[idx] !== undefined) newCounts[idx] += add

            plans.push({
              type: 'expand_deck',
              description: `增加「${keyCard.card.name || keyCard.card.label}」${add}张（卡组从${totalCards}张变为${totalCards + add}张）`,
              changes: [{ card: keyCard.card, change: +add }],
              newCounts,
              newDeckSize: totalCards + add,
              newRate: 0,
              improvement: 0,
              reachTarget: false,
              priority: 3
            })
          }
        }
      }
    }
  }

  // 方案类型4：减少非关键卡
  for (const nonKey of nonKeyCards) {
    if (!nonKey) continue
    if (nonKey.card.count >= 1 && totalCards > 40) {
      const maxReduce = Math.min(nonKey.card.count, totalCards - 40, 3)
      
      for (let reduce = 1; reduce <= maxReduce; reduce++) {
        const newCounts = [...currentCounts]
        const idx = nonKey.index
        if (newCounts[idx] !== undefined) newCounts[idx] -= reduce

        plans.push({
          type: 'reduce_deck',
          description: `减少「${nonKey.card.name || nonKey.card.label}」${reduce}张（卡组从${totalCards}张变为${totalCards - reduce}张）`,
          changes: [{ card: nonKey.card, change: -reduce }],
          newCounts,
          newDeckSize: totalCards - reduce,
          newRate: 0,
          improvement: 0,
          reachTarget: false,
          priority: 4
        })
      }
    }
  }
}

/**
 * 生成降低启动率的方案
 */
function generateDecreasePlans(
  plans: OptimizationPlan[],
  keyCards: Array<{ index: number; card: Card; isKey: boolean }>,
  nonKeyCards: Array<{ index: number; card: Card; isKey: boolean }>,
  currentCounts: number[],
  totalCards: number
) {
  // 方案类型1：减少关键卡数量（用非关键卡替换）
  for (const keyCard of keyCards) {
    if (!keyCard) continue
    if (keyCard.card.count >= 1) {
      const maxReduce = keyCard.card.count
      for (let reduce = 1; reduce <= Math.min(maxReduce, 3); reduce++) {
        for (const nonKey of nonKeyCards) {
          if (!nonKey) continue
          const nonKeyMaxCount = nonKey.card.maxCount ?? 3
          if (nonKey.card.count < nonKeyMaxCount) {
            // 检查增加后不超过上限
            const canAdd = Math.min(reduce, nonKeyMaxCount - nonKey.card.count)
            if (canAdd >= reduce) {
              const newCounts = [...currentCounts]
              const keyIdx = keyCard.index
              const nonKeyIdx = nonKey.index
              if (newCounts[keyIdx] !== undefined) newCounts[keyIdx] -= reduce
              if (newCounts[nonKeyIdx] !== undefined) newCounts[nonKeyIdx] += reduce

              plans.push({
                type: 'decrease_key',
                description: `减少「${keyCard.card.name || keyCard.card.label}」${reduce}张，增加「${nonKey.card.name || nonKey.card.label}」${reduce}张`,
                changes: [
                  { card: keyCard.card, change: -reduce },
                  { card: nonKey.card, change: +reduce }
                ],
                newCounts,
                newRate: 0,
                improvement: 0,
                reachTarget: false,
                priority: 1
              })
            }
          }
        }
      }
    }
  }

  // 方案类型2：多个关键卡同时减少
  if (keyCards.length >= 2) {
    for (let i = 0; i < keyCards.length; i++) {
      for (let j = i + 1; j < keyCards.length; j++) {
        const card1 = keyCards[i]
        const card2 = keyCards[j]
        if (!card1 || !card2) continue
        if (card1.card.count >= 1 && card2.card.count >= 1) {
          for (const nonKey of nonKeyCards) {
            if (!nonKey) continue
            const nonKeyMaxCount = nonKey.card.maxCount ?? 3
            // 需要能增加2张
            if (nonKey.card.count + 2 <= nonKeyMaxCount) {
              const newCounts = [...currentCounts]
              const idx1 = card1.index
              const idx2 = card2.index
              const idxNonKey = nonKey.index
              if (newCounts[idx1] !== undefined) newCounts[idx1] -= 1
              if (newCounts[idx2] !== undefined) newCounts[idx2] -= 1
              if (newCounts[idxNonKey] !== undefined) newCounts[idxNonKey] += 2

              plans.push({
                type: 'decrease_multi_key',
                description: `减少「${card1.card.name || card1.card.label}」1张 + 「${card2.card.name || card2.card.label}」1张，增加「${nonKey.card.name || nonKey.card.label}」2张`,
                changes: [
                  { card: card1.card, change: -1 },
                  { card: card2.card, change: -1 },
                  { card: nonKey.card, change: +2 }
                ],
                newCounts,
                newRate: 0,
                improvement: 0,
                reachTarget: false,
                priority: 2
              })
            }
          }
        }
      }
    }
  }

  // 方案类型3：扩充卡组（增加非关键卡，稀释关键卡比例）
  if (totalCards < 60) {
    for (const nonKey of nonKeyCards) {
      if (!nonKey) continue
      const nonKeyMaxCount = nonKey.card.maxCount ?? 3
      if (nonKey.card.count < nonKeyMaxCount) {
        const maxByCard = nonKeyMaxCount - nonKey.card.count
        const maxByDeck = 60 - totalCards
        const maxAdd = Math.min(maxByCard, maxByDeck, 3)
        
        if (maxAdd > 0) {
          for (let add = 1; add <= maxAdd; add++) {
            const newCounts = [...currentCounts]
            const idx = nonKey.index
            if (newCounts[idx] !== undefined) newCounts[idx] += add

            plans.push({
              type: 'expand_deck',
              description: `增加「${nonKey.card.name || nonKey.card.label}」${add}张（卡组从${totalCards}张变为${totalCards + add}张）`,
              changes: [{ card: nonKey.card, change: +add }],
              newCounts,
              newDeckSize: totalCards + add,
              newRate: 0,
              improvement: 0,
              reachTarget: false,
              priority: 3
            })
          }
        }
      }
    }
  }

  // 方案类型4：减少关键卡（直接移除，减少卡组总数）
  for (const keyCard of keyCards) {
    if (!keyCard) continue
    if (keyCard.card.count >= 1 && totalCards > 40) {
      const maxReduce = Math.min(keyCard.card.count, totalCards - 40, 3)
      
      for (let reduce = 1; reduce <= maxReduce; reduce++) {
        const newCounts = [...currentCounts]
        const idx = keyCard.index
        if (newCounts[idx] !== undefined) newCounts[idx] -= reduce

        plans.push({
          type: 'reduce_deck',
          description: `减少「${keyCard.card.name || keyCard.card.label}」${reduce}张（卡组从${totalCards}张变为${totalCards - reduce}张）`,
          changes: [{ card: keyCard.card, change: -reduce }],
          newCounts,
          newDeckSize: totalCards - reduce,
          newRate: 0,
          improvement: 0,
          reachTarget: false,
          priority: 4
        })
      }
    }
  }
}

/**
 * 应用优化方案到卡组
 */
export function applyPlan(plan: OptimizationPlan, cards: Card[]): void {
  plan.changes.forEach(change => {
    // 优先使用 label 匹配（label 是唯一的），其次使用 name 匹配（需要非空）
    const cardIndex = cards.findIndex(c => {
      if (change.card.label && c.label === change.card.label) {
        return true
      }
      if (change.card.name && c.name && c.name === change.card.name) {
        return true
      }
      return false
    })
    
    if (cardIndex !== -1) {
      const card = cards[cardIndex]
      if (card) {
        card.count = Math.max(0, card.count + change.change)
      }
    }
  })
}

