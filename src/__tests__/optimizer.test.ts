import { describe, it, expect } from 'vitest'
import { optimize, applyPlan } from '../optimizer'
import type { Card } from '../types'

describe('optimizer', () => {
  describe('optimize', () => {
    it('应该生成优化方案', () => {
      const cards: Card[] = [
        { count: 3, name: '增殖的G', label: 'A', maxCount: 3 },
        { count: 2, name: '灰流丽', label: 'B', maxCount: 3 },
        { count: 35, name: '其他', label: 'C', maxCount: 60 }
      ]

      const result = optimize(cards, 'a > 0 || b > 0', 5, 80, { simulations: 1000 })

      expect(result.currentRate).toBeGreaterThan(0)
      expect(result.targetRate).toBe(80)
      expect(['increase', 'decrease']).toContain(result.direction)
      expect(result.totalPlansCount).toBeGreaterThanOrEqual(0)
    })

    it('应该提供三类方案', () => {
      const cards: Card[] = [
        { count: 3, name: 'A', label: 'A', maxCount: 3 },
        { count: 3, name: 'B', label: 'B', maxCount: 3 },
        { count: 34, name: 'C', label: 'C', maxCount: 60 }
      ]

      const result = optimize(cards, 'a > 0', 5, 80, { simulations: 1000 })

      expect(Array.isArray(result.keepDeckPlans)).toBe(true)
      expect(Array.isArray(result.expandDeckPlans)).toBe(true)
      expect(Array.isArray(result.reduceDeckPlans)).toBe(true)
    })

    it('应该自动判断优化方向（提高）', () => {
      const cards: Card[] = [
        { count: 1, name: 'A', label: 'A', maxCount: 3 },
        { count: 39, name: 'B', label: 'B', maxCount: 60 }
      ]

      const result = optimize(cards, 'a > 0', 5, 80, { simulations: 1000 })

      // 当前启动率很低，应该提高
      expect(result.direction).toBe('increase')
    })

    it('应该自动判断优化方向（降低）', () => {
      const cards: Card[] = [
        { count: 20, name: 'A', label: 'A', maxCount: 20 },
        { count: 20, name: 'B', label: 'B', maxCount: 60 }
      ]

      const result = optimize(cards, 'a > 0', 5, 10, { simulations: 1000 })

      // 当前启动率很高，目标很低，应该降低
      expect(result.direction).toBe('decrease')
    })

    it('应该支持进度回调', () => {
      const cards: Card[] = [
        { count: 3, name: 'A', label: 'A', maxCount: 3 },
        { count: 37, name: 'B', label: 'B', maxCount: 60 }
      ]

      const progressCalls: number[] = []

      optimize(cards, 'a > 0', 5, 80, {
        simulations: 1000,
        onProgress: (progress) => {
          progressCalls.push(progress)
        }
      })

      expect(progressCalls.length).toBeGreaterThan(0)
      expect(progressCalls[progressCalls.length - 1]).toBe(100)
    })

    it('应该标记最佳方案', () => {
      const cards: Card[] = [
        { count: 3, name: 'A', label: 'A', maxCount: 3 },
        { count: 3, name: 'B', label: 'B', maxCount: 3 },
        { count: 34, name: 'C', label: 'C', maxCount: 60 }
      ]

      const result = optimize(cards, 'a > 0', 5, 80, { simulations: 1000 })

      if (result.keepDeckPlans.length > 0) {
        expect(result.keepDeckPlans[0].isBest).toBe(true)
      }
    })

    it('应该抛出错误对于空卡组', () => {
      const cards: Card[] = [
        { count: 0, name: 'A', label: 'A', maxCount: 3 }
      ]

      expect(() => optimize(cards, 'a > 0', 5, 80)).toThrow('卡组为空')
    })

    it('应该抛出错误对于空条件', () => {
      const cards: Card[] = [
        { count: 3, name: 'A', label: 'A', maxCount: 3 },
        { count: 37, name: 'B', label: 'B', maxCount: 60 }
      ]

      expect(() => optimize(cards, '', 5, 80)).toThrow('请先设置展开条件')
    })

    it('应该处理复杂条件', () => {
      const cards: Card[] = [
        { count: 3, name: 'A', label: 'A', maxCount: 3 },
        { count: 3, name: 'B', label: 'B', maxCount: 3 },
        { count: 34, name: 'C', label: 'C', maxCount: 60 }
      ]

      const result = optimize(cards, '(a > 0 || b > 0) && c >= 1', 5, 80, { simulations: 1000 })

      expect(result.totalPlansCount).toBeGreaterThanOrEqual(0)
    })

    it('应该限制每组方案数量', () => {
      const cards: Card[] = [
        { count: 3, name: 'A', label: 'A', maxCount: 3 },
        { count: 3, name: 'B', label: 'B', maxCount: 3 },
        { count: 3, name: 'C', label: 'C', maxCount: 3 },
        { count: 31, name: 'D', label: 'D', maxCount: 60 }
      ]

      const result = optimize(cards, 'a > 0', 5, 80, { simulations: 1000 })

      // 每组最多10个方案
      expect(result.keepDeckPlans.length).toBeLessThanOrEqual(10)
      expect(result.expandDeckPlans.length).toBeLessThanOrEqual(10)
      expect(result.reduceDeckPlans.length).toBeLessThanOrEqual(10)
    })

    it('应该尊重卡牌最大上限', () => {
      const cards: Card[] = [
        { count: 2, name: 'A', label: 'A', maxCount: 2 }, // 最大上限2
        { count: 38, name: 'B', label: 'B', maxCount: 60 }
      ]

      const result = optimize(cards, 'a > 0', 5, 80, { simulations: 1000 })

      // 所有方案中 A 卡不应超过 2 张
      result.keepDeckPlans.forEach(plan => {
        plan.changes.forEach(change => {
          if (change.card.label === 'A' && change.change > 0) {
            const newCount = 2 + change.change
            expect(newCount).toBeLessThanOrEqual(2)
          }
        })
      })
    })
  })

  describe('applyPlan', () => {
    it('应该正确应用方案', () => {
      const cards: Card[] = [
        { count: 3, name: 'A', label: 'A', maxCount: 3 },
        { count: 37, name: 'B', label: 'B', maxCount: 60 }
      ]

      const result = optimize(cards, 'a > 0', 5, 80, { simulations: 1000 })

      if (result.keepDeckPlans.length > 0) {
        const plan = result.keepDeckPlans[0]
        const originalCounts = cards.map(c => c.count)

        applyPlan(plan, cards)

        // 卡组应该发生变化
        const hasChanged = cards.some((card, i) => card.count !== originalCounts[i])
        expect(hasChanged).toBe(true)
      }
    })

    it('应该根据 label 匹配卡牌', () => {
      const cards: Card[] = [
        { count: 3, name: '增殖的G', label: 'A', maxCount: 3 },
        { count: 37, name: '其他', label: 'B', maxCount: 60 }
      ]

      const result = optimize(cards, 'a > 0', 5, 80, { simulations: 1000 })

      if (result.keepDeckPlans.length > 0) {
        const plan = result.keepDeckPlans[0]
        applyPlan(plan, cards)

        // 应该成功应用（不抛错）
        expect(cards).toBeDefined()
      }
    })

    it('应该根据 name 匹配卡牌', () => {
      const cards: Card[] = [
        { count: 3, name: '增殖的G', maxCount: 3 },
        { count: 37, name: '其他', maxCount: 60 }
      ]

      const plan = {
        type: 'increase_key' as const,
        description: '测试',
        changes: [
          { card: { count: 3, name: '增殖的G', maxCount: 3 }, change: 1 },
          { card: { count: 37, name: '其他', maxCount: 60 }, change: -1 }
        ],
        newCounts: [4, 36],
        newRate: 0,
        improvement: 0,
        reachTarget: false,
        priority: 1
      }

      applyPlan(plan, cards)

      expect(cards[0].count).toBe(4)
      expect(cards[1].count).toBe(36)
    })

    it('应该不允许卡牌数量为负', () => {
      const cards: Card[] = [
        { count: 1, name: 'A', label: 'A', maxCount: 3 }
      ]

      const plan = {
        type: 'decrease_key' as const,
        description: '测试',
        changes: [
          { card: { count: 1, name: 'A', label: 'A', maxCount: 3 }, change: -5 }
        ],
        newCounts: [-4],
        newRate: 0,
        improvement: 0,
        reachTarget: false,
        priority: 1
      }

      applyPlan(plan, cards)

      // 应该被限制为0
      expect(cards[0].count).toBe(0)
    })
  })

  describe('边界情况', () => {
    it('应该处理只有一种卡的情况', () => {
      const cards: Card[] = [
        { count: 40, name: 'A', label: 'A', maxCount: 40 }
      ]

      const result = optimize(cards, 'a > 0', 5, 80, { simulations: 1000 })

      // 应该能正常运行
      expect(result).toBeDefined()
    })

    it('应该处理接近目标的情况', () => {
      const cards: Card[] = [
        { count: 8, name: 'A', label: 'A', maxCount: 10 },
        { count: 32, name: 'B', label: 'B', maxCount: 60 }
      ]

      const result = optimize(cards, 'a > 0', 5, 75, { simulations: 1000 })

      // 当前启动率应该接近目标
      expect(Math.abs(result.currentRate - result.targetRate)).toBeLessThan(30)
    })

    it('应该处理卡组上限约束', () => {
      const cards: Card[] = [
        { count: 3, name: 'A', label: 'A', maxCount: 3 },
        { count: 57, name: 'B', label: 'B', maxCount: 60 }
      ]

      const result = optimize(cards, 'a > 0', 5, 80, { simulations: 1000 })

      // 扩充方案不应超过60张
      result.expandDeckPlans.forEach(plan => {
        if (plan.newDeckSize) {
          expect(plan.newDeckSize).toBeLessThanOrEqual(60)
        }
      })
    })

    it('应该处理卡组下限约束', () => {
      const cards: Card[] = [
        { count: 20, name: 'A', label: 'A', maxCount: 20 },
        { count: 20, name: 'B', label: 'B', maxCount: 60 }
      ]

      const result = optimize(cards, 'a > 0', 5, 10, { simulations: 1000 })

      // 压缩方案不应少于40张
      result.reduceDeckPlans.forEach(plan => {
        if (plan.newDeckSize) {
          expect(plan.newDeckSize).toBeGreaterThanOrEqual(40)
        }
      })
    })
  })
})

