# YGO Build Calc 快速开始指南

## 📦 项目结构

```
ygo-build-calc/
├── src/
│   ├── types.ts           # TypeScript 类型定义
│   ├── utils.ts           # 工具函数（组合数、洗牌等）
│   ├── condition.ts       # 条件表达式解析和编译
│   ├── calculator.ts      # 概率计算（精确+蒙特卡洛）
│   ├── optimizer.ts       # 卡组优化器
│   ├── worker.ts          # Web Worker 代码生成
│   └── index.ts           # 主入口文件
├── examples/
│   ├── basic-usage.ts     # 基础使用示例
│   └── worker-usage.ts    # Worker 使用示例
├── README.md              # 详细文档
├── GUIDE_CN.md            # 本文件
├── package.json
└── tsconfig.json
```

## 🚀 核心功能

### 1. 概率计算

#### 精确计算
```typescript
import { calculateExact } from '@ygo_build/calc'

// 40张卡组：3张A、3张B、34张其他
// 计算抽5张时至少1张A的概率
const result = calculateExact([3, 3, 34], 5, 'a > 0')
console.log(result.probability) // 33.60%
```

#### 蒙特卡洛模拟
```typescript
import { calculateMonteCarlo } from '@ygo_build/calc'

// 模拟10万次
const result = calculateMonteCarlo([3, 3, 34], 5, 'a > 0', 100000)
console.log(result.probability) // ~33.6%（有微小误差）
```

#### 自动选择
```typescript
import { calculateAuto } from '@ygo_build/calc'

// 系统自动选择最优算法
const result = calculateAuto([3, 3, 34], 5, 'a > 0')
```

### 2. 条件表达式

支持的条件语法：

```typescript
// 简单条件
'a > 0'              // 至少1张A
'b >= 2'             // 至少2张B
'c == 0'             // 没有C

// 逻辑组合
'a > 0 && b > 0'     // A和B都至少1张
'a > 0 || b > 0'     // A或B至少1张

// 算术求和
'a + b >= 2'         // A和B合计至少2张
'a + b + c >= 3'     // A、B、C合计至少3张

// 复杂条件
'(a > 0 || b > 0) && c >= 1'        // (A或B至少1张) 且 C至少1张
'a >= 2 && (b + c) >= 1'            // A至少2张 且 (B+C)至少1张
```

### 3. 卡组优化

```typescript
import { optimize, applyPlan } from '@ygo_build/calc'

const cards = [
  { count: 3, name: '增殖的G', label: 'A', maxCount: 3 },
  { count: 2, name: '灰流丽', label: 'B', maxCount: 3 },
  { count: 35, name: '其他', label: 'C', maxCount: 60 }
]

// 生成优化方案（目标启动率 80%）
const result = optimize(
  cards,
  'a > 0 || b > 0',  // 条件
  5,                  // 抽卡数
  80                  // 目标启动率
)

// 查看方案
console.log(result.keepDeckPlans)   // 保持卡组大小
console.log(result.expandDeckPlans) // 扩充卡组
console.log(result.reduceDeckPlans) // 压缩卡组

// 应用最佳方案
applyPlan(result.keepDeckPlans[0], cards)
```

### 4. Web Worker

```typescript
import { generateExactWorkerCode } from '@ygo_build/calc'

// 创建 Worker
const code = generateExactWorkerCode()
const blob = new Blob([code], { type: 'text/javascript' })
const worker = new Worker(URL.createObjectURL(blob))

// 监听结果
worker.onmessage = (e) => {
  if (e.data.type === 'progress') {
    console.log(`进度: ${e.data.progress}%`)
  } else if (e.data.type === 'result') {
    console.log('结果:', e.data)
    worker.terminate()
  }
}

// 发送任务
worker.postMessage({
  cardCounts: [3, 3, 34],
  draws: 5,
  condition: 'a > 0'
})
```

## 📝 变量命名规则

- 单字母: `a` ~ `z` (索引 0-25)
- 双字母: `aa` ~ `ad` (索引 26-29)

变量名对应 `cardCounts` 数组的索引位置：
- `a` = cardCounts[0]
- `b` = cardCounts[1]
- `c` = cardCounts[2]
- ...

## 🎯 使用场景

### 场景1: 初手概率
```typescript
// 40张卡组，3张关键卡，计算初手有关键卡的概率
calculateExact([3, 37], 5, 'a > 0')
```

### 场景2: 连锁概率
```typescript
// 10张展开、6张手坑、24张其他
// 计算既有展开又有手坑的概率
calculateExact([10, 6, 24], 5, 'a > 0 && b > 0')
```

### 场景3: 多条件组合
```typescript
// 至少2张手坑 或 至少1张展开
calculateExact([9, 9, 22], 5, 'b >= 2 || a >= 1')
```

### 场景4: 卡组优化
```typescript
// 根据目标启动率自动生成调整方案
const result = optimize(cards, 'a >= 1', 5, 85)
applyPlan(result.keepDeckPlans[0], cards)
```

## ⚙️ 开发命令

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm dev

# 构建
npm build

# 类型检查
npm typecheck

# 运行测试
npm test
```

## 📚 更多资源

- 完整文档: [README.md](./README.md)
- 基础示例: [examples/basic-usage.ts](./examples/basic-usage.ts)
- Worker 示例: [examples/worker-usage.ts](./examples/worker-usage.ts)

## 💡 最佳实践

1. **选择合适的计算方法**
   - 小规模卡组（≤40张）：使用精确计算
   - 大型卡组或复杂条件：使用蒙特卡洛模拟
   - 不确定时：使用 `calculateAuto`

2. **条件表达式优化**
   - 使用括号明确优先级
   - 避免过于复杂的嵌套
   - 测试条件是否正确解析

3. **Web Worker 使用**
   - 长时间计算使用 Worker 避免阻塞
   - 记得在完成后 `terminate()` Worker
   - 可以使用进度回调实现 UI 更新

4. **卡组优化**
   - 设置合理的 `maxCount` 限制
   - 根据实际需求选择方案类型
   - 验证优化后的启动率

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT

