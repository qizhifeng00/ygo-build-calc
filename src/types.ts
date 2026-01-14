/**
 * YGO 游戏王概率计算库 - 类型定义
 */

/**
 * 卡牌信息
 */
export interface Card {
  /** 卡牌数量 */
  count: number
  /** 卡牌名称 */
  name?: string
  /** 卡牌标签（A, B, C...） */
  label?: string
  /** 最大上限（默认3） */
  maxCount?: number
}

/**
 * 条件节点类型
 */
export type ConditionNodeType = 'single' | 'and' | 'or'

/**
 * 单个比较条件节点
 */
export interface SingleConditionNode {
  type: 'single'
  /** 参与比较的卡牌变量 */
  cards: Array<{
    name: string
    operator?: '+' | '-' | '*' | '/'
  }>
  /** 比较符号 */
  symbol: 'gt' | 'lt' | 'eq' | 'neq' | 'gte' | 'lte'
  /** 比较的数值 */
  num: string
}

/**
 * 逻辑组合条件节点
 */
export interface LogicalConditionNode {
  type: 'and' | 'or'
  children: ConditionNode[]
}

/**
 * 条件节点（联合类型）
 */
export type ConditionNode = SingleConditionNode | LogicalConditionNode

/**
 * 条件函数类型
 */
export type ConditionFunction = (counts: number[]) => boolean

/**
 * 计算结果
 */
export interface CalculationResult {
  /** 满足条件的组合数 */
  valid: bigint | number
  /** 总组合数 */
  total: bigint | number
  /** 概率（0-100） */
  probability: number
  /** 计算方法 */
  calculationMethod: '精确计算' | '蒙特卡洛模拟'
}

/**
 * 进度回调函数
 */
export type ProgressCallback = (progress: number, text?: string) => void

/**
 * 优化方案变更
 */
export interface PlanChange {
  card: Card
  change: number
}

/**
 * 优化方案
 */
export interface OptimizationPlan {
  /** 方案类型 */
  type: 'increase_key' | 'increase_multi_key' | 'decrease_key' | 'decrease_multi_key' | 'expand_deck' | 'reduce_deck'
  /** 方案描述 */
  description: string
  /** 变更内容 */
  changes: PlanChange[]
  /** 新的卡牌数量数组 */
  newCounts: number[]
  /** 新的卡组大小 */
  newDeckSize?: number
  /** 新的启动率 */
  newRate: number
  /** 提升幅度 */
  improvement: number
  /** 是否达到目标 */
  reachTarget: boolean
  /** 优先级 */
  priority: number
  /** 是否为最佳方案 */
  isBest?: boolean
}

/**
 * 优化结果
 */
export interface OptimizationResult {
  /** 当前启动率 */
  currentRate: number
  /** 目标启动率 */
  targetRate: number
  /** 优化方向 */
  direction: 'increase' | 'decrease'
  /** 保持卡组大小的方案 */
  keepDeckPlans: OptimizationPlan[]
  /** 扩充卡组的方案 */
  expandDeckPlans: OptimizationPlan[]
  /** 压缩卡组的方案 */
  reduceDeckPlans: OptimizationPlan[]
  /** 总方案数 */
  totalPlansCount: number
}

/**
 * 优化选项
 */
export interface OptimizationOptions {
  /** 模拟次数（默认30000） */
  simulations?: number
  /** 进度回调 */
  onProgress?: ProgressCallback
}

/**
 * Worker 消息类型
 */
export interface WorkerProgressMessage {
  type: 'progress'
  progress: number
  text?: string
}

export interface WorkerResultMessage {
  type: 'result'
  valid: string | number
  total: string | number
  calculationMethod?: string
}

export interface WorkerErrorMessage {
  type: 'error'
  message: string
}

export type WorkerMessage = WorkerProgressMessage | WorkerResultMessage | WorkerErrorMessage

/**
 * 卡牌名称映射
 */
export interface CardNameMap {
  [name: string]: string
}

