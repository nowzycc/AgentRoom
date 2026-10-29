// packages/npc-core/vendor/astar-minimal/esm/index.js
function defaultScoreFn(x) {
  return x;
}
function defaultCompareFn(a, b) {
  return a < b;
}
var Heap = class {
  constructor(scoreFn = defaultScoreFn, compareFn = defaultCompareFn) {
    this.contents = [];
    this.scoreFn = scoreFn;
    this.compareFn = compareFn;
  }
  toString() {
    return this.contents;
  }
  size() {
    return this.contents.length;
  }
  contains(item) {
    return this.contents.indexOf(item) >= 0;
  }
  peek() {
    return this.contents[0];
  }
  remove(node) {
    const next = (idx) => {
      if (this.size() == 0) {
        return null;
      }
      if (this.contents[idx] == node) {
        let endNode = this.contents.pop();
        if (node === endNode) {
          return node;
        }
        this.contents[idx] = endNode;
        this.bubbleUp(idx);
        this.sinkDown(idx);
        return node;
      } else {
        if (this.size() - 1 == idx) {
          return null;
        }
        return next(idx + 1);
      }
    };
    return next(0);
  }
  update(node) {
    const idx = this.contents.indexOf(node);
    if (idx < 0) {
      return null;
    }
    this.bubbleUp(idx);
    this.sinkDown(idx);
    return node;
  }
  push(nodes) {
    if (!Array.isArray(nodes)) {
      nodes = [nodes];
    }
    nodes.forEach((node) => {
      this.contents.push(node);
      this.bubbleUp(this.size() - 1);
    });
    return nodes;
  }
  pop() {
    let result = this.contents[0];
    let end = this.contents.pop();
    if (this.size() > 0) {
      this.contents[0] = end;
      this.sinkDown(0);
    }
    return result;
  }
  swap(a, b) {
    const t = this.contents[a];
    this.contents[a] = this.contents[b];
    this.contents[b] = t;
    return a;
  }
  getIndexScore(index) {
    return this.scoreFn(this.contents[index]);
  }
  getParentIndex(index) {
    return Math.floor((index + 1) / 2) - 1;
  }
  bubbleUp(index) {
    if (index > 0) {
      const parentIndex = this.getParentIndex(index);
      if (this.compareFn(this.getIndexScore(index), this.getIndexScore(parentIndex))) {
        this.bubbleUp(this.swap(parentIndex, index));
      }
    }
  }
  sinkDown(parentIndex) {
    if (parentIndex < this.size()) {
      const parentScore = this.getIndexScore(parentIndex);
      const rightIndex = (parentIndex + 1) * 2;
      const leftIndex = rightIndex - 1;
      let swapIdx;
      if (leftIndex < this.size()) {
        let leftIndexScore = this.getIndexScore(leftIndex);
        if (this.compareFn(leftIndexScore, parentScore)) {
          swapIdx = leftIndex;
        }
      }
      if (rightIndex < this.size()) {
        let leftIndexScore = this.getIndexScore(leftIndex);
        const rightIndexScore = this.getIndexScore(rightIndex);
        if (this.compareFn(rightIndexScore, swapIdx !== void 0 ? leftIndexScore : parentScore)) {
          swapIdx = rightIndex;
        }
      }
      if (swapIdx !== void 0) {
        this.sinkDown(this.swap(swapIdx, parentIndex));
      }
    }
  }
};
var AStar = class {
  constructor(heurFn, goalFn, succFn, costFn) {
    this.heurFn = heurFn;
    this.goalFn = goalFn;
    this.succFn = succFn;
    this.costFn = costFn;
  }
  _nodeify(data, prev = null) {
    data._astar_data = {
      g: prev ? prev._astar_data.g + this.costFn(prev, data) : this.costFn(null, data),
      h: this.heurFn(data, this.start),
      prev
    };
    return data;
  }
  _step() {
    while (this.open.size() > 0) {
      let current = this.open.pop();
      this.closed.push(current);
      if (this.goalFn(current)) {
        return this.traceback(current);
      }
      this.succFn(current).forEach((successor) => {
        let closedIdx = this.closed.indexOf(successor);
        if (closedIdx >= 0) {
          let tempCost = current._astar_data.g + this.costFn(current, successor);
          if (tempCost < successor._astar_data.g) {
            this.closed.splice(closedIdx, 1);
            successor._astar_data.g = tempCost;
            successor._astar_data.prev = current;
            this.open.push(successor);
          }
        } else {
          if (this.open.contains(successor)) {
            let tempCost = current._astar_data.g + this.costFn(current, successor);
            if (tempCost < successor._astar_data.g) {
              successor._astar_data.g = tempCost;
              successor._astar_data.prev = current;
              this.open.update(successor);
            }
          } else {
            this.open.push(this._nodeify(successor, current));
          }
        }
      });
    }
    return [];
  }
  find(start) {
    this.start = start;
    this.open = new Heap((node) => {
      return node._astar_data.g + node._astar_data.h;
    });
    this.closed = [];
    this.open.push(this._nodeify(this.start));
    return this._step();
  }
  traceback(goal) {
    let path = [goal];
    let node = goal;
    while (node._astar_data.prev) {
      node = node._astar_data.prev;
      path.push(node);
    }
    path.reverse();
    return path.map((node2) => {
      delete node2._astar_data;
      return node2;
    });
  }
};

