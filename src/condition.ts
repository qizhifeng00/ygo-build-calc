/**
 * 条件表达式解析和编译模块
 */

import type { 
  ConditionNode, 
  SingleConditionNode, 
  LogicalConditionNode,
  ConditionFunction,
  CardNameMap
} from './types'
import { varToIndex, escapeRegExp } from './utils'

/**
 * 操作符映射
 */
const OPERATOR_MAP: Record<string, 'gt' | 'lt' | 'eq' | 'neq' | 'gte' | 'lte'> = {
  '>': 'gt',
  '<': 'lt',
  '==': 'eq',
  '!=': 'neq',
  '>=': 'gte',
  '<=': 'lte'
}

const OPERATOR_SYMBOLS: Record<string, string> = {
  'gt': '>',
  'lt': '<',
  'eq': '==',
  'neq': '!=',
  'gte': '>=',
  'lte': '<='
}

/**
 * Token 解析器
 */
class Parser {
  private tokens: string[]
  private pos: number = 0

  constructor(tokens: string[]) {
    this.tokens = tokens
  }

  peek(): string | undefined {
    return this.tokens[this.pos]
  }

  consume(expected?: string): string {
    const token = this.tokens[this.pos]
    if (expected && token !== expected) {
      throw new Error(`预期 ${expected}，但得到 ${token || '结束'}`)
    }
    if (!token) {
      throw new Error('意外的结束')
    }
    this.pos++
    return token
  }

  eof(): boolean {
    return this.pos >= this.tokens.length
  }

  remaining(): string {
    return this.tokens.slice(this.pos).join(' ')
  }
  
  getPos(): number {
    return this.pos
  }
  
  setPos(pos: number): void {
    this.pos = pos
  }
}

/**
 * 词法分析：将表达式字符串分解为 token
 */
function tokenize(expr: string): string[] {
  // 支持：字母、数字、中文、下划线组成的标识符
  // 支持：>=, <=, ==, !=, &&, ||
  // 支持：+, -, *, /, (, ), <, >
  const regex = /\s*([A-Za-z0-9_\u4e00-\u9fa5]+|>=|<=|==|!=|&&|\|\||[-+*/()<>])\s*/g
  const tokens: string[] = []
  let m: RegExpExecArray | null
  let lastIndex = 0
  
  while ((m = regex.exec(expr)) !== null) {
    // 检查是否有未匹配的字符
    if (m.index > lastIndex) {
      const skipped = expr.substring(lastIndex, m.index).trim()
      if (skipped) {
        throw new Error(`不支持的字符: "${skipped}"`)
      }
    }
    const token = m[1]
    if (token) tokens.push(token)
    lastIndex = regex.lastIndex
  }
  
  // 检查末尾是否有未匹配的字符
  const remaining = expr.substring(lastIndex).trim()
  if (remaining) {
    throw new Error(`不支持的字符: "${remaining}"`)
  }
  
  return tokens
}

/**
 * 解析表达式
 */
function parseExpression(parser: Parser): ConditionNode {
  return parseLogicalOr(parser)
}

/**
 * 解析逻辑或
 */
function parseLogicalOr(parser: Parser): ConditionNode {
  let node = parseLogicalAnd(parser)
  
  while (!parser.eof()) {
    const peek = parser.peek()
    if (peek !== '||') break
    parser.consume('||')
    const right = parseLogicalAnd(parser)
    node = { type: 'or', children: [node, right] } as LogicalConditionNode
  }
  
  return node
}

/**
 * 解析逻辑与
 */
function parseLogicalAnd(parser: Parser): ConditionNode {
  let node = parseRelational(parser)
  
  while (!parser.eof()) {
    const peek = parser.peek()
    if (peek !== '&&') break
    parser.consume('&&')
    const right = parseRelational(parser)
    node = { type: 'and', children: [node, right] } as LogicalConditionNode
  }
  
  return node
}

