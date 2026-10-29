import { AStar, Heap } from 'astar-minimal';
export { AStar, Heap } from 'astar-minimal';

function isComparison( v ) {
    return v !== null && typeof v === 'object' && ( 'eq' in v || 'gte' in v || 'lte' in v || 'gt' in v || 'lt' in v )}

function isDelta( v ) {
    return v !== null && typeof v === 'object' && 'inc' in v}


class WorldState {
    constructor( vars={} ) {
        this.vars = Object.assign({}, vars); }

    get( key ) {return this.vars[key]}

    _match( key, cond ) {
        const cur = this.vars[key];

        if (isComparison(cond) ) {
            if (typeof cur !== 'number') {return false}
            if (cond.eq !== undefined && !(cur === cond.eq)) {return false}
            if (cond.gte !== undefined && !(cur >= cond.gte)) {return false}
            if (cond.lte !== undefined && !(cur <= cond.lte)) {return false}
            if (cond.gt !== undefined && !(cur > cond.gt)) {return false}
            if (cond.lt !== undefined && !(cur < cond.lt)) {return false}
            return true}

        return cur === cond}

    satisfies( conditions ) {
        for (let key in conditions) {
            if (!this._match(key, conditions[key]) ) {return false} }
        return true}

    countUnsatisfied( conditions ) {
        let n = 0;
        for (let key in conditions) {
            if (!this._match(key, conditions[key]) ) {n += 1;} }
        return n}

    apply( effects ) {
        const next = Object.assign({}, this.vars);

        for (let key in effects) {
            const eff = effects[key];

            if (isDelta(eff) ) {
                const base = typeof next[key] === 'number' ? next[key] : 0;
                next[key] = base + eff.inc;}
            else {
                next[key] = eff;} }

        return new WorldState(next) }

    key() {
        const keys = Object.keys( this.vars ).sort();
        let parts = [];
        keys.forEach (( k ) => { parts.push(k + '=' + this.vars[k]);});
        return parts.join(',') }

    clone() {return new WorldState(this.vars)} }


class Action {
    constructor( key, preconditions={}, effects={}, cost=1 ) {
        this.key = key;
        this.preconditions = preconditions;
        this.effects = effects;
        this.cost = cost;}

    isApplicable( state ) {return state.satisfies(this.preconditions)}

    resultOf( state ) {return state.apply(this.effects)}

    toString() {return this.key} }


class Goal {
    constructor( key, conditions={}, priority=0 ) {
        this.key = key;
        this.conditions = conditions;
        this.priority = priority;}

    toString() {return this.key} }


class GOAP {
    constructor( agent ) {
        this.agent = agent;}

    plan() {
        const agent = this.agent;
        const goal = agent.getGoal();

        if (goal === undefined) {return {goal: undefined, plan: []}}

        const memo = new Map();

        const makeNode = (( state ) => {
            const k = state.key();
            if (memo.has(k) ) {return memo.get(k)}

            const node ={state, _succCost: new Map(), _succAction: new Map()};
            memo.set(k, node);
            return node});

        const heurFn = (( node ) => { return node.state.countUnsatisfied(goal.conditions)});
        const goalFn = (( node ) => { return node.state.satisfies(goal.conditions)});
        const costFn = (( prev, node ) => { return prev ? prev._succCost.get( node ) : 0});

        const succFn = (( node ) => {
            const out = [];

            agent.actions.forEach (( action ) => {
                if (!action.isApplicable(node.state) ) {return}

                const result = action.resultOf(node.state);
                const succ = makeNode(result);

                // parallel edges (two actions, same resulting state): keep the cheapest
                const prevCost = node._succCost.get(succ);
                if (prevCost === undefined || action.cost < prevCost) {
                    node._succCost.set(succ, action.cost);
                    node._succAction.set(succ, action); }

                if (out.indexOf( succ ) < 0) {out.push(succ);} });

            return out});

        const start = makeNode(agent.state.clone());
        const astar = new AStar(heurFn, goalFn, succFn, costFn);
        const path = astar.find(start);

        if (path.length === 0) {return {goal, plan: []}}

        const plan = [];
        for (let i = 0; i < path.length - 1; i++) {
            plan.push(path[i]._succAction.get( path[i+1] )); }

        return {goal, plan} } }


class Agent {
    constructor( state={} ) {
        const priorityScore = (( goal ) => { return -goal.priority});

        this.state = new WorldState(state);
        this.actions = [];
        this.goals = new Heap(priorityScore);
        this.planner = new GOAP(this); }

    addAction( action ) {
        this.actions.push(action);
        return action}

    addGoal( goal ) {
        this.goals.push(goal);
        return goal}

    getGoal() {return this.goals.peek()}

    plan() {return this.planner.plan()} }

// The "three states" from Orkin's paper. UseSmartObject is a data-driven
// Animate, so decision-making really only cares about Goto vs Animate.
const FSM ={Goto: 'Goto', Animate: 'Animate', UseSmartObject: 'UseSmartObject'};

// An action drives one FSM state; default Animate, movement-style actions set `.state = 'Goto'`.
function fsmStateFor( action ) {
    return action.state || FSM.Animate}


class AgentRuntime {
    constructor( agent ) {
        this.agent = agent;
        this.plan = null;
        this.index = 0;
        this.goal = undefined;
        this.fsm = FSM.Animate;}

    _replan() {
        const result = this.agent.plan();
        this.goal = result.goal;
        this.plan = result.plan;
        this.index = 0;
        return result}

    goalSatisfied() {
        if (this.goal === undefined) {return false}
        return this.agent.state.satisfies(this.goal.conditions) }

    tick() {
        // (re)plan when we have none, or a higher-priority goal has taken over
        const topGoal = this.agent.getGoal();
        if (this.plan === null || topGoal !== this.goal) {
            this._replan();}

        // plan exhausted: done if the goal is met, otherwise try one fresh plan
        if (this.index >= this.plan.length) {
            if (this.goalSatisfied()) {return {status: 'done', fsm: this.fsm, action: null}}
            this._replan();
            if (this.plan.length === 0) {return {status: 'failed', fsm: this.fsm, action: null}} }

        const action = this.plan[this.index];

        // the world may have changed since planning: validate this step
        if (!action.isApplicable(this.agent.state) ) {
            this._replan();
            if (this.plan.length === 0) {
                if (this.goalSatisfied()) {return {status: 'done', fsm: this.fsm, action: null}}
                return {status: 'failed', fsm: this.fsm, action: null} }
            return {status: 'replanned', fsm: this.fsm, action: null} }

        // drive the FSM and perform the action
        this.fsm = fsmStateFor(action);

        if (typeof action.perform === 'function') {
            action.perform(this.agent); }
        else {
            this.agent.state = action.resultOf(this.agent.state); }

        this.index += 1;

        const done = this.index >= this.plan.length && this.goalSatisfied();
        return {status: done ? 'done' : 'acting', fsm: this.fsm, action: action.key} }

    run( maxTicks=50 ) {
        const trace = [];
        for (let i = 0; i < maxTicks; i++) {
            const step = this.tick();
            trace.push(step);
            if (step.status === 'done' || step.status === 'failed') {break} }
        return trace} }

export { Action, Agent, AgentRuntime, FSM, GOAP, Goal, WorldState, fsmStateFor };
//# sourceMappingURL=index.js.map
