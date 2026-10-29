/**
 * NE1 — NPC appliance interaction page.
 *
 * This page is an independent entry. It reuses the apartment GLB, the VRM rig,
 * the GOAP kernel, the shared scene/claim world and the environment resource
 * file — it does NOT reimplement the planner or the device bindings.
 *
 * The buttons only request a HIGH-LEVEL goal (`lampOn` / `lampOff`). The plan,
 * the walk, the seat claim, the switch claim, the hand reach, the contact gate,
 * the device change, the withdrawal and the claim release are all executed by
 * the runtime and the slice; the page only renders and reports.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadNpcSlice, BrowserPlannerWorker, planWithGoap, samplePostPhysicsContact, contactFailureReason } from './npc-h4a-core.js';
import { DeviceController, validateEnvironmentConfig } from '../environment/interaction-core.js';
import { createPhysicsWorld } from '../environment/physics-world.js';
import { deriveColliderProfile } from '../environment/character-collider.js';
import {
  analyzeSeatEntry,
  analyzeChairSetback,
  shiftChairColliders,
  standingBlockers,
  findStandingRoute,
} from '../environment/seat-entry.js';
import { analyzeFridgeDoor, handleWorldAt } from '../environment/fridge-door.js';
import { buildFridgeInteraction, interactionSummary } from '../environment/fridge-interaction.js';
import {
  buildFridgeGraspSpec,
  contactFromPose,
  doorPoseAtAngle,
  handleSurfaceDistance,
  leafSurfaceDistance,
  palmNormalFromPose,
  staticClearance,
} from '../environment/fridge-grasp.js';
import {
  buildInteractionVisual,
  hideAuthoredUpperAssembly,
  auditInteractionVisual,
  meshWorldBoxes,
} from '../movable-seat/app/interaction-visual.js';
import { ChairController } from '../movable-seat/app/chair-controller.js';
import { SeatGoalRunner } from '../movable-seat/app/seat-goals.js';
import { createSeatExecutorRegistry } from '../movable-seat/app/seat-executors.js';
import { adjustedHostPose } from '../movable-seat/app/chair-frame.js';
import { planSeatDescent } from '../movable-seat/app/seat-descent.js';
import { standingBlockers as capsuleBlockers } from '../movable-seat/app/capsule-query.js';
import { planStandingRoute } from '../movable-seat/app/stand-route.js';
import { TestBlockPlacement } from '../movable-seat/app/test-block-placement.js';

// All resource URLs are resolved against THIS module, never the document, so a
// page can be moved to a different directory depth without breaking assets.
// (Document-relative fetch() of '../../npc-v2/…' from /web/<page>.html resolved
// above the server root and 404'd.)
const MODULE_BASE = new URL('../movable-seat/app/app.js',import.meta.url).href;
const URLS = {
  glb: new URL('../../../dist/apartment-v3.glb', MODULE_BASE).href,
  fit: new URL('../../npc-v2/apartment-v3.fit.json', MODULE_BASE),
  interactions: new URL('../../npc-v2/environment-interactions.json', MODULE_BASE),
  devices: new URL('../../npc-v2/npc-environment.json', MODULE_BASE),
  colliders: new URL('../../npc-v2/environment-colliders.json', MODULE_BASE),
  assets: new URL('../../npc/assets/', MODULE_BASE).href,
  worker: new URL('./npc-h4a-worker.js',import.meta.url),
};
const FIXED_DT = 1 / 60;
const CAMERAS = {
  lamp: { position: [3.62, 1.62, 2.72], target: [5.02, 1.02, 3.52], fov: 44 },
  contact: { position: [4.42, 1.22, 3.06], target: [5.36, 0.86, 3.56], fov: 36 },
  wide: { position: [3.05, 2.12, 1.86], target: [4.35, 0.92, 3.28], fov: 52 },
  chair: { position: [3.95, 1.82, 2.42], target: [4.98, 0.72, 3.02], fov: 50 },
  fridge: { position: [1.72, 1.68, 2.32], target: [2.95, 0.98, 3.70], fov: 50 },
  // Evidence view only (no toolbar button): from the hinge side, high enough to
  // see the leaf/body gap without the NPC standing in front of the door.
  'fridge-side': { position: [3.95, 1.75, 2.45], target: [2.98, 1.05, 3.58], fov: 45 },
  // Evidence view for the open cavity: camera in front-left of the fridge,
  // looking into the upper aperture while the leaf is at -100 deg.
  'fridge-interior': { position: [2.28, 1.58, 2.98], target: [2.96, 1.20, 3.85], fov: 52 },
};

const el = {};
const state = {
  ready: false,
  error: null,
  renderer: null,
  scene: null,
  camera: null,
  controls: null,
  slice: null,
  loaded: null,
  device: null,
  resource: null,
  audit: null,
  events: [],
  errors: [],
  manual: false,
  renderOn: true,
  simTime: 0,
  acc: 0,
  lastNow: performance.now(),
  fpsFrames: 0,
  fpsAt: performance.now(),
  fps: 0,
  cmd: 0,
  prev: {
    goal: null,
    planKey: null,
    actionRunning: null,
    failures: 0,
    claim: null,
    claimState: null,
    deviceState: null,
    contactAt: null,
    changedAt: null,
    releasedAt: null,
    telemetryKey: null,
    feedbackCount: 0,
  },
  occupier: null,
  lastHud: 0,
  maxStepM: 0,
  lastCarrier: null,
  nanCount: 0,
  // Per-step continuity trace (dt, carrier, hips, action phase). Off by
  // default: it is acceptance instrumentation, not a HUD feature.
  steps: [],
  record: false,
  touch: null,
  surface: null,
  // NE-P: one shared Ammo world for the body and the door.
  ammo: null,
  colliderCfg: null,
  entryColliders: null, // the exact array handed to the world (chair tuck applied)
  profile: null,
  physics: null,   // the PhysicsWorld (bodies, sweeps, guard)
  physPort: null,  // the adapter-facing port (same object, narrower contract)
  door: null,
  doorVisual: null,
  // NE2 alignment: default = runtime interaction replacement; ?fridge=glb rolls back.
  fridgeMode: 'interaction',
  fridgeInteraction: null,
  fridgeInteractionVisual: null,
  // NE2 grasp: measured standing target + the page-bound physical authority.
  fridgeGrasp: null,
  fridgeTarget: null,
  fridgeBound: false,
  fridgeOccupier: null,
  authoredVisibility: null,
  doorSpec: null,
  physEvents: { sweeps: 0, blockedSteps: 0, lastMove: null, lastHit: null },
  probe: { rows: [], active: false },
  // C0-C3: the movable chair (opt-in dynamic assembly in the ONE Ammo world).
  chair: null,
  chairResource: 'desk-chair',
  chairToken: null,
  chairPose: null,
  chairInitial: null,
  chairPublished: null,
  chairClaim: null,
  chain: null,
  chainEvents: [],
  seatRevision: 0,
  chairFootprint: null,
};

boot().catch(fail);

async function boot() {
  for (const id of ['loading', 'err', 'chip-goal', 'chip-plan', 'chip-action', 'chip-claim', 'chip-fps', 'event-list', 'event-count', 'device-name', 'device-state', 'device-kv', 'audit-kv', 'contact-kv', 'fridge-kv', 'facts-kv', 'btn-on', 'btn-off', 'btn-cancel', 'btn-audit', 'btn-occupy', 'btn-reset-cam', 'chip-phys', 'physics-kv', 'btn-block', 'btn-unblock', 'btn-door', 'btn-doorsweep', 'btn-physreset', 'btn-fridge-open', 'btn-fridge-occupy', 'btn-seat', 'btn-pull', 'btn-rotate', 'btn-seated-move', 'btn-stand', 'btn-chair-reset', 'chair-kv']) {
    el[id] = document.getElementById(id);
  }

  const [interactions, deviceCfg, colliderCfg, fitDoc] = await Promise.all([
    fetchJson(URLS.interactions),
    fetchJson(URLS.devices),
    fetchJson(URLS.colliders),
    fetchJson(URLS.fit),
  ]);
  state.colliderCfg = colliderCfg;
  state.fitDoc = fitDoc;
  const params = new URLSearchParams(window.location.search);
  state.fridgeMode = params.get('fridge') === 'glb' ? 'glb' : 'interaction';
  const authoredFridge = colliderCfg.colliders?.find((c) => c.id === 'furniture_fridge');
  const authoredDoor = colliderCfg.doors?.find((d) => d.id === 'fridge-door-top');
  if (state.fridgeMode === 'interaction') {
    if (!authoredFridge || !authoredDoor) throw new Error('冰箱交互替换缺少实测 fridge/door 资源');
    state.fridgeInteraction = buildFridgeInteraction({ fridge: authoredFridge, door: authoredDoor });
    state.doorSpec = state.fridgeInteraction.door.physics;
  } else {
    state.doorSpec = authoredDoor ?? null;
  }
  if (typeof window.Ammo !== 'function') throw new Error('vendor/ammo/ammo.wasm.js 未加载：物理世界无法建立');
  state.ammo = await window.Ammo();
  const configErrors = validateEnvironmentConfig(interactions);
  if (configErrors.length) throw new Error(`环境清单校验失败：\n${configErrors.join('\n')}`);
  const switchCfg = deviceCfg?.devices?.[0];
  if (!switchCfg) throw new Error('npc-environment.json 没有设备条目');
  state.resource = (interactions.resources || []).find((r) => r.id === switchCfg.device_resource);
  if (!state.resource) throw new Error(`环境清单缺少设备资源 ${switchCfg.device_resource}`);

  setupRenderer();
  setupLights();

  // The fridge CLAIM slot is annotated before the avatar is loaded; the
  // measured stance and the moving contact are bound after (they need the real
  // rig metrics). The closed contact is the delivered resource's handle face.
  const closedFridgePose = state.fridgeInteraction ? doorPoseAtAngle(state.fridgeInteraction, 0) : null;
  const closedFridgeContact = closedFridgePose && state.fridgeInteraction
    ? contactFromPose(state.fridgeInteraction, closedFridgePose)
    : null;
  const fridgeHost = fitDoc.hostNodes?.['furniture_fridge'] ?? { position: [2.6819, 0, 3.518], yawDeg: 0 };
  const fridgeAnnotation = state.fridgeMode === 'interaction' && state.fridgeInteraction && closedFridgeContact
    ? {
        id: 'fridge-upper-handle',
        interactionId: 'fridge-handle',
        slotId: 'fridge-operate',
        hostNode: 'furniture_fridge',
        hostTransform: { position: [...fridgeHost.position], yawDeg: Number(fridgeHost.yawDeg ?? 0) },
        contactWorldClosed: [closedFridgeContact.x, closedFridgeContact.y, closedFridgeContact.z],
        facingYawDeg: 0,
      }
    : null;

  state.loaded = await loadNpcSlice({
    threeScene: state.scene,
    assetBase: URLS.assets,
    glbUrl: URLS.glb,
    fitUrl: URLS.fit,
    tuckM: 0.15,
    workerFactory: () => new BrowserPlannerWorker(URLS.worker),
    evidenceSource: () => corePostPhysicsEvidence(),
    evidenceRequired: () => coreEvidenceDependencies(),
    ...(fridgeAnnotation ? { fridge: fridgeAnnotation } : {}),
    // The collision proxies are derived from the LOADED avatar, so the world is
    // built here (after the rig exists, before the adapter).
    physicsFactory: ({ metrics, adjustment }) => buildPhysicsWorld(metrics, adjustment),
    deviceFactory: (root) => {
      state.switchSpec = makeSwitchSpec(root, switchCfg);
      return state.switchSpec;
    },
  });
  state.slice = state.loaded.slice;
  window.__npcStage = state.slice;
  // The page measured the standing capsule from this avatar (armPad included).
  // The rig needs that radius for the sit clip's own entry point; without it
  // the fallback is the same shoulder+armPad construction, but the measured
  // value is the authority.
  state.slice.rig.setStandingRadiusM(state.profile.standing.radiusM);
  setupDoorVisual(state.loaded.root, state.door);
  bindFridgeGrasp();

  // The manifest spawns at home; the M4 slice places the rig at the approach.
  // This page starts the body at the declared home so the walk is a real walk.
  const home = state.slice.fit.home;
  state.slice.rig.setCarrier({ x: home.pos[0], y: 0, z: home.pos[2] }, Math.atan2(home.facing[0], home.facing[2]));

  // The body must stand where the page put it, not where the slice spawned it.
  state.physics.character.place({ x: home.pos[0], z: home.pos[2] });
  // C0: the chair resource is registered in the SAME scene world that resolves
  // its seat/manipulation slots. The initial pose is the measured GLB node pose
  // after the declared tuck, not an invented origin.
  const chairHost = state.slice.fit.hostNodes.furniture_chair;
  const chairNav = state.slice.fit.nav.obstacles.find((o) => o.name === 'furniture_chair') ?? null;
  state.chairInitial = {
    x: chairHost.position[0],
    y: chairHost.position[1],
    z: chairHost.position[2],
    yaw: (chairHost.yawDeg * Math.PI) / 180,
  };
  state.chairPose = { ...state.chairInitial };
  state.chairFootprint = chairNav
    ? { minX: chairNav.minX, maxX: chairNav.maxX, minZ: chairNav.minZ, maxZ: chairNav.maxZ }
    : null;
  state.slice.world.registerFurniture({
    resourceId: state.chairResource,
    sceneId: state.slice.sceneId,
    seat: { interactionId: 'chair-main', slotId: 'seat' },
    manipulation: { interactionId: 'chair-main', slotId: 'manipulate' },
    pose: state.chairInitial,
    ...(state.chairFootprint ? { footprint: state.chairFootprint } : {}),
    obstacleName: 'furniture_chair',
  });
  state.slice.world.bindFurniturePhysics(state.chairResource,()=>({pose:state.chair.pose(),stopped:state.chair.settled()}));
  state.slice.setFurnitureSeatPose(state.chairPose, 0);
  state.slice.seat.transitionMode = 'descent-coupled';
  state.chairPublished = { ...state.chairPose };
  syncChairVisual();
  log('chair.register', '椅子已作为可移动资源接入世界', {
    pose: state.chairPose,
    footprint: state.chairFootprint,
    hostRevision: state.slice.world.furniture(state.chairResource).hostRevision,
  });
  // allow: SIZE_OK — legacy page retained; only H3a opt-in injection added.
  const h3a = document.documentElement.dataset.footContact === 'h3a';
  const Controller = h3a ? (await import('./foot-chair-controller.js')).FootChairController : ChairController;
  const footProfile = h3a ? await fetchJson(new URL('./foot-contact-profile.json', MODULE_BASE)) : null;
  state.controller = new Controller({
    ...(h3a ? { footProfile, roomRoot: state.loaded.root } : {}),
    slice: state.slice,
    world: state.slice.world,
    chair: state.chair,
    physics: state.physics,
    profile: state.profile,
    colliders: state.entryColliders,
    chairFootprint: state.chairFootprint,
    nav: state.slice.world.navigation(state.slice.sceneId),
    rig: state.slice.rig,
    resourceId: state.chairResource,
    initial: state.chairInitial,
    log: (kind, message, detail) => log(`chair.${kind}`, message, detail),
    requestGoal: (goal) => requestGoal(goal,'capability-runtime'),
    cancelGoals: () => state.slice.goalCancel(),
    device: { contact: state.switchSpec.contactWorldPoint, side: state.switchSpec.side },
  });
  state.capabilities = new SeatGoalRunner({
    resourceId: state.chairResource,
    planner: planWithGoap,
    registry: createSeatExecutorRegistry(state.controller, goal=>requestGoal(goal,'capability-runtime')),
    actorId: state.slice.actorId,
    record: (kind,detail)=>state.controller.record(kind,detail),
    facts: (_goal,params) => {
      const c=state.controller,v=state.slice.view();
      const reach=state.slice.rig.measurePointReach(state.switchSpec.contactWorldPoint,state.switchSpec.side);
      return {sitting:Boolean(v.facts.sitting&&state.slice.rig.seated),
        entryClear:c.entryVerdict(state.chair.pose()).clear,
        reachReady:reach.shortfallM<=0,
        exitClear:c.exitClear(),
        operated:c.goalSatisfied(v,params.goal??'lampOn')};
    },
  });
  state.device = bindDevice(state.scene, state.resource);
  const touch = buildTouchRegion(state.switchSpec);
  state.touch = touch;
  state.slice.bindDevice({
    read: () => state.device.controller.power,
    apply: (on) => {
      const result = state.device.controller.setPower(on, `npc-${++state.cmd}`);
      if (result.changed) state.slice.deviceFeedback(on, 'npc-switch');
      return { changed: result.changed, state: state.device.controller.power, reason: result.reason || null };
    },
  });

  el['device-name'].textContent = switchCfg.name_zh;
  state.audit = state.slice.deviceAudit();
  bindUI();
  updateAll(true);
  el.loading.classList.add('hidden');
  state.ready = true;
  state.lastNow = performance.now();
  state.slice.heartbeat();
  log('system', '载入完成', { device: switchCfg.id, audit: state.audit });
  exposeHooks();
  requestAnimationFrame(tick);
}


// --------------------------------------------------------------- physics (NE-P)

/**
 * Bind the measured standing grasp target to the slice.
 *
 * The stance is re-derived from the delivered interaction handle, the REAL rig
 * metrics and the REAL collider array; the reach is then re-measured at that
 * stance. If the measured arm cannot reach the declared contact, this throws
 * instead of moving the point or starting a chain that cannot touch.
 */