// packages/npc-core/vendor/goap-minimal/esm/index.js
function isComparison(v) {
  return v !== null && typeof v === "object" && ("eq" in v || "gte" in v || "lte" in v || "gt" in v || "lt" in v);
}
function isDelta(v) {
  return v !== null && typeof v === "object" && "inc" in v;
}
var WorldState = class _WorldState {
  constructor(vars = {}) {
    this.vars = Object.assign({}, vars);
  }
  get(key) {
    return this.vars[key];
  }
  _match(key, cond) {
    const cur = this.vars[key];
    if (isComparison(cond)) {
      if (typeof cur !== "number") {
        return false;
      }
      if (cond.eq !== void 0 && !(cur === cond.eq)) {
        return false;
      }
      if (cond.gte !== void 0 && !(cur >= cond.gte)) {
        return false;
      }
      if (cond.lte !== void 0 && !(cur <= cond.lte)) {
        return false;
      }
      if (cond.gt !== void 0 && !(cur > cond.gt)) {
        return false;
      }
      if (cond.lt !== void 0 && !(cur < cond.lt)) {
        return false;
      }
      return true;
    }
    return cur === cond;
  }
  satisfies(conditions) {
    for (let key in conditions) {
      if (!this._match(key, conditions[key])) {
        return false;
      }
    }
    return true;
  }
  countUnsatisfied(conditions) {
    let n = 0;
    for (let key in conditions) {
      if (!this._match(key, conditions[key])) {
        n += 1;
      }
    }
    return n;
  }
  apply(effects) {
    const next = Object.assign({}, this.vars);
    for (let key in effects) {
      const eff = effects[key];
      if (isDelta(eff)) {
        const base = typeof next[key] === "number" ? next[key] : 0;
        next[key] = base + eff.inc;
      } else {
        next[key] = eff;
      }
    }
    return new _WorldState(next);
  }
  key() {
    const keys = Object.keys(this.vars).sort();
    let parts = [];
    keys.forEach((k) => {
      parts.push(k + "=" + this.vars[k]);
    });
    return parts.join(",");
  }
  clone() {
    return new _WorldState(this.vars);
  }
};
var Action = class {
  constructor(key, preconditions = {}, effects = {}, cost = 1) {
    this.key = key;
    this.preconditions = preconditions;
    this.effects = effects;
    this.cost = cost;
  }
  isApplicable(state) {
    return state.satisfies(this.preconditions);
  }
  resultOf(state) {
    return state.apply(this.effects);
  }
  toString() {
    return this.key;
  }
};
var Goal = class {
  constructor(key, conditions = {}, priority = 0) {
    this.key = key;
    this.conditions = conditions;
    this.priority = priority;
  }
  toString() {
    return this.key;
  }
};
var GOAP = class {
  constructor(agent) {
    this.agent = agent;
  }
  plan() {
    const agent = this.agent;
    const goal = agent.getGoal();
    if (goal === void 0) {
      return { goal: void 0, plan: [] };
    }
    const memo = /* @__PURE__ */ new Map();
    const makeNode = (state) => {
      const k = state.key();
      if (memo.has(k)) {
        return memo.get(k);
      }
      const node = { state, _succCost: /* @__PURE__ */ new Map(), _succAction: /* @__PURE__ */ new Map() };
      memo.set(k, node);
      return node;
    };
    const heurFn = (node) => {
      return node.state.countUnsatisfied(goal.conditions);
    };
    const goalFn = (node) => {
      return node.state.satisfies(goal.conditions);
    };
    const costFn = (prev, node) => {
      return prev ? prev._succCost.get(node) : 0;
    };
    const succFn = (node) => {
      const out = [];
      agent.actions.forEach((action) => {
        if (!action.isApplicable(node.state)) {
          return;
        }
        const result = action.resultOf(node.state);
        const succ = makeNode(result);
        const prevCost = node._succCost.get(succ);
        if (prevCost === void 0 || action.cost < prevCost) {
          node._succCost.set(succ, action.cost);
          node._succAction.set(succ, action);
        }
        if (out.indexOf(succ) < 0) {
          out.push(succ);
        }
      });
      return out;
    };
    const start = makeNode(agent.state.clone());
    const astar = new AStar(heurFn, goalFn, succFn, costFn);
    const path = astar.find(start);
    if (path.length === 0) {
      return { goal, plan: [] };
    }
    const plan = [];
    for (let i = 0; i < path.length - 1; i++) {
      plan.push(path[i]._succAction.get(path[i + 1]));
    }
    return { goal, plan };
  }
};
var Agent = class {
  constructor(state = {}) {
    const priorityScore = (goal) => {
      return -goal.priority;
    };
    this.state = new WorldState(state);
    this.actions = [];
    this.goals = new Heap(priorityScore);
    this.planner = new GOAP(this);
  }
  addAction(action) {
    this.actions.push(action);
    return action;
  }
  addGoal(goal) {
    this.goals.push(goal);
    return goal;
  }
  getGoal() {
    return this.goals.peek();
  }
  plan() {
    return this.planner.plan();
  }
};

