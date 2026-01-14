/**
 * YGO 游戏王概率计算库
 * 
 * @packageDocumentation
 */

// 导出类型定义
export type {
  Card,
  ConditionNode,
  SingleConditionNode,
  LogicalConditionNode,
  ConditionFunction,
  CalculationResult,
  ProgressCallback,
  OptimizationPlan,
  OptimizationResult,
  OptimizationOptions,
  PlanChange,
  WorkerMessage,
  WorkerProgressMessage,
  WorkerResultMessage,
  WorkerErrorMessage,
  CardNameMap
} from './types'

// 导出工具函数
export {
  varToIndex,
  indexToVar,
  indexToLabel,
  combination,
  clearCombinationCache,
  shuffleArray,
  drawCards,
  createDeck,
  escapeRegExp
} from './utils'

// 导出条件解析和编译
export {
  parseCondition,
  conditionToString,
  compileCondition,
  compileConditionString,
  parseConditionVariables,
  replaceCardNames
} from './condition'

// 导出概率计算
export {
  calculateExact,
  calculateMonteCarlo,
  calculateAuto,
  quickMonteCarlo
} from './calculator'

// 导出优化器
export {
  optimize,
  applyPlan
} from './optimizer'

// 导出 Worker 代码生成
export {
  generateExactWorkerCode,
  generateMonteCarloWorkerCode,
  generateOptimizerWorkerCode
} from './worker'