function bindFridgeGrasp() {
  if (state.fridgeMode !== 'interaction' || !state.fridgeInteraction || !state.slice) return null;
  const rig = state.slice.rig;
  const metrics = rig.debugMetrics();
  const closedPose = doorPoseAtAngle(state.fridgeInteraction, 0);
  const closedContact = contactFromPose(state.fridgeInteraction, closedPose);
  const probe = (side) => rig.measurePointReach(closedContact, side, { standpoint: { x: 2.0, z: 2.6, yaw: 0 } });
  const budget = Math.max(0.05, Math.min(probe('left').reachM, probe('right').reachM));
  const grasp = buildFridgeGraspSpec({
    interaction: state.fridgeInteraction,
    metrics,
    profile: state.profile,
    colliders: state.entryColliders,
    armReachM: budget,
  });
  const measured = rig.measurePointReach(closedContact, grasp.handSide, {
    standpoint: { x: grasp.stance.x, z: grasp.stance.z, yaw: grasp.stance.yaw },
  });
  if (!measured || measured.shortfallM > 0) {
    throw new Error(`FRIDGE_STANCE_UNREACHABLE:${measured ? `${measured.distanceM}/${measured.reachM}` : 'no-measurement'}`);
  }
  const target = {
    id: 'fridge-upper-handle',
    interactionId: 'fridge-handle',
    approach: {
      pos: { x: grasp.stance.x, y: 0, z: grasp.stance.z },
      yaw: grasp.stance.yaw,
    },
    side: grasp.handSide,
    toleranceM: grasp.contact.toleranceM,
    contactHoldMs: grasp.contact.contactHoldMs,
    graspHoldMs: grasp.contact.graspHoldMs,
    reachTimeoutMs: grasp.contact.reachTimeoutMs,
    releaseTimeoutMs: grasp.contact.releaseTimeoutMs,
    withdrawMs: grasp.contact.withdrawMs,
    minOpenRad: grasp.open.minRad,
    targetOpenRad: grasp.open.targetRad,
    releaseDriftTolRad: (grasp.open.releaseDriftTolDeg * Math.PI) / 180,
  };
  const interaction = state.fridgeInteraction;
  const poseNow = () => state.door.bodyPose();
  const binding = {
    target,
    handlePoint: () => contactFromPose(interaction, poseNow()),
    handleNormal: () => palmNormalFromPose(interaction, poseNow()),
    palmDistance: (palm) => {
      const pose = poseNow();
      const h = handleSurfaceDistance(interaction, pose, palm);
      const l = leafSurfaceDistance(interaction, pose, palm);
      const s = staticClearance(interaction, palm);
      return {
        signedM: h.signedM,
        distanceM: h.distanceM,
        leafSignedM: l.signedM,
        staticSignedM: s.signedM,
        staticName: s.name,
      };
    },
    angleRad: () => state.door.angleRad(),
    driveOpen: () => { state.door.setMotor(-1); },
    stop: () => { state.door.setMotor(0); },
    blocked: () => state.physics.doorContacts(state.door.id).some((c) => c.id === 'npc' && c.depthM >= 0),
    telemetry: () => {
      const h = contactFromPose(interaction, poseNow());
      return {
        bound: true,
        angleDeg: Number(state.door.angleDeg().toFixed(2)),
        motorSign: state.door.motorSign,
        handle: [h.x, h.y, h.z].map((v) => Number(v.toFixed(4))),
      };
    },
  };
  const bound = state.slice.bindFridge(binding);
  state.fridgeGrasp = grasp;
  state.fridgeTarget = target;
  state.fridgeBound = Boolean(bound.bound);
  log('fridge.bind', '站立抓握目标已按实测绑定', {
    stance: grasp.stance,
    side: grasp.handSide,
    reach: grasp.reach,
    open: grasp.open,
    measured,
  });
  return { grasp, target, measured };
}

/**
 * Build the ONE rigid-body world for this page: the body and the fridge door in
 * the same Ammo world (never two worlds). Collision proxies come from the
 * measured avatar; static boxes come from the derived collider resource; the
 * door leaf/hinge come from the GLB nodes. If any of that is missing the page
 * fails instead of running a kinematic body through the furniture.
 */
function buildPhysicsWorld(metrics, adjustment) {
  const cfg = state.colliderCfg;
  if (!cfg?.colliders?.length) throw new Error('碰撞资源为空：无法建立物理世界');
  if (!cfg.character) throw new Error('碰撞资源缺少角色胶囊声明');
  const seatY = state.fitDoc.authored.seatSurfaceWorld.point[1];
  const profile = deriveColliderProfile(metrics, cfg.character, { seatY });
  state.profile = profile;
  const home = state.fitDoc.home.pos;
  const colliders = applyDeclaredAdjustment(cfg.colliders, adjustment);
  state.entryColliders = state.fridgeMode === 'interaction' && state.fridgeInteraction
    ? colliders.map((c) => (c.id === state.fridgeInteraction.collider.id ? state.fridgeInteraction.collider : c))
    : colliders;
  const world = createPhysicsWorld(state.ammo, {
    colliders: state.entryColliders,
    profile,
    seatId: cfg.seat_node,
    spawn: { x: home[0], z: home[2], yaw: 0 },
    maxSpeedMps: 1.1,
    // NE2 declaration: the blocked-door residual is a solver-accuracy effect,
    // measured 4.0 mm at the shared default 10 and 0 at 20. This is the
    // independent physics entry; older entries keep the default.
    solverIterations: 20,
    // C1: the chair is a real two-body assembly in THIS world. Its origin is
    // the chair NODE pose (after the declared tuck), i.e. the pose the renderer
    // and the scene resolver must agree with.
    chairMotion: true,
    chair: (() => {
      const host = state.fitDoc.hostNodes.furniture_chair;
      return adjustedHostPose(host, adjustment);
    })(),
    chairSpeedMps: 0.35,
  });
  state.physics = world;
  state.chair = world.chair();
  if (!state.chair) throw new Error('CHAIR_MOTION_NOT_BUILT');
  state.door = state.doorSpec ? buildDoor(world, state.doorSpec) : null;
  state.physEvents.profile = profile;
  const port = {
    ready: true,
    get posture() { return world.character.posture; },
    moveCarrier(from, to, dtMs) {
      const p = world.character.position();
      const desync = Math.hypot(p.x - from.x, p.z - from.z);
      if (desync > 0.5) throw new Error(`PHYSICS_DESYNC:${desync.toFixed(3)}m`);
      const r = world.character.moveTo({ x: to.x, z: to.z }, dtMs / 1000);
      state.physEvents.sweeps += 1;
      state.physEvents.lastMove = { requestedM: r.requestedM, movedM: r.movedM, blocked: r.blocked, slid: r.slid, hit: r.hits[0]?.id ?? null };
      if (r.blocked) { state.physEvents.blockedSteps += 1; state.physEvents.lastHit = r.hits[0]?.id ?? null; }
      return {
        from: r.from,
        position: r.position,
        requestedM: r.requestedM,
        movedM: r.movedM,
        blocked: r.blocked,
        slid: r.slid,
        hits: r.hits.map((h) => ({ id: h.id, fraction: h.fraction, stage: h.stage, normal: { x: h.normal[0], y: h.normal[1], z: h.normal[2] } })),
      };
    },
    placeCarrier(pos, posture) {
      if (posture) world.character.setPosture(posture);
      const r = world.character.place(pos);
      return { position: r.position, overlaps: r.overlaps };
    },
    syncCarrier(pos) { return world.character.sync(pos); },
    setPosture(posture) { return world.character.setPosture(posture); },
    setTransition(t) { return world.character.setTransition(t); },
    /**
     * Standing-capsule query against the SAME static compound the sweep uses.
     * The adapter calls this before accepting the sit clip's start point; a
     * false result names the real seat/desk part, never a guessed distance.
     */
    standable(point) {
      const pose = state.chairPose ?? state.chairInitial;
      const colliders = state.controller ? state.controller.collidersAt(pose) : (state.entryColliders ?? []);
      const probe = capsuleBlockers(state.profile, colliders, point);
      if (!probe.length && state.slice?.seat.transitionMode) {
        const plan = planSeatDescent({ profile: state.profile, colliders, seat: state.slice.seat, entry: point });
        if (!plan.ok) return { ok: false, blockers: [{ id: plan.reason, overlapM: 0 }] };
        state.slice.seat.descentPath = plan.path;
      }
      return {
        ok: probe.length === 0,
        blockers: probe.map((b) => ({ id: b.id, node: b.node, overlapM: b.overlapM, inside: b.inside })),
      };
    },
    /**
     * Real-capsule route to the sit clip root. The page is the owner of the
     * collider array and the measured body profile, so the adapter asks here
     * instead of walking a straight line into the chair's front corner.
     */
    standRoute(from, to) {
      const pose = state.chairPose ?? state.chairInitial;
      const colliders = state.controller ? state.controller.collidersAt(pose) : (state.entryColliders ?? []);
      return planStandingRoute(state.profile, colliders, from, to, {
        seat: state.slice?.seat ?? state.slice?.previewFurnitureSeatPose(pose) ?? null,
      });
    },
    penetrations() { return world.character.penetrations(); },
    update(dtMs) { world.update(dtMs / 1000); },
  };
  state.physPort = port;
  return port;
}

/**
 * The live seat-entry verdict. This is the SAME pure module the Node TDD suite
 * runs; it reads the live SeatTarget (after the declared chair tuck) and the
 * exact collider array handed to the Ammo world. It does not move anything.
 */
function seatEntryNow() {
  if (!state.slice?.seat?.seatRect || !state.profile || !state.entryColliders) return null;
  return analyzeSeatEntry({
    profile: state.profile,
    colliders: state.controller ? state.controller.collidersAt(state.slice.world.furniture(state.chairResource).pose) : state.entryColliders,
    seat: state.slice.seat,
  });
}