// packages/npc-core/src/planner/goap-core.ts
var GOAP_CORE = "goap-minimal@1.0.0";
var MAX_COST = 1e6;
var MAX_FACT_VALUE = 1e9;
function validatePlanInput(input) {
  if (!input || typeof input !== "object") throw new Error("plan input must be an object");
  validateFacts(input.facts);
  validateConditions(input.conditions, "conditions");
  if (!Array.isArray(input.actions)) throw new Error("actions must be an array");
  if (input.actions.length === 0) return;
  const seen = /* @__PURE__ */ new Set();
  for (const action of input.actions) {
    if (!action || typeof action.key !== "string" || action.key.length === 0) throw new Error("action.key must be a non-empty string");
    if (seen.has(action.key)) throw new Error(`duplicate action key ${action.key}`);
    seen.add(action.key);
    validateConditions(action.preconditions, `preconditions of ${action.key}`);
    validateEffects(action.effects, action.key);
    if (typeof action.cost !== "number" || !Number.isFinite(action.cost) || action.cost < 0) {
      throw new Error(`action ${action.key} must have a finite non-negative cost`);
    }
  }
}
function validateFacts(facts) {
  for (const [key, value] of Object.entries(facts ?? {})) {
    if (typeof value === "boolean") continue;
    if (typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= MAX_FACT_VALUE) continue;
    throw new Error(`fact ${key} must be a boolean or a bounded finite number`);
  }
}
function validateConditions(conditions, label) {
  for (const [key, value] of Object.entries(conditions ?? {})) {
    if (typeof value === "boolean") continue;
    if (typeof value === "number" && Number.isFinite(value)) continue;
    if (value && typeof value === "object") {
      const allowed = ["eq", "gte", "lte", "gt", "lt"];
      const keys = Object.keys(value);
      if (keys.length === 0) throw new Error(`${label}.${key} has an empty comparison`);
      for (const op of keys) {
        if (!allowed.includes(op)) throw new Error(`${label}.${key} has unsupported comparison ${op}`);
        const n = value[op];
        if (typeof n !== "number" || !Number.isFinite(n) || Math.abs(n) > MAX_FACT_VALUE) {
          throw new Error(`${label}.${key}.${op} must be a bounded finite number`);
        }
      }
      continue;
    }
    throw new Error(`${label}.${key} is not a valid condition`);
  }
}
function validateEffects(effects, actionKey) {
  for (const [key, value] of Object.entries(effects ?? {})) {
    if (typeof value === "boolean") continue;
    if (typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= MAX_FACT_VALUE) continue;
    if (value && typeof value === "object" && "inc" in value) {
      const inc = value.inc;
      if (typeof inc !== "number" || !Number.isFinite(inc) || Math.abs(inc) > MAX_FACT_VALUE) {
        throw new Error(`effect ${actionKey}.${key}.inc must be a bounded finite number`);
      }
      continue;
    }
    throw new Error(`effect ${actionKey}.${key} is not a valid effect`);
  }
}
function applyEffects(facts, effects) {
  const next = new WorldState({ ...facts }).apply(effects).vars;
  return next;
}
function planWithGoap(input) {
  validatePlanInput(input);
  const agent = new Agent({ ...input.facts });
  for (const spec of input.actions) {
    agent.addAction(
      new Action(
        spec.key,
        { ...spec.preconditions },
        { ...spec.effects },
        spec.cost
      )
    );
  }
  agent.addGoal(new Goal("goal", input.conditions));
  if (agent.state.satisfies(input.conditions)) {
    return { status: "satisfied", actions: [], cost: 0, predicted: { ...input.facts }, core: GOAP_CORE };
  }
  const result = agent.plan();
  const plan = result.plan ?? [];
  if (plan.length === 0) {
    return { status: "no-plan", actions: [], cost: 0, predicted: { ...input.facts }, core: GOAP_CORE };
  }
  let predicted = { ...input.facts };
  let cost = 0;
  const actions = [];
  for (const action of plan) {
    actions.push(action.key);
    cost += action.cost;
    predicted = applyEffects(predicted, action.effects);
  }
  if (cost > MAX_COST) throw new Error("plan cost exceeds the bounded cost limit");
  return { status: "ok", actions, cost, predicted, core: GOAP_CORE };
}

// packages/npc-core/src/planner/worker-entry.ts
function handlePlanRequest(request) {
  const base = {
    planId: request?.planId ?? "",
    actorId: request?.actorId ?? "",
    goalId: request?.goalId ?? "idle",
    revision: request?.revision ?? -1,
    core: GOAP_CORE
  };
  try {
    validatePlanInput({ facts: request.facts, conditions: request.conditions, actions: request.actions });
    const result = planWithGoap({
      facts: request.facts,
      conditions: request.conditions,
      actions: request.actions
    });
    return {
      ...base,
      status: result.status,
      actions: result.actions,
      cost: result.cost,
      predicted: result.predicted
    };
  } catch (error) {
    return {
      ...base,
      status: "error",
      actions: [],
      cost: 0,
      predicted: {},
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
var scope = globalThis;
if (typeof scope.addEventListener === "function" && typeof scope.postMessage === "function" && scope.document === void 0) {
  scope.addEventListener("message", (event) => {
    scope.postMessage?.(handlePlanRequest(event.data));
  });
}
export {
  handlePlanRequest
};
