/**
 * Web Worker 代码生成模块
 * 生成可在浏览器 Worker 中运行的独立代码
 */

/**
 * 生成精确计算 Worker 代码
 */
export function generateExactWorkerCode(): string {
  return `
// 组合数缓存
const combinationCache = new Map();

function combination(n, k) {
  if (k < 0 || k > n) return 0n;
  if (k === 0n || k === n) return 1n;
  
  const key = \`\${n},\${k}\`;
  if (combinationCache.has(key)) return combinationCache.get(key);
  
  let result = 1n;
  for (let i = 1n; i <= BigInt(k); i++) {
    result = result * (BigInt(n) - BigInt(k) + i) / i;
  }
  
  combinationCache.set(key, result);
  return result;
}

function varToIndex(varName) {
  const lc = varName.toLowerCase();
  if (lc.length === 1) {
    const code = lc.charCodeAt(0) - 97;
    if (code >= 0 && code < 26) return code;
  }
  if (lc.length === 2 && lc[0] === 'a') {
    const code = lc.charCodeAt(1) - 97;
    if (code >= 0 && code < 4) return 26 + code;
  }
  throw new Error(\`无效的卡名称: \${varName}\`);
}

function calculateProbability(cardCounts, draws, condition) {
  const totalCards = cardCounts.reduce((a, b) => a + b, 0);
  let valid = 0n, total = 0n;
  let lastReportedProgress = 0;

  const conditionFunc = new Function('counts', \`return \${condition.replace(/([a-zA-Z]+)/g, (m) => \`counts[\${varToIndex(m)}]\`)}\`);

  function recurse(index, counts, remaining) {
    if (index === cardCounts.length) {
      if (remaining !== 0) return;
      
      let prob = 1n;
      for (let i = 0; i < counts.length; i++) {
        prob *= combination(cardCounts[i], counts[i]);
      }
      
      total += prob;
      if (conditionFunc(counts)) valid += prob;
      return;
    }

    const progress = Math.min(100, Math.floor((index / cardCounts.length) * 100));
    if (progress > lastReportedProgress) {
      lastReportedProgress = progress;
      postMessage({ type: 'progress', progress });
    }

    const max = Math.min(cardCounts[index], remaining);
    for (let k = 0; k <= max; k++) {
      counts[index] = k;
      recurse(index + 1, [...counts], remaining - k);
    }
  }

  recurse(0, [], draws);
  return { valid, total };
}

onmessage = function(e) {
  const { cardCounts, draws, condition } = e.data;
  try {
    const result = calculateProbability(cardCounts, draws, condition);
    postMessage({ type: 'result', valid: result.valid.toString(), total: result.total.toString(), calculationMethod: '精确计算' });
  } catch (error) {
    postMessage({ type: 'error', message: error.message });
  }
};
  `.trim()
}

/**
 * 生成蒙特卡洛模拟 Worker 代码
 */
export function generateMonteCarloWorkerCode(): string {
  return `
function varToIndex(varName) {
  const lc = varName.toLowerCase();
  if (lc.length === 1) {
    const code = lc.charCodeAt(0) - 97;
    if (code >= 0 && code < 26) return code;
  }
  if (lc.length === 2 && lc[0] === 'a') {
    const code = lc.charCodeAt(1) - 97;
    if (code >= 0 && code < 4) return 26 + code;
  }
  throw new Error("无效的卡名称: " + varName);
}

function drawCards(shuffledDeck, draws, cardTypeCount) {
  let counts = Array(cardTypeCount).fill(0);
  const drawn = shuffledDeck.slice(0, draws);
  drawn.forEach(idx => { counts[idx]++; });
  return counts;
}

function shuffleArray(arr) {
  let array = arr.slice();
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

onmessage = function(e) {
  try {
    const { cardCounts, draws, condition, simulations = 100000 } = e.data;
    
    let deck = [];
    for (let i = 0; i < cardCounts.length; i++) {
      for (let j = 0; j < cardCounts[i]; j++) {
        deck.push(i);
      }
    }
    
    if (deck.length === 0) {
      postMessage({ type: 'result', valid: 0, total: simulations, calculationMethod: "蒙特卡洛模拟" });
      return;
    }

    const replacedCondition = condition.replace(/([a-zA-Z]+)/g, function(m) {
      return "counts[" + varToIndex(m) + "]";
    });
    const conditionFunc = new Function("counts", "return " + replacedCondition);
    
    let valid = 0;
    let iter = 0;
    let lastReported = 0;

    function runChunk() {
      const chunkSize = 5000;
      for (let i = 0; i < chunkSize && iter < simulations; i++, iter++) {
        const shuffled = shuffleArray(deck);
        const result = drawCards(shuffled, draws, cardCounts.length);
        try {
          if (conditionFunc(result)) valid++;
        } catch (e) {
          // 忽略条件执行错误
        }
      }
      
      const progress = Math.floor((iter / simulations) * 100);
      if (progress > lastReported) {
        lastReported = progress;
        postMessage({ type: 'progress', progress });
      }
      
      if (iter < simulations) {
        setTimeout(runChunk, 0);
      } else {
        postMessage({ type: 'result', valid, total: simulations, calculationMethod: "蒙特卡洛模拟" });
      }
    }
    
    runChunk();
  } catch (error) {
    postMessage({ type: 'error', message: error.message });
  }
};
  `.trim()
}