/** The chair GLB node follows the solved body pose (one pose source). */
function syncChairVisual() {
  const root = state.loaded?.root;
  if (!root || !state.slice) return null;
  const node = root.getObjectByName('furniture_chair');
  if (!node) throw new Error('MISSING_NODE:furniture_chair');
  const pose = state.slice.world.furniture(state.chairResource).pose;
  node.position.set(pose.x, pose.y, pose.z);
  node.rotation.set(0, pose.yaw, 0);
  node.updateMatrixWorld(true);
  state.chairPose = { ...pose };
  return node;
}

/**
 * Declared chair-setback EXPERIMENT (analysis only, no furniture is moved).
 *
 * Moves the chair collider/seat target by -setback in a COPY and reports the
 * legal entry, the route existence, and the reach cost on the real rig. This is
 * how the round proves whether a chair operation could ever serve the lamp
 * chain before claiming one.
 */
function seatStagedNow(setbackM) {
  const base = seatEntryNow();
  if (!base) return null;
  const seat = state.slice.seat;
  const staged = analyzeChairSetback({
    profile: state.profile,
    colliders: state.entryColliders ?? [],
    seat,
    setbackM,
  });
  const shiftedSeat = {
    ...seat,
    seat: { ...seat.seat, z: Number((seat.seat.z - setbackM).toFixed(4)) },
    seatRect: {
      ...seat.seatRect,
      minZ: Number((seat.seatRect.minZ - setbackM).toFixed(4)),
      maxZ: Number((seat.seatRect.maxZ - setbackM).toFixed(4)),
    },
    footTargets: seat.footTargets
      ? Object.fromEntries(Object.entries(seat.footTargets).map(([side, point]) => [side, { ...point, z: Number((point.z - setbackM).toFixed(4)) }]))
      : seat.footTargets,
  };
  const snapshot = state.slice.snapshotState();
  const device = snapshot?.device?.target ?? null;
  const reach = device ? state.slice.rig.measurePointReach(device.contact, device.side, { seat: shiftedSeat }) : null;
  const keyboard = state.slice.rig.measureReach(shiftedSeat);
  let route = null;
  if (staged.entryPoint && staged.analysis.frontal.candidateEntryM != null) {
    const stagedColliders = shiftChairColliders(state.entryColliders ?? [], 'furniture_chair', -setbackM);
    route = findStandingRoute(state.profile, stagedColliders, seat.approach.pos, staged.entryPoint, { stepM: 0.03 });
  }
  return {
    setbackM,
    baseVerdict: base.verdict,
    baseDeficitM: base.frontal.deficitM,
    staged,
    reach,
    keyboard,
    route,
  };
}

/**
 * Live-WASM proof of the two posture rules the seat entry depends on:
 *  - the transition capsule deforms continuously from the standing dimensions
 *    to the seated ones (no first-frame shrink);
 *  - the chair SUPPORT is excluded while transition/seated, but the backrest
 *    still produces a real Bullet manifold.
 * It temporarily moves the single character body and restores it exactly.
 */
function transitionProbe() {
  if (!state.physics || !state.slice?.seat?.seat) return null;
  const world = state.physics;
  const c = world.character;
  const saved = c.position();
  try {
    c.setPosture('transition', { t: 0, reason: 'probe' });
    const rows = [];
    for (let i = 0; i <= 10; i += 1) {
      c.setTransition(i / 10);
      const shape = c.shape();
      rows.push({
        t: i / 10,
        radiusM: shape.radiusM,
        bottomY: shape.bottomY,
        topY: shape.topY,
        totalHeightM: shape.totalHeightM,
      });
    }
    c.setTransition(1);
    const seat = state.slice.seat.seat;
    c.sync({ x: seat.x, z: seat.z });
    world.update(FIXED_DT);
    const onSeat = c.penetrations();
    c.sync({ x: seat.x, z: seat.z - 0.20 });
    world.update(FIXED_DT);
    const onBack = c.penetrations();
    return { rows, onSeat, onBack };
  } finally {
    c.setPosture('standing', { reason: 'probe-restore' });
    c.place({ x: saved.x, z: saved.z });
    world.update(FIXED_DT);
  }
}

/**
 * The declared chair tuck moves the visual node and the nav obstacle. Apply the
 * SAME delta to the derived chair collider (including its compound parts), or
 * the capsule would collide with the authored chair 0.15 m from the visible one.
 */
function applyDeclaredAdjustment(colliders, adjustment) {
  if (!adjustment?.applied) return colliders;
  const dz = Number(adjustment.delta?.z ?? 0);
  if (!Number.isFinite(dz) || dz === 0) return colliders;
  const shift = (box) => ({
    ...box,
    min: [box.min[0], box.min[1], Number((box.min[2] + dz).toFixed(4))],
    max: [box.max[0], box.max[1], Number((box.max[2] + dz).toFixed(4))],
  });
  return colliders.map((c) => (c.id === adjustment.node
    ? { ...shift(c), ...(c.parts ? { parts: c.parts.map(shift) } : {}) }
    : c));
}

function buildDoor(world, spec) {
  const rad = (d) => (d * Math.PI) / 180;
  return world.addDoor({
    id: spec.id,
    handle_node: spec.handle_node,
    replacesCollider: spec.replaces_collider,
    doorHalf: spec.doorHalf,
    doorCentre: spec.doorCentre,
    doorParts: spec.doorParts,
    fixedHalf: spec.fixedHalf,
    fixedCentre: spec.fixedCentre,
    fixedParts: spec.fixedParts,
    fixedCollision: spec.fixedCollision !== false,
    hingeLocalInDoor: spec.hingeLocalInDoor,
    hingeLocalInFixed: spec.hingeLocalInFixed,
    axis: spec.axis,
    limitRad: [rad(spec.limitDeg[0]), rad(spec.limitDeg[1])],
    massKg: spec.massKg,
    motorSpeedRad: rad(spec.motorSpeedDeg),
    motorImpulse: spec.motorImpulse,
  });
}

/**
 * The rendered leaf follows the AMMO body, never an animated target angle.
 *
 * Rollback mode (`?fridge=glb`) keeps the authored path: the GLB leaf/handle
 * are re-parented under a pivot at the measured hinge. Interaction mode
 * (`?fridge=glb` absent) hides the authored upper assembly and builds the
 * visible shell/frame/cavity + leaf/handle from the SAME resource as the Ammo
 * compound.
 */
function setupDoorVisual(root, door) {
  if (!root || !door) return null;
  if (state.fridgeMode === 'interaction') return setupInteractionDoorVisual(root, door);
  const spec = state.doorSpec;
  if (!spec?.leaf_node) return null;
  const leaf = root.getObjectByName(spec.leaf_node);
  const handle = spec.handle_node ? root.getObjectByName(spec.handle_node) : null;
  if (!leaf) throw new Error(`DOOR_VISUAL_MISSING:${spec.leaf_node}`);
  if (spec.handle_node && !handle) throw new Error(`DOOR_VISUAL_MISSING:${spec.handle_node}`);
  const pivot = new THREE.Group();
  pivot.name = `${door.id}-pivot`;
  const hinge = spec.hingeWorld ?? [spec.doorCentre[0] - spec.hingeLocalInDoor[0], spec.doorCentre[1] - spec.hingeLocalInDoor[1], spec.doorCentre[2] - spec.hingeLocalInDoor[2]];
  pivot.position.set(hinge[0], hinge[1], hinge[2]);
  root.add(pivot);
  pivot.attach(leaf);
  if (handle) pivot.attach(handle);
  const parentQ = new THREE.Quaternion();
  pivot.parent.getWorldQuaternion(parentQ);
  state.doorVisual = {
    pivot,
    leaf,
    handle,
    parentQ: parentQ.clone(),
    parentQInv: parentQ.clone().invert(),
    mode: 'glb',
  };
  syncDoorVisual();
  return state.doorVisual;
}

function setupInteractionDoorVisual(root, door) {
  const spec = state.fridgeInteraction;
  if (!spec) throw new Error('FRIDGE_INTERACTION_NOT_BUILT');
  state.authoredVisibility = hideAuthoredUpperAssembly(root);
  const visual = buildInteractionVisual(root, spec);
  state.fridgeInteractionVisual = visual;
  const parentQ = new THREE.Quaternion();
  visual.pivot.parent.getWorldQuaternion(parentQ);
  state.doorVisual = {
    pivot: visual.pivot,
    leaf: visual.leafGroup,
    handle: visual.handleMesh,
    parentQ: parentQ.clone(),
    parentQInv: parentQ.clone().invert(),
    mode: 'interaction',
  };
  syncDoorVisual();
  return state.doorVisual;
}

function syncDoorVisual() {
  const visual = state.doorVisual;
  if (!visual || !state.door) return;
  const pose = state.door.bodyPose();
  const q = new THREE.Quaternion(pose.rotation[0], pose.rotation[1], pose.rotation[2], pose.rotation[3]);
  visual.pivot.quaternion.copy(visual.parentQInv).multiply(q).multiply(visual.parentQ);
}

/**
 * The declared test obstacle. It is a real static body in the shared world placed
 * where the body actually walks; it is NOT an NPC action and it produces no
 * goal/plan/claim. Used to prove "blocked -> stop -> report" and "remove -> walk".
 */
let testBlockPlacement = null;
function blockPlacement() {
  if (!testBlockPlacement) {
    const spec = state.colliderCfg.blockers?.[0];
    if (!spec) throw new Error('碰撞资源没有测试挡块声明');
    testBlockPlacement = new TestBlockPlacement({
      size: spec.size_m,
      actor: () => ({ point: state.physics.character.position(), shape: state.physics.character.shape() }),
      colliders: () => state.controller.collidersAt(state.chair.pose()),
      physics: state.physics,
      nav: state.slice.world.navigation(state.slice.sceneId),
      publishColliders: (box) => {
        const colliders = state.controller.colliders.filter(c => c.id !== 'test-block');
        if (box) colliders.push(box);
        state.controller.colliders = colliders;
      },
    });
  }
  return testBlockPlacement;
}
function placeTestBlock(at) {
  if (!state.physics) return null;
  return blockPlacement().request(at);
}

function removeTestBlock() {
  if (!state.physics) return false;
  return blockPlacement().remove();
}

function toggleDoor() {
  if (!state.door) return null;
  const a = state.door.angleDeg();
  const action = a < -5 ? 'close' : 'open';
  state.door.setMotor(action === 'open' ? -1 : 1);
  syncDoorVisual();
  log('physics.door', `冰箱门${action === 'open' ? '打开' : '关闭'}（电机，真实铰链）`, { angleDeg: Number(a.toFixed(2)) });
  return { action, angleDeg: a };
}

/**
 * TEST PROBE, not an NPC action: does an actively driven leaf stop on the
 * standing capsule, and does the same leaf open when the body is outside the
 * swing? Stances are derived from the real resource (handle x, leaf front,
 * carcass front, measured capsule radius), not typed coordinates. The probe
 * restores the body and closes the door before returning.
 */
function probeDoorSweep() {
  if (!state.physics || !state.door) throw new Error('PHYSICS_NOT_READY');
  const view = state.slice.view();
  if (view.action) throw new Error(`PROBE_BUSY:${view.action.actionKey}`);
  const spec = state.doorSpec;
  const fridge = (state.entryColliders ?? state.colliderCfg.colliders).find((c) => c.id === 'furniture_fridge');
  const r = state.profile.standing.radiusM;
  const handleClosed = state.door.handleWorld();
  const leafFront = spec.doorCentre[2] - spec.doorHalf[2];
  const stances = {
    front: { x: Number(handleClosed.x.toFixed(4)), z: Number((leafFront - 0.25).toFixed(4)) },
    side: { x: Number((fridge.min[0] - r - 0.005).toFixed(4)), z: Number((fridge.min[2] - 0.25).toFixed(4)) },
  };
  const saved = state.physics.character.position();
  state.door.reset();
  state.door.setMotor(0);
  state.physics.character.place(stances.front);
  state.physics.update(FIXED_DT);
  const startPen = state.physics.character.penetrations();
  // Let the body sit idle long enough that Bullet WOULD have deactivated it
  // (measured ~2 s). The old capsule did deactivate and a driven leaf passed
  // through it; the fixed world keeps this obstacle awake.
  for (let i = 0; i < 180; i += 1) state.physics.update(FIXED_DT);
  const idlePen = state.physics.character.penetrations();
  state.door.setMotor(-1);
  let maxPen = 0;
  let sawNpcContact = false;
  let maxBodyContact = 0;
  for (let i = 0; i < 240; i += 1) {
    state.physics.update(FIXED_DT);
    for (const p of state.physics.character.penetrations()) maxPen = Math.max(maxPen, p.depthM);
    for (const c of state.physics.doorContacts(spec.id)) {
      if (c.id === 'npc' && c.depthM >= 0) sawNpcContact = true;
      if (c.id === 'furniture_fridge') maxBodyContact = Math.max(maxBodyContact, c.depthM);
    }
  }
  const blockedAngle = state.door.angleDeg();
  const after = state.physics.character.position();
  const movedM = Math.hypot(after.x - stances.front.x, after.z - stances.front.z);
  // Step out of the arc: the same motor must reach the declared limit.
  state.physics.character.place(stances.side);
  for (let i = 0; i < 240; i += 1) state.physics.update(FIXED_DT);
  const openAngle = state.door.angleDeg();
  const sidePen = state.physics.character.penetrations();
  // Restore.
  state.door.reset();
  state.door.setMotor(0);
  state.physics.character.place({ x: saved.x, z: saved.z });
  state.physics.update(FIXED_DT);
  syncDoorVisual();
  return {
    stances,
    startPenetrations: startPen,
    idlePenetrations: idlePen,
    blockedAngleDeg: Number(blockedAngle.toFixed(2)),
    openAngleDeg: Number(openAngle.toFixed(2)),
    limitDeg: spec.limitDeg,
    maxPenetrationM: Number(maxPen.toFixed(4)),
    maxBodyContactM: Number(maxBodyContact.toFixed(4)),
    sawNpcContact,
    characterMovedM: Number(movedM.toFixed(6)),
    sidePenetrations: sidePen,
    restored: { x: saved.x, z: saved.z },
  };
}

