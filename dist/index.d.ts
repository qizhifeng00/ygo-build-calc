/**
 * YGO 游戏王概率计算库 - 类型定义
 */
/**
 * 卡牌信息
 */
interface Card {
    /** 卡牌数量 */
    count: number;
    /** 卡牌名称 */
    name?: string;
    /** 卡牌标签（A, B, C...） */
    label?: string;
    /** 最大上限（默认3） */
    maxCount?: number;
}
/**
 * 单个比较条件节点
 */
interface SingleConditionNode {
    type: 'single';
    /** 参与比较的卡牌变量 */
    cards: Array<{
        name: string;
        operator?: '+' | '-' | '*' | '/';
    }>;
    /** 比较符号 */
    symbol: 'gt' | 'lt' | 'eq' | 'neq' | 'gte' | 'lte';
    /** 比较的数值 */
    num: string;
}
/**
 * 逻辑组合条件节点
 */
interface LogicalConditionNode {
    type: 'and' | 'or';
    children: ConditionNode[];
}
/**
 * 条件节点（联合类型）
 */
type ConditionNode = SingleConditionNode | LogicalConditionNode;
/**
 * 条件函数类型
 */
type ConditionFunction = (counts: number[]) => boolean;
/**
 * 计算结果
 */
interface CalculationResult {
    /** 满足条件的组合数 */
    valid: bigint | number;
    /** 总组合数 */
    total: bigint | number;
    /** 概率（0-100） */
    probability: number;
    /** 计算方法 */
    calculationMethod: '精确计算' | '蒙特卡洛模拟';
}
/**
 * 进度回调函数
 */
type ProgressCallback = (progress: number, text?: string) => void;
/**
 * 优化方案变更
 */
interface PlanChange {
    card: Card;
    change: number;
}
/**
 * 优化方案
 */
interface OptimizationPlan {
    /** 方案类型 */
    type: 'increase_key' | 'increase_multi_key' | 'decrease_key' | 'decrease_multi_key' | 'expand_deck' | 'reduce_deck';
    /** 方案描述 */
    description: string;
    /** 变更内容 */
    changes: PlanChange[];
    /** 新的卡牌数量数组 */
    newCounts: number[];
    /** 新的卡组大小 */
    newDeckSize?: number;
    /** 新的启动率 */
    newRate: number;
    /** 提升幅度 */
    improvement: number;
    /** 是否达到目标 */
    reachTarget: boolean;
    /** 优先级 */
    priority: number;
    /** 是否为最佳方案 */
    isBest?: boolean;
}
/**
 * 优化结果
 */
interface OptimizationResult {
    /** 当前启动率 */
    currentRate: number;
    /** 目标启动率 */
    targetRate: number;
    /** 优化方向 */
    direction: 'increase' | 'decrease';
    /** 保持卡组大小的方案 */
    keepDeckPlans: OptimizationPlan[];
    /** 扩充卡组的方案 */
    expandDeckPlans: OptimizationPlan[];
    /** 压缩卡组的方案 */
    reduceDeckPlans: OptimizationPlan[];
    /** 总方案数 */
    totalPlansCount: number;
}
/**
 * 优化选项
 */
interface OptimizationOptions {
    /** 模拟次数（默认30000） */
    simulations?: number;
    /** 进度回调 */
    onProgress?: ProgressCallback;
}
/**
 * Worker 消息类型
 */
interface WorkerProgressMessage {
    type: 'progress';
    progress: number;
    text?: string;
}
interface WorkerResultMessage {
    type: 'result';
    valid: string | number;
    total: string | number;
    calculationMethod?: string;
}
interface WorkerErrorMessage {
    type: 'error';
    message: string;
}
type WorkerMessage = WorkerProgressMessage | WorkerResultMessage | WorkerErrorMessage;
/**
 * 卡牌名称映射
 */
interface CardNameMap {
    [name: string]: string;
}

/**
 * 工具函数模块
 */
/**
 * 变量名转索引
 * @example
 * varToIndex('a') // 0
 * varToIndex('z') // 25
 * varToIndex('aa') // 26
 */
declare function varToIndex(varName: string): number;
/**
 * 索引转变量名
 * @example
 * indexToVar(0) // 'a'
 * indexToVar(25) // 'z'
 * indexToVar(26) // 'aa'
 */
declare function indexToVar(index: number): string;
/**
 * 索引转标签
 * @example
 * indexToLabel(0) // 'A'
 * indexToLabel(25) // 'Z'
 * indexToLabel(26) // 'AA'
 */
declare function indexToLabel(index: number): string;
/**
 * 计算组合数 C(n, k)
 */
declare function combination(n: number | bigint, k: number | bigint): bigint;
/**
 * 清除组合数缓存
 */