/**
 * 生成优化器 Worker 代码
 */
export function generateOptimizerWorkerCode(): string {
  return `
// 变量名转索引
function varToIndex(varName) {
  const lc = varName.toLowerCase();
  if (lc.length === 1) {
    const code = lc.charCodeAt(0) - 97;
    if (code >= 0 && code < 26) return code;
  }
  if (lc.length === 2 && lc[0] === 'a') {
    const code = lc.charCodeAt(1) - 97;
    if (code >= 0 && code < 4) return 26 + code;
  }
  throw new Error('无效的卡名称: ' + varName);
}

// 洗牌
function shuffleArray(arr) {
  const array = arr.slice();
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// 抽卡并统计
function drawCards(shuffledDeck, draws, cardTypeCount) {
  const counts = Array(cardTypeCount).fill(0);
  const drawn = shuffledDeck.slice(0, draws);
  drawn.forEach((idx) => {
    counts[idx]++;
  });
  return counts;
}

// 快速蒙特卡洛计算
function quickMonteCarlo(cardCounts, draws, conditionFunc, simulations) {
  let deck = [];
  for (let i = 0; i < cardCounts.length; i++) {
    for (let j = 0; j < cardCounts[i]; j++) {
      deck.push(i);
    }
  }

  if (deck.length === 0 || deck.length < draws) {
    return 0;
  }

  let valid = 0;
  for (let i = 0; i < simulations; i++) {
    const shuffled = shuffleArray(deck);
    const counts = drawCards(shuffled, draws, cardCounts.length);
    try {
      if (conditionFunc(counts)) valid++;
    } catch (e) {
      // 忽略条件执行错误
    }
  }

  return (valid / simulations) * 100;
}

// 解析条件中使用的变量
function parseConditionVariables(condition) {
  const varRegex = /([a-zA-Z]+)/g;
  const variables = new Set();
  let match;
  while ((match = varRegex.exec(condition)) !== null) {
    try {
      const idx = varToIndex(match[1]);
      variables.add(idx);
    } catch {
      // 忽略无效变量
    }
  }
  return Array.from(variables);
}

// 主处理函数
onmessage = function(e) {
  const { cardsData, condition, draws, targetRate, simulations } = e.data;
  
  try {
    const currentCounts = cardsData.map(c => c.count);
    const totalCards = currentCounts.reduce((a, b) => a + b, 0);

    // 构建条件函数
    const replacedCondition = condition.replace(/([a-zA-Z]+)/g, (m) => {
      return 'counts[' + varToIndex(m) + ']';
    });
    const conditionFunc = new Function('counts', 'return ' + replacedCondition);

    postMessage({ type: 'progress', progress: 5, text: '计算当前启动率...' });

    // 计算当前概率
    const currentRate = quickMonteCarlo(currentCounts, draws, conditionFunc, simulations);
    
    // 自动判断优化方向：当前概率 < 目标概率时提高，否则降低
    const direction = currentRate < targetRate ? 'increase' : 'decrease';
    
    postMessage({ type: 'progress', progress: 15, text: '分析卡组结构（' + (direction === 'increase' ? '提高' : '降低') + '模式）...' });

    // 解析条件中使用的卡牌
    const conditionVars = parseConditionVariables(condition);
    
    // 找出关键卡和非关键卡
    const keyCards = [];
    const nonKeyCards = [];
    
    cardsData.forEach((card, index) => {
      if (card.count > 0) {
        if (conditionVars.includes(index)) {
          keyCards.push({ index, card, isKey: true });
        } else {
          nonKeyCards.push({ index, card, isKey: false });
        }
      }
    });

    postMessage({ type: 'progress', progress: 20, text: '生成调整方案...' });

    // 生成调整方案
    const plans = [];

    if (direction === 'increase') {
      // === 提高启动率的方案 ===
      
      // 方案1：增加关键卡数量
      for (const keyCard of keyCards) {
        const keyMaxCount = keyCard.card.maxCount || 3;
        if (keyCard.card.count < keyMaxCount) {
          const maxAdd = keyMaxCount - keyCard.card.count;
          for (let add = 1; add <= maxAdd; add++) {
            for (const nonKey of nonKeyCards) {
              if (nonKey.card.count >= add) {
                const newCounts = [...currentCounts];
                newCounts[keyCard.index] += add;
                newCounts[nonKey.index] -= add;
                plans.push({
                  type: 'increase_key',
                  description: '增加「' + (keyCard.card.name || keyCard.card.label) + '」' + add + '张，减少「' + (nonKey.card.name || nonKey.card.label) + '」' + add + '张',
                  changes: [
                    { card: keyCard.card, change: +add },
                    { card: nonKey.card, change: -add }
                  ],
                  newCounts,
                  newRate: 0,
                  improvement: 0,
                  reachTarget: false,
                  priority: 1
                });
              }
            }
          }
        }
      }

      // 方案2：多个关键卡同时增加
      if (keyCards.length >= 2) {
        for (let i = 0; i < keyCards.length; i++) {
          for (let j = i + 1; j < keyCards.length; j++) {
            const card1 = keyCards[i];
            const card2 = keyCards[j];
            const card1MaxCount = card1.card.maxCount || 3;
            const card2MaxCount = card2.card.maxCount || 3;
            if (card1.card.count < card1MaxCount && card2.card.count < card2MaxCount) {
              for (const nonKey of nonKeyCards) {
                if (nonKey.card.count >= 2) {
                  const newCounts = [...currentCounts];
                  newCounts[card1.index] += 1;
                  newCounts[card2.index] += 1;
                  newCounts[nonKey.index] -= 2;
                  plans.push({
                    type: 'increase_multi_key',
                    description: '增加「' + (card1.card.name || card1.card.label) + '」1张 + 「' + (card2.card.name || card2.card.label) + '」1张，减少「' + (nonKey.card.name || nonKey.card.label) + '」2张',
                    changes: [
                      { card: card1.card, change: +1 },
                      { card: card2.card, change: +1 },
                      { card: nonKey.card, change: -2 }
                    ],
                    newCounts,
                    newRate: 0,
                    improvement: 0,
                    reachTarget: false,
                    priority: 2
                  });
                }
              }
            }
          }
        }
      }

      // 方案3：扩充卡组
      if (totalCards < 60) {
        for (const keyCard of keyCards) {
          const keyMaxCount = keyCard.card.maxCount || 3;
          if (keyCard.card.count < keyMaxCount) {
            const maxByCard = keyMaxCount - keyCard.card.count;
            const maxByDeck = 60 - totalCards;
            const maxAdd = Math.min(maxByCard, maxByDeck, 2);
            if (maxAdd > 0) {
              for (let add = 1; add <= maxAdd; add++) {
                const newCounts = [...currentCounts];
                newCounts[keyCard.index] += add;
                plans.push({
                  type: 'expand_deck',
                  description: '增加「' + (keyCard.card.name || keyCard.card.label) + '」' + add + '张（卡组从' + totalCards + '张变为' + (totalCards + add) + '张）',
                  changes: [{ card: keyCard.card, change: +add }],
                  newCounts,
                  newDeckSize: totalCards + add,
                  newRate: 0,
                  improvement: 0,
                  reachTarget: false,
                  priority: 3
                });
              }
            }
          }
        }
      }

      // 方案4：减少非关键卡
      for (const nonKey of nonKeyCards) {
        if (nonKey.card.count >= 1 && totalCards > 40) {
          const maxReduce = Math.min(nonKey.card.count, totalCards - 40, 3);
          for (let reduce = 1; reduce <= maxReduce; reduce++) {
            const newCounts = [...currentCounts];
            newCounts[nonKey.index] -= reduce;
            plans.push({
              type: 'reduce_deck',
              description: '减少「' + (nonKey.card.name || nonKey.card.label) + '」' + reduce + '张（卡组从' + totalCards + '张变为' + (totalCards - reduce) + '张）',
              changes: [{ card: nonKey.card, change: -reduce }],
              newCounts,
              newDeckSize: totalCards - reduce,
              newRate: 0,
              improvement: 0,
              reachTarget: false,
              priority: 4
            });
          }
        }
      }
    } else {
      // === 降低启动率的方案 ===
      
      // 方案1：减少关键卡数量
      for (const keyCard of keyCards) {
        if (keyCard.card.count >= 1) {
          const maxReduce = keyCard.card.count;
          for (let reduce = 1; reduce <= Math.min(maxReduce, 3); reduce++) {
            for (const nonKey of nonKeyCards) {
              const nonKeyMaxCount = nonKey.card.maxCount || 3;
              if (nonKey.card.count < nonKeyMaxCount) {
                const canAdd = Math.min(reduce, nonKeyMaxCount - nonKey.card.count);
                if (canAdd >= reduce) {
                  const newCounts = [...currentCounts];
                  newCounts[keyCard.index] -= reduce;
                  newCounts[nonKey.index] += reduce;
                  plans.push({
                    type: 'decrease_key',
                    description: '减少「' + (keyCard.card.name || keyCard.card.label) + '」' + reduce + '张，增加「' + (nonKey.card.name || nonKey.card.label) + '」' + reduce + '张',
                    changes: [
                      { card: keyCard.card, change: -reduce },
                      { card: nonKey.card, change: +reduce }
                    ],
                    newCounts,
                    newRate: 0,
                    improvement: 0,
                    reachTarget: false,
                    priority: 1
                  });
                }
              }
            }
          }
        }
      }

      // 方案2：多个关键卡同时减少
      if (keyCards.length >= 2) {
        for (let i = 0; i < keyCards.length; i++) {
          for (let j = i + 1; j < keyCards.length; j++) {
            const card1 = keyCards[i];
            const card2 = keyCards[j];
            if (card1.card.count >= 1 && card2.card.count >= 1) {
              for (const nonKey of nonKeyCards) {
                const nonKeyMaxCount = nonKey.card.maxCount || 3;
                if (nonKey.card.count + 2 <= nonKeyMaxCount) {
                  const newCounts = [...currentCounts];
                  newCounts[card1.index] -= 1;
                  newCounts[card2.index] -= 1;
                  newCounts[nonKey.index] += 2;
                  plans.push({
                    type: 'decrease_multi_key',
                    description: '减少「' + (card1.card.name || card1.card.label) + '」1张 + 「' + (card2.card.name || card2.card.label) + '」1张，增加「' + (nonKey.card.name || nonKey.card.label) + '」2张',
                    changes: [
                      { card: card1.card, change: -1 },
                      { card: card2.card, change: -1 },
                      { card: nonKey.card, change: +2 }
                    ],
                    newCounts,
                    newRate: 0,
                    improvement: 0,
                    reachTarget: false,
                    priority: 2
                  });
                }
              }
            }
          }
        }
      }

      // 方案3：扩充卡组（稀释关键卡比例）
      if (totalCards < 60) {
        for (const nonKey of nonKeyCards) {
          const nonKeyMaxCount = nonKey.card.maxCount || 3;
          if (nonKey.card.count < nonKeyMaxCount) {
            const maxByCard = nonKeyMaxCount - nonKey.card.count;
            const maxByDeck = 60 - totalCards;
            const maxAdd = Math.min(maxByCard, maxByDeck, 3);
            if (maxAdd > 0) {
              for (let add = 1; add <= maxAdd; add++) {
                const newCounts = [...currentCounts];
                newCounts[nonKey.index] += add;
                plans.push({
                  type: 'expand_deck',
                  description: '增加「' + (nonKey.card.name || nonKey.card.label) + '」' + add + '张（卡组从' + totalCards + '张变为' + (totalCards + add) + '张）',
                  changes: [{ card: nonKey.card, change: +add }],
                  newCounts,
                  newDeckSize: totalCards + add,
                  newRate: 0,
                  improvement: 0,
                  reachTarget: false,
                  priority: 3
                });
              }
            }
          }
        }
      }

      // 方案4：减少关键卡（直接移除）
      for (const keyCard of keyCards) {
        if (keyCard.card.count >= 1 && totalCards > 40) {
          const maxReduce = Math.min(keyCard.card.count, totalCards - 40, 3);
          for (let reduce = 1; reduce <= maxReduce; reduce++) {
            const newCounts = [...currentCounts];
            newCounts[keyCard.index] -= reduce;
            plans.push({
              type: 'reduce_deck',
              description: '减少「' + (keyCard.card.name || keyCard.card.label) + '」' + reduce + '张（卡组从' + totalCards + '张变为' + (totalCards - reduce) + '张）',
              changes: [{ card: keyCard.card, change: -reduce }],
              newCounts,
              newDeckSize: totalCards - reduce,
              newRate: 0,
              improvement: 0,
              reachTarget: false,
              priority: 4
            });
          }
        }
      }
    }

    postMessage({ type: 'progress', progress: 30, text: '评估方案效果 (0/' + plans.length + ')...' });

    // 计算每个方案的概率
    const totalPlans = plans.length;
    for (let i = 0; i < totalPlans; i++) {
      const plan = plans[i];
      const newTotal = plan.newCounts.reduce((a, b) => a + b, 0);
      const actualDraws = Math.min(draws, newTotal);
      plan.newRate = quickMonteCarlo(plan.newCounts, actualDraws, conditionFunc, Math.floor(simulations / 2));
      plan.improvement = plan.newRate - currentRate;
      plan.reachTarget = direction === 'increase' ? plan.newRate >= targetRate : plan.newRate <= targetRate;

      if (i % 5 === 0 || i === totalPlans - 1) {
        const progress = 30 + Math.floor(((i + 1) / totalPlans) * 65);
        postMessage({ 
          type: 'progress', 
          progress, 
          text: '评估方案效果 (' + (i + 1) + '/' + totalPlans + ')...'
        });
      }
    }

    postMessage({ type: 'progress', progress: 95, text: '整理结果...' });

    // 过滤和排序方案
    const validPlans = plans.filter(p => 
      direction === 'increase' ? p.improvement > 0.1 : p.improvement < -0.1
    );

    // 按类型分组
    const keepDeckPlans = validPlans.filter(p => 
      direction === 'increase' 
        ? (p.type === 'increase_key' || p.type === 'increase_multi_key')
        : (p.type === 'decrease_key' || p.type === 'decrease_multi_key')
    );
    const expandDeckPlans = validPlans.filter(p => p.type === 'expand_deck');
    const reduceDeckPlans = validPlans.filter(p => p.type === 'reduce_deck');

    // 排序函数：最接近目标的在前，达到目标的优先
    const sortPlans = (arr) => {
      return arr.sort((a, b) => {
        if (a.reachTarget !== b.reachTarget) {
          return a.reachTarget ? -1 : 1;
        }
        const diffA = Math.abs(targetRate - a.newRate);
        const diffB = Math.abs(targetRate - b.newRate);
        return diffA - diffB;
      });
    };

    // 对每组方案排序
    sortPlans(keepDeckPlans);
    sortPlans(expandDeckPlans);
    sortPlans(reduceDeckPlans);

    // 标记每组的最佳方案
    if (keepDeckPlans.length > 0) keepDeckPlans[0].isBest = true;
    if (expandDeckPlans.length > 0) expandDeckPlans[0].isBest = true;
    if (reduceDeckPlans.length > 0) reduceDeckPlans[0].isBest = true;

    // 限制每组数量
    const maxPerGroup = 10;

    postMessage({ type: 'progress', progress: 100, text: '完成！' });

    postMessage({
      type: 'result',
      currentRate,
      targetRate,
      direction,
      keepDeckPlans: keepDeckPlans.slice(0, maxPerGroup),
      expandDeckPlans: expandDeckPlans.slice(0, maxPerGroup),
      reduceDeckPlans: reduceDeckPlans.slice(0, maxPerGroup),
      totalPlansCount: validPlans.length
    });

  } catch (error) {
    postMessage({ type: 'error', message: error.message });
  }
};
  `.trim()
}