function resetPhysics() {
  if (!state.physics) return null;
  state.physics.reset();
  const home = state.slice.fit.home;
  state.slice.rig.setCarrier({ x: home.pos[0], y: 0, z: home.pos[2] }, Math.atan2(home.facing[0], home.facing[2]));
  state.physics.character.place({ x: home.pos[0], z: home.pos[2] });
  state.physEvents.blockedSteps = 0;
  state.physEvents.lastHit = null;
  log('physics.reset', '物理世界重置：角色回 home，门关闭，挡块恢复');
  return true;
}

/**
 * TEST PROBE, not an NPC action: it applies continuous desired displacements
 * through the SAME swept port the walker uses, with no goal, no plan and no
 * claim. It exists to answer "push the body into a wall/door for N seconds and
 * show it never crosses" in the real browser.
 */
function probePush(target, seconds) {
  if (!state.physics) throw new Error('物理世界未建立');
  if (!state.manual) throw new Error('PROBE_REQUIRES_MANUAL_STEPPING');
  const view = state.slice.view();
  if (view.action) throw new Error(`PROBE_BUSY:${view.action.actionKey}`);
  const steps = Math.max(1, Math.round(seconds / FIXED_DT));
  const rows = [];
  for (let i = 0; i < steps; i += 1) {
    const r = state.physics.character.moveTo({ x: target[0], z: target[1] }, FIXED_DT);
    if (r.requestedM > 0) {
      state.slice.rig.setCarrier(r.position, Math.atan2(target[0] - r.position.x, target[1] - r.position.z));
      state.slice.rig.walk(FIXED_DT * 1000, r.movedM / FIXED_DT);
      state.slice.rig.update(FIXED_DT * 1000);
    }
    state.physics.update(FIXED_DT);
    state.simTime += FIXED_DT;
    rows.push({
      i,
      x: Number(r.position.x.toFixed(4)),
      z: Number(r.position.z.toFixed(4)),
      moved: r.movedM,
      blocked: r.blocked,
      hit: r.hits[0]?.id ?? null,
    });
  }
  state.probe.rows = rows;
  return { rows: rows.length, from: rows[0], to: rows[rows.length - 1], blockedRows: rows.filter((x) => x.blocked).length };
}

function fetchJson(url) {
  return fetch(url, { cache: 'no-store' }).then((r) => {
    if (!r.ok) throw new Error(`载入失败 ${url} HTTP ${r.status}`);
    return r.json();
  });
}

function setupRenderer() {
  const canvas = document.getElementById('stage');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  state.renderer = renderer;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0d10);
  state.scene = scene;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.26;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(CAMERAS.lamp.fov, window.innerWidth / window.innerHeight, 0.04, 60);
  camera.position.fromArray(CAMERAS.lamp.position);
  state.camera = camera;

  const controls = new OrbitControls(camera, canvas);
  controls.target.fromArray(CAMERAS.lamp.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.5;
  controls.maxDistance = 9;
  controls.maxPolarAngle = Math.PI * 0.54;
  controls.update();
  state.controls = controls;

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  });
}

function setupLights() {
  const scene = state.scene;
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x27221d, 0.5));
  for (const p of [
    { pos: [4.35, 2.26, 2.4], intensity: 10, color: 0xfff1dd, distance: 5.2 },
    { pos: [1.6, 2.2, 3.95], intensity: 7, color: 0xffe8cc, distance: 4.2 },
    { pos: [4.92, 2.16, 3.7], intensity: 5, color: 0xfff2df, distance: 3.2 },
    { pos: [0.8, 2.22, 2.3], intensity: 3.5, color: 0xffe9d2, distance: 3.0 },
  ]) {
    const light = new THREE.PointLight(p.color, p.intensity, p.distance, 2);
    light.position.fromArray(p.pos);
    scene.add(light);
  }
}

/**
 * Resolve the switch from the LOADED GLB: the host node's real world transform
 * plus a check that the authored contact point lies on that node's bounds. The
 * contact itself is never recomputed from the arm or the camera.
 */
function makeSwitchSpec(root, cfg) {
  root.updateMatrixWorld(true);
  const host = root.getObjectByName(cfg.host_node);
  if (!host) throw new Error(`设备宿主节点不存在：${cfg.host_node}`);
  const position = new THREE.Vector3();
  host.getWorldPosition(position);
  const quaternion = new THREE.Quaternion();
  host.getWorldQuaternion(quaternion);
  const yawDeg = THREE.MathUtils.radToDeg(new THREE.Euler().setFromQuaternion(quaternion, 'YXZ').y);
  const declared = cfg.host_world;
  const drift = Math.hypot(position.x - declared[0], position.y - declared[1], position.z - declared[2]);
  if (drift > 0.01) throw new Error(`设备宿主位置与资源不符：${drift.toFixed(3)}m`);
  const contact = new THREE.Vector3().fromArray(cfg.contact_world);
  // The contact must lie on the VISIBLE surface, measured on the real
  // triangles — a bounding-box test only says "inside the box", which a point
  // floating in the middle of the puck also passes.
  const surface = closestOnMesh(host, contact);
  if (!surface) throw new Error(`设备宿主没有可测网格：${cfg.host_node}`);
  if (surface.distanceM > 0.005) throw new Error(`接触点不在宿主可见表面：${surface.distanceM.toFixed(3)}m`);
  if (Math.abs(surface.normal[1]) < 0.9) throw new Error(`接触点不在顶面：法线 y=${surface.normal[1].toFixed(2)}`);
  const semantics = cfg.switch_semantics;
  if (!semantics || semantics.kind !== 'touch-base') {
    throw new Error('设备未声明 switch_semantics.kind=touch-base：资产没有机械开关，必须声明触控底座');
  }
  if (!semantics.touch_region || !(semantics.touch_region.radius_m > 0)) {
    throw new Error('触控底座缺少可见触控区域声明（switch_semantics.touch_region.radius_m）');
  }
  return {
    id: cfg.id,
    name: cfg.name_zh,
    deviceId: cfg.device_resource,
    factKey: cfg.fact,
    hostNode: cfg.host_node,
    hostTransform: { position: [position.x, position.y, position.z], yawDeg },
    contactWorld: cfg.contact_world,
    contactWorldPoint: { x: cfg.contact_world[0], y: cfg.contact_world[1], z: cfg.contact_world[2] },
    normalWorld: cfg.contact_normal_world,
    facingYawDeg: cfg.facing_yaw_deg,
    side: cfg.reach_side,
    pitchRad: (cfg.pitch_deg * Math.PI) / 180,
    toleranceM: cfg.tolerance_m,
    holdMs: cfg.hold_ms,
    reachTimeoutMs: cfg.reach_timeout_ms,
    withdrawMs: cfg.withdraw_ms,
    posture: cfg.posture,
    switchSemantics: semantics,
    contactSurfaceAtLoad: surface,
    interactionId: `${cfg.id}-switch`,
  };
}

/**
 * Closest point on the visible triangles of a node (world space) plus the
 * signed offset along the face normal. `signedM < 0` means the query point is
 * INSIDE the surface (penetration); the distance alone cannot tell that apart
 * from a point hovering above it.
 */
function closestOnMesh(root, point) {
  root.updateMatrixWorld(true);
  let best = null;
  const a = new THREE.Vector3(); const b = new THREE.Vector3(); const c = new THREE.Vector3();
  const closest = new THREE.Vector3(); const ab = new THREE.Vector3(); const ac = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes?.position) return;
    const pos = o.geometry.attributes.position;
    const idx = o.geometry.index;
    const tri = new THREE.Triangle();
    const count = idx ? idx.count : pos.count;
    for (let i = 0; i < count; i += 3) {
      const i0 = idx ? idx.getX(i) : i;
      const i1 = idx ? idx.getX(i + 1) : i + 1;
      const i2 = idx ? idx.getX(i + 2) : i + 2;
      a.fromBufferAttribute(pos, i0).applyMatrix4(o.matrixWorld);
      b.fromBufferAttribute(pos, i1).applyMatrix4(o.matrixWorld);
      c.fromBufferAttribute(pos, i2).applyMatrix4(o.matrixWorld);
      tri.set(a, b, c);
      tri.closestPointToPoint(point, closest);
      const d = closest.distanceTo(point);
      if (!best || d < best.distanceM) {
        const n = ab.subVectors(b, a).cross(ac.subVectors(c, a)).normalize().clone();
        best = {
          distanceM: d,
          point: closest.clone(),
          normal: n,
          signedM: new THREE.Vector3().subVectors(point, closest).dot(n),
          mesh: o.name || o.parent?.name || '(unnamed)',
        };
      }
    }
  });
  if (!best) return null;
  return {
    distanceM: Number(best.distanceM.toFixed(4)),
    signedM: Number(best.signedM.toFixed(4)),
    normal: best.normal.toArray().map((v) => Number(v.toFixed(3))),
    point: best.point.toArray().map((v) => Number(v.toFixed(4))),
    mesh: best.mesh,
  };
}

/**
 * The declared touch region, drawn where the resource says it is: a flat ring
 * on the lamp base top. This is the visible, understandable affordance for a
 * lamp whose asset has NO mechanical switch — it marks the declared capacitive
 * pad; it does not move the contact point.
 */
function buildTouchRegion(spec) {
  const region = spec.switchSemantics.touch_region;
  const center = new THREE.Vector3().fromArray(region.center_world || spec.contactWorld);
  const normal = new THREE.Vector3().fromArray(region.normal_world || spec.normalWorld).normalize();
  const radius = region.radius_m;
  const color = new THREE.Color().fromArray(region.color || [0.35, 0.85, 1.0]);
  const group = new THREE.Group();
  group.name = 'npc-touch-region';
  const ringGeo = new THREE.RingGeometry(Math.max(0.01, radius * 0.86), radius, 48);
  const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  const discGeo = new THREE.CircleGeometry(radius * 0.86, 48);
  const discMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
  const disc = new THREE.Mesh(discGeo, discMat);
  for (const mesh of [ring, disc]) {
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    mesh.position.copy(center).addScaledVector(normal, 0.0015);
    group.add(mesh);
  }
  state.scene.add(group);
  const info = {
    kind: spec.switchSemantics.kind,
    declaration: spec.switchSemantics.declaration,
    center: center.toArray().map((v) => Number(v.toFixed(3))),
    normal: normal.toArray().map((v) => Number(v.toFixed(3))),
    radiusM: radius,
    visible: true,
    objects: [ring.name || 'ring', disc.name || 'disc'],
  };
  return { group, materials: [ringMat, discMat], info };
}

/**
 * Device bindings from the environment resource (emissive / point light / glow).
 * Per-instance material clones: the GLB shares one emissive material across all
 * diffusers, so mutating it would light the whole apartment.
 */
