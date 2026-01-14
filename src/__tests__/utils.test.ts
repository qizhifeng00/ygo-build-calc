import { describe, it, expect, beforeEach } from 'vitest'
import {
  varToIndex,
  indexToVar,
  indexToLabel,
  combination,
  clearCombinationCache,
  shuffleArray,
  drawCards,
  createDeck,
  escapeRegExp
} from '../utils'

describe('utils', () => {
  describe('varToIndex', () => {
    it('应该正确转换单字母变量名', () => {
      expect(varToIndex('a')).toBe(0)
      expect(varToIndex('b')).toBe(1)
      expect(varToIndex('z')).toBe(25)
    })

    it('应该正确转换双字母变量名', () => {
      expect(varToIndex('aa')).toBe(26)
      expect(varToIndex('ab')).toBe(27)
      expect(varToIndex('ad')).toBe(29)
    })

    it('应该不区分大小写', () => {
      expect(varToIndex('A')).toBe(0)
      expect(varToIndex('Z')).toBe(25)
      expect(varToIndex('AA')).toBe(26)
    })

    it('应该抛出错误对于无效的变量名', () => {
      expect(() => varToIndex('ae')).toThrow('无效的卡名称')
      expect(() => varToIndex('ba')).toThrow('无效的卡名称')
      expect(() => varToIndex('123')).toThrow('无效的卡名称')
    })
  })

  describe('indexToVar', () => {
    it('应该正确转换单字母索引', () => {
      expect(indexToVar(0)).toBe('a')
      expect(indexToVar(1)).toBe('b')
      expect(indexToVar(25)).toBe('z')
    })

    it('应该正确转换双字母索引', () => {
      expect(indexToVar(26)).toBe('aa')
      expect(indexToVar(27)).toBe('ab')
      expect(indexToVar(29)).toBe('ad')
    })

    it('应该抛出错误对于超出范围的索引', () => {
      expect(() => indexToVar(-1)).toThrow('索引超出范围')
      expect(() => indexToVar(30)).toThrow('索引超出范围')
    })
  })

  describe('indexToLabel', () => {
    it('应该正确转换单字母标签', () => {
      expect(indexToLabel(0)).toBe('A')
      expect(indexToLabel(1)).toBe('B')
      expect(indexToLabel(25)).toBe('Z')
    })

    it('应该正确转换双字母标签', () => {
      expect(indexToLabel(26)).toBe('AA')
      expect(indexToLabel(27)).toBe('AB')
      expect(indexToLabel(29)).toBe('AD')
    })

    it('应该抛出错误对于超出范围的索引', () => {
      expect(() => indexToLabel(-1)).toThrow('索引超出范围')
      expect(() => indexToLabel(30)).toThrow('索引超出范围')
    })
  })

  describe('combination', () => {
    beforeEach(() => {
      clearCombinationCache()
    })

    it('应该正确计算基本组合数', () => {
      expect(combination(5, 0)).toBe(1n)
      expect(combination(5, 5)).toBe(1n)
      expect(combination(5, 1)).toBe(5n)
      expect(combination(5, 2)).toBe(10n)
      expect(combination(5, 3)).toBe(10n)
    })

    it('应该正确计算大数组合', () => {
      expect(combination(40, 5)).toBe(658008n)
      expect(combination(60, 5)).toBe(5461512n)
    })

    it('应该返回0对于无效的参数', () => {
      expect(combination(5, 6)).toBe(0n)
      expect(combination(5, -1)).toBe(0n)
    })

    it('应该使用缓存', () => {
      // 第一次计算
      const result1 = combination(40, 5)
      // 第二次应该从缓存获取
      const result2 = combination(40, 5)
      expect(result1).toBe(result2)
    })

    it('应该支持 bigint 参数', () => {
      expect(combination(5n, 2n)).toBe(10n)
    })
  })

  describe('clearCombinationCache', () => {
    it('应该清除缓存', () => {
      combination(40, 5)
      clearCombinationCache()
      // 清除后再次计算应该得到相同结果
      expect(combination(40, 5)).toBe(658008n)
    })
  })

  describe('shuffleArray', () => {
    it('应该返回相同长度的数组', () => {
      const arr = [1, 2, 3, 4, 5]
      const shuffled = shuffleArray(arr)
      expect(shuffled).toHaveLength(arr.length)
    })

    it('应该包含所有原始元素', () => {
      const arr = [1, 2, 3, 4, 5]
      const shuffled = shuffleArray(arr)
      expect(shuffled.sort()).toEqual(arr.sort())
    })

    it('应该不修改原始数组', () => {
      const arr = [1, 2, 3, 4, 5]
      const original = [...arr]
      shuffleArray(arr)
      expect(arr).toEqual(original)
    })

    it('应该能处理空数组', () => {
      expect(shuffleArray([])).toEqual([])
    })
  })

  describe('drawCards', () => {
    it('应该正确统计抽到的卡牌', () => {
      const deck = [0, 0, 0, 1, 1, 2]
      const counts = drawCards(deck, 3, 3)
      
      expect(counts).toHaveLength(3)
      expect(counts[0]).toBe(3) // 抽到3张类型0的卡
      expect(counts[1]).toBe(0) // 没有抽到类型1的卡
      expect(counts[2]).toBe(0) // 没有抽到类型2的卡
    })

    it('应该正确处理混合抽卡', () => {
      const deck = [0, 1, 2, 0, 1, 2]
      const counts = drawCards(deck, 6, 3)
      
      expect(counts[0]).toBe(2)
      expect(counts[1]).toBe(2)
      expect(counts[2]).toBe(2)
    })

    it('应该能处理空抽卡', () => {
      const deck = [0, 1, 2]
      const counts = drawCards(deck, 0, 3)
      
      expect(counts).toEqual([0, 0, 0])
    })
  })

  describe('createDeck', () => {
    it('应该正确创建卡组', () => {
      const cardCounts = [3, 2, 1]
      const deck = createDeck(cardCounts)
      
      expect(deck).toHaveLength(6)
      expect(deck.filter(c => c === 0)).toHaveLength(3)
      expect(deck.filter(c => c === 1)).toHaveLength(2)
      expect(deck.filter(c => c === 2)).toHaveLength(1)
    })

    it('应该能处理空卡组', () => {
      expect(createDeck([])).toEqual([])
      expect(createDeck([0, 0, 0])).toEqual([])
    })

    it('应该能处理包含0的卡组', () => {
      const deck = createDeck([2, 0, 3])
      expect(deck).toHaveLength(5)
      expect(deck.filter(c => c === 0)).toHaveLength(2)
      expect(deck.filter(c => c === 1)).toHaveLength(0)
      expect(deck.filter(c => c === 2)).toHaveLength(3)
    })
  })

  describe('escapeRegExp', () => {
    it('应该转义特殊字符', () => {
      expect(escapeRegExp('.')).toBe('\\.')
      expect(escapeRegExp('*')).toBe('\\*')
      expect(escapeRegExp('+')).toBe('\\+')
      expect(escapeRegExp('?')).toBe('\\?')
      expect(escapeRegExp('^')).toBe('\\^')
      expect(escapeRegExp('$')).toBe('\\$')
      expect(escapeRegExp('()')).toBe('\\(\\)')
      expect(escapeRegExp('[]')).toBe('\\[\\]')
      expect(escapeRegExp('{}')).toBe('\\{\\}')
      expect(escapeRegExp('|')).toBe('\\|')
      expect(escapeRegExp('\\')).toBe('\\\\')
    })

    it('应该不修改普通字符', () => {
      expect(escapeRegExp('abc123')).toBe('abc123')
      expect(escapeRegExp('增殖的G')).toBe('增殖的G')
    })

    it('应该处理组合字符串', () => {
      expect(escapeRegExp('(a+b)*c')).toBe('\\(a\\+b\\)\\*c')
    })
  })
})

