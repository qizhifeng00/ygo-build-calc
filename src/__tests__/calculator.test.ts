import { describe, it, expect, vi } from 'vitest'
import {
  calculateExact,
  calculateMonteCarlo,
  calculateAuto,
  quickMonteCarlo
} from '../calculator'
import { compileConditionString } from '../condition'

describe('calculator', () => {
  describe('calculateExact', () => {
    it('应该正确计算简单概率', () => {
      const result = calculateExact([3, 37], 5, 'a > 0')
      
      expect(result.probability).toBeGreaterThan(0)
      expect(result.probability).toBeLessThan(100)
      expect(result.valid).toBeGreaterThan(0n)
      expect(result.total).toBeGreaterThan(0n)
      expect(result.calculationMethod).toBe('精确计算')
    })

    it('应该计算至少1张A卡的概率', () => {
      // 40张卡，3张A，抽5张
      const result = calculateExact([3, 37], 5, 'a > 0')
      
      // 理论值约为 33.6%
      expect(result.probability).toBeGreaterThan(33)
      expect(result.probability).toBeLessThan(34)
    })

    it('应该计算复杂条件概率', () => {
      const result = calculateExact([3, 3, 34], 5, 'a > 0 && b > 0')
      
      expect(result.probability).toBeGreaterThan(0)
      expect(result.probability).toBeLessThan(100)
    })

    it('应该计算算术求和条件', () => {
      const result = calculateExact([3, 3, 34], 5, 'a + b >= 2')
      
      expect(result.probability).toBeGreaterThan(0)
      expect(result.calculationMethod).toBe('精确计算')
    })

    it('应该支持进度回调', () => {
      const progressCalls: number[] = []
      
      calculateExact([3, 37], 5, 'a > 0', (progress) => {
        progressCalls.push(progress)
      })
      
      expect(progressCalls.length).toBeGreaterThan(0)
      expect(progressCalls[progressCalls.length - 1]).toBe(100)
    })

    it('应该抛出错误对于空卡组', () => {
      expect(() => calculateExact([], 5, 'a > 0')).toThrow('卡组为空')
      expect(() => calculateExact([0, 0], 5, 'a > 0')).toThrow('卡组为空')
    })

    it('应该抛出错误当抽卡数过多', () => {
      expect(() => calculateExact([3, 37], 50, 'a > 0')).toThrow('抽取数量')
    })
  })

  describe('calculateMonteCarlo', () => {
    it('应该正确计算简单概率', () => {
      const result = calculateMonteCarlo([3, 37], 5, 'a > 0', 10000)
      
      expect(result.probability).toBeGreaterThan(30)
      expect(result.probability).toBeLessThan(37)
      expect(result.total).toBe(10000)
      expect(result.calculationMethod).toBe('蒙特卡洛模拟')
    })

    it('应该使用默认模拟次数', () => {
      const result = calculateMonteCarlo([3, 37], 5, 'a > 0')
      
      expect(result.total).toBe(100000)
    })

    it('应该接受已编译的条件函数', () => {
      const conditionFunc = compileConditionString('a > 0')
      const result = calculateMonteCarlo([3, 37], 5, conditionFunc, 10000)
      
      expect(result.probability).toBeGreaterThan(30)
      expect(result.probability).toBeLessThan(37)
    })

    it('应该支持进度回调', () => {
      const progressCalls: number[] = []
      
      calculateMonteCarlo([3, 37], 5, 'a > 0', 10000, (progress) => {
        progressCalls.push(progress)
      })
      
      expect(progressCalls.length).toBeGreaterThan(0)
    })

    it('应该抛出错误对于空卡组', () => {
      expect(() => calculateMonteCarlo([], 5, 'a > 0')).toThrow('卡组为空')
    })

    it('应该抛出错误当抽卡数过多', () => {
      expect(() => calculateMonteCarlo([3, 37], 50, 'a > 0')).toThrow('抽取数量')
    })
  })

  describe('quickMonteCarlo', () => {
    it('应该快速计算概率', () => {
      const conditionFunc = compileConditionString('a > 0')
      const probability = quickMonteCarlo([3, 37], 5, conditionFunc, 10000)
      
      expect(probability).toBeGreaterThan(30)
      expect(probability).toBeLessThan(37)
    })

    it('应该返回0对于空卡组', () => {
      const conditionFunc = compileConditionString('a > 0')
      const probability = quickMonteCarlo([], 5, conditionFunc, 1000)
      
      expect(probability).toBe(0)
    })

    it('应该返回0当抽卡数大于卡组大小', () => {
      const conditionFunc = compileConditionString('a > 0')
      const probability = quickMonteCarlo([3, 37], 50, conditionFunc, 1000)
      
      expect(probability).toBe(0)
    })

    it('应该处理条件执行错误', () => {
      // 创建一个会抛错的条件函数
      const errorFunc = () => {
        throw new Error('Test error')
      }
      
      const probability = quickMonteCarlo([3, 37], 5, errorFunc, 1000)
      
      // 应该返回0而不是抛出错误
      expect(probability).toBe(0)
    })
  })

  describe('calculateAuto', () => {
    it('应该自动选择计算方法', () => {
      const result = calculateAuto([3, 37], 5, 'a > 0')
      
      expect(result.probability).toBeGreaterThan(0)
      expect(['精确计算', '蒙特卡洛模拟']).toContain(result.calculationMethod)
    })

    it('应该对小卡组使用精确计算', () => {
      const result = calculateAuto([3, 37], 5, 'a > 0')
      
      // 40张卡，应该使用精确计算
      expect(result.calculationMethod).toBe('精确计算')
    })

    it('应该对大卡组使用蒙特卡洛', () => {
      // 创建一个61张的大卡组
      const result = calculateAuto([3, 58], 5, 'a > 0')
      
      // 超过60张，应该使用蒙特卡洛
      expect(result.calculationMethod).toBe('蒙特卡洛模拟')
    })

    it('应该支持进度回调', () => {
      const progressCalls: number[] = []
      
      calculateAuto([3, 37], 5, 'a > 0', (progress) => {
        progressCalls.push(progress)
      })
      
      expect(progressCalls.length).toBeGreaterThan(0)
    })
  })

  describe('边界情况', () => {
    it('应该处理全部抽中的情况', () => {
      const result = calculateExact([5, 0], 5, 'a == 5')
      
      expect(result.probability).toBe(100)
    })

    it('应该处理不可能的条件', () => {
      const result = calculateExact([3, 37], 5, 'a > 10')
      
      expect(result.probability).toBe(0)
    })

    it('应该处理复杂的或条件', () => {
      const result = calculateExact([3, 3, 34], 5, 'a > 0 || b > 0 || c > 0')
      
      expect(result.probability).toBeGreaterThan(0)
      expect(result.probability).toBeLessThanOrEqual(100)
    })
  })
})