declare function clearCombinationCache(): void;
/**
 * 洗牌算法（Fisher-Yates）
 */
declare function shuffleArray<T>(array: T[]): T[];
/**
 * 从卡组中抽卡并统计
 */
declare function drawCards(deck: number[], draws: number, cardTypeCount: number): number[];
/**
 * 创建卡组（扩展数组）
 */
declare function createDeck(cardCounts: number[]): number[];
/**
 * 转义正则表达式特殊字符
 */
declare function escapeRegExp(str: string): string;

/**
 * 条件表达式解析和编译模块
 */

/**
 * 解析条件表达式字符串
 * @param expr 条件表达式字符串
 * @returns 条件节点
 */
declare function parseCondition(expr: string): ConditionNode;
/**
 * 条件节点转字符串
 */
declare function conditionToString(condition: ConditionNode): string;
/**
 * 编译条件节点为可执行函数
 */
declare function compileCondition(condition: ConditionNode): ConditionFunction;
/**
 * 编译条件字符串为可执行函数
 */
declare function compileConditionString(expr: string): ConditionFunction;
/**
 * 提取条件中使用的变量索引
 */
declare function parseConditionVariables(expr: string): number[];
/**
 * 替换条件表达式中的卡牌名称为变量名
 * @param expr 条件表达式
 * @param nameMap 卡牌名称到变量名的映射
 */
declare function replaceCardNames(expr: string, nameMap: CardNameMap): string;

/**
 * 概率计算模块
 */

/**
 * 精确计算概率
 * @param cardCounts 各种卡牌的数量数组
 * @param draws 抽取的卡牌数
 * @param condition 条件表达式字符串
 * @param onProgress 进度回调
 */
declare function calculateExact(cardCounts: number[], draws: number, condition: string, onProgress?: ProgressCallback): CalculationResult;
/**
 * 蒙特卡洛模拟计算概率
 * @param cardCounts 各种卡牌的数量数组
 * @param draws 抽取的卡牌数
 * @param condition 条件表达式字符串或条件函数
 * @param simulations 模拟次数（默认100000）
 * @param onProgress 进度回调
 */
declare function calculateMonteCarlo(cardCounts: number[], draws: number, condition: string | ConditionFunction, simulations?: number, onProgress?: ProgressCallback): CalculationResult;
/**
 * 快速蒙特卡洛计算（已编译的条件函数）
 * 主要用于优化器中大量重复计算
 */
declare function quickMonteCarlo(cardCounts: number[], draws: number, conditionFunc: ConditionFunction, simulations: number): number;
/**
 * 自动选择计算方法
 * 根据问题规模自动选择精确计算或蒙特卡洛模拟
 */
declare function calculateAuto(cardCounts: number[], draws: number, condition: string, onProgress?: ProgressCallback): CalculationResult;

/**
 * 卡组优化器模块
 */

/**
 * 生成卡组优化方案
 * @param cards 卡牌列表
 * @param condition 条件表达式
 * @param draws 抽卡数
 * @param targetRate 目标启动率（0-100）
 * @param options 优化选项
 */
declare function optimize(cards: Card[], condition: string, draws: number, targetRate: number, options?: OptimizationOptions): OptimizationResult;
/**
 * 应用优化方案到卡组
 */
declare function applyPlan(plan: OptimizationPlan, cards: Card[]): void;

/**
 * Web Worker 代码生成模块
 * 生成可在浏览器 Worker 中运行的独立代码
 */
/**
 * 生成精确计算 Worker 代码
 */
declare function generateExactWorkerCode(): string;
/**
 * 生成蒙特卡洛模拟 Worker 代码
 */
declare function generateMonteCarloWorkerCode(): string;
/**
 * 生成优化器 Worker 代码
 */
declare function generateOptimizerWorkerCode(): string;

export { type CalculationResult, type Card, type CardNameMap, type ConditionFunction, type ConditionNode, type LogicalConditionNode, type OptimizationOptions, type OptimizationPlan, type OptimizationResult, type PlanChange, type ProgressCallback, type SingleConditionNode, type WorkerErrorMessage, type WorkerMessage, type WorkerProgressMessage, type WorkerResultMessage, applyPlan, calculateAuto, calculateExact, calculateMonteCarlo, clearCombinationCache, combination, compileCondition, compileConditionString, conditionToString, createDeck, drawCards, escapeRegExp, generateExactWorkerCode, generateMonteCarloWorkerCode, generateOptimizerWorkerCode, indexToLabel, indexToVar, optimize, parseCondition, parseConditionVariables, quickMonteCarlo, replaceCardNames, shuffleArray, varToIndex };
