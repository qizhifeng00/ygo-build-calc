/**
 * YGO Build Calc 基础使用示例
 */

import {
  calculateExact,
  calculateMonteCarlo,
  calculateAuto,
  optimize,
  applyPlan,
  parseCondition,
  compileConditionString,
  type Card
} from '@ygo_build/calc'

// ============================================
// 示例 1: 基础概率计算
// ============================================
console.log('=== 示例 1: 基础概率计算 ===')

// 40张卡组: 3张A卡、3张B卡、34张其他
// 计算抽5张时至少有1张A卡的概率
const result1 = calculateExact([3, 3, 34], 5, 'a > 0')
console.log(`精确概率: ${result1.probability.toFixed(2)}%`)
console.log(`满足条件的组合: ${result1.valid}`)
console.log(`总组合数: ${result1.total}`)
console.log()

// ============================================
// 示例 2: 复杂条件
// ============================================
console.log('=== 示例 2: 复杂条件 ===')

// 计算至少1张A卡 且 至少1张B卡
const result2 = calculateExact([3, 3, 34], 5, 'a > 0 && b > 0')
console.log(`A和B都有: ${result2.probability.toFixed(2)}%`)

// 计算A+B合计至少2张
const result3 = calculateExact([3, 3, 34], 5, 'a + b >= 2')
console.log(`A+B合计至少2张: ${result3.probability.toFixed(2)}%`)

// 计算A或B至少1张
const result4 = calculateExact([3, 3, 34], 5, 'a > 0 || b > 0')
console.log(`A或B至少1张: ${result4.probability.toFixed(2)}%`)
console.log()

// ============================================
// 示例 3: 蒙特卡洛模拟
// ============================================
console.log('=== 示例 3: 蒙特卡洛模拟 ===')

// 使用蒙特卡洛模拟（适合大型卡组或复杂条件）
const result5 = calculateMonteCarlo(
  [3, 3, 34],
  5,
  'a > 0',
  100000, // 模拟10万次
  (progress, text) => {
    if (progress % 20 === 0) { // 每20%显示一次进度
      console.log(`${text}`)
    }
  }
)
console.log(`蒙特卡洛模拟结果: ${result5.probability.toFixed(2)}%`)
console.log()

// ============================================
// 示例 4: 自动选择计算方法
// ============================================
console.log('=== 示例 4: 自动选择计算方法 ===')

// 系统会根据问题规模自动选择最优算法
const result6 = calculateAuto([3, 3, 34], 5, 'a > 0')
console.log(`自动计算结果: ${result6.probability.toFixed(2)}%`)
console.log(`使用方法: ${result6.calculationMethod}`)
console.log()

// ============================================
// 示例 5: 条件解析和编译
// ============================================
console.log('=== 示例 5: 条件解析和编译 ===')

// 解析条件表达式
const condition = parseCondition('a > 0 && (b + c) >= 2')
console.log('解析后的AST:', JSON.stringify(condition, null, 2))

// 编译为可执行函数
const checkFunc = compileConditionString('a > 0 && b >= 1')
console.log('测试 [1, 1, 0]: ', checkFunc([1, 1, 0, 0]))  // true
console.log('测试 [1, 0, 0]: ', checkFunc([1, 0, 0, 0]))  // false
console.log('测试 [0, 1, 0]: ', checkFunc([0, 1, 0, 0]))  // false
console.log()

// ============================================
// 示例 6: 卡组优化
// ============================================
console.log('=== 示例 6: 卡组优化 ===')

// 定义当前卡组
const cards: Card[] = [
  { count: 3, name: '增殖的G', label: 'A', maxCount: 3 },
  { count: 2, name: '灰流丽', label: 'B', maxCount: 3 },
  { count: 1, name: '无限泡影', label: 'C', maxCount: 3 },
  { count: 34, name: '其他', label: 'D', maxCount: 60 }
]

console.log('当前卡组:')
cards.forEach(card => {
  if (card.count > 0) {
    console.log(`  ${card.name}: ${card.count}张`)
  }
})
console.log()

// 生成优化方案（目标启动率 80%）
console.log('正在生成优化方案...')
const optimizeResult = optimize(
  cards,
  'a > 0 || b > 0',  // 条件：至少有1张增G或灰流
  5,                  // 初手5张
  80,                 // 目标启动率 80%
  {
    simulations: 30000,  // 模拟3万次
    onProgress: (progress, text) => {
      if (progress % 20 === 0) {
        console.log(`  ${text}`)
      }
    }
  }
)

console.log()
console.log(`当前启动率: ${optimizeResult.currentRate.toFixed(2)}%`)
console.log(`目标启动率: ${optimizeResult.targetRate}%`)
console.log(`优化方向: ${optimizeResult.direction === 'increase' ? '提高' : '降低'}`)
console.log(`生成方案数: ${optimizeResult.totalPlansCount}`)
console.log()

// 显示保持卡组大小的最佳方案
if (optimizeResult.keepDeckPlans.length > 0) {
  console.log('保持卡组大小的推荐方案:')
  optimizeResult.keepDeckPlans.slice(0, 3).forEach((plan, i) => {
    console.log(`  ${i + 1}. ${plan.description}`)
    console.log(`     新启动率: ${plan.newRate.toFixed(2)}%`)
    console.log(`     提升: ${plan.improvement > 0 ? '+' : ''}${plan.improvement.toFixed(2)}%`)
    console.log(`     ${plan.reachTarget ? '✓ 达到目标' : '✗ 未达到目标'}`)
  })
}
console.log()

// 应用最佳方案
if (optimizeResult.keepDeckPlans.length > 0) {
  const bestPlan = optimizeResult.keepDeckPlans[0]
  console.log(`应用方案: ${bestPlan.description}`)
  applyPlan(bestPlan, cards)
  
  console.log('调整后的卡组:')
  cards.forEach(card => {
    if (card.count > 0) {
      console.log(`  ${card.name}: ${card.count}张`)
    }
  })
}

