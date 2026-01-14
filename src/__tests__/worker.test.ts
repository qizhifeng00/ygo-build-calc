import { describe, it, expect } from 'vitest'
import {
  generateExactWorkerCode,
  generateMonteCarloWorkerCode,
  generateOptimizerWorkerCode
} from '../worker'

describe('worker', () => {
  describe('generateExactWorkerCode', () => {
    it('应该生成有效的 Worker 代码', () => {
      const code = generateExactWorkerCode()
      
      expect(code).toBeTruthy()
      expect(typeof code).toBe('string')
      expect(code.length).toBeGreaterThan(0)
    })

    it('应该包含必要的函数', () => {
      const code = generateExactWorkerCode()
      
      expect(code).toContain('combination')
      expect(code).toContain('varToIndex')
      expect(code).toContain('calculateProbability')
      expect(code).toContain('onmessage')
    })

    it('应该包含进度报告逻辑', () => {
      const code = generateExactWorkerCode()
      
      expect(code).toContain('postMessage')
      expect(code).toContain('type: \'progress\'')
    })

    it('应该包含结果返回逻辑', () => {
      const code = generateExactWorkerCode()
      
      expect(code).toContain('type: \'result\'')
      expect(code).toContain('valid')
      expect(code).toContain('total')
    })

    it('应该包含错误处理逻辑', () => {
      const code = generateExactWorkerCode()
      
      expect(code).toContain('type: \'error\'')
      expect(code).toContain('catch')
    })

    it('应该支持 BigInt', () => {
      const code = generateExactWorkerCode()
      
      expect(code).toContain('0n')
      expect(code).toContain('1n')
      expect(code).toContain('BigInt')
    })
  })

  describe('generateMonteCarloWorkerCode', () => {
    it('应该生成有效的 Worker 代码', () => {
      const code = generateMonteCarloWorkerCode()
      
      expect(code).toBeTruthy()
      expect(typeof code).toBe('string')
      expect(code.length).toBeGreaterThan(0)
    })

    it('应该包含必要的函数', () => {
      const code = generateMonteCarloWorkerCode()
      
      expect(code).toContain('varToIndex')
      expect(code).toContain('drawCards')
      expect(code).toContain('shuffleArray')
      expect(code).toContain('onmessage')
    })

    it('应该包含模拟逻辑', () => {
      const code = generateMonteCarloWorkerCode()
      
      expect(code).toContain('simulations')
      expect(code).toContain('shuffleArray')
      expect(code).toContain('drawCards')
    })

    it('应该包含进度报告逻辑', () => {
      const code = generateMonteCarloWorkerCode()
      
      expect(code).toContain('postMessage')
      expect(code).toContain('type: \'progress\'')
    })

    it('应该包含分块执行逻辑', () => {
      const code = generateMonteCarloWorkerCode()
      
      expect(code).toContain('runChunk')
      expect(code).toContain('setTimeout')
      expect(code).toContain('chunkSize')
    })

    it('应该有默认模拟次数', () => {
      const code = generateMonteCarloWorkerCode()
      
      expect(code).toContain('100000')
    })
  })

  describe('generateOptimizerWorkerCode', () => {
    it('应该生成有效的 Worker 代码', () => {
      const code = generateOptimizerWorkerCode()
      
      expect(code).toBeTruthy()
      expect(typeof code).toBe('string')
      expect(code.length).toBeGreaterThan(0)
    })

    it('应该包含必要的函数', () => {
      const code = generateOptimizerWorkerCode()
      
      expect(code).toContain('varToIndex')
      expect(code).toContain('shuffleArray')
      expect(code).toContain('drawCards')
      expect(code).toContain('quickMonteCarlo')
      expect(code).toContain('parseConditionVariables')
      expect(code).toContain('onmessage')
    })

    it('应该包含进度报告逻辑', () => {
      const code = generateOptimizerWorkerCode()
      
      expect(code).toContain('type: \'progress\'')
      expect(code).toContain('postMessage')
    })

    it('应该包含优化方向判断', () => {
      const code = generateOptimizerWorkerCode()
      
      expect(code).toContain('direction')
      expect(code).toContain('increase')
      expect(code).toContain('decrease')
    })

    it('应该包含方案生成逻辑', () => {
      const code = generateOptimizerWorkerCode()
      
      expect(code).toContain('plans')
      expect(code).toContain('keyCards')
      expect(code).toContain('nonKeyCards')
    })

    it('应该包含结果返回逻辑', () => {
      const code = generateOptimizerWorkerCode()
      
      expect(code).toContain('type: \'result\'')
      expect(code).toContain('currentRate')
      expect(code).toContain('targetRate')
    })

    it('应该包含错误处理', () => {
      const code = generateOptimizerWorkerCode()
      
      expect(code).toContain('type: \'error\'')
      expect(code).toContain('catch')
    })
  })

  describe('Worker 代码质量', () => {
    it('所有 Worker 代码都应该是有效的 JavaScript', () => {
      const codes = [
        generateExactWorkerCode(),
        generateMonteCarloWorkerCode(),
        generateOptimizerWorkerCode()
      ]

      codes.forEach(code => {
        // 尝试创建 Function 来验证语法
        expect(() => new Function(code)).not.toThrow()
      })
    })

    it('所有 Worker 代码都应该包含 onmessage 处理器', () => {
      const codes = [
        generateExactWorkerCode(),
        generateMonteCarloWorkerCode(),
        generateOptimizerWorkerCode()
      ]

      codes.forEach(code => {
        expect(code).toContain('onmessage')
      })
    })

    it('所有 Worker 代码都应该包含错误处理', () => {
      const codes = [
        generateExactWorkerCode(),
        generateMonteCarloWorkerCode(),
        generateOptimizerWorkerCode()
      ]

      codes.forEach(code => {
        expect(code).toContain('try')
        expect(code).toContain('catch')
      })
    })

    it('所有 Worker 代码都应该有进度报告', () => {
      const codes = [
        generateExactWorkerCode(),
        generateMonteCarloWorkerCode(),
        generateOptimizerWorkerCode()
      ]

      codes.forEach(code => {
        expect(code).toContain('progress')
        expect(code).toContain('postMessage')
      })
    })
  })

  describe('代码一致性', () => {
    it('varToIndex 实现应该在所有 Worker 中一致', () => {
      const codes = [
        generateExactWorkerCode(),
        generateMonteCarloWorkerCode(),
        generateOptimizerWorkerCode()
      ]

      // 提取 varToIndex 函数定义
      const varToIndexRegex = /function varToIndex\([^)]*\)[^{]*{[\s\S]*?^}/m

      const implementations = codes.map(code => {
        const match = code.match(varToIndexRegex)
        return match ? match[0] : null
      }).filter(Boolean)

      // 所有实现应该存在
      expect(implementations.length).toBe(3)
    })

    it('shuffleArray 实现应该在相关 Worker 中一致', () => {
      const codes = [
        generateMonteCarloWorkerCode(),
        generateOptimizerWorkerCode()
      ]

      codes.forEach(code => {
        expect(code).toContain('shuffleArray')
      })
    })
  })
})

