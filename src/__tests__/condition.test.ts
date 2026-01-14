import { describe, it, expect } from 'vitest'
import {
  parseCondition,
  conditionToString,
  compileCondition,
  compileConditionString,
  parseConditionVariables,
  replaceCardNames
} from '../condition'
import type { ConditionNode } from '../types'

describe('condition', () => {
  describe('parseCondition', () => {
    it('应该解析简单条件', () => {
      const result = parseCondition('a > 0')
      expect(result.type).toBe('and')
      expect(result.children).toHaveLength(1)
      
      const child = result.children[0]
      expect(child.type).toBe('single')
      if (child.type === 'single') {
        expect(child.cards).toHaveLength(1)
        expect(child.cards[0].name).toBe('a')
        expect(child.symbol).toBe('gt')
        expect(child.num).toBe('0')
      }
    })

    it('应该解析逻辑与条件', () => {
      const result = parseCondition('a > 0 && b >= 1')
      expect(result.type).toBe('and')
      expect(result.children).toHaveLength(2)
    })

    it('应该解析逻辑或条件', () => {
      const result = parseCondition('a > 0 || b >= 1')
      expect(result.type).toBe('or')
      expect(result.children).toHaveLength(2)
    })

    it('应该解析算术求和', () => {
      const result = parseCondition('a + b >= 2')
      expect(result.type).toBe('and')
      
      const child = result.children[0]
      if (child.type === 'single') {
        expect(child.cards).toHaveLength(2)
        expect(child.cards[0].name).toBe('a')
        expect(child.cards[1].name).toBe('b')
        expect(child.cards[1].operator).toBe('+')
        expect(child.symbol).toBe('gte')
        expect(child.num).toBe('2')
      }
    })

    it('应该解析括号表达式', () => {
      const result = parseCondition('(a > 0 || b > 0) && c >= 1')
      expect(result.type).toBe('and')
      expect(result.children).toHaveLength(2)
      
      const firstChild = result.children[0]
      expect(firstChild.type).toBe('or')
    })

    it('应该支持所有比较运算符', () => {
      const operators = ['>', '<', '>=', '<=', '==', '!=']
      const expectedSymbols = ['gt', 'lt', 'gte', 'lte', 'eq', 'neq']
      
      operators.forEach((op, i) => {
        const result = parseCondition(`a ${op} 1`)
        const child = result.children[0]
        if (child.type === 'single') {
          expect(child.symbol).toBe(expectedSymbols[i])
        }
      })
    })

    it('应该抛出错误对于空条件', () => {
      expect(() => parseCondition('')).toThrow('空的条件表达式')
    })

    it('应该抛出错误对于无效语法', () => {
      expect(() => parseCondition('a >')).toThrow()
      expect(() => parseCondition('a + b')).toThrow()
    })

    it('应该支持中文卡名', () => {
      const result = parseCondition('增殖的G > 0')
      const child = result.children[0]
      if (child.type === 'single') {
        expect(child.cards[0].name).toBe('增殖的G')
      }
    })
  })

  describe('conditionToString', () => {
    it('应该将简单条件转换为字符串', () => {
      const condition: ConditionNode = {
        type: 'and',
        children: [{
          type: 'single',
          cards: [{ name: 'a' }],
          symbol: 'gt',
          num: '0'
        }]
      }
      
      const result = conditionToString(condition)
      expect(result).toContain('a')
      expect(result).toContain('>')
      expect(result).toContain('0')
    })

    it('应该将复杂条件转换为字符串', () => {
      const condition: ConditionNode = {
        type: 'and',
        children: [
          {
            type: 'single',
            cards: [{ name: 'a' }],
            symbol: 'gt',
            num: '0'
          },
          {
            type: 'single',
            cards: [{ name: 'b' }],
            symbol: 'gte',
            num: '1'
          }
        ]
      }
      
      const result = conditionToString(condition)
      expect(result).toContain('&&')
    })

    it('应该处理算术表达式', () => {
      const condition: ConditionNode = {
        type: 'and',
        children: [{
          type: 'single',
          cards: [
            { name: 'a' },
            { name: 'b', operator: '+' }
          ],
          symbol: 'gte',
          num: '2'
        }]
      }
      
      const result = conditionToString(condition)
      expect(result).toContain('a')
      expect(result).toContain('b')
      expect(result).toContain('+')
    })
  })

  describe('compileCondition', () => {
    it('应该编译简单条件', () => {
      const condition: ConditionNode = {
        type: 'and',
        children: [{
          type: 'single',
          cards: [{ name: 'a' }],
          symbol: 'gt',
          num: '0'
        }]
      }
      
      const func = compileCondition(condition)
      expect(func([1, 0, 0])).toBe(true)
      expect(func([0, 0, 0])).toBe(false)
    })

    it('应该编译逻辑与条件', () => {
      const condition: ConditionNode = {
        type: 'and',
        children: [
          {
            type: 'single',
            cards: [{ name: 'a' }],
            symbol: 'gt',
            num: '0'
          },
          {
            type: 'single',
            cards: [{ name: 'b' }],
            symbol: 'gt',
            num: '0'
          }
        ]
      }
      
      const func = compileCondition(condition)
      expect(func([1, 1, 0])).toBe(true)
      expect(func([1, 0, 0])).toBe(false)
      expect(func([0, 1, 0])).toBe(false)
    })

    it('应该编译逻辑或条件', () => {
      const condition: ConditionNode = {
        type: 'or',
        children: [
          {
            type: 'single',
            cards: [{ name: 'a' }],
            symbol: 'gt',
            num: '0'
          },
          {
            type: 'single',
            cards: [{ name: 'b' }],
            symbol: 'gt',
            num: '0'
          }
        ]
      }
      
      const func = compileCondition(condition)
      expect(func([1, 0, 0])).toBe(true)
      expect(func([0, 1, 0])).toBe(true)
      expect(func([0, 0, 0])).toBe(false)
    })

    it('应该编译算术表达式', () => {
      const condition: ConditionNode = {
        type: 'and',
        children: [{
          type: 'single',
          cards: [
            { name: 'a' },
            { name: 'b', operator: '+' }
          ],
          symbol: 'gte',
          num: '2'
        }]
      }
      
      const func = compileCondition(condition)
      expect(func([1, 1, 0])).toBe(true)
      expect(func([2, 0, 0])).toBe(true)
      expect(func([0, 2, 0])).toBe(true)
      expect(func([1, 0, 0])).toBe(false)
    })

    it('应该支持所有比较运算符', () => {
      const testCases = [
        { symbol: 'gt' as const, pass: [2], fail: [1, 0] },
        { symbol: 'gte' as const, pass: [1, 2], fail: [0] },
        { symbol: 'lt' as const, pass: [0], fail: [1, 2] },
        { symbol: 'lte' as const, pass: [0, 1], fail: [2] },
        { symbol: 'eq' as const, pass: [1], fail: [0, 2] },
        { symbol: 'neq' as const, pass: [0, 2], fail: [1] }
      ]
      
      testCases.forEach(({ symbol, pass, fail }) => {
        const condition: ConditionNode = {
          type: 'and',
          children: [{
            type: 'single',
            cards: [{ name: 'a' }],
            symbol,
            num: '1'
          }]
        }
        
        const func = compileCondition(condition)
        pass.forEach(val => {
          expect(func([val, 0, 0])).toBe(true)
        })
        fail.forEach(val => {
          expect(func([val, 0, 0])).toBe(false)
        })
      })
    })
  })

  describe('compileConditionString', () => {
    it('应该编译条件字符串', () => {
      const func = compileConditionString('a > 0')
      expect(func([1, 0, 0])).toBe(true)
      expect(func([0, 0, 0])).toBe(false)
    })

    it('应该编译复杂条件字符串', () => {
      const func = compileConditionString('(a > 0 || b > 0) && c >= 1')
      expect(func([1, 0, 1])).toBe(true)
      expect(func([0, 1, 1])).toBe(true)
      expect(func([1, 1, 0])).toBe(false)
      expect(func([0, 0, 1])).toBe(false)
    })
  })

  describe('parseConditionVariables', () => {
    it('应该提取简单变量', () => {
      const vars = parseConditionVariables('a > 0')
      expect(vars).toEqual([0])
    })

    it('应该提取多个变量', () => {
      const vars = parseConditionVariables('a > 0 && b >= 1')
      expect(vars).toEqual([0, 1])
    })

    it('应该去重变量', () => {
      const vars = parseConditionVariables('a > 0 && a >= 1')
      expect(vars).toEqual([0])
    })

    it('应该排序变量', () => {
      const vars = parseConditionVariables('c > 0 && a >= 1 && b > 0')
      expect(vars).toEqual([0, 1, 2])
    })

    it('应该忽略无效变量', () => {
      const vars = parseConditionVariables('a > 0 && invalid > 1')
      expect(vars).toEqual([0])
    })

    it('应该支持双字母变量', () => {
      const vars = parseConditionVariables('aa > 0 && ab >= 1')
      expect(vars).toEqual([26, 27])
    })
  })

  describe('replaceCardNames', () => {
    it('应该替换卡牌名称', () => {
      const nameMap = {
        '增殖的G': 'a',
        '灰流丽': 'b'
      }
      
      const result = replaceCardNames('增殖的G > 0', nameMap)
      expect(result).toBe('a > 0')
    })

    it('应该替换多个卡牌名称', () => {
      const nameMap = {
        '增殖的G': 'a',
        '灰流丽': 'b'
      }
      
      const result = replaceCardNames('增殖的G > 0 && 灰流丽 >= 1', nameMap)
      expect(result).toBe('a > 0 && b >= 1')
    })

    it('应该按长度从长到短替换', () => {
      const nameMap = {
        'ABC': 'a',
        'AB': 'b',
        'A': 'c'
      }
      
      const result = replaceCardNames('ABC > 0', nameMap)
      expect(result).toBe('a > 0')
    })

    it('应该跳过不存在的映射', () => {
      const nameMap = {
        '增殖的G': 'a'
      }
      
      const result = replaceCardNames('增殖的G > 0 && 灰流丽 >= 1', nameMap)
      expect(result).toContain('a > 0')
      expect(result).toContain('灰流丽')
    })
  })
})