/**
 * 解析关系表达式
 */
function parseRelational(parser: Parser): ConditionNode {
  const left = parseSum(parser)
  
  // 如果 left 已经是一个条件对象（从括号表达式返回），直接返回
  if (typeof left === 'object' && !Array.isArray(left) && 'type' in left) {
    return left as ConditionNode
  }
  
  const peek = parser.peek()
  if (!parser.eof() && peek && /^(>=|<=|==|!=|>|<)$/.test(peek)) {
    const op = parser.consume()
    const num = parser.consume()
    
    if (!/^\d+$/.test(num)) {
      throw new Error(`预期数字，但得到 ${num || '结束'}`)
    }

    const cards: SingleConditionNode['cards'] = []
    
    if (Array.isArray(left)) {
      const first = left[0]
      if (!first) throw new Error('表达式为空')
      cards.push({ name: first })
      for (let i = 1; i < left.length; i += 2) {
        const operator = left[i] as '+' | '-' | '*' | '/'
        const operand = left[i + 1]
        if (!operand) throw new Error('表达式不完整')
        cards.push({ operator, name: operand })
      }
    } else if (typeof left === 'string') {
      cards.push({ name: left })
    } else {
      throw new Error(`无法解析表达式左侧: ${JSON.stringify(left)}`)
    }

    const symbol = OPERATOR_MAP[op]
    if (!symbol) {
      throw new Error(`不支持的运算符: ${op}`)
    }

    return {
      type: 'single',
      cards,
      symbol,
      num
    }
  }
  
  // 如果没有比较运算符，抛出错误
  throw new Error(`无效的表达式: ${JSON.stringify(left)}`)
}

/**
 * 解析求和表达式
 */
function parseSum(parser: Parser): ConditionNode | string | string[] {
  if (parser.peek() === '(') {
    parser.consume('(')
    
    // 尝试解析括号内的内容
    const startPos = parser.getPos()
    try {
      const node = parseExpression(parser)
      if (parser.peek() === ')') {
        parser.consume(')')
        return node
      }
    } catch (e) {
      // 解析失败，回溯
      parser.setPos(startPos)
    }
    
    // 如果不是完整表达式，作为操作数求和解析
    parser.setPos(startPos)
    const items: string[] = []
    items.push(parser.consume())
    
    while (!parser.eof()) {
      const peek = parser.peek()
      if (!peek || !['+', '-', '*', '/'].includes(peek)) break
      const operator = parser.consume()
      items.push(operator)
      const operand = parser.consume()
      items.push(operand)
    }
    
    parser.consume(')')
    const first = items[0]
    return items.length === 1 && first ? first : items
  }

  // 没有括号，直接解析标识符或数字
  const items: string[] = []
  const first = parser.consume()
  items.push(first)
  
  while (!parser.eof()) {
    const peek = parser.peek()
    if (!peek || !['+', '-', '*', '/'].includes(peek)) break
    const operator = parser.consume()
    items.push(operator)
    const operand = parser.consume()
    items.push(operand)
  }
  
  const firstItem = items[0]
  return items.length === 1 && firstItem ? firstItem : items
}

/**
 * 展平条件结构（合并相同类型的嵌套）
 */
function flattenCondition(condition: ConditionNode): ConditionNode {
  if (condition.type === 'single') {
    return condition
  }
  
  const flatChildren: ConditionNode[] = []
  for (const child of condition.children) {
    const flatChild = flattenCondition(child)
    // 如果子节点和父节点类型相同，展平它
    if (flatChild.type === condition.type) {
      flatChildren.push(...(flatChild as LogicalConditionNode).children)
    } else {
      flatChildren.push(flatChild)
    }
  }
  
  return { type: condition.type, children: flatChildren }
}

/**
 * 解析条件表达式字符串
 * @param expr 条件表达式字符串
 * @returns 条件节点
 */
