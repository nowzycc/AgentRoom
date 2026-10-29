export * from './types.js';
export type { CancelIntent } from './runtime/cancellation.js';
export { SimClock } from './clock/sim-clock.js';
export type { AdvanceResult, SimClockOptions } from './clock/sim-clock.js';
export {
  resolveConfig,
  DEFAULT_AUTONOMY_GOALS,
  type DomainConfig,
  type DomainConfigInput,
  type AutonomyGoalId,
} from './domain/config.js';
export {
  DomainStore,
  type DomainStoreOptions,
  type StoreListener,
  type HistoryCheckpoint,
  type ReplayResult,
} from './domain/store.js';
export { deriveActivity, type ActivityDerivation } from './domain/activity.js';
export { buildCandidates } from './goals/candidates.js';
export {
  arbitrate,
  compareCandidates,
  type ArbitrationInput,
  type ArbitrationResult,
} from './goals/arbiter.js';
export { LAYER_RANK, LAYER_ORDER, GOAL_SCORES, layerRank, isHigherLayer } from './goals/layers.js';
export {
  Blackboard,
  createBlackboard,
  type SelectorKey,
  type ProjectionMap,
  type ActivityView,
  type GoalView,
  type LivenessView,
  type ActionView,
  type ActionsView,
} from './domain/blackboard.js';
export { rehydrateDomainState } from './domain/state.js';
export { createIdMap, copyIdMap, readId, writeId, hasId, deleteId, type IdMap } from './domain/idmap.js';

// M2: planner port, action catalog, execution and resources.
export {
  GOAP_CORE,
  applyEffects,
  countUnsatisfied,
  planWithGoap,
  satisfies,
  validatePlanInput,
} from './planner/goap-core.js';
export {
  ACTION_CATALOG,
  GOAL_CONDITIONS,
  PLAN_FACTS,
  defaultFacts,
  goalConditions,
  planSpecs,
  type ActionDefinition,
  type Channel,
} from './planner/catalog.js';
export {
  type ActionPlanSpec,
  type ConditionSet,
  type EffectSet,
  type FactCondition,
  type FactEffect,
  type FactSet,
  type FactValue,
  type PlanRequest,
  type PlanResponse,
  type PlanStatus,
  type PlannerPort,
} from './planner/types.js';
export {
  WorkerPlanner,
  type PlannerWorkerFactory,
  type PlannerWorkerLike,
  type WorkerPlannerOptions,
  type WorkerPlannerStats,
} from './planner/worker-planner.js';
export { ReactivePlanner, REACTIVE_CORE } from './planner/bt/reactive-planner.js';
export { ChannelLocks, type AcquireResult, type ChannelConflict } from './resources/channels.js';
export {
  ActionExecutor,
  conditionsHold,
  type ActionExecutorOptions,
  type ActionRuntimeView,
  type ActionTerminal,
  type EvidenceReceipt,
  type ExecPhase,
  type StartActionOptions,
  type StartResult,
  type TerminalOutcome,
} from './actions/executor.js';
export {
  FakeMotionAdapter,
  type ActionEvidenceRequest,
  type BodyProfile,
  type EvidenceDependency,
  type EvidenceDependencyKind,
  type FakeMotionOptions,
  type LogicalCompletion,
  type MotionAdapter,
  type MotionCall,
  type MotionCallKind,
  type MotionCompletion,
  type MotionContext,
  type MotionEvidence,
  type MotionFeasibility,
  type MotionResult,
  type PostPhysicsCompletion,
} from './actions/motion.js';
export {
  NpcRuntime,
  type NpcRuntimeOptions,
  type RuntimeFailure,
  type RuntimeFailureKind,
  type RuntimeStats,
  type RuntimeView,
} from './runtime/npc-runtime.js';