function bindDevice(scene, resource) {
  const rt = resource.runtime || {};
  const handles = [];
  const originals = new Map();
  const extra = [];
  const onMaterials = [];
  const getMesh = (name) => {
    const node = scene.getObjectByName(name);
    if (!node || !node.isMesh) throw new Error(`设备节点不存在或不是 mesh：${resource.id} → ${name}`);
    return node;
  };
  for (const binding of rt.bindings || []) {
    if (binding.type === 'emissive') {
      for (const name of binding.nodes) {
        const mesh = getMesh(name);
        const original = mesh.material;
        const on = original.clone();
        if (on.emissive && typeof on.emissive.set === 'function') {
          on.emissive = new THREE.Color().fromArray(binding.on_color);
          on.emissiveIntensity = binding.on_intensity;
        } else {
          on.color = new THREE.Color().fromArray(binding.on_color);
          on.toneMapped = false;
        }
        on.needsUpdate = true;
        originals.set(mesh, original);
        onMaterials.push(on);
        handles.push({ type: 'emissive', mesh, original, on });
      }
    } else if (binding.type === 'point-light') {
      const light = new THREE.PointLight(new THREE.Color().fromArray(binding.color), 0, binding.distance, binding.decay);
      light.position.fromArray(binding.position);
      scene.add(light);
      handles.push({ type: 'point-light', light, spec: binding });
    } else if (binding.type === 'glow') {
      const geometry = new THREE.SphereGeometry(Math.max(0.012, binding.radius || 0.012), 16, 12);
      const material = new THREE.MeshBasicMaterial({ color: new THREE.Color().fromArray(binding.color), toneMapped: false, transparent: true, opacity: 0.95 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.fromArray(binding.position);
      mesh.visible = false;
      scene.add(mesh);
      handles.push({ type: 'glow', mesh });
      extra.push(() => { scene.remove(mesh); geometry.dispose(); material.dispose(); });
    } else {
      throw new Error(`未知设备绑定类型：${binding.type}`);
    }
  }
  const apply = (on) => {
    for (const h of handles) {
      if (h.type === 'emissive') h.mesh.material = on ? h.on : h.original;
      else if (h.type === 'point-light') h.light.intensity = on ? h.spec.intensity : 0;
      else if (h.type === 'glow') h.mesh.visible = on;
    }
  };
  apply(false);
  const controller = new DeviceController({ id: resource.id, initial: false, apply });
  return { resource, controller, apply, handles, dispose() { for (const fn of extra) fn(); for (const [mesh, original] of originals) mesh.material = original; for (const m of onMaterials) m.dispose(); } };
}

function bindUI() {
  el['btn-on'].addEventListener('click', () => requestGoal('lampOn', 'ui'));
  el['btn-off'].addEventListener('click', () => requestGoal('lampOff', 'ui'));
  el['btn-cancel'].addEventListener('click', () => cancelAll('ui'));
  if (el['btn-seat']) el['btn-seat'].addEventListener('click', () => startChairChain('seatAndGoal'));
  if (el['btn-pull']) el['btn-pull'].addEventListener('click', () => startChairChain('pullOut'));
  if (el['btn-rotate']) el['btn-rotate'].addEventListener('click', () => startChairChain('rotate'));
  if (el['btn-seated-move']) el['btn-seated-move'].addEventListener('click', () => startChairChain('seatedMove'));
  if (el['btn-stand']) el['btn-stand'].addEventListener('click', () => startChairChain('stand'));
  if (el['btn-chair-reset']) el['btn-chair-reset'].addEventListener('click', () => resetChair());
  if (el['btn-fridge-open']) el['btn-fridge-open'].addEventListener('click', () => requestGoal('fridgeOpen', 'ui'));
  if (el['btn-fridge-occupy']) el['btn-fridge-occupy'].addEventListener('click', () => toggleFridgeOccupier());
  el['btn-audit'].addEventListener('click', () => {
    state.audit = state.slice.deviceAudit();
    log('audit', '能力查询', state.audit);
    updateAll(true);
  });
  el['btn-occupy'].addEventListener('click', () => toggleOccupier());
  el['btn-reset-cam'].addEventListener('click', () => setCamera('lamp', true));
  if (el['btn-block']) {
    el['btn-block'].addEventListener('click', () => {
      const p = state.slice.rig.carrier.pos;
      const yaw = state.slice.rig.carrier.yaw;
      placeTestBlock({ x: p.x + Math.sin(yaw) * 1.0, z: p.z + Math.cos(yaw) * 1.0 });
      updateAll(true);
    });
  }
  if (el['btn-unblock']) el['btn-unblock'].addEventListener('click', () => { removeTestBlock(); updateAll(true); });
  if (el['btn-door']) el['btn-door'].addEventListener('click', () => { toggleDoor(); updateAll(true); });
  if (el['btn-doorsweep']) {
    el['btn-doorsweep'].addEventListener('click', () => {
      try {
        const result = probeDoorSweep();
        log('physics.doorsweep', '门主动扫掠测试', result);
      } catch (error) {
        log('physics.doorsweep', `门扫掠测试失败：${error.message}`, { error: String(error) });
      }
      updateAll(true);
    });
  }
  if (el['btn-physreset']) el['btn-physreset'].addEventListener('click', () => { resetPhysics(); updateAll(true); });
  document.querySelectorAll('[data-cam]').forEach((button) => {
    button.addEventListener('click', () => setCamera(button.dataset.cam));
  });
}

function requestGoal(goal, source) {
  if (!state.slice || !state.ready) return null;
  const commandId = `page-${++state.cmd}`;
  state.slice.goalRequest(goal, commandId);
  log('goal.request', `${goal}`, { source, commandId, deviceState: state.device.controller.power });
  return commandId;
}

function cancelAll(source) {
  if (!state.slice) return;
  state.capabilities?.cancel();
  state.controller?.cancel();
  state.slice.cancel({ scope: 'work' });
  log('goal.cancel', '操作员取消', { source, chain: state.controller?.chain?.kind ?? null });
}

function startChairChain(kind) {
  if (!state.controller || !state.ready) return null;
  if (state.controller.chain && !['done', 'failed', 'cancelled'].includes(state.controller.chain.kind)) {
    log('chair.busy', `链路忙：${state.controller.chain.kind}/${state.controller.chain.phase}`, {});
    return { ok: false, reason: 'CHAIN_BUSY' };
  }
  let result;
  if (kind === 'seatAndGoal') result = state.capabilities.start('operate',{goal:'lampOn'});
  else if (kind === 'pullOut') result = state.controller.startPullOutOnly();
  else if (kind === 'rotate') result = state.controller.startRotate(Math.PI / 2);
  else if (kind === 'seatedMove') result = state.controller.startSeatedMove();
  else if (kind === 'stand') result = state.capabilities.start('stand');
  else result = { ok: false, reason: 'UNKNOWN_CHAIN' };
  log('chair.chain', `${kind} · ${result.ok ? '开始' : '拒绝'}`, result);
  updateAll(true);
  return result;
}

function resetChair() {
  if (!state.controller || !state.slice) return;
  state.controller.reset(state.chairInitial, state.slice.fit.home);
  syncChairVisual();
  state.slice.goalCancel();
  state.chairPose = { ...state.chairInitial };
  log('chair.reset', '座椅与身体复位', { pose: state.chairInitial });
  updateAll(true);
}

function toggleOccupier() {
  if (!state.slice) return null;
  if (state.occupier) {
    releaseOccupier();
    return null;
  }
  const actor = state.slice.world.bindActor({ actorId: 'npc-b', sceneId: state.slice.sceneId, radiusMeters: 0.2 });
  const requirement = { capability: 'switch', kind: 'generic' };
  const binding = actor.resolve(requirement);
  const availability = actor.check([binding]);
  if (!availability.ok) throw new Error(`占用失败：${availability.reason}`);
  const claim = actor.ensureClaim('test-occupier', [requirement]);
  state.occupier = { actor, claim };
  el['btn-occupy'].textContent = '释放开关占用';
  log('claim.occupier', '他人占用台灯开关', { claimId: claim.claimId, state: actor.claimState(claim.claimId) });
  return claim.claimId;
}

function releaseOccupier() {
  if (!state.occupier) return;
  const { actor, claim } = state.occupier;
  const released = actor.release(claim.claimId, claim.fence, 'cancelled');
  log('claim.occupier.release', '释放占用', { claimId: claim.claimId, released });
  state.occupier = null;
  el['btn-occupy'].textContent = '他人占用开关';
}

/**
 * Occupancy test for the SHARED DOOR resource. It uses a real second actor in
 * the same lease table (slice.occupyFridge), not a page flag.
 */
function toggleFridgeOccupier() {
  if (!state.slice) return null;
  if (state.fridgeOccupier) {
    const released = state.slice.releaseFridgeOccupier();
    state.fridgeOccupier = null;
    if (el['btn-fridge-occupy']) el['btn-fridge-occupy'].textContent = '他人占用冰箱门';
    log('claim.fridge.release', '释放冰箱门占用', { released });
    return null;
  }
  const result = state.slice.occupyFridge();
  state.fridgeOccupier = result.ok ? result : null;
  if (el['btn-fridge-occupy']) el['btn-fridge-occupy'].textContent = result.ok ? '释放冰箱门占用' : '他人占用冰箱门';
  log('claim.fridge.occupier', result.ok ? '他人占用冰箱门' : '占用失败', result);
  return result;
}

// ------------------------------------------------------------------ loop

function tick(now) {
  const dt = Math.min((now - state.lastNow) / 1000, 0.5);
  state.lastNow = now;
  try {
    if (!state.manual) simulate(dt);
    if (state.renderOn) render();
    state.fpsFrames += 1;
    const elapsed = (now - state.fpsAt) / 1000;
    if (elapsed >= 1) {
      state.fps = state.fpsFrames / elapsed;
      state.fpsFrames = 0;
      state.fpsAt = now;
      updateHud();
    }
  } catch (error) {
    fail(error);
    return;
  }
  requestAnimationFrame(tick);
}

function simulate(dt) {
  state.acc += dt;
  let steps = 0;
  while (state.acc >= FIXED_DT && steps < 20) {
    stepOnce();
    state.acc -= FIXED_DT;
    steps += 1;
  }
  if (steps >= 20) state.acc = 0;
}

let solvedContact = null;
let solvedStep = 0;
let holdCoreEvidence = false;
function coreEvidenceDependencies() {
  const action = state.slice?.view?.().action ?? null;
  const furniture = state.slice && state.chairResource
    ? state.slice.world.furniture(state.chairResource)
    : null;
  if (['sitOnDeskChair', 'standUp', 'typeAtKeyboard', 'thinkAtDesk', 'restAtDesk'].includes(action?.actionKey)) {
    return [
      ...(furniture ? [
        { kind: 'resource', id: state.chairResource, revision: furniture.poseRevision },
        { kind: 'host', id: 'furniture_chair', revision: furniture.hostRevision },
      ] : []),
    ];
  }
  return [];
}
function corePostPhysicsEvidence() {
  const dependencies = coreEvidenceDependencies();
  const stand = state.slice?.view().action?.actionKey === 'standUp'
    ? state.controller?.standContactEvidence?.() : null;
  return {
    simStep: solvedStep,
    outcome: stand?.outcome ?? 'confirmed',
    reason: stand?.reason ?? null,
    dependencies,
  };
}
function stepOnce() {
  if (!state.slice) return;
  const placement = testBlockPlacement?.flush();
  if (placement) log('physics.placement', placement.ok ? '挡块边界已同步' : '挡块拒绝', placement);
  // The chair chain runs BEFORE the body's runtime step: it may request a goal,
  // start walking, or command the furniture controller. Its physical result is
  // read back AFTER the one world step below.
  state.capabilities?.update(FIXED_DT);
  state.controller?.update(FIXED_DT);
  state.slice.update(FIXED_DT * 1000);
  const coreCandidate = state.slice.view().action;
  if (coreCandidate?.phase === 'awaiting-evidence') {
    log('core.awaiting', `${coreCandidate.actionKey} · awaiting-evidence`, {
      actionId: coreCandidate.actionId,
      attemptId: coreCandidate.attemptId,
      afterSimStep: solvedStep,
      observationKind: coreCandidate.evidenceKind,
    });
  }
  // EXACTLY ONE world step per simulation step, owned here (the adapter sweeps
  // but never steps: a door integrated twice per frame would drift).
  if (state.physics) state.physics.update(FIXED_DT);
  state.controller?.afterPhysics(FIXED_DT);
  solvedStep += 1;
  if (state.controller) state.controller.lastSolvedStep = solvedStep;
  // The display node and the resolver read the same published pose.
  try { syncChairVisual(); } catch (error) { fail(error); return; }
  syncDoorVisual();
  state.simTime += FIXED_DT;
  solvedContact = samplePostPhysicsContact({frame:state.slice.rig.frame(),seat:state.slice.seat,
    seated:state.slice.rig.seated,hipTarget:state.slice.rig.hipTarget ?? null,
    simStep:solvedStep,poseRevision:state.slice.seatPoseRevision()});
  const coreAction = state.slice.view().action;
  if (coreAction?.phase === 'awaiting-evidence' && !holdCoreEvidence) {
    const before = coreAction;
    const receipt = state.slice.observeAction();
    log('core.evidence', `${before.actionKey} · ${receipt.status}`, {
      actionId: before.actionId,
      attemptId: before.attemptId,
      simStep: solvedStep,
      observationKind: before.evidenceKind,
      receipt,
    });
    if (receipt.terminal?.outcome === 'success') {
      log('core.commit', `${before.actionKey} · effects committed`, {
        actionId: before.actionId,
        attemptId: before.attemptId,
        simStep: solvedStep,
        effects: receipt.terminal.effects,
      });
    }
  }
  track();
  if (state.record) recordStep();
}

/** One row per simulation step: the continuity evidence the test reads. */
function recordStep() {
  const rig = state.slice.rig;
  const view = state.slice.view();
  const t = rig.carrier.pos;
  const hips = typeof rig.hipsWorld === 'function' ? rig.hipsWorld() : null;
  state.steps.push({
    t: Number(state.simTime.toFixed(4)),
    dt: FIXED_DT,
    c: [Number(t.x.toFixed(6)), Number(t.z.toFixed(6))],
    yaw: Number(rig.carrier.yaw.toFixed(5)),
    hips: hips ? [Number(hips.x.toFixed(6)), Number(hips.y.toFixed(6)), Number(hips.z.toFixed(6))] : null,
    action: view.action?.actionKey ?? null,
    phase: view.action?.phase ?? null,
    transition: Boolean(rig.transitioning),
    seated: Boolean(rig.seated),
    chair: state.chair ? { pose: state.chair.pose(), ...state.chair.telemetry() } : null,
    physicsPosture: state.physics?.character.posture,
    navRevision: state.slice.world.navigation(state.slice.sceneId).revision,
    physicsPosition: state.physics?.character.position(),
    contactVersion: solvedContact ? {simStep:solvedContact.simStep,poseRevision:solvedContact.poseRevision} : null,
    dev: view.device?.telemetry?.phase ?? null,
    clip: typeof rig.baseTimeS === 'function' ? Number(rig.baseTimeS().toFixed(3)) : -1,
  });
  if (state.steps.length > 40000) state.steps.splice(0, state.steps.length - 40000);
}

/**
 * Aggregate the per-step trace into speed / acceleration / discontinuity
 * evidence. The bound is declared motion (m/s), never a hand-tuned distance:
 * a teleport is a step whose displacement exceeds speed*dt.
 */
function stepStats() {
  const rows = state.steps;
  const lim0 = state.slice.motionLimits ? state.slice.motionLimits() : null;
  const lim = lim0 ? { ...lim0, fixedDtS: FIXED_DT } : null;
  const maxSpeed = lim ? Math.max(lim.walkSpeedMps, lim.stepSpeedMps) : null;
  let maxStep = 0; let maxStepRow = null; let maxSpeedSeen = 0; let prevV = null;
  let maxAccel = 0; let maxAccelRow = null; let maxYawStep = 0; let maxYawRow = null;
  const violations = [];
  for (let i = 1; i < rows.length; i += 1) {
    const a = rows[i - 1]; const b = rows[i];
    const d = Math.hypot(b.c[0] - a.c[0], b.c[1] - a.c[1]);
    const dt = b.dt;
    const v = d / dt;
    if (d > maxStep) { maxStep = d; maxStepRow = b; }
    if (v > maxSpeedSeen) maxSpeedSeen = v;
    if (prevV != null) {
      const accel = Math.abs(v - prevV) / dt;
      if (accel > maxAccel) { maxAccel = accel; maxAccelRow = b; }
    }
    prevV = v;
    const dyaw = Math.abs(Math.atan2(Math.sin(b.yaw - a.yaw), Math.cos(b.yaw - a.yaw)));
    if (dyaw > maxYawStep) { maxYawStep = dyaw; maxYawRow = b; }
    // A step over the declared speed on a walking/step-in action is a snap.
    const translational = b.action === 'walkToDesk' || b.action === 'walkAway' || b.action === 'sitOnDeskChair';
    if (maxSpeed != null && translational && v > maxSpeed + 1e-3) {
      violations.push({ i, v: Number(v.toFixed(3)), action: b.action, phase: b.phase, transition: b.transition, d: Number(d.toFixed(4)), row: b });
    }
  }
  return {
    rows: rows.length,
    limits: lim,
    maxStepM: Number(maxStep.toFixed(4)),
    maxStepAt: maxStepRow,
    maxSpeedMps: Number(maxSpeedSeen.toFixed(3)),
    maxAccelMps2: Number(maxAccel.toFixed(2)),
    maxAccelAt: maxAccelRow,
    maxYawStepDeg: Number((maxYawStep * 180 / Math.PI).toFixed(2)),
    maxYawAt: maxYawRow,
    speedViolations: violations.slice(0, 8),
    nanRows: rows.filter((r) => !Number.isFinite(r.c[0]) || !Number.isFinite(r.c[1]) || (r.hips && !r.hips.every(Number.isFinite))).length,
  };
}

async function stepSim(seconds) {
  const steps = Math.max(1, Math.round(seconds / FIXED_DT));
  for (let i = 0; i < steps; i += 1) stepOnce();
  await state.slice.settle();
  updateAll(true);
}

function render() {
  const device = state.device;
  if (device) {
    // Keep the point light following nothing (it is authored in world space).
  }
  // The declared touch pad breathes while the lamp goal is being served, so a
  // viewer can see WHERE the lamp is switched on. It never moves the contact.
  if (state.touch) {
    const active = Boolean(state.slice?.view().action?.actionKey?.startsWith('pressLampSwitch'));
    const pulse = active ? 0.55 + 0.3 * Math.sin(state.simTime * 6) : 0.42;
    const [ringMat, discMat] = state.touch.materials;
    ringMat.opacity = pulse;
    discMat.opacity = active ? 0.24 : 0.14;
  }
  state.controls.update();
  state.renderer.render(state.scene, state.camera);
}

// ------------------------------------------------------------- observation

function track() {
  const view = state.slice.view();
  const prev = state.prev;

  // No-teleport and NaN invariants, sampled on the real body every step.
  const carrier = state.slice.rig.carrier.pos;
  if (Number.isFinite(carrier.x) && Number.isFinite(carrier.z)) {
    if (state.lastCarrier) {
      const step = Math.hypot(carrier.x - state.lastCarrier.x, carrier.z - state.lastCarrier.z);
      if (step > state.maxStepM) state.maxStepM = Number(step.toFixed(4));
    }
    state.lastCarrier = { x: carrier.x, z: carrier.z };
  } else {
    state.nanCount += 1;
  }
  const t0 = view.device?.telemetry;
  if (t0 && (Number.isNaN(t0.palmErrorM) || Number.isNaN(t0.contactMs))) state.nanCount += 1;

  if (view.goalId !== prev.goal) {
    log('goal', view.goalId ?? '—', { layer: view.goalLayer });
    prev.goal = view.goalId;
  }
  const planKey = view.plan ? `${view.plan.status}:${view.plan.actions.join('>')}` : 'none';
  if (planKey !== prev.planKey) {
    log('plan', view.plan ? `${view.plan.status} [${view.plan.actions.join(' → ')}]` : '—', {});
    prev.planKey = planKey;
  }
  const running = view.action && view.action.phase === 'running' ? `${view.action.actionKey}` : null;
  if (running && running !== prev.actionRunning) log('action.start', running, { phase: view.action.phase });
  if (!running && prev.actionRunning) log('action.end', prev.actionRunning, { next: view.action?.phase ?? null });
  prev.actionRunning = running;

  if (view.failures.length > prev.failures) {
    const last = view.failures[view.failures.length - 1];
    log('failure', `${last.kind}: ${last.reason ?? ''}`, last);
    prev.failures = view.failures.length;
  }

  const device = view.device;
  if (device) {
    // Telemetry first: contact < device change < withdrawal are the physical
    // order; the claim is released by cleanup AFTER the motion completes.
    const t = device.telemetry;
    if (t) {
      if (t.contactAtSimMs !== null && t.contactAtSimMs !== prev.contactAt) {
        log('contact', '手掌接触成立', { palmErrorM: t.palmErrorM, contactMs: t.contactMs, adapterSimMs: t.contactAtSimMs });
        prev.contactAt = t.contactAtSimMs;
      }
      if (t.changedAtSimMs !== null && t.changedAtSimMs !== prev.changedAt) {
        log('device.change', '设备状态改变', { applyReason: t.applyReason, adapterSimMs: t.changedAtSimMs });
        prev.changedAt = t.changedAtSimMs;
      }
      if (t.releasedAtSimMs !== null && t.releasedAtSimMs !== prev.releasedAt) {
        log('withdraw', '手已撤离，动作完成', { adapterSimMs: t.releasedAtSimMs });
        prev.releasedAt = t.releasedAtSimMs;
      }
    }
    if (device.claim !== prev.claim) {
      log(device.claim ? 'claim.acquire' : 'claim.release', device.claim ?? '—', { state: device.claimState });
      prev.claim = device.claim;
    }
    if (device.claimState !== prev.claimState) prev.claimState = device.claimState;
    if (device.state !== prev.deviceState) {
      log('device.state', device.state ? 'on' : 'off', { source: 'sample' });
      prev.deviceState = device.state;
    }
    const feedback = device.feedback || [];
    if (feedback.length !== prev.feedbackCount) {
      const last = feedback[feedback.length - 1];
      if (last) log('device.feedback', `核心收到设备反馈 ${last.on ? 'on' : 'off'}`, { source: last.source, atWallMs: last.atWallMs });
      prev.feedbackCount = feedback.length;
    }
  }
}

function log(kind, message, detail = null) {
  const entry = { at: Number(state.simTime.toFixed(3)), kind, message, detail };
  state.events.push(entry);
  if (state.events.length > 200) state.events.splice(0, state.events.length - 200);
  renderEvents();
}

function renderEvents() {
  const list = el['event-list'];
  list.innerHTML = '';
  for (const entry of state.events.slice(-10).reverse()) {
    const li = document.createElement('li');
    if (/contact|device\.change|withdraw|device\.state/.test(entry.kind)) li.className = 'hot';
    if (/failure|error/.test(entry.kind)) li.className = 'bad';
    const t = document.createElement('span');
    t.className = 't';
    t.textContent = `${entry.at.toFixed(2)}s`;
    const k = document.createElement('span');
    k.className = 'k';
    k.textContent = `${entry.kind} · ${entry.message}`;
    li.append(t, k);
    list.append(li);
  }
  el['event-count'].textContent = String(state.events.length);
}

// --------------------------------------------------------------------- HUD

function updateAll(force = false) {
  updateHud();
  updateDevicePanel();
  if (force) renderEvents();
}

function updateHud() {
  if (!state.slice) return;
  const view = state.slice.view();
  const device = view.device;
  el['chip-goal'].textContent = `goal ${view.goalId ?? '—'}`;
  el['chip-plan'].textContent = view.plan ? `plan ${view.plan.status} · ${view.plan.actions.length}` : 'plan —';
  el['chip-plan'].className = `chip ${view.plan?.status === 'ok' ? 'ok' : view.plan?.status === 'failed' ? 'bad' : ''}`;
  el['chip-action'].textContent = `action ${view.action ? `${view.action.actionKey}/${view.action.phase}` : '—'}`;
  el['chip-action'].className = `chip ${view.action?.phase === 'running' ? 'ok' : ''}`;
  const claim = view.claim ? `${view.claimState}` : device?.claim ? `${device.claimState}` : '—';
  el['chip-claim'].textContent = `claim ${claim}`;
  el['chip-claim'].className = `chip ${view.claimState === 'occupied' || device?.claimState === 'occupied' ? 'ok' : view.claimState === 'reserved' || device?.claimState === 'reserved' ? 'warn' : ''}`;
  el['chip-fps'].textContent = `fps ${state.fps.toFixed(1)}`;
  el['chip-fps'].className = `chip ${state.fps < 4 ? 'bad' : ''}`;
  if (el['chip-phys'] && state.physics) {
    const ps = state.physics.stats();
    el['chip-phys'].textContent = `phys 1 world · ${ps.statics} box · ${ps.posture}`;
    el['chip-phys'].className = `chip ${state.physEvents.blockedSteps > 0 ? 'warn' : 'ok'}`;
  }

  const devState = device?.state;
  el['device-state'].textContent = device ? (devState ? '灯：开（真实 emissive + 点光）' : '灯：关') : '设备未绑定';
  el['device-state'].className = `statebox ${devState ? 'on' : 'off'}`;
  const t = device?.telemetry;
  const kv = [
    ['概念 goal', view.goalId ?? '—'],
    ['计划', view.plan ? view.plan.actions.join(' → ') || '(已满足)' : '—'],
    ['动作', view.action ? `${view.action.actionKey} · ${view.action.phase}${view.action.reason ? ' · ' + view.action.reason : ''}` : '—'],
    ['claim', device?.claim ? `${device.claim} · ${device.claimState}` : '—'],
    ['device bound', device ? String(device.bound) : '—'],
    ['device state', device ? (device.state ? 'on' : 'off') : '—'],
    ['接触点', state.switchSpec ? `${state.switchSpec.contactWorldPoint.x.toFixed(3)}, ${state.switchSpec.contactWorldPoint.y.toFixed(3)}, ${state.switchSpec.contactWorldPoint.z.toFixed(3)}` : '—'],
    ['容差', device ? `${device.toleranceM} m` : '—'],
    ['手掌误差', t?.palmErrorM != null ? `${(t.palmErrorM * 1000).toFixed(1)} mm` : '—'],
    ['按压阶段', t?.phase ?? '—'],
    ['接触/变更/撤手', t ? `${t.contactAtSimMs ?? '—'} / ${t.changedAtSimMs ?? '—'} / ${t.releasedAtSimMs ?? '—'}` : '—'],
    ['短差', t?.shortfallM != null ? `${(t.shortfallM * 1000).toFixed(1)} mm` : '—'],
    ['触控区域', state.touch ? `${state.touch.info.kind} ⌀${(state.touch.info.radiusM * 2000).toFixed(0)} mm（模型无机械开关）` : '—'],
    ['掌心→可见面', state.surface ? `${(state.surface.distanceM * 1000).toFixed(1)} mm${state.surface.inside ? '（穿透）' : ''}` : '—'],
  ];
  el['device-kv'].innerHTML = kv.map(([k, v]) => `<b>${escapeHtml(k)}</b><span>${escapeHtml(String(v))}</span>`).join('');

  if (el['chair-kv'] && state.controller) {
    const ctrl = state.controller;
    const fv = state.slice.world.furniture(state.chairResource);
    const pose = fv.pose;
    const seat = state.slice.seat;
    const chain = ctrl.chain;
    const entry = ctrl.entryCache;
    const motion = state.slice.seatedMotionTelemetry?.() ?? null;
    const node = state.loaded?.root?.getObjectByName('furniture_chair');
    const visualErr = node
      ? Math.hypot(node.position.x - pose.x, node.position.y - pose.y, node.position.z - pose.z)
      : null;
    const ckv = [
      ['椅 pose', `x ${pose.x.toFixed(3)} · y ${pose.y.toFixed(3)} · z ${pose.z.toFixed(3)} · yaw ${(pose.yaw * 180 / Math.PI).toFixed(1)}°`],
      ['poseRevision / host', `${fv.poseRevision} / ${fv.hostRevision}`],
      ['座面槽位', `x ${seat.seat.x.toFixed(3)} · y ${seat.seatY.toFixed(3)} · z ${seat.seat.z.toFixed(3)} · rev ${state.slice.seatPoseRevision()}`],
      ['显示↔解算', visualErr == null ? '—' : `${(visualErr * 1000).toFixed(2)} mm`],
      ['租约', `${fv.occupant ? `占座 ${fv.occupant}` : '空椅'} · 阶段 ${fv.phase} · ${fv.stopped ? '已停稳' : '运动中'}`],
      ['body claim', view.claim ? `${view.claim} · ${view.claimState}` : '—'],
      ['能力链', chain ? `${chain.kind} / ${chain.phase}` : '—'],
      ['入口候选', entry?.ok ? `后退 ${entry.setbackM} m · start (${entry.start.x.toFixed(3)}, ${entry.start.z.toFixed(3)}) · 路线 ${entry.pathLengthM.toFixed(2)} m` : '—'],
      ['坐姿移动', motion ? `${motion.distanceM.toFixed(3)} m · 脚滑 ${motion.footSlideM.toFixed(3)} m · ${motion.mode}` : '—'],
      ['上次失败', ctrl.lastError ?? '—'],
      ['座椅入口判定', (() => { const a = seatEntryNow(); return a ? `${a.verdict}${a.frontal.deficitM > 0 ? ` · 缺口 ${a.frontal.deficitM.toFixed(3)} m` : ''}` : '—'; })()],
      ['手臂可达（台灯）', (() => {
        if (!state.device) return '—';
        const m = state.switchSpec ? state.slice.rig.measurePointReach?.(state.switchSpec.contactWorldPoint, state.switchSpec.side) ?? null : null;
        return m ? `距离 ${m.distanceM} / 可达 ${m.reachM} / 差 ${m.shortfallM} m` : '—';
      })()],
    ];
    el['chair-kv'].innerHTML = ckv.map(([k, v]) => `<b>${escapeHtml(k)}</b><span>${escapeHtml(String(v))}</span>`).join('');
  }

  if (el['fridge-kv']) {
    const fr = view.fridge;
    const fa = fr?.action;
    const ft = fr?.telemetry;
    const fkv = [
      ['绑定', fr ? (fr.bound ? '已绑定（实测站位 / 实际门体）' : '未绑定') : '—'],
      ['站位', fr?.target ? `x ${fr.target.approach.x.toFixed(3)} · z ${fr.target.approach.z.toFixed(3)} · yaw ${fr.target.approach.yaw.toFixed(3)}` : '—'],
      ['手 / 开角', fr?.target ? `${fr.target.side} 手 · 最小 ${fr.target.minOpenDeg}° / 目标 ${fr.target.targetOpenDeg}°` : '—'],
      ['实际门角', fr?.angleDeg != null ? `${fr.angleDeg}°` : '—'],
      ['claim', fr?.claim ? `${fr.claim} · ${fr.claimState}` : '—'],
      ['阶段', fa?.phase ?? '—'],
      ['掌心→把手面', fa?.palmErrorM != null ? `${(fa.palmErrorM * 1000).toFixed(1)} mm · signed ${fa.signedM} m` : '—'],
      ['手叶/手身', fa ? `叶 ${fa.leafSignedM} m · 机身 ${fa.staticSignedM} m ${fa.staticName ?? ''}` : '—'],
      ['接触/抓握/电机', fa ? `${fa.contactAtSimMs ?? '—'} / ${fa.graspedAtSimMs ?? '—'} / ${fa.motorStartedAtSimMs ?? '—'} → ${fa.motorStoppedAtSimMs ?? '—'} ms` : '—'],
      ['停角 / 余动', fa ? `${fa.angleAtStopDeg ?? '—'}° / ${fa.driftDeg ?? '—'}°` : '—'],
      ['电机实际', ft ? `sign ${ft.motorSign} · ${ft.angleDeg}°` : '—'],
    ];
    el['fridge-kv'].innerHTML = fkv.map(([k, v]) => `<b>${escapeHtml(k)}</b><span>${escapeHtml(String(v))}</span>`).join('');
  }

  if (el['physics-kv'] && state.physics && state.profile) {
    const ps = state.physics.stats();
    const prof = state.profile;
    const lm = state.physEvents.lastMove;
    const pen = state.physics.character.penetrations();
    const phys = [
      ['世界', `Ammo 2.82 · 1 个 btDiscreteDynamicsWorld · 步 ${ps.updates} 次`],
      ['静态碰撞', `${ps.statics} 个盒（GLB 节点 AABB 导出）${ps.replacedStatics.length ? ` · 门体替换 ${ps.replacedStatics.join(',')}` : ''}`],
      ['冰箱上层', state.fridgeMode === 'interaction' && state.fridgeInteraction
        ? `运行时交互替换 · 壳/框/内腔 · 铰链 ${state.fridgeInteraction.after.hingeWorld.map((v) => v.toFixed(3)).join(',')} · 闭合缝 ${(state.fridgeInteraction.assumptions.closed_gap_m * 1000).toFixed(0)} mm（?fridge=glb 回退）`
        : '原 GLB 实心体 + 原铰链（回退模式 ?fridge=glb）'],
      ['动态', `门 ${ps.doors}（真实铰链，电机 ${state.door ? state.door.angleDeg().toFixed(1) + '°' : '—'}） · 挡块 ${ps.blockers}`],
      ['胶囊', `站立 r ${prof.standing.radiusM.toFixed(3)} m × H ${prof.standing.totalHeightM.toFixed(3)} m（VRM 实测 + 声明近似）`],
      ['坐姿代理', `r ${prof.seated.radiusM.toFixed(3)} m · y ${prof.seated.bottomY.toFixed(3)}–${prof.seated.topY.toFixed(3)} m（仅排除支撑面；靠背/扶手仍阻挡）`],
      ['姿态', `${ps.posture} · 扫掠 ${ps.sweeps} 次`],
      ['最近位移', lm ? `请求 ${(lm.requestedM * 1000).toFixed(1)} mm · 实际 ${(lm.movedM * 1000).toFixed(1)} mm${lm.blocked ? ` · 受阻 ${lm.hit}` : ''}` : '—'],
      ['穿插检查', pen.length ? pen.map((p) => `${p.id} ${(p.depthM * 1000).toFixed(1)} mm`).join(' | ') : '无（非座椅几何）'],
      ['受阻步', `${state.physEvents.blockedSteps}${state.physEvents.lastHit ? ' · 最近 ' + state.physEvents.lastHit : ''}`],
      ['座椅入口', (() => {
        const a = seatEntryNow();
        if (!a) return '—';
        return `${a.verdict}${a.frontal.deficitM > 0 ? ` · 缺口 ${a.frontal.deficitM.toFixed(3)} m` : ''}${a.clipEntry.blockers[0] ? ` · ${a.clipEntry.blockers[0].node}` : ''}`;
      })()],
    ];
    el['physics-kv'].innerHTML = phys.map(([k, v], i) => `<b>${escapeHtml(k)}</b><span class="${i === 8 && pen.length ? 'bad' : ''}">${escapeHtml(String(v))}</span>`).join('');
  }

  if (state.audit) {
    const a = state.audit;
    const standing = a.standing;
    const seated = a.seated;
    const lines = [
      ['最近可站点', a.nearest ? `(${a.nearest.x.toFixed(2)}, ${a.nearest.z.toFixed(2)}) 水平 ${a.nearest.distanceXZ.toFixed(2)} m` : '—'],
      ['站立', standing ? `${standing.distanceM.toFixed(3)} m / 臂展 ${standing.reachM.toFixed(3)} m ${(standing.reachable ?? standing.shortfallM === 0) ? '→ 可达' : '→ 不可达'}` : '—'],
      ['坐下', seated ? `${seated.distanceM.toFixed(3)} m / 臂展 ${seated.reachM.toFixed(3)} m ${(seated.reachable ?? seated.shortfallM === 0) ? '→ 可达' : '→ 不可达'}` : '—'],
      ['结论', standing && standing.reachable === false ? '站立拒绝（不移动接触点），改由座椅姿态操作' : '按计划执行'],
      ['触控语义', state.touch ? `${state.touch.info.kind}：${state.touch.info.declaration}` : '—'],
    ];
    el['audit-kv'].innerHTML = lines.map(([k, v], i) => `<b>${k}</b><span class="${i === 1 && standing && standing.shortfallM > 0 ? 'bad' : i === 2 && seated && seated.shortfallM === 0 ? 'ok' : ''}">${escapeHtml(v)}</span>`).join('');
  } else {
    el['audit-kv'].textContent = '—';
  }

  const facts = view.facts || {};
  const blocked = view.goalLayer === 'task' && !view.plan ? (window.__envnpc?.blockedBy?.() ?? null) : null;
  const contactLines = [
    ['lampOn', String(facts.lampOn ?? '—')],
    ['atDesk', String(facts.atDesk ?? '—')],
    ['sitting', String(facts.sitting ?? '—')],
    ['hand claim', device?.claim ?? '—'],
    ['失败', view.failures.length ? view.failures.slice(-2).map((f) => `${f.kind}: ${f.reason ?? ''}`).join(' | ') : '—'],
    ['设备反馈', (device?.feedback || []).slice(-2).map((f) => `${f.on ? 'on' : 'off'}@${f.source}`).join(' | ') || '—'],
    ['被占用', blocked && !blocked.ok ? `${blocked.reason ?? 'SLOT_BUSY'}${blocked.holder ? ' · ' + blocked.holder : ''}` : '—'],
  ];
  el['facts-kv'].innerHTML = contactLines.map(([k, v], i) => `<b>${k}</b><span class="${i === 4 && view.failures.length ? 'bad' : ''}">${escapeHtml(v)}</span>`).join('');
  el['contact-kv'].innerHTML = [
    ['手掌误差', t?.palmErrorM != null ? `${(t.palmErrorM * 1000).toFixed(1)} mm / 容差 ${((device?.toleranceM ?? 0) * 1000).toFixed(0)} mm` : '—'],
    ['接触时长', t ? `${t.contactMs.toFixed(0)} ms` : '—'],
    ['动作阶段', t?.phase ?? '—'],
    ['arm IK', device?.reach ? `weight ${device.reach.weight}${device.reach.withdrawing ? '（撤手）' : ''}` : '—'],
  ].map(([k, v]) => `<b>${k}</b><span>${escapeHtml(v)}</span>`).join('');
}

function updateDevicePanel() {}

function setCamera(name, instant = false) {
  const preset = CAMERAS[name];
  if (!preset) return;
  state.camera.position.fromArray(preset.position);
  state.controls.target.fromArray(preset.target);
  state.camera.fov = preset.fov;
  state.camera.updateProjectionMatrix();
  state.controls.update();
  document.querySelectorAll('[data-cam]').forEach((b) => b.classList.toggle('active', b.dataset.cam === name));
  if (!instant) log('camera', name);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fail(error) {
  console.error(error);
  state.error = String(error?.stack || error?.message || error);
  state.errors.push(state.error);
  if (el.err) {
    el.err.hidden = false;
    el.err.textContent = `载入/运行失败\n\n${error?.message || error}\n\n资产/节点/接触点不匹配会明确报错，不会回退坐标或伪造接触。`;
  }
  if (el.loading) el.loading.classList.add('hidden');
  if (window.__envnpc) window.__envnpc.error = state.error;
}

// -------------------------------------------------------------------- hooks

/**
 * Measured distance from the visible palm to the visible lamp surface, and the
 * signed side of that surface. The declared contact tolerance is NOT evidence
 * that the hand touched anything: this is.
 */
function surfaceNow() {
  const spec = state.switchSpec;
  if (!spec || !state.slice) return null;
  const host = state.scene.getObjectByName(spec.hostNode);
  const palm = state.slice.rig.palmPoint?.(spec.side) ?? null;
  if (!host || !palm) return null;
  const p = new THREE.Vector3(palm.x, palm.y, palm.z);
  const s = closestOnMesh(host, p);
  if (!s) return null;
  state.surface = {
    ...s,
    palm: [palm.x, palm.y, palm.z].map((v) => Number(v.toFixed(4))),
    contactWorld: spec.contactWorld,
    toleranceM: spec.toleranceM,
    inside: s.signedM < 0,
  };
  return state.surface;
}

function exposeHooks() {
  window.__errors = state.errors;
  window.__envnpc = {
    ready: true,
    capability: () => state.capabilities.view(),
    error: null,
    state: () => ({
      ready: state.ready,
      simTime: Number(state.simTime.toFixed(3)),
      fps: state.fps,
      manual: state.manual,
      maxStepM: state.maxStepM,
      nanCount: state.nanCount,
      view: state.slice.view(),
      audit: state.audit,
      devices: {
        id: state.device.resource.id,
        power: state.device.controller.power,
        changes: state.device.controller.snapshot().changes,
      },
      errors: state.errors,
    }),
    audit: () => state.slice.deviceAudit(),
    trace: () => state.events.map((e) => ({ ...e })),
    snapshot: () => state.slice.snapshotState(),
    arm: () => (typeof state.slice.rig.debug === 'function' ? state.slice.rig.debug() : null),
    step: (seconds) => stepSim(seconds),
    setManual: (on) => { state.manual = Boolean(on); },
    setRender: (on) => { state.renderOn = Boolean(on); },
    request: (goal) => requestGoal(goal, 'hook'),
    cancel: () => cancelAll('hook'),
    occupy: () => toggleOccupier(),
    releaseOccupier: () => releaseOccupier(),
    setCamera,
    // --- NE2 standing fridge grasp ----------------------------------------
    fridge: {
      spec: () => state.fridgeGrasp,
      target: () => state.fridgeTarget,
      bound: () => state.fridgeBound,
      view: () => state.slice?.view().fridge ?? null,
      telemetry: () => state.slice?.view().fridge?.action ?? null,
      claimEvents: () => (state.slice?.claiming ? state.slice.claiming.log.slice(-48) : []),
      bind: () => bindFridgeGrasp(),
      occupy: () => toggleFridgeOccupier(),
      releaseOccupier: () => { const r = state.slice?.releaseFridgeOccupier(); state.fridgeOccupier = null; return r; },
      door: () => (state.door ? {
        id: state.door.id,
        angleDeg: Number(state.door.angleDeg().toFixed(3)),
        motorSign: state.door.motorSign,
        pose: state.door.bodyPose(),
        handle: state.door.handleWorld(),
      } : null),
      palm: () => (state.slice && state.fridgeTarget
        ? (state.slice.rig.palmPoint?.(state.fridgeTarget.side) ?? null)
        : null),
      reach: () => (state.slice ? {
        debug: state.slice.rig.deviceReachDebug?.() ?? null,
        arm: state.fridgeTarget ? state.slice.rig.armPose?.(state.fridgeTarget.side) ?? null : null,
      } : null),
      distance: (palm) => (state.slice?.view().fridge?.bound && state.fridgeTarget && palm
        ? (() => {
            const interaction = state.fridgeInteraction;
            const pose = state.door.bodyPose();
            return {
              handle: handleSurfaceDistance(interaction, pose, palm),
              leaf: leafSurfaceDistance(interaction, pose, palm),
              statics: staticClearance(interaction, palm),
            };
          })()
        : null),
    },
    // --- acceptance instrumentation (no behaviour change) ------------------
    recordSteps: (on) => { state.record = Boolean(on); if (on) state.steps.length = 0; return state.record; },
    stepStats,
    stepLog: () => state.steps.slice(),
    postPhysicsContact: () => solvedContact,
    h0Evidence: () => corePostPhysicsEvidence(),
    h0HoldEvidence: (on = true) => { holdCoreEvidence = Boolean(on); return holdCoreEvidence; },
    h0ObserveNow: () => state.slice?.observeAction?.() ?? null,
    h0MoveSupportBeforeObserve: (deltaZ = 0.12) => {
      if (!state.chair || !state.controller) return { ok: false, reason: 'CHAIR_UNAVAILABLE' };
      const action = state.slice.view().action;
      if (action?.phase !== 'awaiting-evidence') return { ok: false, reason: 'CORE_NOT_AWAITING', action };
      const pose = state.chair.pose();
      state.chair.setTarget({ x: pose.x, z: pose.z + Number(deltaZ), yaw: pose.yaw });
      for (let step = 0; step < 90; step += 1) {
        state.physics.update(FIXED_DT);
        state.controller.afterPhysics(FIXED_DT);
        solvedStep += 1;
        if (state.controller) state.controller.lastSolvedStep = solvedStep;
        syncChairVisual();
        solvedContact = samplePostPhysicsContact({frame:state.slice.rig.frame(),seat:state.slice.seat,
          seated:state.slice.rig.seated,hipTarget:state.slice.rig.hipTarget ?? null,
          simStep:solvedStep,poseRevision:state.slice.seatPoseRevision()});
        if (Math.abs(state.chair.pose().z - pose.z) >= Math.abs(Number(deltaZ)) * 0.5) break;
      }
      state.chair.clearTarget();
      state.chair.brake();
      return { ok: true, action, pose: state.chair.pose(), evidence: corePostPhysicsEvidence() };
    },
    motionLimits: () => ({ ...(state.slice.motionLimits ? state.slice.motionLimits() : {}), fixedDtS: FIXED_DT }),
    touch: () => state.touch?.info ?? null,
    surfaceNow,
    contactSurfaceAtLoad: () => state.switchSpec?.contactSurfaceAtLoad ?? null,
    armPose: (side) => (typeof state.slice.rig.armPose === 'function' ? state.slice.rig.armPose(side ?? state.switchSpec?.side ?? 'left') : null),
    /** Sustained-animation probe: base clip time + wrist/hips, one row per step. */
    animProbe: () => {
      const rig = state.slice.rig;
      return {
        clip: typeof rig.baseTimeS === 'function' ? Number(rig.baseTimeS().toFixed(4)) : null,
        hand: rig.armPose ? rig.armPose(state.switchSpec?.side ?? 'left')?.hand ?? null : null,
        hips: typeof rig.hipsWorld === 'function' ? rig.hipsWorld() : null,
        seated: Boolean(rig.seated),
        transitioning: Boolean(rig.transitioning),
      };
    },
    animDebug: () => {
      const rig = state.slice.rig;
      const base = rig.base ?? null;
      const baked = [...(rig.bakedActions?.keys?.() ?? [])];
      return {
        mode: rig.debug ? rig.debug().mode : null,
        hasWalkBaked: baked.includes('npc_walk'),
        baked,
        baseClip: base?._clip?.name ?? null,
        baseTime: base ? Number(base.time.toFixed(4)) : null,
        baseWeight: base ? Number(base.getEffectiveWeight().toFixed(3)) : null,
        basePaused: base ? Boolean(base.paused) : null,
        baseRunning: base ? Boolean(base.isRunning()) : null,
        baseEnabled: base ? Boolean(base.enabled) : null,
        mixerTime: rig.mixer ? Number(rig.mixer.time.toFixed(4)) : null,
      };
    },
    /** Why the actor cannot use a slot right now (claim conflict visibility). */
    blockedBy: () => {
      if (!state.slice) return null;
      try {
        const binding = state.slice.actor.resolve({ capability: 'switch', kind: 'generic' });
        const availability = state.slice.actor.check([binding]);
        return { ok: Boolean(availability.ok), reason: availability.reason ?? null, holder: availability.holder ?? null };
      } catch (error) {
        return { ok: false, reason: String(error?.message ?? error), holder: null };
      }
    },
    /**
     * The runtime's own refusal for a standing appliance reach. It throws before
     * touching any state, so this is a real behavioural check.
     */
    lampStandingProbe: () => {
      const target = state.slice.snapshotState()?.device?.target;
      if (!target || !state.physics) return null;
      const candidates = [];
      for (let x = target.contact.x - 0.65; x <= target.contact.x + 0.65; x += 0.05) {
        for (let z = target.contact.z - 0.65; z <= target.contact.z + 0.65; z += 0.05) {
          const pos = { x, y: 0, z };
          if (standingBlockers(state.profile, state.entryColliders ?? [], pos).length) continue;
          const yaw = Math.atan2(target.contact.x - x, target.contact.z - z);
          const reach = state.slice.rig.measurePointReach(target.contact, target.side, { standpoint: {x,z,yaw} });
          candidates.push({x,z,yaw,...reach});
        }
      }
      return { target, candidates: candidates.sort((a,b)=>a.shortfallM-b.shortfallM).slice(0,5) };
    },
    tryStandingReach: () => {
      const target = state.slice.snapshotState()?.device?.target;
      if (!target) return { refused: true, message: 'NO_DEVICE_TARGET' };
      try {
        state.slice.rig.reachDevice({ ...target, seated: false });
        return { refused: false, message: 'reach accepted' };
      } catch (error) {
        return { refused: true, message: String(error?.message ?? error) };
      }
    },
    // --- C1-C3 movable seat: the real controller, its pose authority and trace
    chair: {
      resource: () => state.chairResource,
      controller: () => state.controller,
      chain: () => (state.controller ? { ...state.controller.chain } : null),
      trace: () => (state.controller ? state.controller.events.map((e) => ({ ...e })) : []),
      entry: () => state.controller?.entryCache ?? null,
      debugEntry: () => { try { return state.controller?.debugEntry() ?? null; } catch (e) { return { error: String(e?.message ?? e) }; } },
      lastError: () => state.controller?.lastError ?? null,
      handle: () => { try { return state.controller?.handleTarget() ?? null; } catch (e) { return { error: String(e?.message ?? e) }; } },
      pose: () => state.slice?.world.furniture(state.chairResource) ?? null,
      start: (kind) => startChairChain(kind),
      cancel: () => (state.controller ? state.controller.cancel() : false),
      reset: () => resetChair(),
      seated: () => Boolean(state.slice?.rig?.seated),
      seat: () => state.slice?.seat ?? null,
      seatedMotion: () => state.slice?.seatedMotionTelemetry?.() ?? null,
      nodes: () => {
        const host = state.scene?.getObjectByName('furniture_chair');
        if (!host) return null;
        host.updateMatrixWorld(true);
        const out = [];
        host.traverse((o) => {
          if (!o.isMesh) return;
          const b = new THREE.Box3().setFromObject(o);
          out.push({ name: o.name, min: b.min.toArray().map((v) => +v.toFixed(3)), max: b.max.toArray().map((v) => +v.toFixed(3)) });
        });
        return out;
      },
    },
    keyframe: (label) => ({
      label,
      simTime: Number(state.simTime.toFixed(3)),
      view: state.slice.view(),
      snapshot: state.slice.snapshotState(),
      audit: state.slice.deviceAudit(),
    }),
    metrics: () => {
      const gl = state.renderer.getContext();
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        gl: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        triangles: state.renderer.info.render.triangles,
        calls: state.renderer.info.render.calls,
        fps: state.fps,
      };
    },
    renderNow: () => { render(); },
    // --- NE-P physics: the shared world, its measured proxies and the guard ---
    phys: {
      stats: () => state.physics?.stats() ?? null,
      colliders: () => state.physics?.statics() ?? [],
      profile: () => state.profile,
      character: () => {
        if (!state.physics) return null;
        const c = state.physics.character;
        return { posture: c.posture, position: c.position(), shape: c.shape(), penetrations: c.penetrations() };
      },
      door: () => (state.door ? { id: state.door.id, angleDeg: Number(state.door.angleDeg().toFixed(3)), pose: state.door.bodyPose(), handle: state.door.handleWorld() } : null),
      doorOpen: () => { if (state.door) state.door.setMotor(-1); return state.door?.angleDeg() ?? null; },
      doorClose: () => { if (state.door) state.door.setMotor(1); return state.door?.angleDeg() ?? null; },
      /** Test/evidence brake: hold the current angle (motor target 0). */
      doorStop: () => { if (state.door) state.door.setMotor(0); return state.door?.angleDeg() ?? null; },
      doorSweep: () => probeDoorSweep(),
      fridgeReach: () => {
        const spec = state.doorSpec;
        if (!spec) return null;
        const handle = handleWorldAt(spec, 0);
        const probe = state.slice.rig.measurePointReach?.(handle, 'left', { standpoint: { x: 2.55, z: 3.3, yaw: 0 } });
        const armReachM = probe?.reachM ?? 0.491;
        const a = analyzeFridgeDoor({
          profile: state.profile,
          colliders: state.entryColliders,
          spec,
          armReachM,
          metrics: state.profile.measured,
          home: state.slice.fit.home.pos,
        });
        if (a.best) {
          const exact = state.slice.rig.measurePointReach?.(handle, a.best.side, {
            standpoint: { x: a.best.x, z: a.best.z, yaw: a.best.yaw },
          });
          a.rig = exact ?? null;
        }
        return a;
      },
      doorVisual: () => {
        const v = state.doorVisual;
        if (!v) return null;
        const leaf = new THREE.Vector3();
        v.leaf.getWorldPosition(leaf);
        const handle = v.handle ? new THREE.Vector3() : null;
        if (handle) v.handle.getWorldPosition(handle);
        return {
          leaf: leaf.toArray().map((n) => Number(n.toFixed(4))),
          handle: handle ? handle.toArray().map((n) => Number(n.toFixed(4))) : null,
          pivot: v.pivot.position.toArray().map((n) => Number(n.toFixed(4))),
          quaternion: v.pivot.quaternion.toArray().map((n) => Number(n.toFixed(5))),
          mode: v.mode ?? null,
        };
      },
      fridgeMode: () => state.fridgeMode,
      fridgeInteraction: () => (state.fridgeInteraction ? {
        ...interactionSummary(state.fridgeInteraction),
        before: state.fridgeInteraction.before,
        after: state.fridgeInteraction.after,
        changes: state.fridgeInteraction.changes,
        assumptions: state.fridgeInteraction.assumptions,
        aperture: state.fridgeInteraction.aperture,
        cavity: state.fridgeInteraction.cavity,
        authoredVisibility: (state.authoredVisibility ?? []).map((rec) => ({
          ...rec,
          visibleNow: state.loaded?.root?.getObjectByName(rec.name)?.visible ?? null,
        })),
        visualStaticMeshes: state.fridgeInteractionVisual?.staticMeshes.map((m) => m.name) ?? [],
        visualBoxes: state.fridgeInteractionVisual ? meshWorldBoxes(state.fridgeInteractionVisual.staticMeshes) : [],
        colliderParts: state.fridgeInteraction.collider.parts.map((p) => ({ node: p.node, min: p.min, max: p.max, run_source: p.run_source })),
      } : null),
      /**
       * Sweep the ACTUAL rendered door meshes against the ACTUAL rendered
       * shell/frame/cavity meshes. Not the collider proxy.
       */
      interactionAudit: (stepDeg = 0.25) => {
        if (!state.fridgeInteractionVisual) return null;
        return auditInteractionVisual(state.fridgeInteractionVisual, { stepDeg });
      },
      navigation: () => ({ revision: state.slice.world.navigation(state.slice.sceneId).revision,
        block: state.slice.world.navigation(state.slice.sceneId).obstacle('test-block'),
        placement: testBlockPlacement?.snapshot() ?? null }),
      placeBlock: (at) => placeTestBlock(at),
      removeBlock: () => removeTestBlock(),
      /**
       * Test/evidence instrumentation only: put the rig and its world body at a
       * given floor point. Used to keep the NPC out of a side-view keyframe; it
       * is not an NPC action and creates no goal/plan/claim.
       */
      placeCharacter: ({ x, z, yaw = 0 }) => {
        if (!state.physics) return null;
        state.physics.character.place({ x, z });
        state.slice.rig.setCarrier({ x, y: 0, z }, yaw);
        state.physics.update(FIXED_DT);
        const p = state.physics.character.position();
        return { x: Number(p.x.toFixed(4)), z: Number(p.z.toFixed(4)) };
      },
      probe: (target, seconds) => probePush(target, seconds),
      reset: () => resetPhysics(),
      events: () => ({ ...state.physEvents }),
      /** Live seat-entry geometry (read-only; same module as the Node tests). */
      seatEntry: () => seatEntryNow(),
      /** Live transition deformation + support/backrest split (restores the body). */
      transitionProbe: () => transitionProbe(),
      /** Declared chair-setback experiment: analysis + route + reach cost. */
      seatStaged: (setbackM = 0.35) => seatStagedNow(setbackM),
      /** Route existence to a standable side point at the operating position. */
      seatSideRoute: (side = 'left') => {
        const a = seatEntryNow();
        const p = a?.sides?.[side]?.point;
        if (!p || !state.profile || !state.entryColliders) return null;
        return findStandingRoute(state.profile, state.entryColliders, state.slice.seat.approach.pos, p, { stepM: 0.03 });
      },
      /** The single world instance (identity check: never two worlds). */
      worldId: () => (state.physics ? 1 : 0),
    },
  };
  window.__stepSim = (seconds) => stepSim(seconds);
}
