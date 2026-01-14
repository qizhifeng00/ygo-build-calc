'use strict';

// src/utils.ts
function varToIndex(varName) {
  const lc = varName.toLowerCase();
  if (lc.length === 1) {
    const code = lc.charCodeAt(0) - 97;
    if (code >= 0 && code < 26) return code;
  }
  if (lc.length === 2 && lc[0] === "a") {
    const code = lc.charCodeAt(1) - 97;
    if (code >= 0 && code < 4) return 26 + code;
  }
  throw new Error(`\u65E0\u6548\u7684\u5361\u540D\u79F0: ${varName}`);
}
function indexToVar(index) {
  if (index < 0 || index >= 30) {
    throw new Error(`\u7D22\u5F15\u8D85\u51FA\u8303\u56F4: ${index}`);
  }
  if (index < 26) {
    return String.fromCharCode(97 + index);
  }
  return "a" + String.fromCharCode(97 + index - 26);
}
function indexToLabel(index) {
  if (index < 0 || index >= 30) {
    throw new Error(`\u7D22\u5F15\u8D85\u51FA\u8303\u56F4: ${index}`);
  }
  if (index < 26) {
    return String.fromCharCode(65 + index);
  }
  return "A" + String.fromCharCode(65 + index - 26);
}
var combinationCache = /* @__PURE__ */ new Map();
function combination(n, k) {
  const nBig = BigInt(n);
  const kBig = BigInt(k);
  if (kBig < 0n || kBig > nBig) return 0n;
  if (kBig === 0n || kBig === nBig) return 1n;
  const key = `${nBig},${kBig}`;
  if (combinationCache.has(key)) {
    return combinationCache.get(key);
  }
  let result = 1n;
  for (let i = 1n; i <= kBig; i++) {
    result = result * (nBig - kBig + i) / i;
  }
  combinationCache.set(key, result);
  return result;
}
function clearCombinationCache() {
  combinationCache.clear();
}
function shuffleArray(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}
function drawCards(deck, draws, cardTypeCount) {
  const counts = Array(cardTypeCount).fill(0);
  const drawn = deck.slice(0, draws);
  drawn.forEach((idx) => {
    counts[idx]++;
  });
  return counts;
}
function createDeck(cardCounts) {
  const deck = [];
  for (let i = 0; i < cardCounts.length; i++) {
    const count = cardCounts[i];
    if (count !== void 0) {
      for (let j = 0; j < count; j++) {
        deck.push(i);
      }
    }
  }
  return deck;
}
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// src/condition.ts
var OPERATOR_MAP = {
  ">": "gt",
  "<": "lt",
  "==": "eq",
  "!=": "neq",
  ">=": "gte",
  "<=": "lte"
};
var OPERATOR_SYMBOLS = {
  "gt": ">",
  "lt": "<",
  "eq": "==",
  "neq": "!=",
  "gte": ">=",
  "lte": "<="
};
var Parser = class {
  tokens;
  pos = 0;
  constructor(tokens) {
    this.tokens = tokens;
  }
  peek() {
    return this.tokens[this.pos];
  }
  consume(expected) {
    const token = this.tokens[this.pos];
    if (expected && token !== expected) {
      throw new Error(`\u9884\u671F ${expected}\uFF0C\u4F46\u5F97\u5230 ${token || "\u7ED3\u675F"}`);
    }
    if (!token) {
      throw new Error("\u610F\u5916\u7684\u7ED3\u675F");
    }
    this.pos++;
    return token;
  }
  eof() {
    return this.pos >= this.tokens.length;
  }
  remaining() {
    return this.tokens.slice(this.pos).join(" ");
  }
  getPos() {
    return this.pos;
  }
  setPos(pos) {
    this.pos = pos;
  }
};
function tokenize(expr) {
  const regex = /\s*([A-Za-z0-9_\u4e00-\u9fa5]+|>=|<=|==|!=|&&|\|\||[-+*/()<>])\s*/g;
  const tokens = [];
  let m;
  let lastIndex = 0;
  while ((m = regex.exec(expr)) !== null) {
    if (m.index > lastIndex) {
      const skipped = expr.substring(lastIndex, m.index).trim();
      if (skipped) {
        throw new Error(`\u4E0D\u652F\u6301\u7684\u5B57\u7B26: "${skipped}"`);
      }
    }
    const token = m[1];
    if (token) tokens.push(token);
    lastIndex = regex.lastIndex;
  }
  const remaining = expr.substring(lastIndex).trim();
  if (remaining) {
    throw new Error(`\u4E0D\u652F\u6301\u7684\u5B57\u7B26: "${remaining}"`);
  }
  return tokens;
}
function parseExpression(parser) {
  return parseLogicalOr(parser);
}
function parseLogicalOr(parser) {
  let node = parseLogicalAnd(parser);
  while (!parser.eof()) {
    const peek = parser.peek();
    if (peek !== "||") break;
    parser.consume("||");
    const right = parseLogicalAnd(parser);
    node = { type: "or", children: [node, right] };
  }
  return node;
}
function parseLogicalAnd(parser) {
  let node = parseRelational(parser);
  while (!parser.eof()) {
    const peek = parser.peek();
    if (peek !== "&&") break;
    parser.consume("&&");
    const right = parseRelational(parser);
    node = { type: "and", children: [node, right] };
  }
  return node;
}
function parseRelational(parser) {
  const left = parseSum(parser);
  if (typeof left === "object" && !Array.isArray(left) && "type" in left) {
    return left;
  }
  const peek = parser.peek();
  if (!parser.eof() && peek && /^(>=|<=|==|!=|>|<)$/.test(peek)) {
    const op = parser.consume();
    const num = parser.consume();
    if (!/^\d+$/.test(num)) {
      throw new Error(`\u9884\u671F\u6570\u5B57\uFF0C\u4F46\u5F97\u5230 ${num || "\u7ED3\u675F"}`);
    }
    const cards = [];
    if (Array.isArray(left)) {
      const first = left[0];
      if (!first) throw new Error("\u8868\u8FBE\u5F0F\u4E3A\u7A7A");
      cards.push({ name: first });
      for (let i = 1; i < left.length; i += 2) {
        const operator = left[i];
        const operand = left[i + 1];
        if (!operand) throw new Error("\u8868\u8FBE\u5F0F\u4E0D\u5B8C\u6574");
        cards.push({ operator, name: operand });
      }
    } else if (typeof left === "string") {
      cards.push({ name: left });
    } else {
      throw new Error(`\u65E0\u6CD5\u89E3\u6790\u8868\u8FBE\u5F0F\u5DE6\u4FA7: ${JSON.stringify(left)}`);
    }
    const symbol = OPERATOR_MAP[op];
    if (!symbol) {
      throw new Error(`\u4E0D\u652F\u6301\u7684\u8FD0\u7B97\u7B26: ${op}`);
    }
    return {
      type: "single",
      cards,
      symbol,
      num
    };
  }
  throw new Error(`\u65E0\u6548\u7684\u8868\u8FBE\u5F0F: ${JSON.stringify(left)}`);
}
function parseSum(parser) {
  if (parser.peek() === "(") {
    parser.consume("(");
    const startPos = parser.getPos();
    try {
      const node = parseExpression(parser);
      if (parser.peek() === ")") {
        parser.consume(")");
        return node;
      }
    } catch (e) {
      parser.setPos(startPos);
    }
    parser.setPos(startPos);
    const items2 = [];
    items2.push(parser.consume());
    while (!parser.eof()) {
      const peek = parser.peek();
      if (!peek || !["+", "-", "*", "/"].includes(peek)) break;
      const operator = parser.consume();
      items2.push(operator);
      const operand = parser.consume();
      items2.push(operand);
    }
    parser.consume(")");
    const first2 = items2[0];
    return items2.length === 1 && first2 ? first2 : items2;
  }
  const items = [];
  const first = parser.consume();
  items.push(first);
  while (!parser.eof()) {
    const peek = parser.peek();
    if (!peek || !["+", "-", "*", "/"].includes(peek)) break;
    const operator = parser.consume();
    items.push(operator);
    const operand = parser.consume();
    items.push(operand);
  }
  const firstItem = items[0];
  return items.length === 1 && firstItem ? firstItem : items;
}
function flattenCondition(condition) {
  if (condition.type === "single") {
    return condition;
  }
  const flatChildren = [];
  for (const child of condition.children) {
    const flatChild = flattenCondition(child);
    if (flatChild.type === condition.type) {
      flatChildren.push(...flatChild.children);
    } else {
      flatChildren.push(flatChild);
    }
  }
  return { type: condition.type, children: flatChildren };
}
function parseCondition(expr) {
  const trimmed = expr.trim();
  if (!trimmed) {
    throw new Error("\u7A7A\u7684\u6761\u4EF6\u8868\u8FBE\u5F0F");
  }
  const tokens = tokenize(trimmed);
  if (tokens.length === 0) {
    throw new Error("\u65E0\u6CD5\u89E3\u6790\u6761\u4EF6\uFF1A\u65E0\u6709\u6548\u6807\u8BB0");
  }
  const parser = new Parser(tokens);
  const tree = parseExpression(parser);
  if (!parser.eof()) {
    throw new Error(`\u65E0\u6CD5\u89E3\u6790\u6761\u4EF6\uFF1A${trimmed}\uFF08\u5269\u4F59: ${parser.remaining()}\uFF09`);
  }
  if (tree.type === "single") {
    return { type: "and", children: [tree] };
  }
  return flattenCondition(tree);
}
function conditionToString(condition) {
  if (condition.type === "single") {
    const cardsText = condition.cards.map((c, i) => i === 0 ? c.name : `${c.operator || "+"} ${c.name}`).join(" ");
    const operator = OPERATOR_SYMBOLS[condition.symbol] || condition.symbol;
    return `(${cardsText}) ${operator} ${condition.num}`;
  }
  const childrenText = condition.children.map(conditionToString).filter(Boolean);
  return childrenText.length > 1 ? `(${childrenText.join(condition.type === "and" ? " && " : " || ")})` : childrenText[0] || "";
}
function compileCondition(condition) {
  if (condition.type === "single") {
    let expr = "";
    condition.cards.forEach((card, i) => {
      if (i === 0) {
        expr += `counts[${varToIndex(card.name)}]`;
      } else {
        expr += ` ${card.operator || "+"} counts[${varToIndex(card.name)}]`;
      }
    });
    const op = OPERATOR_SYMBOLS[condition.symbol];
    if (!op) {
      throw new Error(`\u4E0D\u652F\u6301\u7684\u8FD0\u7B97\u7B26: ${condition.symbol}`);
    }
    expr = `(${expr}) ${op} ${condition.num}`;
    return new Function("counts", `return ${expr}`);
  }
  const childFuncs = condition.children.map(compileCondition);
  if (condition.type === "and") {
    return (counts) => childFuncs.every((fn) => fn(counts));
  } else {
    return (counts) => childFuncs.some((fn) => fn(counts));
  }
}
function compileConditionString(expr) {
  const condition = parseCondition(expr);
  return compileCondition(condition);
}
function parseConditionVariables(expr) {
  const varRegex = /([a-zA-Z]+)/g;
  const variables = /* @__PURE__ */ new Set();
  let match;
  while ((match = varRegex.exec(expr)) !== null) {
    try {
      const varName = match[1];
      if (varName) {
        const idx = varToIndex(varName);
        variables.add(idx);
      }
    } catch {
    }
  }
  return Array.from(variables).sort((a, b) => a - b);
}
function replaceCardNames(expr, nameMap) {
  let result = expr;
  const sortedNames = Object.keys(nameMap).sort((a, b) => b.length - a.length);
  for (const name of sortedNames) {
    const replacement = nameMap[name];
    if (!replacement) continue;
    const regex = new RegExp(escapeRegExp(name), "g");
    result = result.replace(regex, replacement);
  }
  return result;
}