export function parseCondition(expr: string): ConditionNode {
  const trimmed = expr.trim()
  if (!trimmed) {
    throw new Error('空的条件表达式')
  }

  const tokens = tokenize(trimmed)
  if (tokens.length === 0) {
    throw new Error('无法解析条件：无有效标记')
  }
  
  const parser = new Parser(tokens)
  const tree = parseExpression(parser)

  if (!parser.eof()) {
    throw new Error(`无法解析条件：${trimmed}（剩余: ${parser.remaining()}）`)
  }

  // 规范化结果：确保返回的是 and/or 类型的根节点
  if (tree.type === 'single') {
    return { type: 'and', children: [tree] }
  }

  // 展平不必要的嵌套
  return flattenCondition(tree)
}

/**
 * 条件节点转字符串
 */
export function conditionToString(condition: ConditionNode): string {
  if (condition.type === 'single') {
    const cardsText = condition.cards
      .map((c, i) => i === 0 ? c.name : `${c.operator || '+'} ${c.name}`)
      .join(' ')
    const operator = OPERATOR_SYMBOLS[condition.symbol] || condition.symbol
    return `(${cardsText}) ${operator} ${condition.num}`
  }

  const childrenText = condition.children
    .map(conditionToString)
    .filter(Boolean)
  
  return childrenText.length > 1
    ? `(${childrenText.join(condition.type === 'and' ? ' && ' : ' || ')})`
    : childrenText[0] || ''
}

/**
 * 编译条件节点为可执行函数
 */
export function compileCondition(condition: ConditionNode): ConditionFunction {
  if (condition.type === 'single') {
    // 生成表达式
    let expr = ''
    condition.cards.forEach((card, i) => {
      if (i === 0) {
        expr += `counts[${varToIndex(card.name)}]`
      } else {
        expr += ` ${card.operator || '+'} counts[${varToIndex(card.name)}]`
      }
    })
    
    const op = OPERATOR_SYMBOLS[condition.symbol]
    if (!op) {
      throw new Error(`不支持的运算符: ${condition.symbol}`)
    }
    expr = `(${expr}) ${op} ${condition.num}`
    
    return new Function('counts', `return ${expr}`) as ConditionFunction
  }
  
  // 递归编译子条件
  const childFuncs = condition.children.map(compileCondition)
  
  if (condition.type === 'and') {
    return (counts: number[]) => childFuncs.every(fn => fn(counts))
  } else {
    return (counts: number[]) => childFuncs.some(fn => fn(counts))
  }
}

/**
 * 编译条件字符串为可执行函数
 */
export function compileConditionString(expr: string): ConditionFunction {
  const condition = parseCondition(expr)
  return compileCondition(condition)
}

/**
 * 提取条件中使用的变量索引
 */
export function parseConditionVariables(expr: string): number[] {
  const varRegex = /([a-zA-Z]+)/g
  const variables = new Set<number>()
  let match: RegExpExecArray | null
  
  while ((match = varRegex.exec(expr)) !== null) {
    try {
      const varName = match[1]
      if (varName) {
        const idx = varToIndex(varName)
        variables.add(idx)
      }
    } catch {
      // 忽略无效变量
    }
  }
  
  return Array.from(variables).sort((a, b) => a - b)
}

/**
 * 替换条件表达式中的卡牌名称为变量名
 * @param expr 条件表达式
 * @param nameMap 卡牌名称到变量名的映射
 */
export function replaceCardNames(expr: string, nameMap: CardNameMap): string {
  let result = expr
  
  // 按长度从长到短排序，避免短名称替换导致长名称无法匹配
  const sortedNames = Object.keys(nameMap).sort((a, b) => b.length - a.length)
  
  for (const name of sortedNames) {
    const replacement = nameMap[name]
    if (!replacement) continue
    const regex = new RegExp(escapeRegExp(name), 'g')
    result = result.replace(regex, replacement)
  }
  
  return result
}

