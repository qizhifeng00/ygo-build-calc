/**
 * YGO Build Calc Worker 使用示例
 * 演示如何在浏览器中使用 Web Worker 进行后台计算
 */

import {
  generateExactWorkerCode,
  generateMonteCarloWorkerCode,
} from '@ygo_build/calc'

// ============================================
// 示例 1: 精确计算 Worker
// ============================================
console.log('=== 精确计算 Worker 示例 ===')

// 创建精确计算 Worker
const exactCode = generateExactWorkerCode()
const exactBlob = new Blob([exactCode], { type: 'text/javascript' })
const exactWorker = new Worker(URL.createObjectURL(exactBlob))

exactWorker.onmessage = (e) => {
  if (e.data.type === 'progress') {
    console.log(`精确计算进度: ${e.data.progress}%`)
  } else if (e.data.type === 'result') {
    console.log('精确计算完成!')
    const valid = BigInt(e.data.valid)
    const total = BigInt(e.data.total)
    const probability = Number((valid * 10000n) / total) / 100
    console.log(`概率: ${probability.toFixed(2)}%`)
    console.log(`满足条件: ${valid}`)
    console.log(`总组合数: ${total}`)
    
    // 计算完成后终止 Worker
    exactWorker.terminate()
  } else if (e.data.type === 'error') {
    console.error('精确计算错误:', e.data.message)
    exactWorker.terminate()
  }
}

// 发送计算任务
exactWorker.postMessage({
  cardCounts: [3, 3, 34],  // 3张A、3张B、34张其他
  draws: 5,                 // 抽5张
  condition: 'a > 0'        // 至少1张A
})

console.log('精确计算已开始...')
console.log()

// ============================================
// 示例 2: 蒙特卡洛模拟 Worker
// ============================================
console.log('=== 蒙特卡洛模拟 Worker 示例 ===')

// 创建蒙特卡洛模拟 Worker
const mcCode = generateMonteCarloWorkerCode()
const mcBlob = new Blob([mcCode], { type: 'text/javascript' })
const mcWorker = new Worker(URL.createObjectURL(mcBlob))

mcWorker.onmessage = (e) => {
  if (e.data.type === 'progress') {
    console.log(`蒙特卡洛模拟进度: ${e.data.progress}%`)
  } else if (e.data.type === 'result') {
    console.log('蒙特卡洛模拟完成!')
    const valid = e.data.valid
    const total = e.data.total
    const probability = (valid / total) * 100
    console.log(`概率: ${probability.toFixed(2)}%`)
    console.log(`满足条件: ${valid}`)
    console.log(`总模拟次数: ${total}`)
    
    // 计算完成后终止 Worker
    mcWorker.terminate()
  } else if (e.data.type === 'error') {
    console.error('蒙特卡洛模拟错误:', e.data.message)
    mcWorker.terminate()
  }
}

// 发送计算任务
mcWorker.postMessage({
  cardCounts: [3, 3, 34],   // 3张A、3张B、34张其他
  draws: 5,                  // 抽5张
  condition: 'a > 0 && b > 0', // 至少1张A且至少1张B
  simulations: 100000        // 模拟10万次
})

console.log('蒙特卡洛模拟已开始...')
console.log()

// ============================================
// 实际使用建议
// ============================================
console.log('=== 实际使用建议 ===')
console.log('1. Worker 适合计算时间较长的任务，避免阻塞主线程')
console.log('2. 精确计算适合小规模卡组（≤40张）和简单条件')
console.log('3. 蒙特卡洛模拟适合大型卡组或复杂条件')
console.log('4. 可以使用进度回调实现进度条显示')
console.log('5. 记得在计算完成或发生错误后终止 Worker')