// src/calculator.ts
function calculateExact(cardCounts, draws, condition, onProgress) {
  const totalCards = cardCounts.reduce((a, b) => a + b, 0);
  if (totalCards === 0) {
    throw new Error("\u5361\u7EC4\u4E3A\u7A7A");
  }
  if (draws > totalCards) {
    throw new Error(`\u62BD\u53D6\u6570\u91CF(${draws})\u4E0D\u80FD\u5927\u4E8E\u5361\u7EC4\u603B\u6570(${totalCards})`);
  }
  const conditionFunc = compileConditionString(condition);
  let valid = 0n;
  let total = 0n;
  let lastReportedProgress = 0;
  function recurse(index, counts, remaining) {
    if (index === cardCounts.length) {
      if (remaining !== 0) return;
      let prob = 1n;
      for (let i = 0; i < counts.length; i++) {
        const cardCount = cardCounts[i];
        const drawCount = counts[i];
        if (cardCount === void 0 || drawCount === void 0) continue;
        prob *= combination(cardCount, drawCount);
      }
      total += prob;
      if (conditionFunc(counts)) {
        valid += prob;
      }
      return;
    }
    const progress = Math.min(100, Math.floor(index / cardCounts.length * 100));
    if (progress > lastReportedProgress && onProgress) {
      lastReportedProgress = progress;
      onProgress(progress, `\u7CBE\u786E\u8BA1\u7B97\u4E2D: ${progress}%`);
    }
    const currentCount = cardCounts[index];
    if (currentCount === void 0) return;
    const max = Math.min(currentCount, remaining);
    for (let k = 0; k <= max; k++) {
      counts[index] = k;
      recurse(index + 1, [...counts], remaining - k);
    }
  }
  recurse(0, [], draws);
  if (onProgress) {
    onProgress(100, "\u7CBE\u786E\u8BA1\u7B97\u5B8C\u6210");
  }
  return {
    valid,
    total,
    probability: Number(valid * 10000n / total) / 100,
    calculationMethod: "\u7CBE\u786E\u8BA1\u7B97"
  };
}
function calculateMonteCarlo(cardCounts, draws, condition, simulations = 1e5, onProgress) {
  const deck = createDeck(cardCounts);
  if (deck.length === 0) {
    throw new Error("\u5361\u7EC4\u4E3A\u7A7A");
  }
  if (draws > deck.length) {
    throw new Error(`\u62BD\u53D6\u6570\u91CF(${draws})\u4E0D\u80FD\u5927\u4E8E\u5361\u7EC4\u603B\u6570(${deck.length})`);
  }
  const conditionFunc = typeof condition === "string" ? compileConditionString(condition) : condition;
  let valid = 0;
  let lastReportedProgress = 0;
  for (let i = 0; i < simulations; i++) {
    const shuffled = shuffleArray(deck);
    const counts = drawCards(shuffled, draws, cardCounts.length);
    try {
      if (conditionFunc(counts)) {
        valid++;
      }
    } catch (e) {
    }
    const progress = Math.floor((i + 1) / simulations * 100);
    if (progress > lastReportedProgress && onProgress) {
      lastReportedProgress = progress;
      onProgress(progress, `\u8499\u7279\u5361\u6D1B\u6A21\u62DF: ${progress}%`);
    }
  }
  if (onProgress) {
    onProgress(100, "\u8499\u7279\u5361\u6D1B\u6A21\u62DF\u5B8C\u6210");
  }
  return {
    valid,
    total: simulations,
    probability: valid / simulations * 100,
    calculationMethod: "\u8499\u7279\u5361\u6D1B\u6A21\u62DF"
  };
}
function quickMonteCarlo(cardCounts, draws, conditionFunc, simulations) {
  const deck = createDeck(cardCounts);
  if (deck.length === 0 || deck.length < draws) {
    return 0;
  }
  let valid = 0;
  for (let i = 0; i < simulations; i++) {
    const shuffled = shuffleArray(deck);
    const counts = drawCards(shuffled, draws, cardCounts.length);
    try {
      if (conditionFunc(counts)) {
        valid++;
      }
    } catch (e) {
    }
  }
  return valid / simulations * 100;
}
function calculateAuto(cardCounts, draws, condition, onProgress) {
  const totalCards = cardCounts.reduce((a, b) => a + b, 0);
  const nonZeroTypes = cardCounts.filter((c) => c > 0).length;
  const useExact = totalCards <= 40 && nonZeroTypes <= 10 && draws <= 6;
  if (useExact) {
    return calculateExact(cardCounts, draws, condition, onProgress);
  } else {
    const simulations = totalCards <= 60 ? 1e5 : 5e5;
    return calculateMonteCarlo(cardCounts, draws, condition, simulations, onProgress);
  }
}

// src/optimizer.ts
function optimize(cards, condition, draws, targetRate, options = {}) {
  const { simulations = 3e4, onProgress } = options;
  const currentCounts = cards.map((c) => c.count);
  const totalCards = currentCounts.reduce((a, b) => a + b, 0);
  if (totalCards === 0) {
    throw new Error("\u5361\u7EC4\u4E3A\u7A7A\uFF0C\u8BF7\u5148\u6DFB\u52A0\u5361\u724C");
  }
  if (!condition || condition.trim() === "") {
    throw new Error("\u8BF7\u5148\u8BBE\u7F6E\u5C55\u5F00\u6761\u4EF6");
  }
  onProgress?.(5, "\u7F16\u8BD1\u6761\u4EF6\u8868\u8FBE\u5F0F...");
  const conditionFunc = compileConditionString(condition);
  onProgress?.(10, "\u8BA1\u7B97\u5F53\u524D\u542F\u52A8\u7387...");
  const currentRate = quickMonteCarlo(currentCounts, draws, conditionFunc, simulations);
  const direction = currentRate < targetRate ? "increase" : "decrease";
  onProgress?.(15, `\u5206\u6790\u5361\u7EC4\u7ED3\u6784\uFF08${direction === "increase" ? "\u63D0\u9AD8" : "\u964D\u4F4E"}\u6A21\u5F0F\uFF09...`);
  const conditionVars = parseConditionVariables(condition);
  const keyCards = [];
  const nonKeyCards = [];
  cards.forEach((card, index) => {
    if (!card) return;
    if (card.count > 0) {
      if (conditionVars.includes(index)) {
        keyCards.push({ index, card, isKey: true });
      } else {
        nonKeyCards.push({ index, card, isKey: false });
      }
    }
  });
  onProgress?.(20, "\u751F\u6210\u8C03\u6574\u65B9\u6848...");
  const plans = [];
  if (direction === "increase") {
    generateIncreasePlans(plans, keyCards, nonKeyCards, currentCounts, totalCards);
  } else {
    generateDecreasePlans(plans, keyCards, nonKeyCards, currentCounts, totalCards);
  }
  onProgress?.(30, `\u8BC4\u4F30\u65B9\u6848\u6548\u679C (0/${plans.length})...`);
  const totalPlans = plans.length;
  for (let i = 0; i < totalPlans; i++) {
    const plan = plans[i];
    if (!plan) continue;
    const newTotal = plan.newCounts.reduce((a, b) => a + b, 0);
    const actualDraws = Math.min(draws, newTotal);
    plan.newRate = quickMonteCarlo(plan.newCounts, actualDraws, conditionFunc, Math.floor(simulations / 2));
    plan.improvement = plan.newRate - currentRate;
    plan.reachTarget = direction === "increase" ? plan.newRate >= targetRate : plan.newRate <= targetRate;
    if (i % 5 === 0 || i === totalPlans - 1) {
      const progress = 30 + Math.floor((i + 1) / totalPlans * 65);
      onProgress?.(progress, `\u8BC4\u4F30\u65B9\u6848\u6548\u679C (${i + 1}/${totalPlans})...`);
    }
  }
  onProgress?.(95, "\u6574\u7406\u7ED3\u679C...");
  const validPlans = plans.filter(
    (p) => direction === "increase" ? p.improvement > 0.1 : p.improvement < -0.1
  );
  const keepDeckPlans = validPlans.filter(
    (p) => direction === "increase" ? p.type === "increase_key" || p.type === "increase_multi_key" : p.type === "decrease_key" || p.type === "decrease_multi_key"
  );
  const expandDeckPlans = validPlans.filter((p) => p.type === "expand_deck");
  const reduceDeckPlans = validPlans.filter((p) => p.type === "reduce_deck");
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
  sortPlans(keepDeckPlans);
  sortPlans(expandDeckPlans);
  sortPlans(reduceDeckPlans);
  if (keepDeckPlans.length > 0 && keepDeckPlans[0]) keepDeckPlans[0].isBest = true;
  if (expandDeckPlans.length > 0 && expandDeckPlans[0]) expandDeckPlans[0].isBest = true;
  if (reduceDeckPlans.length > 0 && reduceDeckPlans[0]) reduceDeckPlans[0].isBest = true;
  const maxPerGroup = 10;
  onProgress?.(100, "\u5B8C\u6210\uFF01");
  return {
    currentRate,
    targetRate,
    direction,
    keepDeckPlans: keepDeckPlans.slice(0, maxPerGroup),
    expandDeckPlans: expandDeckPlans.slice(0, maxPerGroup),
    reduceDeckPlans: reduceDeckPlans.slice(0, maxPerGroup),
    totalPlansCount: validPlans.length
  };
}
function generateIncreasePlans(plans, keyCards, nonKeyCards, currentCounts, totalCards) {
  for (const keyCard of keyCards) {
    if (!keyCard) continue;
    const keyMaxCount = keyCard.card.maxCount ?? 3;
    if (keyCard.card.count < keyMaxCount) {
      const maxAdd = keyMaxCount - keyCard.card.count;
      for (let add = 1; add <= maxAdd; add++) {
        for (const nonKey of nonKeyCards) {
          if (!nonKey) continue;
          if (nonKey.card.count >= add) {
            const newCounts = [...currentCounts];
            const keyIdx = keyCard.index;
            const nonKeyIdx = nonKey.index;
            if (newCounts[keyIdx] !== void 0) newCounts[keyIdx] += add;
            if (newCounts[nonKeyIdx] !== void 0) newCounts[nonKeyIdx] -= add;
            plans.push({
              type: "increase_key",
              description: `\u589E\u52A0\u300C${keyCard.card.name || keyCard.card.label}\u300D${add}\u5F20\uFF0C\u51CF\u5C11\u300C${nonKey.card.name || nonKey.card.label}\u300D${add}\u5F20`,
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
  if (keyCards.length >= 2) {
    for (let i = 0; i < keyCards.length; i++) {
      for (let j = i + 1; j < keyCards.length; j++) {
        const card1 = keyCards[i];
        const card2 = keyCards[j];
        if (!card1 || !card2) continue;
        const card1MaxCount = card1.card.maxCount ?? 3;
        const card2MaxCount = card2.card.maxCount ?? 3;
        if (card1.card.count < card1MaxCount && card2.card.count < card2MaxCount) {
          const totalReduce = 2;
          for (const nonKey of nonKeyCards) {
            if (!nonKey) continue;
            if (nonKey.card.count >= totalReduce) {
              const newCounts = [...currentCounts];
              const idx1 = card1.index;
              const idx2 = card2.index;
              const idxNonKey = nonKey.index;
              if (newCounts[idx1] !== void 0) newCounts[idx1] += 1;
              if (newCounts[idx2] !== void 0) newCounts[idx2] += 1;
              if (newCounts[idxNonKey] !== void 0) newCounts[idxNonKey] -= totalReduce;
              plans.push({
                type: "increase_multi_key",
                description: `\u589E\u52A0\u300C${card1.card.name || card1.card.label}\u300D1\u5F20 + \u300C${card2.card.name || card2.card.label}\u300D1\u5F20\uFF0C\u51CF\u5C11\u300C${nonKey.card.name || nonKey.card.label}\u300D2\u5F20`,
                changes: [
                  { card: card1.card, change: 1 },
                  { card: card2.card, change: 1 },
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
  if (totalCards < 60) {
    for (const keyCard of keyCards) {
      if (!keyCard) continue;
      const keyMaxCount = keyCard.card.maxCount ?? 3;
      if (keyCard.card.count < keyMaxCount) {
        const maxByCard = keyMaxCount - keyCard.card.count;
        const maxByDeck = 60 - totalCards;
        const maxAdd = Math.min(maxByCard, maxByDeck, 2);
        if (maxAdd > 0) {
          for (let add = 1; add <= maxAdd; add++) {
            const newCounts = [...currentCounts];
            const idx = keyCard.index;
            if (newCounts[idx] !== void 0) newCounts[idx] += add;
            plans.push({
              type: "expand_deck",
              description: `\u589E\u52A0\u300C${keyCard.card.name || keyCard.card.label}\u300D${add}\u5F20\uFF08\u5361\u7EC4\u4ECE${totalCards}\u5F20\u53D8\u4E3A${totalCards + add}\u5F20\uFF09`,
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
  for (const nonKey of nonKeyCards) {
    if (!nonKey) continue;
    if (nonKey.card.count >= 1 && totalCards > 40) {
      const maxReduce = Math.min(nonKey.card.count, totalCards - 40, 3);
      for (let reduce = 1; reduce <= maxReduce; reduce++) {
        const newCounts = [...currentCounts];
        const idx = nonKey.index;
        if (newCounts[idx] !== void 0) newCounts[idx] -= reduce;
        plans.push({
          type: "reduce_deck",
          description: `\u51CF\u5C11\u300C${nonKey.card.name || nonKey.card.label}\u300D${reduce}\u5F20\uFF08\u5361\u7EC4\u4ECE${totalCards}\u5F20\u53D8\u4E3A${totalCards - reduce}\u5F20\uFF09`,
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
}
function generateDecreasePlans(plans, keyCards, nonKeyCards, currentCounts, totalCards) {
  for (const keyCard of keyCards) {
    if (!keyCard) continue;
    if (keyCard.card.count >= 1) {
      const maxReduce = keyCard.card.count;
      for (let reduce = 1; reduce <= Math.min(maxReduce, 3); reduce++) {
        for (const nonKey of nonKeyCards) {
          if (!nonKey) continue;
          const nonKeyMaxCount = nonKey.card.maxCount ?? 3;
          if (nonKey.card.count < nonKeyMaxCount) {
            const canAdd = Math.min(reduce, nonKeyMaxCount - nonKey.card.count);
            if (canAdd >= reduce) {
              const newCounts = [...currentCounts];
              const keyIdx = keyCard.index;
              const nonKeyIdx = nonKey.index;
              if (newCounts[keyIdx] !== void 0) newCounts[keyIdx] -= reduce;
              if (newCounts[nonKeyIdx] !== void 0) newCounts[nonKeyIdx] += reduce;
              plans.push({
                type: "decrease_key",
                description: `\u51CF\u5C11\u300C${keyCard.card.name || keyCard.card.label}\u300D${reduce}\u5F20\uFF0C\u589E\u52A0\u300C${nonKey.card.name || nonKey.card.label}\u300D${reduce}\u5F20`,
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
  if (keyCards.length >= 2) {
    for (let i = 0; i < keyCards.length; i++) {
      for (let j = i + 1; j < keyCards.length; j++) {
        const card1 = keyCards[i];
        const card2 = keyCards[j];
        if (!card1 || !card2) continue;
        if (card1.card.count >= 1 && card2.card.count >= 1) {
          for (const nonKey of nonKeyCards) {
            if (!nonKey) continue;
            const nonKeyMaxCount = nonKey.card.maxCount ?? 3;
            if (nonKey.card.count + 2 <= nonKeyMaxCount) {
              const newCounts = [...currentCounts];
              const idx1 = card1.index;
              const idx2 = card2.index;
              const idxNonKey = nonKey.index;
              if (newCounts[idx1] !== void 0) newCounts[idx1] -= 1;
              if (newCounts[idx2] !== void 0) newCounts[idx2] -= 1;
              if (newCounts[idxNonKey] !== void 0) newCounts[idxNonKey] += 2;
              plans.push({
                type: "decrease_multi_key",
                description: `\u51CF\u5C11\u300C${card1.card.name || card1.card.label}\u300D1\u5F20 + \u300C${card2.card.name || card2.card.label}\u300D1\u5F20\uFF0C\u589E\u52A0\u300C${nonKey.card.name || nonKey.card.label}\u300D2\u5F20`,
                changes: [
                  { card: card1.card, change: -1 },
                  { card: card2.card, change: -1 },
                  { card: nonKey.card, change: 2 }
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
  if (totalCards < 60) {
    for (const nonKey of nonKeyCards) {
      if (!nonKey) continue;
      const nonKeyMaxCount = nonKey.card.maxCount ?? 3;
      if (nonKey.card.count < nonKeyMaxCount) {
        const maxByCard = nonKeyMaxCount - nonKey.card.count;
        const maxByDeck = 60 - totalCards;
        const maxAdd = Math.min(maxByCard, maxByDeck, 3);
        if (maxAdd > 0) {
          for (let add = 1; add <= maxAdd; add++) {
            const newCounts = [...currentCounts];
            const idx = nonKey.index;
            if (newCounts[idx] !== void 0) newCounts[idx] += add;
            plans.push({
              type: "expand_deck",
              description: `\u589E\u52A0\u300C${nonKey.card.name || nonKey.card.label}\u300D${add}\u5F20\uFF08\u5361\u7EC4\u4ECE${totalCards}\u5F20\u53D8\u4E3A${totalCards + add}\u5F20\uFF09`,
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
  for (const keyCard of keyCards) {
    if (!keyCard) continue;
    if (keyCard.card.count >= 1 && totalCards > 40) {
      const maxReduce = Math.min(keyCard.card.count, totalCards - 40, 3);
      for (let reduce = 1; reduce <= maxReduce; reduce++) {
        const newCounts = [...currentCounts];
        const idx = keyCard.index;
        if (newCounts[idx] !== void 0) newCounts[idx] -= reduce;
        plans.push({
          type: "reduce_deck",
          description: `\u51CF\u5C11\u300C${keyCard.card.name || keyCard.card.label}\u300D${reduce}\u5F20\uFF08\u5361\u7EC4\u4ECE${totalCards}\u5F20\u53D8\u4E3A${totalCards - reduce}\u5F20\uFF09`,
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
function applyPlan(plan, cards) {
  plan.changes.forEach((change) => {
    const cardIndex = cards.findIndex((c) => {
      if (change.card.label && c.label === change.card.label) {
        return true;
      }
      if (change.card.name && c.name && c.name === change.card.name) {
        return true;
      }
      return false;
    });
    if (cardIndex !== -1) {
      const card = cards[cardIndex];
      if (card) {
        card.count = Math.max(0, card.count + change.change);
      }
    }
  });
}

// src/worker.ts
function generateExactWorkerCode() {
  return `
// \u7EC4\u5408\u6570\u7F13\u5B58
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
  throw new Error(\`\u65E0\u6548\u7684\u5361\u540D\u79F0: \${varName}\`);
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
    postMessage({ type: 'result', valid: result.valid.toString(), total: result.total.toString(), calculationMethod: '\u7CBE\u786E\u8BA1\u7B97' });
  } catch (error) {
    postMessage({ type: 'error', message: error.message });
  }
};
  `.trim();
}
function generateMonteCarloWorkerCode() {
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
  throw new Error("\u65E0\u6548\u7684\u5361\u540D\u79F0: " + varName);
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
      postMessage({ type: 'result', valid: 0, total: simulations, calculationMethod: "\u8499\u7279\u5361\u6D1B\u6A21\u62DF" });
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
          // \u5FFD\u7565\u6761\u4EF6\u6267\u884C\u9519\u8BEF
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
        postMessage({ type: 'result', valid, total: simulations, calculationMethod: "\u8499\u7279\u5361\u6D1B\u6A21\u62DF" });
      }
    }
    
    runChunk();
  } catch (error) {
    postMessage({ type: 'error', message: error.message });
  }
};
  `.trim();
}
function generateOptimizerWorkerCode() {
  return `
// \u53D8\u91CF\u540D\u8F6C\u7D22\u5F15
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
  throw new Error('\u65E0\u6548\u7684\u5361\u540D\u79F0: ' + varName);
}

// \u6D17\u724C
function shuffleArray(arr) {
  const array = arr.slice();
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// \u62BD\u5361\u5E76\u7EDF\u8BA1
function drawCards(shuffledDeck, draws, cardTypeCount) {
  const counts = Array(cardTypeCount).fill(0);
  const drawn = shuffledDeck.slice(0, draws);
  drawn.forEach((idx) => {
    counts[idx]++;
  });
  return counts;
}

// \u5FEB\u901F\u8499\u7279\u5361\u6D1B\u8BA1\u7B97
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
      // \u5FFD\u7565\u6761\u4EF6\u6267\u884C\u9519\u8BEF
    }
  }

  return (valid / simulations) * 100;
}

// \u89E3\u6790\u6761\u4EF6\u4E2D\u4F7F\u7528\u7684\u53D8\u91CF
function parseConditionVariables(condition) {
  const varRegex = /([a-zA-Z]+)/g;
  const variables = new Set();
  let match;
  while ((match = varRegex.exec(condition)) !== null) {
    try {
      const idx = varToIndex(match[1]);
      variables.add(idx);
    } catch {
      // \u5FFD\u7565\u65E0\u6548\u53D8\u91CF
    }
  }
  return Array.from(variables);
}

// \u4E3B\u5904\u7406\u51FD\u6570
onmessage = function(e) {
  const { cardsData, condition, draws, targetRate, simulations } = e.data;
  
  try {
    const currentCounts = cardsData.map(c => c.count);
    const totalCards = currentCounts.reduce((a, b) => a + b, 0);

    // \u6784\u5EFA\u6761\u4EF6\u51FD\u6570
    const replacedCondition = condition.replace(/([a-zA-Z]+)/g, (m) => {
      return 'counts[' + varToIndex(m) + ']';
    });
    const conditionFunc = new Function('counts', 'return ' + replacedCondition);

    postMessage({ type: 'progress', progress: 5, text: '\u8BA1\u7B97\u5F53\u524D\u542F\u52A8\u7387...' });

    // \u8BA1\u7B97\u5F53\u524D\u6982\u7387
    const currentRate = quickMonteCarlo(currentCounts, draws, conditionFunc, simulations);
    
    // \u81EA\u52A8\u5224\u65AD\u4F18\u5316\u65B9\u5411\uFF1A\u5F53\u524D\u6982\u7387 < \u76EE\u6807\u6982\u7387\u65F6\u63D0\u9AD8\uFF0C\u5426\u5219\u964D\u4F4E
    const direction = currentRate < targetRate ? 'increase' : 'decrease';
    
    postMessage({ type: 'progress', progress: 15, text: '\u5206\u6790\u5361\u7EC4\u7ED3\u6784\uFF08' + (direction === 'increase' ? '\u63D0\u9AD8' : '\u964D\u4F4E') + '\u6A21\u5F0F\uFF09...' });

    // \u89E3\u6790\u6761\u4EF6\u4E2D\u4F7F\u7528\u7684\u5361\u724C
    const conditionVars = parseConditionVariables(condition);
    
    // \u627E\u51FA\u5173\u952E\u5361\u548C\u975E\u5173\u952E\u5361
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

    postMessage({ type: 'progress', progress: 20, text: '\u751F\u6210\u8C03\u6574\u65B9\u6848...' });

    // \u751F\u6210\u8C03\u6574\u65B9\u6848
    const plans = [];

    if (direction === 'increase') {
      // === \u63D0\u9AD8\u542F\u52A8\u7387\u7684\u65B9\u6848 ===
      
      // \u65B9\u68481\uFF1A\u589E\u52A0\u5173\u952E\u5361\u6570\u91CF
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
                  description: '\u589E\u52A0\u300C' + (keyCard.card.name || keyCard.card.label) + '\u300D' + add + '\u5F20\uFF0C\u51CF\u5C11\u300C' + (nonKey.card.name || nonKey.card.label) + '\u300D' + add + '\u5F20',
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

      // \u65B9\u68482\uFF1A\u591A\u4E2A\u5173\u952E\u5361\u540C\u65F6\u589E\u52A0
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
                    description: '\u589E\u52A0\u300C' + (card1.card.name || card1.card.label) + '\u300D1\u5F20 + \u300C' + (card2.card.name || card2.card.label) + '\u300D1\u5F20\uFF0C\u51CF\u5C11\u300C' + (nonKey.card.name || nonKey.card.label) + '\u300D2\u5F20',
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

      // \u65B9\u68483\uFF1A\u6269\u5145\u5361\u7EC4
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
                  description: '\u589E\u52A0\u300C' + (keyCard.card.name || keyCard.card.label) + '\u300D' + add + '\u5F20\uFF08\u5361\u7EC4\u4ECE' + totalCards + '\u5F20\u53D8\u4E3A' + (totalCards + add) + '\u5F20\uFF09',
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

      // \u65B9\u68484\uFF1A\u51CF\u5C11\u975E\u5173\u952E\u5361
      for (const nonKey of nonKeyCards) {
        if (nonKey.card.count >= 1 && totalCards > 40) {
          const maxReduce = Math.min(nonKey.card.count, totalCards - 40, 3);
          for (let reduce = 1; reduce <= maxReduce; reduce++) {
            const newCounts = [...currentCounts];
            newCounts[nonKey.index] -= reduce;
            plans.push({
              type: 'reduce_deck',
              description: '\u51CF\u5C11\u300C' + (nonKey.card.name || nonKey.card.label) + '\u300D' + reduce + '\u5F20\uFF08\u5361\u7EC4\u4ECE' + totalCards + '\u5F20\u53D8\u4E3A' + (totalCards - reduce) + '\u5F20\uFF09',
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
      // === \u964D\u4F4E\u542F\u52A8\u7387\u7684\u65B9\u6848 ===
      
      // \u65B9\u68481\uFF1A\u51CF\u5C11\u5173\u952E\u5361\u6570\u91CF
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
                    description: '\u51CF\u5C11\u300C' + (keyCard.card.name || keyCard.card.label) + '\u300D' + reduce + '\u5F20\uFF0C\u589E\u52A0\u300C' + (nonKey.card.name || nonKey.card.label) + '\u300D' + reduce + '\u5F20',
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

      // \u65B9\u68482\uFF1A\u591A\u4E2A\u5173\u952E\u5361\u540C\u65F6\u51CF\u5C11
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
                    description: '\u51CF\u5C11\u300C' + (card1.card.name || card1.card.label) + '\u300D1\u5F20 + \u300C' + (card2.card.name || card2.card.label) + '\u300D1\u5F20\uFF0C\u589E\u52A0\u300C' + (nonKey.card.name || nonKey.card.label) + '\u300D2\u5F20',
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

      // \u65B9\u68483\uFF1A\u6269\u5145\u5361\u7EC4\uFF08\u7A00\u91CA\u5173\u952E\u5361\u6BD4\u4F8B\uFF09
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
                  description: '\u589E\u52A0\u300C' + (nonKey.card.name || nonKey.card.label) + '\u300D' + add + '\u5F20\uFF08\u5361\u7EC4\u4ECE' + totalCards + '\u5F20\u53D8\u4E3A' + (totalCards + add) + '\u5F20\uFF09',
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

      // \u65B9\u68484\uFF1A\u51CF\u5C11\u5173\u952E\u5361\uFF08\u76F4\u63A5\u79FB\u9664\uFF09
      for (const keyCard of keyCards) {
        if (keyCard.card.count >= 1 && totalCards > 40) {
          const maxReduce = Math.min(keyCard.card.count, totalCards - 40, 3);
          for (let reduce = 1; reduce <= maxReduce; reduce++) {
            const newCounts = [...currentCounts];
            newCounts[keyCard.index] -= reduce;
            plans.push({
              type: 'reduce_deck',
              description: '\u51CF\u5C11\u300C' + (keyCard.card.name || keyCard.card.label) + '\u300D' + reduce + '\u5F20\uFF08\u5361\u7EC4\u4ECE' + totalCards + '\u5F20\u53D8\u4E3A' + (totalCards - reduce) + '\u5F20\uFF09',
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

    postMessage({ type: 'progress', progress: 30, text: '\u8BC4\u4F30\u65B9\u6848\u6548\u679C (0/' + plans.length + ')...' });

    // \u8BA1\u7B97\u6BCF\u4E2A\u65B9\u6848\u7684\u6982\u7387
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
          text: '\u8BC4\u4F30\u65B9\u6848\u6548\u679C (' + (i + 1) + '/' + totalPlans + ')...'
        });
      }
    }

    postMessage({ type: 'progress', progress: 95, text: '\u6574\u7406\u7ED3\u679C...' });

    // \u8FC7\u6EE4\u548C\u6392\u5E8F\u65B9\u6848
    const validPlans = plans.filter(p => 
      direction === 'increase' ? p.improvement > 0.1 : p.improvement < -0.1
    );

    // \u6309\u7C7B\u578B\u5206\u7EC4
    const keepDeckPlans = validPlans.filter(p => 
      direction === 'increase' 
        ? (p.type === 'increase_key' || p.type === 'increase_multi_key')
        : (p.type === 'decrease_key' || p.type === 'decrease_multi_key')
    );
    const expandDeckPlans = validPlans.filter(p => p.type === 'expand_deck');
    const reduceDeckPlans = validPlans.filter(p => p.type === 'reduce_deck');

    // \u6392\u5E8F\u51FD\u6570\uFF1A\u6700\u63A5\u8FD1\u76EE\u6807\u7684\u5728\u524D\uFF0C\u8FBE\u5230\u76EE\u6807\u7684\u4F18\u5148
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

    // \u5BF9\u6BCF\u7EC4\u65B9\u6848\u6392\u5E8F
    sortPlans(keepDeckPlans);
    sortPlans(expandDeckPlans);
    sortPlans(reduceDeckPlans);

    // \u6807\u8BB0\u6BCF\u7EC4\u7684\u6700\u4F73\u65B9\u6848
    if (keepDeckPlans.length > 0) keepDeckPlans[0].isBest = true;
    if (expandDeckPlans.length > 0) expandDeckPlans[0].isBest = true;
    if (reduceDeckPlans.length > 0) reduceDeckPlans[0].isBest = true;

    // \u9650\u5236\u6BCF\u7EC4\u6570\u91CF
    const maxPerGroup = 10;

    postMessage({ type: 'progress', progress: 100, text: '\u5B8C\u6210\uFF01' });

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
  `.trim();
}

exports.applyPlan = applyPlan;
exports.calculateAuto = calculateAuto;
exports.calculateExact = calculateExact;
exports.calculateMonteCarlo = calculateMonteCarlo;
exports.clearCombinationCache = clearCombinationCache;
exports.combination = combination;
exports.compileCondition = compileCondition;
exports.compileConditionString = compileConditionString;
exports.conditionToString = conditionToString;
exports.createDeck = createDeck;
exports.drawCards = drawCards;
exports.escapeRegExp = escapeRegExp;
exports.generateExactWorkerCode = generateExactWorkerCode;
exports.generateMonteCarloWorkerCode = generateMonteCarloWorkerCode;
exports.generateOptimizerWorkerCode = generateOptimizerWorkerCode;
exports.indexToLabel = indexToLabel;
exports.indexToVar = indexToVar;
exports.optimize = optimize;
exports.parseCondition = parseCondition;
exports.parseConditionVariables = parseConditionVariables;
exports.quickMonteCarlo = quickMonteCarlo;
exports.replaceCardNames = replaceCardNames;
exports.shuffleArray = shuffleArray;
exports.varToIndex = varToIndex;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map