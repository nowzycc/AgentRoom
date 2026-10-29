// packages/npc-three/src/browser.ts
import * as THREE39 from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// stage/node_modules/@pixiv/three-vrm/lib/three-vrm.module.js
import * as THREE from "three";
import * as THREE4 from "three";
import * as THREE2 from "three";
import * as THREE3 from "three";
import * as THREE5 from "three";
import * as THREE6 from "three";
import * as THREE7 from "three";
import * as THREE8 from "three";
import * as THREE11 from "three";
import * as THREE9 from "three";
import * as THREE10 from "three";
import * as THREE13 from "three";
import * as THREE12 from "three";
import * as THREE14 from "three";
import * as THREE15 from "three";
import * as THREE16 from "three";
import * as THREE52 from "three";
import * as THREE22 from "three";
import * as THREE17 from "three";
import * as THREE42 from "three";
import * as THREE32 from "three";
import * as THREE18 from "three";
import * as THREE19 from "three";
import * as THREE33 from "three";
import * as THREE23 from "three";
import * as THREE43 from "three";
import * as THREE53 from "three";
import * as THREE72 from "three";
import * as THREE20 from "three";
import * as THREE24 from "three";
import * as THREE34 from "three";
import * as THREE44 from "three";
import * as THREE54 from "three";
import * as THREE62 from "three";
import * as THREE92 from "three";
import * as THREE82 from "three";
import * as THREE102 from "three";
import * as THREE132 from "three";
import * as THREE122 from "three";
import * as THREE112 from "three";
import * as THREE142 from "three";
import * as THREE21 from "three";
import * as THREE27 from "three";
import * as THREE25 from "three";
import * as THREE26 from "three";
import * as THREE28 from "three";
import * as THREE29 from "three";
import { BufferAttribute as BufferAttribute9 } from "three";
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected2 = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected2);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
var __async2 = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected2 = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected2);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
var VRMExpression = class extends THREE.Object3D {
  constructor(expressionName) {
    super();
    this.weight = 0;
    this.isBinary = false;
    this.overrideBlink = "none";
    this.overrideLookAt = "none";
    this.overrideMouth = "none";
    this._binds = [];
    this.name = `VRMExpression_${expressionName}`;
    this.expressionName = expressionName;
    this.type = "VRMExpression";
    this.visible = false;
  }
  /**
   * Binds that this expression influences.
   */
  get binds() {
    return this._binds;
  }
  /**
   * A value represents how much it should override blink expressions.
   * `0.0` == no override at all, `1.0` == completely block the expressions.
   */
  get overrideBlinkAmount() {
    if (this.overrideBlink === "block") {
      return 0 < this.outputWeight ? 1 : 0;
    } else if (this.overrideBlink === "blend") {
      return this.outputWeight;
    } else {
      return 0;
    }
  }
  /**
   * A value represents how much it should override lookAt expressions.
   * `0.0` == no override at all, `1.0` == completely block the expressions.
   */
  get overrideLookAtAmount() {
    if (this.overrideLookAt === "block") {
      return 0 < this.outputWeight ? 1 : 0;
    } else if (this.overrideLookAt === "blend") {
      return this.outputWeight;
    } else {
      return 0;
    }
  }
  /**
   * A value represents how much it should override mouth expressions.
   * `0.0` == no override at all, `1.0` == completely block the expressions.
   */
  get overrideMouthAmount() {
    if (this.overrideMouth === "block") {
      return 0 < this.outputWeight ? 1 : 0;
    } else if (this.overrideMouth === "blend") {
      return this.outputWeight;
    } else {
      return 0;
    }
  }
  /**
   * An output weight of this expression, considering the {@link isBinary}.
   */
  get outputWeight() {
    if (this.isBinary) {
      return this.weight > 0.5 ? 1 : 0;
    }
    return this.weight;
  }
  /**
   * Add an expression bind to the expression.
   *
   * @param bind A bind to add
   */
  addBind(bind) {
    this._binds.push(bind);
  }
  /**
   * Delete an expression bind from the expression.
   *
   * @param bind A bind to delete
   */
  deleteBind(bind) {
    const index = this._binds.indexOf(bind);
    if (index >= 0) {
      this._binds.splice(index, 1);
    }
  }
  /**
   * Apply weight to every assigned blend shapes.
   * Should be called every frame.
   */
  applyWeight(options) {
    var _a2;
    let actualWeight = this.outputWeight;
    actualWeight *= (_a2 = options == null ? void 0 : options.multiplier) != null ? _a2 : 1;
    if (this.isBinary && actualWeight < 1) {
      actualWeight = 0;
    }
    this._binds.forEach((bind) => bind.applyWeight(actualWeight));
  }
  /**
   * Clear previously assigned blend shapes.
   */
  clearAppliedWeight() {
    this._binds.forEach((bind) => bind.clearAppliedWeight());
  }
};
function extractPrimitivesInternal(gltf, nodeIndex, node) {
  var _a2, _b2;
  const json = gltf.parser.json;
  const schemaNode = (_a2 = json.nodes) == null ? void 0 : _a2[nodeIndex];
  if (schemaNode == null) {
    console.warn(`extractPrimitivesInternal: Attempt to use nodes[${nodeIndex}] of glTF but the node doesn't exist`);
    return null;
  }
  const meshIndex = schemaNode.mesh;
  if (meshIndex == null) {
    return null;
  }
  const schemaMesh = (_b2 = json.meshes) == null ? void 0 : _b2[meshIndex];
  if (schemaMesh == null) {
    console.warn(`extractPrimitivesInternal: Attempt to use meshes[${meshIndex}] of glTF but the mesh doesn't exist`);
    return null;
  }
  const primitiveCount = schemaMesh.primitives.length;
  const primitives = [];
  node.traverse((object) => {
    if (primitives.length < primitiveCount) {
      if (object.isMesh) {
        primitives.push(object);
      }
    }
  });
  return primitives;
}
function gltfExtractPrimitivesFromNode(gltf, nodeIndex) {
  return __async2(this, null, function* () {
    const node = yield gltf.parser.getDependency("node", nodeIndex);
    return extractPrimitivesInternal(gltf, nodeIndex, node);
  });
}
function gltfExtractPrimitivesFromNodes(gltf) {
  return __async2(this, null, function* () {
    const nodes = yield gltf.parser.getDependencies("node");
    const map = /* @__PURE__ */ new Map();
    nodes.forEach((node, index) => {
      const result = extractPrimitivesInternal(gltf, index, node);
      if (result != null) {
        map.set(index, result);
      }
    });
    return map;
  });
}
var VRMExpressionPresetName = {
  Aa: "aa",
  Ih: "ih",
  Ou: "ou",
  Ee: "ee",
  Oh: "oh",
  Blink: "blink",
  Happy: "happy",
  Angry: "angry",
  Sad: "sad",
  Relaxed: "relaxed",
  LookUp: "lookUp",
  Surprised: "surprised",
  LookDown: "lookDown",
  LookLeft: "lookLeft",
  LookRight: "lookRight",
  BlinkLeft: "blinkLeft",
  BlinkRight: "blinkRight",
  Neutral: "neutral"
};
function saturate(value) {
  return Math.max(Math.min(value, 1), 0);
}
var VRMExpressionManager = class _VRMExpressionManager {
  /**
   * Create a new {@link VRMExpressionManager}.
   */
  constructor() {
    this.blinkExpressionNames = ["blink", "blinkLeft", "blinkRight"];
    this.lookAtExpressionNames = ["lookLeft", "lookRight", "lookUp", "lookDown"];
    this.mouthExpressionNames = ["aa", "ee", "ih", "oh", "ou"];
    this._expressions = [];
    this._expressionMap = {};
  }
  get expressions() {
    return this._expressions.concat();
  }
  get expressionMap() {
    return Object.assign({}, this._expressionMap);
  }
  /**
   * A map from name to expression, but excluding custom expressions.
   */
  get presetExpressionMap() {
    const result = {};
    const presetNameSet = new Set(Object.values(VRMExpressionPresetName));
    Object.entries(this._expressionMap).forEach(([name, expression]) => {
      if (presetNameSet.has(name)) {
        result[name] = expression;
      }
    });
    return result;
  }
  /**
   * A map from name to expression, but excluding preset expressions.
   */
  get customExpressionMap() {
    const result = {};
    const presetNameSet = new Set(Object.values(VRMExpressionPresetName));
    Object.entries(this._expressionMap).forEach(([name, expression]) => {
      if (!presetNameSet.has(name)) {
        result[name] = expression;
      }
    });
    return result;
  }
  /**
   * Copy the given {@link VRMExpressionManager} into this one.
   * @param source The {@link VRMExpressionManager} you want to copy
   * @returns this
   */
  copy(source) {
    const expressions = this._expressions.concat();
    expressions.forEach((expression) => {
      this.unregisterExpression(expression);
    });
    source._expressions.forEach((expression) => {
      this.registerExpression(expression);
    });
    this.blinkExpressionNames = source.blinkExpressionNames.concat();
    this.lookAtExpressionNames = source.lookAtExpressionNames.concat();
    this.mouthExpressionNames = source.mouthExpressionNames.concat();
    return this;
  }
  /**
   * Returns a clone of this {@link VRMExpressionManager}.
   * @returns Copied {@link VRMExpressionManager}
   */
  clone() {
    return new _VRMExpressionManager().copy(this);
  }
  /**
   * Return a registered expression.
   * If it cannot find an expression, it will return `null` instead.
   *
   * @param name Name or preset name of the expression
   */
  getExpression(name) {
    var _a2;
    return (_a2 = this._expressionMap[name]) != null ? _a2 : null;
  }
  /**
   * Register an expression.
   *
   * @param expression {@link VRMExpression} that describes the expression
   */
  registerExpression(expression) {
    this._expressions.push(expression);
    this._expressionMap[expression.expressionName] = expression;
  }
  /**
   * Unregister an expression.
   *
   * @param expression The expression you want to unregister
   */
  unregisterExpression(expression) {
    const index = this._expressions.indexOf(expression);
    if (index === -1) {
      console.warn("VRMExpressionManager: The specified expressions is not registered");
    }
    this._expressions.splice(index, 1);
    delete this._expressionMap[expression.expressionName];
  }
  /**
   * Get the current weight of the specified expression.
   * If it doesn't have an expression of given name, it will return `null` instead.
   *
   * @param name Name of the expression
   */
  getValue(name) {
    var _a2;
    const expression = this.getExpression(name);
    return (_a2 = expression == null ? void 0 : expression.weight) != null ? _a2 : null;
  }
  /**
   * Set a weight to the specified expression.
   *
   * @param name Name of the expression
   * @param weight Weight
   */
  setValue(name, weight) {
    const expression = this.getExpression(name);
    if (expression) {
      expression.weight = saturate(weight);
    }
  }
  /**
   * Reset weights of all expressions to `0.0`.
   */
  resetValues() {
    this._expressions.forEach((expression) => {
      expression.weight = 0;
    });
  }
  /**
   * Get a track name of specified expression.
   * This track name is needed to manipulate its expression via keyframe animations.
   *
   * @example Manipulate an expression using keyframe animation
   * ```js
   * const trackName = vrm.expressionManager.getExpressionTrackName( 'blink' );
   * const track = new THREE.NumberKeyframeTrack(
   *   name,
   *   [ 0.0, 0.5, 1.0 ], // times
   *   [ 0.0, 1.0, 0.0 ] // values
   * );
   *
   * const clip = new THREE.AnimationClip(
   *   'blink', // name
   *   1.0, // duration
   *   [ track ] // tracks
   * );
   *
   * const mixer = new THREE.AnimationMixer( vrm.scene );
   * const action = mixer.clipAction( clip );
   * action.play();
   * ```
   *
   * @param name Name of the expression
   */
  getExpressionTrackName(name) {
    const expression = this.getExpression(name);
    return expression ? `${expression.name}.weight` : null;
  }
  /**
   * Update every expressions.
   */
  update() {
    const weightMultipliers = this._calculateWeightMultipliers();
    this._expressions.forEach((expression) => {
      expression.clearAppliedWeight();
    });
    this._expressions.forEach((expression) => {
      let multiplier = 1;
      const name = expression.expressionName;
      if (this.blinkExpressionNames.indexOf(name) !== -1) {
        multiplier *= weightMultipliers.blink;
      }
      if (this.lookAtExpressionNames.indexOf(name) !== -1) {
        multiplier *= weightMultipliers.lookAt;
      }
      if (this.mouthExpressionNames.indexOf(name) !== -1) {
        multiplier *= weightMultipliers.mouth;
      }
      expression.applyWeight({ multiplier });
    });
  }
  /**
   * Calculate sum of override amounts to see how much we should multiply weights of certain expressions.
   */
  _calculateWeightMultipliers() {
    let blink = 1;
    let lookAt = 1;
    let mouth = 1;
    this._expressions.forEach((expression) => {
      blink -= expression.overrideBlinkAmount;
      lookAt -= expression.overrideLookAtAmount;
      mouth -= expression.overrideMouthAmount;
    });
    blink = Math.max(0, blink);
    lookAt = Math.max(0, lookAt);
    mouth = Math.max(0, mouth);
    return { blink, lookAt, mouth };
  }
};
var VRMExpressionMaterialColorType = {
  Color: "color",
  EmissionColor: "emissionColor",
  ShadeColor: "shadeColor",
  MatcapColor: "matcapColor",
  RimColor: "rimColor",
  OutlineColor: "outlineColor"
};
var v0ExpressionMaterialColorMap = {
  _Color: VRMExpressionMaterialColorType.Color,
  _EmissionColor: VRMExpressionMaterialColorType.EmissionColor,
  _ShadeColor: VRMExpressionMaterialColorType.ShadeColor,
  _RimColor: VRMExpressionMaterialColorType.RimColor,
  _OutlineColor: VRMExpressionMaterialColorType.OutlineColor
};
var _color = new THREE2.Color();
var _VRMExpressionMaterialColorBind = class _VRMExpressionMaterialColorBind2 {
  constructor({
    material,
    type,
    targetValue,
    targetAlpha
  }) {
    this.material = material;
    this.type = type;
    this.targetValue = targetValue;
    this.targetAlpha = targetAlpha != null ? targetAlpha : 1;
    const color = this._initColorBindState();
    const alpha = this._initAlphaBindState();
    this._state = { color, alpha };
  }
  applyWeight(weight) {
    const { color, alpha } = this._state;
    if (color != null) {
      const { propertyName, deltaValue } = color;
      const target = this.material[propertyName];
      if (target != void 0) {
        target.add(_color.copy(deltaValue).multiplyScalar(weight));
      }
    }
    if (alpha != null) {
      const { propertyName, deltaValue } = alpha;
      const target = this.material[propertyName];
      if (target != void 0) {
        this.material[propertyName] += deltaValue * weight;
      }
    }
  }
  clearAppliedWeight() {
    const { color, alpha } = this._state;
    if (color != null) {
      const { propertyName, initialValue } = color;
      const target = this.material[propertyName];
      if (target != void 0) {
        target.copy(initialValue);
      }
    }
    if (alpha != null) {
      const { propertyName, initialValue } = alpha;
      const target = this.material[propertyName];
      if (target != void 0) {
        this.material[propertyName] = initialValue;
      }
    }
  }
  _initColorBindState() {
    var _a2, _b2, _c;
    const { material, type, targetValue } = this;
    const propertyNameMap = this._getPropertyNameMap();
    const propertyName = (_b2 = (_a2 = propertyNameMap == null ? void 0 : propertyNameMap[type]) == null ? void 0 : _a2[0]) != null ? _b2 : null;
    if (propertyName == null) {
      console.warn(
        `Tried to add a material color bind to the material ${(_c = material.name) != null ? _c : "(no name)"}, the type ${type} but the material or the type is not supported.`
      );
      return null;
    }
    const target = material[propertyName];
    const initialValue = target.clone();
    const deltaValue = new THREE2.Color(
      targetValue.r - initialValue.r,
      targetValue.g - initialValue.g,
      targetValue.b - initialValue.b
    );
    return { propertyName, initialValue, deltaValue };
  }
  _initAlphaBindState() {
    var _a2, _b2, _c;
    const { material, type, targetAlpha } = this;
    const propertyNameMap = this._getPropertyNameMap();
    const propertyName = (_b2 = (_a2 = propertyNameMap == null ? void 0 : propertyNameMap[type]) == null ? void 0 : _a2[1]) != null ? _b2 : null;
    if (propertyName == null && targetAlpha !== 1) {
      console.warn(
        `Tried to add a material alpha bind to the material ${(_c = material.name) != null ? _c : "(no name)"}, the type ${type} but the material or the type does not support alpha.`
      );
      return null;
    }
    if (propertyName == null) {
      return null;
    }
    const initialValue = material[propertyName];
    const deltaValue = targetAlpha - initialValue;
    return { propertyName, initialValue, deltaValue };
  }
  _getPropertyNameMap() {
    var _a2, _b2;
    return (_b2 = (_a2 = Object.entries(_VRMExpressionMaterialColorBind2._propertyNameMapMap).find(([distinguisher]) => {
      return this.material[distinguisher] === true;
    })) == null ? void 0 : _a2[1]) != null ? _b2 : null;
  }
};
_VRMExpressionMaterialColorBind._propertyNameMapMap = {
  isMeshStandardMaterial: {
    color: ["color", "opacity"],
    emissionColor: ["emissive", null]
  },
  isMeshBasicMaterial: {
    color: ["color", "opacity"]
  },
  isMToonMaterial: {
    color: ["color", "opacity"],
    emissionColor: ["emissive", null],
    outlineColor: ["outlineColorFactor", null],
    matcapColor: ["matcapFactor", null],
    rimColor: ["parametricRimColorFactor", null],
    shadeColor: ["shadeColorFactor", null]
  }
};
var VRMExpressionMaterialColorBind = _VRMExpressionMaterialColorBind;
var VRMExpressionMorphTargetBind = class {
  constructor({
    primitives,
    index,
    weight
  }) {
    this.primitives = primitives;
    this.index = index;
    this.weight = weight;
  }
  applyWeight(weight) {
    this.primitives.forEach((mesh) => {
      var _a2;
      if (((_a2 = mesh.morphTargetInfluences) == null ? void 0 : _a2[this.index]) != null) {
        mesh.morphTargetInfluences[this.index] += this.weight * weight;
      }
    });
  }
  clearAppliedWeight() {
    this.primitives.forEach((mesh) => {
      var _a2;
      if (((_a2 = mesh.morphTargetInfluences) == null ? void 0 : _a2[this.index]) != null) {
        mesh.morphTargetInfluences[this.index] = 0;
      }
    });
  }
};
var _v2 = new THREE3.Vector2();
var _VRMExpressionTextureTransformBind = class _VRMExpressionTextureTransformBind2 {
  constructor({
    material,
    scale,
    offset
  }) {
    var _a2, _b2;
    this.material = material;
    this.scale = scale;
    this.offset = offset;
    const propertyNames = (_a2 = Object.entries(_VRMExpressionTextureTransformBind2._propertyNamesMap).find(
      ([distinguisher]) => {
        return material[distinguisher] === true;
      }
    )) == null ? void 0 : _a2[1];
    if (propertyNames == null) {
      console.warn(
        `Tried to add a texture transform bind to the material ${(_b2 = material.name) != null ? _b2 : "(no name)"} but the material is not supported.`
      );
      this._properties = [];
    } else {
      this._properties = [];
      propertyNames.forEach((propertyName) => {
        var _a22;
        const texture = (_a22 = material[propertyName]) == null ? void 0 : _a22.clone();
        if (!texture) {
          return null;
        }
        material[propertyName] = texture;
        const initialOffset = texture.offset.clone();
        const initialScale = texture.repeat.clone();
        const deltaOffset = offset.clone().sub(initialOffset);
        const deltaScale = scale.clone().sub(initialScale);
        this._properties.push({
          name: propertyName,
          initialOffset,
          deltaOffset,
          initialScale,
          deltaScale
        });
      });
    }
  }
  applyWeight(weight) {
    this._properties.forEach((property) => {
      const target = this.material[property.name];
      if (target === void 0) {
        return;
      }
      target.offset.add(_v2.copy(property.deltaOffset).multiplyScalar(weight));
      target.repeat.add(_v2.copy(property.deltaScale).multiplyScalar(weight));
    });
  }
  clearAppliedWeight() {
    this._properties.forEach((property) => {
      const target = this.material[property.name];
      if (target === void 0) {
        return;
      }
      target.offset.copy(property.initialOffset);
      target.repeat.copy(property.initialScale);
    });
  }
};
_VRMExpressionTextureTransformBind._propertyNamesMap = {
  isMeshStandardMaterial: [
    "map",
    "emissiveMap",
    "bumpMap",
    "normalMap",
    "displacementMap",
    "roughnessMap",
    "metalnessMap",
    "alphaMap"
  ],
  isMeshBasicMaterial: ["map", "specularMap", "alphaMap"],
  isMToonMaterial: [
    "map",
    "normalMap",
    "emissiveMap",
    "shadeMultiplyTexture",
    "rimMultiplyTexture",
    "outlineWidthMultiplyTexture",
    "uvAnimationMaskTexture"
  ]
};
var VRMExpressionTextureTransformBind = _VRMExpressionTextureTransformBind;
var POSSIBLE_SPEC_VERSIONS = /* @__PURE__ */ new Set(["1.0", "1.0-beta"]);
var _VRMExpressionLoaderPlugin = class _VRMExpressionLoaderPlugin2 {
  get name() {
    return "VRMExpressionLoaderPlugin";
  }
  constructor(parser) {
    this.parser = parser;
  }
  afterRoot(gltf) {
    return __async2(this, null, function* () {
      gltf.userData.vrmExpressionManager = yield this._import(gltf);
    });
  }
  /**
   * Import a {@link VRMExpressionManager} from a VRM.
   *
   * @param gltf A parsed result of GLTF taken from GLTFLoader
   */
  _import(gltf) {
    return __async2(this, null, function* () {
      const v1Result = yield this._v1Import(gltf);
      if (v1Result) {
        return v1Result;
      }
      const v0Result = yield this._v0Import(gltf);
      if (v0Result) {
        return v0Result;
      }
      return null;
    });
  }
  _v1Import(gltf) {
    return __async2(this, null, function* () {
      var _a2, _b2;
      const json = this.parser.json;
      const isVRMUsed = ((_a2 = json.extensionsUsed) == null ? void 0 : _a2.indexOf("VRMC_vrm")) !== -1;
      if (!isVRMUsed) {
        return null;
      }
      const extension = (_b2 = json.extensions) == null ? void 0 : _b2["VRMC_vrm"];
      if (!extension) {
        return null;
      }
      const specVersion = extension.specVersion;
      if (!POSSIBLE_SPEC_VERSIONS.has(specVersion)) {
        console.warn(`VRMExpressionLoaderPlugin: Unknown VRMC_vrm specVersion "${specVersion}"`);
        return null;
      }
      const schemaExpressions = extension.expressions;
      if (!schemaExpressions) {
        return null;
      }
      const presetNameSet = new Set(Object.values(VRMExpressionPresetName));
      const nameSchemaExpressionMap = /* @__PURE__ */ new Map();
      if (schemaExpressions.preset != null) {
        Object.entries(schemaExpressions.preset).forEach(([name, schemaExpression]) => {
          if (schemaExpression == null) {
            return;
          }
          if (!presetNameSet.has(name)) {
            console.warn(`VRMExpressionLoaderPlugin: Unknown preset name "${name}" detected. Ignoring the expression`);
            return;
          }
          nameSchemaExpressionMap.set(name, schemaExpression);
        });
      }
      if (schemaExpressions.custom != null) {
        Object.entries(schemaExpressions.custom).forEach(([name, schemaExpression]) => {
          if (presetNameSet.has(name)) {
            console.warn(
              `VRMExpressionLoaderPlugin: Custom expression cannot have preset name "${name}". Ignoring the expression`
            );
            return;
          }
          nameSchemaExpressionMap.set(name, schemaExpression);
        });
      }
      const manager = new VRMExpressionManager();
      yield Promise.all(
        Array.from(nameSchemaExpressionMap.entries()).map((_0) => __async2(this, [_0], function* ([name, schemaExpression]) {
          var _a22, _b22, _c, _d2, _e, _f, _g;
          const expression = new VRMExpression(name);
          gltf.scene.add(expression);
          expression.isBinary = (_a22 = schemaExpression.isBinary) != null ? _a22 : false;
          expression.overrideBlink = (_b22 = schemaExpression.overrideBlink) != null ? _b22 : "none";
          expression.overrideLookAt = (_c = schemaExpression.overrideLookAt) != null ? _c : "none";
          expression.overrideMouth = (_d2 = schemaExpression.overrideMouth) != null ? _d2 : "none";
          (_e = schemaExpression.morphTargetBinds) == null ? void 0 : _e.forEach((bind) => __async2(this, null, function* () {
            var _a3;
            if (bind.node === void 0 || bind.index === void 0) {
              return;
            }
            const primitives = yield gltfExtractPrimitivesFromNode(gltf, bind.node);
            const morphTargetIndex = bind.index;
            if (!primitives.every(
              (primitive) => Array.isArray(primitive.morphTargetInfluences) && morphTargetIndex < primitive.morphTargetInfluences.length
            )) {
              console.warn(
                `VRMExpressionLoaderPlugin: ${schemaExpression.name} attempts to index morph #${morphTargetIndex} but not found.`
              );
              return;
            }
            expression.addBind(
              new VRMExpressionMorphTargetBind({
                primitives,
                index: morphTargetIndex,
                weight: (_a3 = bind.weight) != null ? _a3 : 1
              })
            );
          }));
          if (schemaExpression.materialColorBinds || schemaExpression.textureTransformBinds) {
            const gltfMaterials = [];
            gltf.scene.traverse((object) => {
              const material = object.material;
              if (material) {
                if (Array.isArray(material)) {
                  gltfMaterials.push(...material);
                } else {
                  gltfMaterials.push(material);
                }
              }
            });
            (_f = schemaExpression.materialColorBinds) == null ? void 0 : _f.forEach((bind) => __async2(this, null, function* () {
              const materials = gltfMaterials.filter((material) => {
                var _a3;
                const materialIndex = (_a3 = this.parser.associations.get(material)) == null ? void 0 : _a3.materials;
                return bind.material === materialIndex;
              });
              materials.forEach((material) => {
                expression.addBind(
                  new VRMExpressionMaterialColorBind({
                    material,
                    type: bind.type,
                    targetValue: new THREE4.Color().fromArray(bind.targetValue),
                    targetAlpha: bind.targetValue[3]
                  })
                );
              });
            }));
            (_g = schemaExpression.textureTransformBinds) == null ? void 0 : _g.forEach((bind) => __async2(this, null, function* () {
              const materials = gltfMaterials.filter((material) => {
                var _a3;
                const materialIndex = (_a3 = this.parser.associations.get(material)) == null ? void 0 : _a3.materials;
                return bind.material === materialIndex;
              });
              materials.forEach((material) => {
                var _a3, _b3;
                expression.addBind(
                  new VRMExpressionTextureTransformBind({
                    material,
                    offset: new THREE4.Vector2().fromArray((_a3 = bind.offset) != null ? _a3 : [0, 0]),
                    scale: new THREE4.Vector2().fromArray((_b3 = bind.scale) != null ? _b3 : [1, 1])
                  })
                );
              });
            }));
          }
          manager.registerExpression(expression);
        }))
      );
      return manager;
    });
  }
  _v0Import(gltf) {
    return __async2(this, null, function* () {
      var _a2;
      const json = this.parser.json;
      const vrmExt = (_a2 = json.extensions) == null ? void 0 : _a2.VRM;
      if (!vrmExt) {
        return null;
      }
      const schemaBlendShape = vrmExt.blendShapeMaster;
      if (!schemaBlendShape) {
        return null;
      }
      const manager = new VRMExpressionManager();
      const schemaBlendShapeGroups = schemaBlendShape.blendShapeGroups;
      if (!schemaBlendShapeGroups) {
        return manager;
      }
      const blendShapeNameSet = /* @__PURE__ */ new Set();
      yield Promise.all(
        schemaBlendShapeGroups.map((schemaGroup) => __async2(this, null, function* () {
          var _a22;
          const v0PresetName = schemaGroup.presetName;
          const v1PresetName = v0PresetName != null && _VRMExpressionLoaderPlugin2.v0v1PresetNameMap[v0PresetName] || null;
          const name = v1PresetName != null ? v1PresetName : schemaGroup.name;
          if (name == null) {
            console.warn("VRMExpressionLoaderPlugin: One of custom expressions has no name. Ignoring the expression");
            return;
          }
          if (blendShapeNameSet.has(name)) {
            console.warn(
              `VRMExpressionLoaderPlugin: An expression preset ${v0PresetName} has duplicated entries. Ignoring the expression`
            );
            return;
          }
          blendShapeNameSet.add(name);
          const expression = new VRMExpression(name);
          gltf.scene.add(expression);
          expression.isBinary = (_a22 = schemaGroup.isBinary) != null ? _a22 : false;
          if (schemaGroup.binds) {
            schemaGroup.binds.forEach((bind) => __async2(this, null, function* () {
              var _a3;
              if (bind.mesh === void 0 || bind.index === void 0) {
                return;
              }
              const nodesUsingMesh = [];
              (_a3 = json.nodes) == null ? void 0 : _a3.forEach((node, i) => {
                if (node.mesh === bind.mesh) {
                  nodesUsingMesh.push(i);
                }
              });
              if (nodesUsingMesh.length === 0) {
                console.warn(
                  `VRMExpressionLoaderPlugin: ${schemaGroup.name} attempts to bind a morph target to the mesh #${bind.mesh} but the mesh is not found or not used in the scene. Ignoring the bind.`
                );
                return;
              }
              const morphTargetIndex = bind.index;
              yield Promise.all(
                nodesUsingMesh.map((nodeIndex) => __async2(this, null, function* () {
                  var _a4;
                  const primitives = yield gltfExtractPrimitivesFromNode(gltf, nodeIndex);
                  if (!primitives.every(
                    (primitive) => Array.isArray(primitive.morphTargetInfluences) && morphTargetIndex < primitive.morphTargetInfluences.length
                  )) {
                    console.warn(
                      `VRMExpressionLoaderPlugin: ${schemaGroup.name} attempts to index ${morphTargetIndex}th morph but not found.`
                    );
                    return;
                  }
                  expression.addBind(
                    new VRMExpressionMorphTargetBind({
                      primitives,
                      index: morphTargetIndex,
                      weight: 0.01 * ((_a4 = bind.weight) != null ? _a4 : 100)
                      // narrowing the range from [ 0.0 - 100.0 ] to [ 0.0 - 1.0 ]
                    })
                  );
                }))
              );
            }));
          }
          const materialValues = schemaGroup.materialValues;
          if (materialValues && materialValues.length !== 0) {
            materialValues.forEach((materialValue) => {
              if (materialValue.materialName === void 0 || materialValue.propertyName === void 0 || materialValue.targetValue === void 0) {
                return;
              }
              const materials = [];
              gltf.scene.traverse((object) => {
                if (object.material) {
                  const material = object.material;
                  if (Array.isArray(material)) {
                    materials.push(
                      ...material.filter(
                        (mtl) => (mtl.name === materialValue.materialName || mtl.name === materialValue.materialName + " (Outline)") && materials.indexOf(mtl) === -1
                      )
                    );
                  } else if (material.name === materialValue.materialName && materials.indexOf(material) === -1) {
                    materials.push(material);
                  }
                }
              });
              const materialPropertyName = materialValue.propertyName;
              materials.forEach((material) => {
                if (materialPropertyName === "_MainTex_ST") {
                  const scale = new THREE4.Vector2(materialValue.targetValue[0], materialValue.targetValue[1]);
                  const offset = new THREE4.Vector2(materialValue.targetValue[2], materialValue.targetValue[3]);
                  offset.y = 1 - offset.y - scale.y;
                  expression.addBind(
                    new VRMExpressionTextureTransformBind({
                      material,
                      scale,
                      offset
                    })
                  );
                  return;
                }
                const materialColorType = v0ExpressionMaterialColorMap[materialPropertyName];
                if (materialColorType) {
                  expression.addBind(
                    new VRMExpressionMaterialColorBind({
                      material,
                      type: materialColorType,
                      targetValue: new THREE4.Color().fromArray(materialValue.targetValue),
                      targetAlpha: materialValue.targetValue[3]
                    })
                  );
                  return;
                }
                console.warn(materialPropertyName + " is not supported");
              });
            });
          }
          manager.registerExpression(expression);
        }))
      );
      return manager;
    });
  }
};
_VRMExpressionLoaderPlugin.v0v1PresetNameMap = {
  a: "aa",
  e: "ee",
  i: "ih",
  o: "oh",
  u: "ou",
  blink: "blink",
  joy: "happy",
  angry: "angry",
  sorrow: "sad",
  fun: "relaxed",
  lookup: "lookUp",
  lookdown: "lookDown",
  lookleft: "lookLeft",
  lookright: "lookRight",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  blink_l: "blinkLeft",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  blink_r: "blinkRight",
  neutral: "neutral"
};
var VRMExpressionLoaderPlugin = _VRMExpressionLoaderPlugin;
var _VRMFirstPerson = class _VRMFirstPerson2 {
  /**
   * Create a new VRMFirstPerson object.
   *
   * @param humanoid A {@link VRMHumanoid}
   * @param meshAnnotations A {@link VRMFirstPersonMeshAnnotation}
   */
  constructor(humanoid, meshAnnotations) {
    this._firstPersonOnlyLayer = _VRMFirstPerson2.DEFAULT_FIRSTPERSON_ONLY_LAYER;
    this._thirdPersonOnlyLayer = _VRMFirstPerson2.DEFAULT_THIRDPERSON_ONLY_LAYER;
    this._initializedLayers = false;
    this.humanoid = humanoid;
    this.meshAnnotations = meshAnnotations;
  }
  /**
   * Copy the given {@link VRMFirstPerson} into this one.
   * {@link humanoid} must be same as the source one.
   * @param source The {@link VRMFirstPerson} you want to copy
   * @returns this
   */
  copy(source) {
    if (this.humanoid !== source.humanoid) {
      throw new Error("VRMFirstPerson: humanoid must be same in order to copy");
    }
    this.meshAnnotations = source.meshAnnotations.map((annotation) => ({
      meshes: annotation.meshes.concat(),
      type: annotation.type
    }));
    return this;
  }
  /**
   * Returns a clone of this {@link VRMFirstPerson}.
   * @returns Copied {@link VRMFirstPerson}
   */
  clone() {
    return new _VRMFirstPerson2(this.humanoid, this.meshAnnotations).copy(this);
  }
  /**
   * A camera layer represents `FirstPersonOnly` layer.
   * Note that **you must call {@link setup} first before you use the layer feature** or it does not work properly.
   *
   * The value is {@link DEFAULT_FIRSTPERSON_ONLY_LAYER} by default but you can change the layer by specifying via {@link setup} if you prefer.
   *
   * @see https://vrm.dev/en/univrm/api/univrm_use_firstperson/
   * @see https://threejs.org/docs/#api/en/core/Layers
   */
  get firstPersonOnlyLayer() {
    return this._firstPersonOnlyLayer;
  }
  /**
   * A camera layer represents `ThirdPersonOnly` layer.
   * Note that **you must call {@link setup} first before you use the layer feature** or it does not work properly.
   *
   * The value is {@link DEFAULT_THIRDPERSON_ONLY_LAYER} by default but you can change the layer by specifying via {@link setup} if you prefer.
   *
   * @see https://vrm.dev/en/univrm/api/univrm_use_firstperson/
   * @see https://threejs.org/docs/#api/en/core/Layers
   */
  get thirdPersonOnlyLayer() {
    return this._thirdPersonOnlyLayer;
  }
  /**
   * In this method, it assigns layers for every meshes based on mesh annotations.
   * You must call this method first before you use the layer feature.
   *
   * This is an equivalent of [VRMFirstPerson.Setup](https://github.com/vrm-c/UniVRM/blob/73a5bd8fcddaa2a7a8735099a97e63c9db3e5ea0/Assets/VRM/Runtime/FirstPerson/VRMFirstPerson.cs#L295-L299) of the UniVRM.
   *
   * The `cameraLayer` parameter specifies which layer will be assigned for `FirstPersonOnly` / `ThirdPersonOnly`.
   * In UniVRM, we specified those by naming each desired layer as `FIRSTPERSON_ONLY_LAYER` / `THIRDPERSON_ONLY_LAYER`
   * but we are going to specify these layers at here since we are unable to name layers in Three.js.
   *
   * @param cameraLayer Specify which layer will be for `FirstPersonOnly` / `ThirdPersonOnly`.
   */
  setup({
    firstPersonOnlyLayer = _VRMFirstPerson2.DEFAULT_FIRSTPERSON_ONLY_LAYER,
    thirdPersonOnlyLayer = _VRMFirstPerson2.DEFAULT_THIRDPERSON_ONLY_LAYER
  } = {}) {
    if (this._initializedLayers) {
      return;
    }
    this._firstPersonOnlyLayer = firstPersonOnlyLayer;
    this._thirdPersonOnlyLayer = thirdPersonOnlyLayer;
    this.meshAnnotations.forEach((item) => {
      item.meshes.forEach((mesh) => {
        if (item.type === "firstPersonOnly") {
          mesh.layers.set(this._firstPersonOnlyLayer);
          mesh.traverse((child) => child.layers.set(this._firstPersonOnlyLayer));
        } else if (item.type === "thirdPersonOnly") {
          mesh.layers.set(this._thirdPersonOnlyLayer);
          mesh.traverse((child) => child.layers.set(this._thirdPersonOnlyLayer));
        } else if (item.type === "auto") {
          this._createHeadlessModel(mesh);
        }
      });
    });
    this._initializedLayers = true;
  }
  _excludeTriangles(triangles, bws, skinIndex, exclude) {
    let count = 0;
    if (bws != null && bws.length > 0) {
      for (let i = 0; i < triangles.length; i += 3) {
        const a = triangles[i];
        const b = triangles[i + 1];
        const c = triangles[i + 2];
        const bw0 = bws[a];
        const skin0 = skinIndex[a];
        if (bw0[0] > 0 && exclude.includes(skin0[0])) continue;
        if (bw0[1] > 0 && exclude.includes(skin0[1])) continue;
        if (bw0[2] > 0 && exclude.includes(skin0[2])) continue;
        if (bw0[3] > 0 && exclude.includes(skin0[3])) continue;
        const bw1 = bws[b];
        const skin1 = skinIndex[b];
        if (bw1[0] > 0 && exclude.includes(skin1[0])) continue;
        if (bw1[1] > 0 && exclude.includes(skin1[1])) continue;
        if (bw1[2] > 0 && exclude.includes(skin1[2])) continue;
        if (bw1[3] > 0 && exclude.includes(skin1[3])) continue;
        const bw2 = bws[c];
        const skin2 = skinIndex[c];
        if (bw2[0] > 0 && exclude.includes(skin2[0])) continue;
        if (bw2[1] > 0 && exclude.includes(skin2[1])) continue;
        if (bw2[2] > 0 && exclude.includes(skin2[2])) continue;
        if (bw2[3] > 0 && exclude.includes(skin2[3])) continue;
        triangles[count++] = a;
        triangles[count++] = b;
        triangles[count++] = c;
      }
    }
    return count;
  }
  _createErasedMesh(src, erasingBonesIndex) {
    const dst = new THREE5.SkinnedMesh(src.geometry.clone(), src.material);
    dst.name = `${src.name}(erase)`;
    dst.frustumCulled = src.frustumCulled;
    dst.layers.set(this._firstPersonOnlyLayer);
    const geometry = dst.geometry;
    const skinIndexAttr = geometry.getAttribute("skinIndex");
    const skinIndexAttrArray = skinIndexAttr instanceof THREE5.GLBufferAttribute ? [] : skinIndexAttr.array;
    const skinIndex = [];
    for (let i = 0; i < skinIndexAttrArray.length; i += 4) {
      skinIndex.push([
        skinIndexAttrArray[i],
        skinIndexAttrArray[i + 1],
        skinIndexAttrArray[i + 2],
        skinIndexAttrArray[i + 3]
      ]);
    }
    const skinWeightAttr = geometry.getAttribute("skinWeight");
    const skinWeightAttrArray = skinWeightAttr instanceof THREE5.GLBufferAttribute ? [] : skinWeightAttr.array;
    const skinWeight = [];
    for (let i = 0; i < skinWeightAttrArray.length; i += 4) {
      skinWeight.push([
        skinWeightAttrArray[i],
        skinWeightAttrArray[i + 1],
        skinWeightAttrArray[i + 2],
        skinWeightAttrArray[i + 3]
      ]);
    }
    const index = geometry.getIndex();
    if (!index) {
      throw new Error("The geometry doesn't have an index buffer");
    }
    const oldTriangles = Array.from(index.array);
    const count = this._excludeTriangles(oldTriangles, skinWeight, skinIndex, erasingBonesIndex);
    const newTriangle = [];
    for (let i = 0; i < count; i++) {
      newTriangle[i] = oldTriangles[i];
    }
    geometry.setIndex(newTriangle);
    if (src.onBeforeRender) {
      dst.onBeforeRender = src.onBeforeRender;
    }
    dst.bind(new THREE5.Skeleton(src.skeleton.bones, src.skeleton.boneInverses), new THREE5.Matrix4());
    return dst;
  }
  _createHeadlessModelForSkinnedMesh(parent, mesh) {
    const eraseBoneIndexes = [];
    mesh.skeleton.bones.forEach((bone, index) => {
      if (this._isEraseTarget(bone)) eraseBoneIndexes.push(index);
    });
    if (!eraseBoneIndexes.length) {
      mesh.layers.enable(this._thirdPersonOnlyLayer);
      mesh.layers.enable(this._firstPersonOnlyLayer);
      return;
    }
    mesh.layers.set(this._thirdPersonOnlyLayer);
    const newMesh = this._createErasedMesh(mesh, eraseBoneIndexes);
    parent.add(newMesh);
  }
  _createHeadlessModel(node) {
    if (node.type === "Group") {
      node.layers.set(this._thirdPersonOnlyLayer);
      if (this._isEraseTarget(node)) {
        node.traverse((child) => child.layers.set(this._thirdPersonOnlyLayer));
      } else {
        const parent = new THREE5.Group();
        parent.name = `_headless_${node.name}`;
        parent.layers.set(this._firstPersonOnlyLayer);
        node.parent.add(parent);
        node.children.filter((child) => child.type === "SkinnedMesh").forEach((child) => {
          const skinnedMesh = child;
          this._createHeadlessModelForSkinnedMesh(parent, skinnedMesh);
        });
      }
    } else if (node.type === "SkinnedMesh") {
      const skinnedMesh = node;
      this._createHeadlessModelForSkinnedMesh(node.parent, skinnedMesh);
    } else {
      if (this._isEraseTarget(node)) {
        node.layers.set(this._thirdPersonOnlyLayer);
        node.traverse((child) => child.layers.set(this._thirdPersonOnlyLayer));
      }
    }
  }
  _isEraseTarget(bone) {
    if (bone === this.humanoid.getRawBoneNode("head")) {
      return true;
    } else if (!bone.parent) {
      return false;
    } else {
      return this._isEraseTarget(bone.parent);
    }
  }
};
_VRMFirstPerson.DEFAULT_FIRSTPERSON_ONLY_LAYER = 9;
_VRMFirstPerson.DEFAULT_THIRDPERSON_ONLY_LAYER = 10;
var VRMFirstPerson = _VRMFirstPerson;
var POSSIBLE_SPEC_VERSIONS2 = /* @__PURE__ */ new Set(["1.0", "1.0-beta"]);
var VRMFirstPersonLoaderPlugin = class {
  get name() {
    return "VRMFirstPersonLoaderPlugin";
  }
  constructor(parser) {
    this.parser = parser;
  }
  afterRoot(gltf) {
    return __async2(this, null, function* () {
      const vrmHumanoid = gltf.userData.vrmHumanoid;
      if (vrmHumanoid === null) {
        return;
      } else if (vrmHumanoid === void 0) {
        throw new Error(
          "VRMFirstPersonLoaderPlugin: vrmHumanoid is undefined. VRMHumanoidLoaderPlugin have to be used first"
        );
      }
      gltf.userData.vrmFirstPerson = yield this._import(gltf, vrmHumanoid);
    });
  }
  /**
   * Import a {@link VRMFirstPerson} from a VRM.
   *
   * @param gltf A parsed result of GLTF taken from GLTFLoader
   * @param humanoid A {@link VRMHumanoid} instance that represents the VRM
   */
  _import(gltf, humanoid) {
    return __async2(this, null, function* () {
      if (humanoid == null) {
        return null;
      }
      const v1Result = yield this._v1Import(gltf, humanoid);
      if (v1Result) {
        return v1Result;
      }
      const v0Result = yield this._v0Import(gltf, humanoid);
      if (v0Result) {
        return v0Result;
      }
      return null;
    });
  }
  _v1Import(gltf, humanoid) {
    return __async2(this, null, function* () {
      var _a2, _b2;
      const json = this.parser.json;
      const isVRMUsed = ((_a2 = json.extensionsUsed) == null ? void 0 : _a2.indexOf("VRMC_vrm")) !== -1;
      if (!isVRMUsed) {
        return null;
      }
      const extension = (_b2 = json.extensions) == null ? void 0 : _b2["VRMC_vrm"];
      if (!extension) {
        return null;
      }
      const specVersion = extension.specVersion;
      if (!POSSIBLE_SPEC_VERSIONS2.has(specVersion)) {
        console.warn(`VRMFirstPersonLoaderPlugin: Unknown VRMC_vrm specVersion "${specVersion}"`);
        return null;
      }
      const schemaFirstPerson = extension.firstPerson;
      const meshAnnotations = [];
      const nodePrimitivesMap = yield gltfExtractPrimitivesFromNodes(gltf);
      Array.from(nodePrimitivesMap.entries()).forEach(([nodeIndex, primitives]) => {
        var _a22, _b22;
        const annotation = (_a22 = schemaFirstPerson == null ? void 0 : schemaFirstPerson.meshAnnotations) == null ? void 0 : _a22.find((a) => a.node === nodeIndex);
        meshAnnotations.push({
          meshes: primitives,
          type: (_b22 = annotation == null ? void 0 : annotation.type) != null ? _b22 : "auto"
        });
      });
      return new VRMFirstPerson(humanoid, meshAnnotations);
    });
  }
  _v0Import(gltf, humanoid) {
    return __async2(this, null, function* () {
      var _a2;
      const json = this.parser.json;
      const vrmExt = (_a2 = json.extensions) == null ? void 0 : _a2.VRM;
      if (!vrmExt) {
        return null;
      }
      const schemaFirstPerson = vrmExt.firstPerson;
      if (!schemaFirstPerson) {
        return null;
      }
      const meshAnnotations = [];
      const nodePrimitivesMap = yield gltfExtractPrimitivesFromNodes(gltf);
      Array.from(nodePrimitivesMap.entries()).forEach(([nodeIndex, primitives]) => {
        const schemaNode = json.nodes[nodeIndex];
        const flag = schemaFirstPerson.meshAnnotations ? schemaFirstPerson.meshAnnotations.find((a) => a.mesh === schemaNode.mesh) : void 0;
        meshAnnotations.push({
          meshes: primitives,
          type: this._convertV0FlagToV1Type(flag == null ? void 0 : flag.firstPersonFlag)
        });
      });
      return new VRMFirstPerson(humanoid, meshAnnotations);
    });
  }
  _convertV0FlagToV1Type(flag) {
    if (flag === "FirstPersonOnly") {
      return "firstPersonOnly";
    } else if (flag === "ThirdPersonOnly") {
      return "thirdPersonOnly";
    } else if (flag === "Both") {
      return "both";
    } else {
      return "auto";
    }
  }
};
var _v3A = new THREE6.Vector3();
var _v3B = new THREE6.Vector3();
var _quatA = new THREE6.Quaternion();
var VRMHumanoidHelper = class extends THREE6.Group {
  constructor(humanoid) {
    super();
    this.vrmHumanoid = humanoid;
    this._boneAxesMap = /* @__PURE__ */ new Map();
    Object.values(humanoid.humanBones).forEach((bone) => {
      const helper = new THREE6.AxesHelper(1);
      helper.matrixAutoUpdate = false;
      helper.material.depthTest = false;
      helper.material.depthWrite = false;
      this.add(helper);
      this._boneAxesMap.set(bone, helper);
    });
  }
  dispose() {
    Array.from(this._boneAxesMap.values()).forEach((axes) => {
      axes.geometry.dispose();
      axes.material.dispose();
    });
  }
  updateMatrixWorld(force) {
    Array.from(this._boneAxesMap.entries()).forEach(([bone, axes]) => {
      bone.node.updateWorldMatrix(true, false);
      bone.node.matrixWorld.decompose(_v3A, _quatA, _v3B);
      const scale = _v3A.set(0.1, 0.1, 0.1).divide(_v3B);
      axes.matrix.copy(bone.node.matrixWorld).scale(scale);
    });
    super.updateMatrixWorld(force);
  }
};
var VRMHumanBoneList = [
  "hips",
  "spine",
  "chest",
  "upperChest",
  "neck",
  "head",
  "leftEye",
  "rightEye",
  "jaw",
  "leftUpperLeg",
  "leftLowerLeg",
  "leftFoot",
  "leftToes",
  "rightUpperLeg",
  "rightLowerLeg",
  "rightFoot",
  "rightToes",
  "leftShoulder",
  "leftUpperArm",
  "leftLowerArm",
  "leftHand",
  "rightShoulder",
  "rightUpperArm",
  "rightLowerArm",
  "rightHand",
  "leftThumbMetacarpal",
  "leftThumbProximal",
  "leftThumbDistal",
  "leftIndexProximal",
  "leftIndexIntermediate",
  "leftIndexDistal",
  "leftMiddleProximal",
  "leftMiddleIntermediate",
  "leftMiddleDistal",
  "leftRingProximal",
  "leftRingIntermediate",
  "leftRingDistal",
  "leftLittleProximal",
  "leftLittleIntermediate",
  "leftLittleDistal",
  "rightThumbMetacarpal",
  "rightThumbProximal",
  "rightThumbDistal",
  "rightIndexProximal",
  "rightIndexIntermediate",
  "rightIndexDistal",
  "rightMiddleProximal",
  "rightMiddleIntermediate",
  "rightMiddleDistal",
  "rightRingProximal",
  "rightRingIntermediate",
  "rightRingDistal",
  "rightLittleProximal",
  "rightLittleIntermediate",
  "rightLittleDistal"
];
var VRMHumanBoneParentMap = {
  hips: null,
  spine: "hips",
  chest: "spine",
  upperChest: "chest",
  neck: "upperChest",
  head: "neck",
  leftEye: "head",
  rightEye: "head",
  jaw: "head",
  leftUpperLeg: "hips",
  leftLowerLeg: "leftUpperLeg",
  leftFoot: "leftLowerLeg",
  leftToes: "leftFoot",
  rightUpperLeg: "hips",
  rightLowerLeg: "rightUpperLeg",
  rightFoot: "rightLowerLeg",
  rightToes: "rightFoot",
  leftShoulder: "upperChest",
  leftUpperArm: "leftShoulder",
  leftLowerArm: "leftUpperArm",
  leftHand: "leftLowerArm",
  rightShoulder: "upperChest",
  rightUpperArm: "rightShoulder",
  rightLowerArm: "rightUpperArm",
  rightHand: "rightLowerArm",
  leftThumbMetacarpal: "leftHand",
  leftThumbProximal: "leftThumbMetacarpal",
  leftThumbDistal: "leftThumbProximal",
  leftIndexProximal: "leftHand",
  leftIndexIntermediate: "leftIndexProximal",
  leftIndexDistal: "leftIndexIntermediate",
  leftMiddleProximal: "leftHand",
  leftMiddleIntermediate: "leftMiddleProximal",
  leftMiddleDistal: "leftMiddleIntermediate",
  leftRingProximal: "leftHand",
  leftRingIntermediate: "leftRingProximal",
  leftRingDistal: "leftRingIntermediate",
  leftLittleProximal: "leftHand",
  leftLittleIntermediate: "leftLittleProximal",
  leftLittleDistal: "leftLittleIntermediate",
  rightThumbMetacarpal: "rightHand",
  rightThumbProximal: "rightThumbMetacarpal",
  rightThumbDistal: "rightThumbProximal",
  rightIndexProximal: "rightHand",
  rightIndexIntermediate: "rightIndexProximal",
  rightIndexDistal: "rightIndexIntermediate",
  rightMiddleProximal: "rightHand",
  rightMiddleIntermediate: "rightMiddleProximal",
  rightMiddleDistal: "rightMiddleIntermediate",
  rightRingProximal: "rightHand",
  rightRingIntermediate: "rightRingProximal",
  rightRingDistal: "rightRingIntermediate",
  rightLittleProximal: "rightHand",
  rightLittleIntermediate: "rightLittleProximal",
  rightLittleDistal: "rightLittleIntermediate"
};
function quatInvertCompat(target) {
  if (target.invert) {
    target.invert();
  } else {
    target.inverse();
  }
  return target;
}
var _v3A2 = new THREE7.Vector3();
var _quatA2 = new THREE7.Quaternion();
var VRMRig = class {
  /**
   * Create a new {@link VRMHumanoid}.
   * @param humanBones A {@link VRMHumanBones} contains all the bones of the new humanoid
   */
  constructor(humanBones) {
    this.humanBones = humanBones;
    this.restPose = this.getAbsolutePose();
  }
  /**
   * Return the current absolute pose of this humanoid as a {@link VRMPose}.
   * Note that the output result will contain initial state of the VRM and not compatible between different models.
   * You might want to use {@link getPose} instead.
   */
  getAbsolutePose() {
    const pose = {};
    Object.keys(this.humanBones).forEach((vrmBoneNameString) => {
      const vrmBoneName = vrmBoneNameString;
      const node = this.getBoneNode(vrmBoneName);
      if (!node) {
        return;
      }
      _v3A2.copy(node.position);
      _quatA2.copy(node.quaternion);
      pose[vrmBoneName] = {
        position: _v3A2.toArray(),
        rotation: _quatA2.toArray()
      };
    });
    return pose;
  }
  /**
   * Return the current pose of this humanoid as a {@link VRMPose}.
   *
   * Each transform is a local transform relative from rest pose (T-pose).
   */
  getPose() {
    const pose = {};
    Object.keys(this.humanBones).forEach((boneNameString) => {
      const boneName = boneNameString;
      const node = this.getBoneNode(boneName);
      if (!node) {
        return;
      }
      _v3A2.set(0, 0, 0);
      _quatA2.identity();
      const restState = this.restPose[boneName];
      if (restState == null ? void 0 : restState.position) {
        _v3A2.fromArray(restState.position).negate();
      }
      if (restState == null ? void 0 : restState.rotation) {
        quatInvertCompat(_quatA2.fromArray(restState.rotation));
      }
      _v3A2.add(node.position);
      _quatA2.premultiply(node.quaternion);
      pose[boneName] = {
        position: _v3A2.toArray(),
        rotation: _quatA2.toArray()
      };
    });
    return pose;
  }
  /**
   * Let the humanoid do a specified pose.
   *
   * Each transform have to be a local transform relative from rest pose (T-pose).
   * You can pass what you got from {@link getPose}.
   *
   * @param poseObject A {@link VRMPose} that represents a single pose
   */
  setPose(poseObject) {
    Object.entries(poseObject).forEach(([boneNameString, state]) => {
      const boneName = boneNameString;
      const node = this.getBoneNode(boneName);
      if (!node) {
        return;
      }
      const restState = this.restPose[boneName];
      if (!restState) {
        return;
      }
      if (state == null ? void 0 : state.position) {
        node.position.fromArray(state.position);
        if (restState.position) {
          node.position.add(_v3A2.fromArray(restState.position));
        }
      }
      if (state == null ? void 0 : state.rotation) {
        node.quaternion.fromArray(state.rotation);
        if (restState.rotation) {
          node.quaternion.multiply(_quatA2.fromArray(restState.rotation));
        }
      }
    });
  }
  /**
   * Reset the humanoid to its rest pose.
   */
  resetPose() {
    Object.entries(this.restPose).forEach(([boneName, rest]) => {
      const node = this.getBoneNode(boneName);
      if (!node) {
        return;
      }
      if (rest == null ? void 0 : rest.position) {
        node.position.fromArray(rest.position);
      }
      if (rest == null ? void 0 : rest.rotation) {
        node.quaternion.fromArray(rest.rotation);
      }
    });
  }
  /**
   * Return a bone bound to a specified {@link VRMHumanBoneName}, as a {@link VRMHumanBone}.
   *
   * @param name Name of the bone you want
   */
  getBone(name) {
    var _a2;
    return (_a2 = this.humanBones[name]) != null ? _a2 : void 0;
  }
  /**
   * Return a bone bound to a specified {@link VRMHumanBoneName}, as a `THREE.Object3D`.
   *
   * @param name Name of the bone you want
   */
  getBoneNode(name) {
    var _a2, _b2;
    return (_b2 = (_a2 = this.humanBones[name]) == null ? void 0 : _a2.node) != null ? _b2 : null;
  }
};
var _v3A3 = new THREE8.Vector3();
var _quatA3 = new THREE8.Quaternion();
var _boneWorldPos = new THREE8.Vector3();
var VRMHumanoidRig = class _VRMHumanoidRig extends VRMRig {
  static _setupTransforms(modelRig) {
    const root = new THREE8.Object3D();
    root.name = "VRMHumanoidRig";
    const boneWorldPositions = {};
    const boneWorldRotations = {};
    const boneRotations = {};
    const parentWorldRotations = {};
    VRMHumanBoneList.forEach((boneName) => {
      var _a2;
      const boneNode = modelRig.getBoneNode(boneName);
      if (boneNode) {
        const boneWorldPosition = new THREE8.Vector3();
        const boneWorldRotation = new THREE8.Quaternion();
        boneNode.updateWorldMatrix(true, false);
        boneNode.matrixWorld.decompose(boneWorldPosition, boneWorldRotation, _v3A3);
        boneWorldPositions[boneName] = boneWorldPosition;
        boneWorldRotations[boneName] = boneWorldRotation;
        boneRotations[boneName] = boneNode.quaternion.clone();
        const parentWorldRotation = new THREE8.Quaternion();
        (_a2 = boneNode.parent) == null ? void 0 : _a2.matrixWorld.decompose(_v3A3, parentWorldRotation, _v3A3);
        parentWorldRotations[boneName] = parentWorldRotation;
      }
    });
    const rigBones = {};
    VRMHumanBoneList.forEach((boneName) => {
      var _a2;
      const boneNode = modelRig.getBoneNode(boneName);
      if (boneNode) {
        const boneWorldPosition = boneWorldPositions[boneName];
        let currentBoneName = boneName;
        let parentBoneWorldPosition;
        while (parentBoneWorldPosition == null) {
          currentBoneName = VRMHumanBoneParentMap[currentBoneName];
          if (currentBoneName == null) {
            break;
          }
          parentBoneWorldPosition = boneWorldPositions[currentBoneName];
        }
        const rigBoneNode = new THREE8.Object3D();
        rigBoneNode.name = "Normalized_" + boneNode.name;
        const parentRigBoneNode = currentBoneName ? (_a2 = rigBones[currentBoneName]) == null ? void 0 : _a2.node : root;
        parentRigBoneNode.add(rigBoneNode);
        rigBoneNode.position.copy(boneWorldPosition);
        if (parentBoneWorldPosition) {
          rigBoneNode.position.sub(parentBoneWorldPosition);
        }
        rigBones[boneName] = { node: rigBoneNode };
      }
    });
    return {
      rigBones,
      root,
      parentWorldRotations,
      boneRotations
    };
  }
  constructor(humanoid) {
    const { rigBones, root, parentWorldRotations, boneRotations } = _VRMHumanoidRig._setupTransforms(humanoid);
    super(rigBones);
    this.original = humanoid;
    this.root = root;
    this._parentWorldRotations = parentWorldRotations;
    this._boneRotations = boneRotations;
  }
  /**
   * Update this humanoid rig.
   */
  update() {
    VRMHumanBoneList.forEach((boneName) => {
      const boneNode = this.original.getBoneNode(boneName);
      if (boneNode != null) {
        const rigBoneNode = this.getBoneNode(boneName);
        const parentWorldRotation = this._parentWorldRotations[boneName];
        const invParentWorldRotation = _quatA3.copy(parentWorldRotation).invert();
        const boneRotation = this._boneRotations[boneName];
        boneNode.quaternion.copy(rigBoneNode.quaternion).multiply(parentWorldRotation).premultiply(invParentWorldRotation).multiply(boneRotation);
        if (boneName === "hips") {
          const boneWorldPosition = rigBoneNode.getWorldPosition(_boneWorldPos);
          boneNode.parent.updateWorldMatrix(true, false);
          const parentWorldMatrix = boneNode.parent.matrixWorld;
          const localPosition = boneWorldPosition.applyMatrix4(parentWorldMatrix.invert());
          boneNode.position.copy(localPosition);
        }
      }
    });
  }
};
var VRMHumanoid = class _VRMHumanoid {
  // TODO: Rename
  /**
   * @deprecated Deprecated. Use either {@link rawRestPose} or {@link normalizedRestPose} instead.
   */
  get restPose() {
    console.warn("VRMHumanoid: restPose is deprecated. Use either rawRestPose or normalizedRestPose instead.");
    return this.rawRestPose;
  }
  /**
   * A {@link VRMPose} of its raw human bones that is its default state.
   * Note that it's not compatible with {@link setRawPose} and {@link getRawPose}, since it contains non-relative values of each local transforms.
   */
  get rawRestPose() {
    return this._rawHumanBones.restPose;
  }
  /**
   * A {@link VRMPose} of its normalized human bones that is its default state.
   * Note that it's not compatible with {@link setNormalizedPose} and {@link getNormalizedPose}, since it contains non-relative values of each local transforms.
   */
  get normalizedRestPose() {
    return this._normalizedHumanBones.restPose;
  }
  /**
   * A map from {@link VRMHumanBoneName} to raw {@link VRMHumanBone}s.
   */
  get humanBones() {
    return this._rawHumanBones.humanBones;
  }
  /**
   * A map from {@link VRMHumanBoneName} to raw {@link VRMHumanBone}s.
   */
  get rawHumanBones() {
    return this._rawHumanBones.humanBones;
  }
  /**
   * A map from {@link VRMHumanBoneName} to normalized {@link VRMHumanBone}s.
   */
  get normalizedHumanBones() {
    return this._normalizedHumanBones.humanBones;
  }
  /**
   * The root of normalized {@link VRMHumanBone}s.
   */
  get normalizedHumanBonesRoot() {
    return this._normalizedHumanBones.root;
  }
  /**
   * Create a new {@link VRMHumanoid}.
   * @param humanBones A {@link VRMHumanBones} contains all the bones of the new humanoid
   * @param autoUpdateHumanBones Whether it copies pose from normalizedHumanBones to rawHumanBones on {@link update}. `true` by default.
   */
  constructor(humanBones, options) {
    var _a2;
    this.autoUpdateHumanBones = (_a2 = options == null ? void 0 : options.autoUpdateHumanBones) != null ? _a2 : true;
    this._rawHumanBones = new VRMRig(humanBones);
    this._normalizedHumanBones = new VRMHumanoidRig(this._rawHumanBones);
  }
  /**
   * Copy the given {@link VRMHumanoid} into this one.
   * @param source The {@link VRMHumanoid} you want to copy
   * @returns this
   */
  copy(source) {
    this.autoUpdateHumanBones = source.autoUpdateHumanBones;
    this._rawHumanBones = new VRMRig(source.humanBones);
    this._normalizedHumanBones = new VRMHumanoidRig(this._rawHumanBones);
    return this;
  }
  /**
   * Returns a clone of this {@link VRMHumanoid}.
   * @returns Copied {@link VRMHumanoid}
   */
  clone() {
    return new _VRMHumanoid(this.humanBones, { autoUpdateHumanBones: this.autoUpdateHumanBones }).copy(this);
  }
  /**
   * @deprecated Deprecated. Use either {@link getRawAbsolutePose} or {@link getNormalizedAbsolutePose} instead.
   */
  getAbsolutePose() {
    console.warn(
      "VRMHumanoid: getAbsolutePose() is deprecated. Use either getRawAbsolutePose() or getNormalizedAbsolutePose() instead."
    );
    return this.getRawAbsolutePose();
  }
  /**
   * Return the current absolute pose of this raw human bones as a {@link VRMPose}.
   * Note that the output result will contain initial state of the VRM and not compatible between different models.
   * You might want to use {@link getRawPose} instead.
   */
  getRawAbsolutePose() {
    return this._rawHumanBones.getAbsolutePose();
  }
  /**
   * Return the current absolute pose of this normalized human bones as a {@link VRMPose}.
   * Note that the output result will contain initial state of the VRM and not compatible between different models.
   * You might want to use {@link getNormalizedPose} instead.
   */
  getNormalizedAbsolutePose() {
    return this._normalizedHumanBones.getAbsolutePose();
  }
  /**
   * @deprecated Deprecated. Use either {@link getRawPose} or {@link getNormalizedPose} instead.
   */
  getPose() {
    console.warn("VRMHumanoid: getPose() is deprecated. Use either getRawPose() or getNormalizedPose() instead.");
    return this.getRawPose();
  }
  /**
   * Return the current pose of raw human bones as a {@link VRMPose}.
   *
   * Each transform is a local transform relative from rest pose (T-pose).
   */
  getRawPose() {
    return this._rawHumanBones.getPose();
  }
  /**
   * Return the current pose of normalized human bones as a {@link VRMPose}.
   *
   * Each transform is a local transform relative from rest pose (T-pose).
   */
  getNormalizedPose() {
    return this._normalizedHumanBones.getPose();
  }
  /**
   * @deprecated Deprecated. Use either {@link setRawPose} or {@link setNormalizedPose} instead.
   */
  setPose(poseObject) {
    console.warn("VRMHumanoid: setPose() is deprecated. Use either setRawPose() or setNormalizedPose() instead.");
    return this.setRawPose(poseObject);
  }
  /**
   * Let the raw human bones do a specified pose.
   *
   * Each transform have to be a local transform relative from rest pose (T-pose).
   * You can pass what you got from {@link getRawPose}.
   *
   * If you are using {@link autoUpdateHumanBones}, you might want to use {@link setNormalizedPose} instead.
   *
   * @param poseObject A {@link VRMPose} that represents a single pose
   */
  setRawPose(poseObject) {
    return this._rawHumanBones.setPose(poseObject);
  }
  /**
   * Let the normalized human bones do a specified pose.
   *
   * Each transform have to be a local transform relative from rest pose (T-pose).
   * You can pass what you got from {@link getNormalizedPose}.
   *
   * @param poseObject A {@link VRMPose} that represents a single pose
   */
  setNormalizedPose(poseObject) {
    return this._normalizedHumanBones.setPose(poseObject);
  }
  /**
   * @deprecated Deprecated. Use either {@link resetRawPose} or {@link resetNormalizedPose} instead.
   */
  resetPose() {
    console.warn("VRMHumanoid: resetPose() is deprecated. Use either resetRawPose() or resetNormalizedPose() instead.");
    return this.resetRawPose();
  }
  /**
   * Reset the raw humanoid to its rest pose.
   *
   * If you are using {@link autoUpdateHumanBones}, you might want to use {@link resetNormalizedPose} instead.
   */
  resetRawPose() {
    return this._rawHumanBones.resetPose();
  }
  /**
   * Reset the normalized humanoid to its rest pose.
   */
  resetNormalizedPose() {
    return this._normalizedHumanBones.resetPose();
  }
  /**
   * @deprecated Deprecated. Use either {@link getRawBone} or {@link getNormalizedBone} instead.
   */
  getBone(name) {
    console.warn("VRMHumanoid: getBone() is deprecated. Use either getRawBone() or getNormalizedBone() instead.");
    return this.getRawBone(name);
  }
  /**
   * Return a raw {@link VRMHumanBone} bound to a specified {@link VRMHumanBoneName}.
   *
   * @param name Name of the bone you want
   */
  getRawBone(name) {
    return this._rawHumanBones.getBone(name);
  }
  /**
   * Return a normalized {@link VRMHumanBone} bound to a specified {@link VRMHumanBoneName}.
   *
   * @param name Name of the bone you want
   */
  getNormalizedBone(name) {
    return this._normalizedHumanBones.getBone(name);
  }
  /**
   * @deprecated Deprecated. Use either {@link getRawBoneNode} or {@link getNormalizedBoneNode} instead.
   */
  getBoneNode(name) {
    console.warn(
      "VRMHumanoid: getBoneNode() is deprecated. Use either getRawBoneNode() or getNormalizedBoneNode() instead."
    );
    return this.getRawBoneNode(name);
  }
  /**
   * Return a raw bone as a `THREE.Object3D` bound to a specified {@link VRMHumanBoneName}.
   *
   * @param name Name of the bone you want
   */
  getRawBoneNode(name) {
    return this._rawHumanBones.getBoneNode(name);
  }
  /**
   * Return a normalized bone as a `THREE.Object3D` bound to a specified {@link VRMHumanBoneName}.
   *
   * @param name Name of the bone you want
   */
  getNormalizedBoneNode(name) {
    return this._normalizedHumanBones.getBoneNode(name);
  }
  /**
   * Update the humanoid component.
   *
   * If {@link autoUpdateHumanBones} is `true`, it transfers the pose of normalized human bones to raw human bones.
   */
  update() {
    if (this.autoUpdateHumanBones) {
      this._normalizedHumanBones.update();
    }
  }
};
var VRMRequiredHumanBoneName = {
  Hips: "hips",
  Spine: "spine",
  Head: "head",
  LeftUpperLeg: "leftUpperLeg",
  LeftLowerLeg: "leftLowerLeg",
  LeftFoot: "leftFoot",
  RightUpperLeg: "rightUpperLeg",
  RightLowerLeg: "rightLowerLeg",
  RightFoot: "rightFoot",
  LeftUpperArm: "leftUpperArm",
  LeftLowerArm: "leftLowerArm",
  LeftHand: "leftHand",
  RightUpperArm: "rightUpperArm",
  RightLowerArm: "rightLowerArm",
  RightHand: "rightHand"
};
var POSSIBLE_SPEC_VERSIONS3 = /* @__PURE__ */ new Set(["1.0", "1.0-beta"]);
var thumbBoneNameMap = {
  leftThumbProximal: "leftThumbMetacarpal",
  leftThumbIntermediate: "leftThumbProximal",
  rightThumbProximal: "rightThumbMetacarpal",
  rightThumbIntermediate: "rightThumbProximal"
};
var VRMHumanoidLoaderPlugin = class {
  get name() {
    return "VRMHumanoidLoaderPlugin";
  }
  constructor(parser, options) {
    this.parser = parser;
    this.helperRoot = options == null ? void 0 : options.helperRoot;
    this.autoUpdateHumanBones = options == null ? void 0 : options.autoUpdateHumanBones;
  }
  afterRoot(gltf) {
    return __async2(this, null, function* () {
      gltf.userData.vrmHumanoid = yield this._import(gltf);
    });
  }
  /**
   * Import a {@link VRMHumanoid} from a VRM.
   *
   * @param gltf A parsed result of GLTF taken from GLTFLoader
   */
  _import(gltf) {
    return __async2(this, null, function* () {
      const v1Result = yield this._v1Import(gltf);
      if (v1Result) {
        return v1Result;
      }
      const v0Result = yield this._v0Import(gltf);
      if (v0Result) {
        return v0Result;
      }
      return null;
    });
  }
  _v1Import(gltf) {
    return __async2(this, null, function* () {
      var _a2, _b2;
      const json = this.parser.json;
      const isVRMUsed = ((_a2 = json.extensionsUsed) == null ? void 0 : _a2.indexOf("VRMC_vrm")) !== -1;
      if (!isVRMUsed) {
        return null;
      }
      const extension = (_b2 = json.extensions) == null ? void 0 : _b2["VRMC_vrm"];
      if (!extension) {
        return null;
      }
      const specVersion = extension.specVersion;
      if (!POSSIBLE_SPEC_VERSIONS3.has(specVersion)) {
        console.warn(`VRMHumanoidLoaderPlugin: Unknown VRMC_vrm specVersion "${specVersion}"`);
        return null;
      }
      const schemaHumanoid = extension.humanoid;
      if (!schemaHumanoid) {
        return null;
      }
      const existsPreviousThumbName = schemaHumanoid.humanBones.leftThumbIntermediate != null || schemaHumanoid.humanBones.rightThumbIntermediate != null;
      const humanBones = {};
      if (schemaHumanoid.humanBones != null) {
        yield Promise.all(
          Object.entries(schemaHumanoid.humanBones).map((_0) => __async2(this, [_0], function* ([boneNameString, schemaHumanBone]) {
            let boneName = boneNameString;
            const index = schemaHumanBone.node;
            if (existsPreviousThumbName) {
              const thumbBoneName = thumbBoneNameMap[boneName];
              if (thumbBoneName != null) {
                boneName = thumbBoneName;
              }
            }
            const node = yield this.parser.getDependency("node", index);
            if (node == null) {
              console.warn(`A glTF node bound to the humanoid bone ${boneName} (index = ${index}) does not exist`);
              return;
            }
            humanBones[boneName] = { node };
          }))
        );
      }
      const humanoid = new VRMHumanoid(this._ensureRequiredBonesExist(humanBones), {
        autoUpdateHumanBones: this.autoUpdateHumanBones
      });
      gltf.scene.add(humanoid.normalizedHumanBonesRoot);
      if (this.helperRoot) {
        const helper = new VRMHumanoidHelper(humanoid);
        this.helperRoot.add(helper);
        helper.renderOrder = this.helperRoot.renderOrder;
      }
      return humanoid;
    });
  }
  _v0Import(gltf) {
    return __async2(this, null, function* () {
      var _a2;
      const json = this.parser.json;
      const vrmExt = (_a2 = json.extensions) == null ? void 0 : _a2.VRM;
      if (!vrmExt) {
        return null;
      }
      const schemaHumanoid = vrmExt.humanoid;
      if (!schemaHumanoid) {
        return null;
      }
      const humanBones = {};
      if (schemaHumanoid.humanBones != null) {
        yield Promise.all(
          schemaHumanoid.humanBones.map((bone) => __async2(this, null, function* () {
            const boneName = bone.bone;
            const index = bone.node;
            if (boneName == null || index == null) {
              return;
            }
            if (index < 0) {
              console.warn(
                `A glTF node index for the humanoid bone ${boneName} is negative (${index}), ignoring this bone.`
              );
              return;
            }
            const node = yield this.parser.getDependency("node", index);
            if (node == null) {
              console.warn(`A glTF node bound to the humanoid bone ${boneName} (index = ${index}) does not exist`);
              return;
            }
            const thumbBoneName = thumbBoneNameMap[boneName];
            const newBoneName = thumbBoneName != null ? thumbBoneName : boneName;
            if (humanBones[newBoneName] != null) {
              console.warn(
                `Multiple bone entries for ${newBoneName} detected (index = ${index}), ignoring duplicated entries.`
              );
              return;
            }
            humanBones[newBoneName] = { node };
          }))
        );
      }
      const humanoid = new VRMHumanoid(this._ensureRequiredBonesExist(humanBones), {
        autoUpdateHumanBones: this.autoUpdateHumanBones
      });
      gltf.scene.add(humanoid.normalizedHumanBonesRoot);
      if (this.helperRoot) {
        const helper = new VRMHumanoidHelper(humanoid);
        this.helperRoot.add(helper);
        helper.renderOrder = this.helperRoot.renderOrder;
      }
      return humanoid;
    });
  }
  /**
   * Ensure required bones exist in given human bones.
   * @param humanBones Human bones
   * @returns Human bones, no longer partial!
   */
  _ensureRequiredBonesExist(humanBones) {
    const missingRequiredBones = Object.values(VRMRequiredHumanBoneName).filter(
      (requiredBoneName) => humanBones[requiredBoneName] == null
    );
    if (missingRequiredBones.length > 0) {
      throw new Error(
        `VRMHumanoidLoaderPlugin: These humanoid bones are required but not exist: ${missingRequiredBones.join(", ")}`
      );
    }
    return humanBones;
  }
};
var FanBufferGeometry = class extends THREE9.BufferGeometry {
  constructor() {
    super();
    this._currentTheta = 0;
    this._currentRadius = 0;
    this.theta = 0;
    this.radius = 0;
    this._currentTheta = 0;
    this._currentRadius = 0;
    this._attrPos = new THREE9.BufferAttribute(new Float32Array(65 * 3), 3);
    this.setAttribute("position", this._attrPos);
    this._attrIndex = new THREE9.BufferAttribute(new Uint16Array(3 * 63), 1);
    this.setIndex(this._attrIndex);
    this._buildIndex();
    this.update();
  }
  update() {
    let shouldUpdateGeometry = false;
    if (this._currentTheta !== this.theta) {
      this._currentTheta = this.theta;
      shouldUpdateGeometry = true;
    }
    if (this._currentRadius !== this.radius) {
      this._currentRadius = this.radius;
      shouldUpdateGeometry = true;
    }
    if (shouldUpdateGeometry) {
      this._buildPosition();
    }
  }
  _buildPosition() {
    this._attrPos.setXYZ(0, 0, 0, 0);
    for (let i = 0; i < 64; i++) {
      const t = i / 63 * this._currentTheta;
      this._attrPos.setXYZ(i + 1, this._currentRadius * Math.sin(t), 0, this._currentRadius * Math.cos(t));
    }
    this._attrPos.needsUpdate = true;
  }
  _buildIndex() {
    for (let i = 0; i < 63; i++) {
      this._attrIndex.setXYZ(i * 3, 0, i + 1, i + 2);
    }
    this._attrIndex.needsUpdate = true;
  }
};
var LineAndSphereBufferGeometry = class extends THREE10.BufferGeometry {
  constructor() {
    super();
    this.radius = 0;
    this._currentRadius = 0;
    this.tail = new THREE10.Vector3();
    this._currentTail = new THREE10.Vector3();
    this._attrPos = new THREE10.BufferAttribute(new Float32Array(294), 3);
    this.setAttribute("position", this._attrPos);
    this._attrIndex = new THREE10.BufferAttribute(new Uint16Array(194), 1);
    this.setIndex(this._attrIndex);
    this._buildIndex();
    this.update();
  }
  update() {
    let shouldUpdateGeometry = false;
    if (this._currentRadius !== this.radius) {
      this._currentRadius = this.radius;
      shouldUpdateGeometry = true;
    }
    if (!this._currentTail.equals(this.tail)) {
      this._currentTail.copy(this.tail);
      shouldUpdateGeometry = true;
    }
    if (shouldUpdateGeometry) {
      this._buildPosition();
    }
  }
  _buildPosition() {
    for (let i = 0; i < 32; i++) {
      const t = i / 16 * Math.PI;
      this._attrPos.setXYZ(i, Math.cos(t), Math.sin(t), 0);
      this._attrPos.setXYZ(32 + i, 0, Math.cos(t), Math.sin(t));
      this._attrPos.setXYZ(64 + i, Math.sin(t), 0, Math.cos(t));
    }
    this.scale(this._currentRadius, this._currentRadius, this._currentRadius);
    this.translate(this._currentTail.x, this._currentTail.y, this._currentTail.z);
    this._attrPos.setXYZ(96, 0, 0, 0);
    this._attrPos.setXYZ(97, this._currentTail.x, this._currentTail.y, this._currentTail.z);
    this._attrPos.needsUpdate = true;
  }
  _buildIndex() {
    for (let i = 0; i < 32; i++) {
      const i1 = (i + 1) % 32;
      this._attrIndex.setXY(i * 2, i, i1);
      this._attrIndex.setXY(64 + i * 2, 32 + i, 32 + i1);
      this._attrIndex.setXY(128 + i * 2, 64 + i, 64 + i1);
    }
    this._attrIndex.setXY(192, 96, 97);
    this._attrIndex.needsUpdate = true;
  }
};
var _quatA4 = new THREE11.Quaternion();
var _quatB = new THREE11.Quaternion();
var _v3A4 = new THREE11.Vector3();
var _v3B2 = new THREE11.Vector3();
var SQRT_2_OVER_2 = Math.sqrt(2) / 2;
var QUAT_XY_CW90 = new THREE11.Quaternion(0, 0, -SQRT_2_OVER_2, SQRT_2_OVER_2);
var VEC3_POSITIVE_Y = new THREE11.Vector3(0, 1, 0);
var VRMLookAtHelper = class extends THREE11.Group {
  constructor(lookAt) {
    super();
    this.matrixAutoUpdate = false;
    this.vrmLookAt = lookAt;
    {
      const geometry = new FanBufferGeometry();
      geometry.radius = 0.5;
      const material = new THREE11.MeshBasicMaterial({
        color: 65280,
        transparent: true,
        opacity: 0.5,
        side: THREE11.DoubleSide,
        depthTest: false,
        depthWrite: false
      });
      this._meshPitch = new THREE11.Mesh(geometry, material);
      this.add(this._meshPitch);
    }
    {
      const geometry = new FanBufferGeometry();
      geometry.radius = 0.5;
      const material = new THREE11.MeshBasicMaterial({
        color: 16711680,
        transparent: true,
        opacity: 0.5,
        side: THREE11.DoubleSide,
        depthTest: false,
        depthWrite: false
      });
      this._meshYaw = new THREE11.Mesh(geometry, material);
      this.add(this._meshYaw);
    }
    {
      const geometry = new LineAndSphereBufferGeometry();
      geometry.radius = 0.1;
      const material = new THREE11.LineBasicMaterial({
        color: 16777215,
        depthTest: false,
        depthWrite: false
      });
      this._lineTarget = new THREE11.LineSegments(geometry, material);
      this._lineTarget.frustumCulled = false;
      this.add(this._lineTarget);
    }
  }
  dispose() {
    this._meshYaw.geometry.dispose();
    this._meshYaw.material.dispose();
    this._meshPitch.geometry.dispose();
    this._meshPitch.material.dispose();
    this._lineTarget.geometry.dispose();
    this._lineTarget.material.dispose();
  }
  updateMatrixWorld(force) {
    const yaw = THREE11.MathUtils.DEG2RAD * this.vrmLookAt.yaw;
    this._meshYaw.geometry.theta = yaw;
    this._meshYaw.geometry.update();
    const pitch = THREE11.MathUtils.DEG2RAD * this.vrmLookAt.pitch;
    this._meshPitch.geometry.theta = pitch;
    this._meshPitch.geometry.update();
    this.vrmLookAt.getLookAtWorldPosition(_v3A4);
    this.vrmLookAt.getLookAtWorldQuaternion(_quatA4);
    _quatA4.multiply(this.vrmLookAt.getFaceFrontQuaternion(_quatB));
    this._meshYaw.position.copy(_v3A4);
    this._meshYaw.quaternion.copy(_quatA4);
    this._meshPitch.position.copy(_v3A4);
    this._meshPitch.quaternion.copy(_quatA4);
    this._meshPitch.quaternion.multiply(_quatB.setFromAxisAngle(VEC3_POSITIVE_Y, yaw));
    this._meshPitch.quaternion.multiply(QUAT_XY_CW90);
    const { target, autoUpdate } = this.vrmLookAt;
    if (target != null && autoUpdate) {
      target.getWorldPosition(_v3B2).sub(_v3A4);
      this._lineTarget.geometry.tail.copy(_v3B2);
      this._lineTarget.geometry.update();
      this._lineTarget.position.copy(_v3A4);
    }
    super.updateMatrixWorld(force);
  }
};
var _position = new THREE12.Vector3();
var _scale = new THREE12.Vector3();
function getWorldQuaternionLite(object, out) {
  object.matrixWorld.decompose(_position, out, _scale);
  return out;
}
function calcAzimuthAltitude(vector) {
  return [Math.atan2(-vector.z, vector.x), Math.atan2(vector.y, Math.sqrt(vector.x * vector.x + vector.z * vector.z))];
}
function sanitizeAngle(angle) {
  const roundTurn = Math.round(angle / 2 / Math.PI);
  return angle - 2 * Math.PI * roundTurn;
}
var VEC3_POSITIVE_Z = new THREE13.Vector3(0, 0, 1);
var _v3A5 = new THREE13.Vector3();
var _v3B3 = new THREE13.Vector3();
var _v3C = new THREE13.Vector3();
var _quatA5 = new THREE13.Quaternion();
var _quatB2 = new THREE13.Quaternion();
var _quatC = new THREE13.Quaternion();
var _quatD = new THREE13.Quaternion();
var _eulerA = new THREE13.Euler();
var _VRMLookAt = class _VRMLookAt2 {
  /**
   * Create a new {@link VRMLookAt}.
   *
   * @param humanoid A {@link VRMHumanoid}
   * @param applier A {@link VRMLookAtApplier}
   */
  constructor(humanoid, applier) {
    this.offsetFromHeadBone = new THREE13.Vector3();
    this.autoUpdate = true;
    this.faceFront = new THREE13.Vector3(0, 0, 1);
    this.humanoid = humanoid;
    this.applier = applier;
    this._yaw = 0;
    this._pitch = 0;
    this._needsUpdate = true;
    this._restHeadWorldQuaternion = this.getLookAtWorldQuaternion(new THREE13.Quaternion());
  }
  /**
   * Its current angle around Y axis, in degree.
   */
  get yaw() {
    return this._yaw;
  }
  /**
   * Its current angle around Y axis, in degree.
   */
  set yaw(value) {
    this._yaw = value;
    this._needsUpdate = true;
  }
  /**
   * Its current angle around X axis, in degree.
   */
  get pitch() {
    return this._pitch;
  }
  /**
   * Its current angle around X axis, in degree.
   */
  set pitch(value) {
    this._pitch = value;
    this._needsUpdate = true;
  }
  /**
   * @deprecated Use {@link getEuler} instead.
   */
  get euler() {
    console.warn("VRMLookAt: euler is deprecated. use getEuler() instead.");
    return this.getEuler(new THREE13.Euler());
  }
  /**
   * Get its yaw-pitch angles as an `Euler`.
   * Does NOT consider {@link faceFront}; it returns `Euler(0, 0, 0; "YXZ")` by default regardless of the faceFront value.
   *
   * @param target The target euler
   */
  getEuler(target) {
    return target.set(THREE13.MathUtils.DEG2RAD * this._pitch, THREE13.MathUtils.DEG2RAD * this._yaw, 0, "YXZ");
  }
  /**
   * Copy the given {@link VRMLookAt} into this one.
   * {@link humanoid} must be same as the source one.
   * {@link applier} will reference the same instance as the source one.
   * @param source The {@link VRMLookAt} you want to copy
   * @returns this
   */
  copy(source) {
    if (this.humanoid !== source.humanoid) {
      throw new Error("VRMLookAt: humanoid must be same in order to copy");
    }
    this.offsetFromHeadBone.copy(source.offsetFromHeadBone);
    this.applier = source.applier;
    this.autoUpdate = source.autoUpdate;
    this.target = source.target;
    this.faceFront.copy(source.faceFront);
    return this;
  }
  /**
   * Returns a clone of this {@link VRMLookAt}.
   * Note that {@link humanoid} and {@link applier} will reference the same instance as this one.
   * @returns Copied {@link VRMLookAt}
   */
  clone() {
    return new _VRMLookAt2(this.humanoid, this.applier).copy(this);
  }
  /**
   * Reset the lookAt direction (yaw and pitch) to the initial direction.
   */
  reset() {
    this._yaw = 0;
    this._pitch = 0;
    this._needsUpdate = true;
  }
  /**
   * Get its lookAt position in world coordinate.
   *
   * @param target A target `THREE.Vector3`
   */
  getLookAtWorldPosition(target) {
    const head = this.humanoid.getRawBoneNode("head");
    return target.copy(this.offsetFromHeadBone).applyMatrix4(head.matrixWorld);
  }
  /**
   * Get its lookAt rotation in world coordinate.
   * Does NOT consider {@link faceFront}.
   *
   * @param target A target `THREE.Quaternion`
   */
  getLookAtWorldQuaternion(target) {
    const head = this.humanoid.getRawBoneNode("head");
    return getWorldQuaternionLite(head, target);
  }
  /**
   * Get a quaternion that rotates the +Z unit vector of the humanoid Head to the {@link faceFront} direction.
   *
   * @param target A target `THREE.Quaternion`
   */
  getFaceFrontQuaternion(target) {
    if (this.faceFront.distanceToSquared(VEC3_POSITIVE_Z) < 0.01) {
      return target.copy(this._restHeadWorldQuaternion).invert();
    }
    const [faceFrontAzimuth, faceFrontAltitude] = calcAzimuthAltitude(this.faceFront);
    _eulerA.set(0, 0.5 * Math.PI + faceFrontAzimuth, faceFrontAltitude, "YZX");
    return target.setFromEuler(_eulerA).premultiply(_quatD.copy(this._restHeadWorldQuaternion).invert());
  }
  /**
   * Get its LookAt direction in world coordinate.
   *
   * @param target A target `THREE.Vector3`
   */
  getLookAtWorldDirection(target) {
    this.getLookAtWorldQuaternion(_quatB2);
    this.getFaceFrontQuaternion(_quatC);
    return target.copy(VEC3_POSITIVE_Z).applyQuaternion(_quatB2).applyQuaternion(_quatC).applyEuler(this.getEuler(_eulerA));
  }
  /**
   * Set its lookAt target position.
   *
   * Note that its result will be instantly overwritten if {@link VRMLookAtHead.autoUpdate} is enabled.
   *
   * If you want to track an object continuously, you might want to use {@link target} instead.
   *
   * @param position A target position, in world space
   */
  lookAt(position) {
    const headRotDiffInv = _quatA5.copy(this._restHeadWorldQuaternion).multiply(quatInvertCompat(this.getLookAtWorldQuaternion(_quatB2)));
    const headPos = this.getLookAtWorldPosition(_v3B3);
    const lookAtDir = _v3C.copy(position).sub(headPos).applyQuaternion(headRotDiffInv).normalize();
    const [azimuthFrom, altitudeFrom] = calcAzimuthAltitude(this.faceFront);
    const [azimuthTo, altitudeTo] = calcAzimuthAltitude(lookAtDir);
    const yaw = sanitizeAngle(azimuthTo - azimuthFrom);
    const pitch = sanitizeAngle(altitudeFrom - altitudeTo);
    this._yaw = THREE13.MathUtils.RAD2DEG * yaw;
    this._pitch = THREE13.MathUtils.RAD2DEG * pitch;
    this._needsUpdate = true;
  }
  /**
   * Update the VRMLookAtHead.
   * If {@link autoUpdate} is enabled, this will make it look at the {@link target}.
   *
   * @param delta deltaTime, it isn't used though. You can use the parameter if you want to use this in your own extended {@link VRMLookAt}.
   */
  update(delta) {
    if (this.target != null && this.autoUpdate) {
      this.lookAt(this.target.getWorldPosition(_v3A5));
    }
    if (this._needsUpdate) {
      this._needsUpdate = false;
      this.applier.applyYawPitch(this._yaw, this._pitch);
    }
  }
};
_VRMLookAt.EULER_ORDER = "YXZ";
var VRMLookAt = _VRMLookAt;
var VEC3_POSITIVE_Z2 = new THREE14.Vector3(0, 0, 1);
var _quatA6 = new THREE14.Quaternion();
var _quatB3 = new THREE14.Quaternion();
var _eulerA2 = new THREE14.Euler(0, 0, 0, "YXZ");
var VRMLookAtBoneApplier = class {
  /**
   * Create a new {@link VRMLookAtBoneApplier}.
   *
   * @param humanoid A {@link VRMHumanoid}
   * @param rangeMapHorizontalInner A {@link VRMLookAtRangeMap} used for inner transverse direction
   * @param rangeMapHorizontalOuter A {@link VRMLookAtRangeMap} used for outer transverse direction
   * @param rangeMapVerticalDown A {@link VRMLookAtRangeMap} used for down direction
   * @param rangeMapVerticalUp A {@link VRMLookAtRangeMap} used for up direction
   */
  constructor(humanoid, rangeMapHorizontalInner, rangeMapHorizontalOuter, rangeMapVerticalDown, rangeMapVerticalUp) {
    this.humanoid = humanoid;
    this.rangeMapHorizontalInner = rangeMapHorizontalInner;
    this.rangeMapHorizontalOuter = rangeMapHorizontalOuter;
    this.rangeMapVerticalDown = rangeMapVerticalDown;
    this.rangeMapVerticalUp = rangeMapVerticalUp;
    this.faceFront = new THREE14.Vector3(0, 0, 1);
    this._restQuatLeftEye = new THREE14.Quaternion();
    this._restQuatRightEye = new THREE14.Quaternion();
    this._restLeftEyeParentWorldQuat = new THREE14.Quaternion();
    this._restRightEyeParentWorldQuat = new THREE14.Quaternion();
    const leftEye = this.humanoid.getRawBoneNode("leftEye");
    const rightEye = this.humanoid.getRawBoneNode("rightEye");
    if (leftEye) {
      this._restQuatLeftEye.copy(leftEye.quaternion);
      getWorldQuaternionLite(leftEye.parent, this._restLeftEyeParentWorldQuat);
    }
    if (rightEye) {
      this._restQuatRightEye.copy(rightEye.quaternion);
      getWorldQuaternionLite(rightEye.parent, this._restRightEyeParentWorldQuat);
    }
  }
  /**
   * Apply the input angle to its associated VRM model.
   *
   * @param yaw Rotation around Y axis, in degree
   * @param pitch Rotation around X axis, in degree
   */
  applyYawPitch(yaw, pitch) {
    const leftEye = this.humanoid.getRawBoneNode("leftEye");
    const rightEye = this.humanoid.getRawBoneNode("rightEye");
    const leftEyeNormalized = this.humanoid.getNormalizedBoneNode("leftEye");
    const rightEyeNormalized = this.humanoid.getNormalizedBoneNode("rightEye");
    if (leftEye) {
      if (pitch < 0) {
        _eulerA2.x = -THREE14.MathUtils.DEG2RAD * this.rangeMapVerticalDown.map(-pitch);
      } else {
        _eulerA2.x = THREE14.MathUtils.DEG2RAD * this.rangeMapVerticalUp.map(pitch);
      }
      if (yaw < 0) {
        _eulerA2.y = -THREE14.MathUtils.DEG2RAD * this.rangeMapHorizontalInner.map(-yaw);
      } else {
        _eulerA2.y = THREE14.MathUtils.DEG2RAD * this.rangeMapHorizontalOuter.map(yaw);
      }
      _quatA6.setFromEuler(_eulerA2);
      this._getWorldFaceFrontQuat(_quatB3);
      leftEyeNormalized.quaternion.copy(_quatB3).multiply(_quatA6).multiply(_quatB3.invert());
      _quatA6.copy(this._restLeftEyeParentWorldQuat);
      leftEye.quaternion.copy(leftEyeNormalized.quaternion).multiply(_quatA6).premultiply(_quatA6.invert()).multiply(this._restQuatLeftEye);
    }
    if (rightEye) {
      if (pitch < 0) {
        _eulerA2.x = -THREE14.MathUtils.DEG2RAD * this.rangeMapVerticalDown.map(-pitch);
      } else {
        _eulerA2.x = THREE14.MathUtils.DEG2RAD * this.rangeMapVerticalUp.map(pitch);
      }
      if (yaw < 0) {
        _eulerA2.y = -THREE14.MathUtils.DEG2RAD * this.rangeMapHorizontalOuter.map(-yaw);
      } else {
        _eulerA2.y = THREE14.MathUtils.DEG2RAD * this.rangeMapHorizontalInner.map(yaw);
      }
      _quatA6.setFromEuler(_eulerA2);
      this._getWorldFaceFrontQuat(_quatB3);
      rightEyeNormalized.quaternion.copy(_quatB3).multiply(_quatA6).multiply(_quatB3.invert());
      _quatA6.copy(this._restRightEyeParentWorldQuat);
      rightEye.quaternion.copy(rightEyeNormalized.quaternion).multiply(_quatA6).premultiply(_quatA6.invert()).multiply(this._restQuatRightEye);
    }
  }
  /**
   * @deprecated Use {@link applyYawPitch} instead.
   */
  lookAt(euler) {
    console.warn("VRMLookAtBoneApplier: lookAt() is deprecated. use apply() instead.");
    const yaw = THREE14.MathUtils.RAD2DEG * euler.y;
    const pitch = THREE14.MathUtils.RAD2DEG * euler.x;
    this.applyYawPitch(yaw, pitch);
  }
  /**
   * Get a quaternion that rotates the world-space +Z unit vector to the {@link faceFront} direction.
   *
   * @param target A target `THREE.Quaternion`
   */
  _getWorldFaceFrontQuat(target) {
    if (this.faceFront.distanceToSquared(VEC3_POSITIVE_Z2) < 0.01) {
      return target.identity();
    }
    const [faceFrontAzimuth, faceFrontAltitude] = calcAzimuthAltitude(this.faceFront);
    _eulerA2.set(0, 0.5 * Math.PI + faceFrontAzimuth, faceFrontAltitude, "YZX");
    return target.setFromEuler(_eulerA2);
  }
};
VRMLookAtBoneApplier.type = "bone";
var VRMLookAtExpressionApplier = class {
  /**
   * Create a new {@link VRMLookAtExpressionApplier}.
   *
   * @param expressions A {@link VRMExpressionManager}
   * @param rangeMapHorizontalInner A {@link VRMLookAtRangeMap} used for inner transverse direction
   * @param rangeMapHorizontalOuter A {@link VRMLookAtRangeMap} used for outer transverse direction
   * @param rangeMapVerticalDown A {@link VRMLookAtRangeMap} used for down direction
   * @param rangeMapVerticalUp A {@link VRMLookAtRangeMap} used for up direction
   */
  constructor(expressions, rangeMapHorizontalInner, rangeMapHorizontalOuter, rangeMapVerticalDown, rangeMapVerticalUp) {
    this.expressions = expressions;
    this.rangeMapHorizontalInner = rangeMapHorizontalInner;
    this.rangeMapHorizontalOuter = rangeMapHorizontalOuter;
    this.rangeMapVerticalDown = rangeMapVerticalDown;
    this.rangeMapVerticalUp = rangeMapVerticalUp;
  }
  /**
   * Apply the input angle to its associated VRM model.
   *
   * @param yaw Rotation around Y axis, in degree
   * @param pitch Rotation around X axis, in degree
   */
  applyYawPitch(yaw, pitch) {
    if (pitch < 0) {
      this.expressions.setValue("lookDown", 0);
      this.expressions.setValue("lookUp", this.rangeMapVerticalUp.map(-pitch));
    } else {
      this.expressions.setValue("lookUp", 0);
      this.expressions.setValue("lookDown", this.rangeMapVerticalDown.map(pitch));
    }
    if (yaw < 0) {
      this.expressions.setValue("lookLeft", 0);
      this.expressions.setValue("lookRight", this.rangeMapHorizontalOuter.map(-yaw));
    } else {
      this.expressions.setValue("lookRight", 0);
      this.expressions.setValue("lookLeft", this.rangeMapHorizontalOuter.map(yaw));
    }
  }
  /**
   * @deprecated Use {@link applyYawPitch} instead.
   */
  lookAt(euler) {
    console.warn("VRMLookAtBoneApplier: lookAt() is deprecated. use apply() instead.");
    const yaw = THREE15.MathUtils.RAD2DEG * euler.y;
    const pitch = THREE15.MathUtils.RAD2DEG * euler.x;
    this.applyYawPitch(yaw, pitch);
  }
};
VRMLookAtExpressionApplier.type = "expression";
var VRMLookAtRangeMap = class {
  /**
   * Create a new {@link VRMLookAtRangeMap}.
   *
   * @param inputMaxValue The {@link inputMaxValue} of the map
   * @param outputScale The {@link outputScale} of the map
   */
  constructor(inputMaxValue, outputScale) {
    this.inputMaxValue = inputMaxValue;
    this.outputScale = outputScale;
  }
  /**
   * Evaluate an input value and output a mapped value.
   * @param src The input value
   */
  map(src) {
    return this.outputScale * saturate(src / this.inputMaxValue);
  }
};
var POSSIBLE_SPEC_VERSIONS4 = /* @__PURE__ */ new Set(["1.0", "1.0-beta"]);
var INPUT_MAX_VALUE_MINIMUM = 0.01;
var VRMLookAtLoaderPlugin = class {
  get name() {
    return "VRMLookAtLoaderPlugin";
  }
  constructor(parser, options) {
    this.parser = parser;
    this.helperRoot = options == null ? void 0 : options.helperRoot;
  }
  afterRoot(gltf) {
    return __async2(this, null, function* () {
      const vrmHumanoid = gltf.userData.vrmHumanoid;
      if (vrmHumanoid === null) {
        return;
      } else if (vrmHumanoid === void 0) {
        throw new Error("VRMLookAtLoaderPlugin: vrmHumanoid is undefined. VRMHumanoidLoaderPlugin have to be used first");
      }
      const vrmExpressionManager = gltf.userData.vrmExpressionManager;
      if (vrmExpressionManager === null) {
        return;
      } else if (vrmExpressionManager === void 0) {
        throw new Error(
          "VRMLookAtLoaderPlugin: vrmExpressionManager is undefined. VRMExpressionLoaderPlugin have to be used first"
        );
      }
      gltf.userData.vrmLookAt = yield this._import(gltf, vrmHumanoid, vrmExpressionManager);
    });
  }
  /**
   * Import a {@link VRMLookAt} from a VRM.
   *
   * @param gltf A parsed result of GLTF taken from GLTFLoader
   * @param humanoid A {@link VRMHumanoid} instance that represents the VRM
   * @param expressions A {@link VRMExpressionManager} instance that represents the VRM
   */
  _import(gltf, humanoid, expressions) {
    return __async2(this, null, function* () {
      if (humanoid == null || expressions == null) {
        return null;
      }
      const v1Result = yield this._v1Import(gltf, humanoid, expressions);
      if (v1Result) {
        return v1Result;
      }
      const v0Result = yield this._v0Import(gltf, humanoid, expressions);
      if (v0Result) {
        return v0Result;
      }
      return null;
    });
  }
  _v1Import(gltf, humanoid, expressions) {
    return __async2(this, null, function* () {
      var _a2, _b2, _c;
      const json = this.parser.json;
      const isVRMUsed = ((_a2 = json.extensionsUsed) == null ? void 0 : _a2.indexOf("VRMC_vrm")) !== -1;
      if (!isVRMUsed) {
        return null;
      }
      const extension = (_b2 = json.extensions) == null ? void 0 : _b2["VRMC_vrm"];
      if (!extension) {
        return null;
      }
      const specVersion = extension.specVersion;
      if (!POSSIBLE_SPEC_VERSIONS4.has(specVersion)) {
        console.warn(`VRMLookAtLoaderPlugin: Unknown VRMC_vrm specVersion "${specVersion}"`);
        return null;
      }
      const schemaLookAt = extension.lookAt;
      if (!schemaLookAt) {
        return null;
      }
      const defaultOutputScale = schemaLookAt.type === "expression" ? 1 : 10;
      const mapHI = this._v1ImportRangeMap(schemaLookAt.rangeMapHorizontalInner, defaultOutputScale);
      const mapHO = this._v1ImportRangeMap(schemaLookAt.rangeMapHorizontalOuter, defaultOutputScale);
      const mapVD = this._v1ImportRangeMap(schemaLookAt.rangeMapVerticalDown, defaultOutputScale);
      const mapVU = this._v1ImportRangeMap(schemaLookAt.rangeMapVerticalUp, defaultOutputScale);
      let applier;
      if (schemaLookAt.type === "expression") {
        applier = new VRMLookAtExpressionApplier(expressions, mapHI, mapHO, mapVD, mapVU);
      } else {
        applier = new VRMLookAtBoneApplier(humanoid, mapHI, mapHO, mapVD, mapVU);
      }
      const lookAt = this._importLookAt(humanoid, applier);
      lookAt.offsetFromHeadBone.fromArray((_c = schemaLookAt.offsetFromHeadBone) != null ? _c : [0, 0.06, 0]);
      return lookAt;
    });
  }
  _v1ImportRangeMap(schemaRangeMap, defaultOutputScale) {
    var _a2, _b2;
    let inputMaxValue = (_a2 = schemaRangeMap == null ? void 0 : schemaRangeMap.inputMaxValue) != null ? _a2 : 90;
    const outputScale = (_b2 = schemaRangeMap == null ? void 0 : schemaRangeMap.outputScale) != null ? _b2 : defaultOutputScale;
    if (inputMaxValue < INPUT_MAX_VALUE_MINIMUM) {
      console.warn(
        "VRMLookAtLoaderPlugin: inputMaxValue of a range map is too small. Consider reviewing the range map!"
      );
      inputMaxValue = INPUT_MAX_VALUE_MINIMUM;
    }
    return new VRMLookAtRangeMap(inputMaxValue, outputScale);
  }
  _v0Import(gltf, humanoid, expressions) {
    return __async2(this, null, function* () {
      var _a2, _b2, _c, _d2;
      const json = this.parser.json;
      const vrmExt = (_a2 = json.extensions) == null ? void 0 : _a2.VRM;
      if (!vrmExt) {
        return null;
      }
      const schemaFirstPerson = vrmExt.firstPerson;
      if (!schemaFirstPerson) {
        return null;
      }
      const defaultOutputScale = schemaFirstPerson.lookAtTypeName === "BlendShape" ? 1 : 10;
      const mapHI = this._v0ImportDegreeMap(schemaFirstPerson.lookAtHorizontalInner, defaultOutputScale);
      const mapHO = this._v0ImportDegreeMap(schemaFirstPerson.lookAtHorizontalOuter, defaultOutputScale);
      const mapVD = this._v0ImportDegreeMap(schemaFirstPerson.lookAtVerticalDown, defaultOutputScale);
      const mapVU = this._v0ImportDegreeMap(schemaFirstPerson.lookAtVerticalUp, defaultOutputScale);
      let applier;
      if (schemaFirstPerson.lookAtTypeName === "BlendShape") {
        applier = new VRMLookAtExpressionApplier(expressions, mapHI, mapHO, mapVD, mapVU);
      } else {
        applier = new VRMLookAtBoneApplier(humanoid, mapHI, mapHO, mapVD, mapVU);
      }
      const lookAt = this._importLookAt(humanoid, applier);
      if (schemaFirstPerson.firstPersonBoneOffset) {
        lookAt.offsetFromHeadBone.set(
          (_b2 = schemaFirstPerson.firstPersonBoneOffset.x) != null ? _b2 : 0,
          (_c = schemaFirstPerson.firstPersonBoneOffset.y) != null ? _c : 0.06,
          -((_d2 = schemaFirstPerson.firstPersonBoneOffset.z) != null ? _d2 : 0)
        );
      } else {
        lookAt.offsetFromHeadBone.set(0, 0.06, 0);
      }
      lookAt.faceFront.set(0, 0, -1);
      if (applier instanceof VRMLookAtBoneApplier) {
        applier.faceFront.set(0, 0, -1);
      }
      return lookAt;
    });
  }
  _v0ImportDegreeMap(schemaDegreeMap, defaultOutputScale) {
    var _a2, _b2;
    const curve = schemaDegreeMap == null ? void 0 : schemaDegreeMap.curve;
    if (JSON.stringify(curve) !== "[0,0,0,1,1,1,1,0]") {
      console.warn("Curves of LookAtDegreeMap defined in VRM 0.0 are not supported");
    }
    let xRange = (_a2 = schemaDegreeMap == null ? void 0 : schemaDegreeMap.xRange) != null ? _a2 : 90;
    const yRange = (_b2 = schemaDegreeMap == null ? void 0 : schemaDegreeMap.yRange) != null ? _b2 : defaultOutputScale;
    if (xRange < INPUT_MAX_VALUE_MINIMUM) {
      console.warn("VRMLookAtLoaderPlugin: xRange of a degree map is too small. Consider reviewing the degree map!");
      xRange = INPUT_MAX_VALUE_MINIMUM;
    }
    return new VRMLookAtRangeMap(xRange, yRange);
  }
  _importLookAt(humanoid, applier) {
    const lookAt = new VRMLookAt(humanoid, applier);
    if (this.helperRoot) {
      const helper = new VRMLookAtHelper(lookAt);
      this.helperRoot.add(helper);
      helper.renderOrder = this.helperRoot.renderOrder;
    }
    return lookAt;
  }
};
function resolveURL(url, path) {
  if (typeof url !== "string" || url === "") return "";
  if (/^https?:\/\//i.test(path) && /^\//.test(url)) {
    path = path.replace(/(^https?:\/\/[^/]+).*/i, "$1");
  }
  if (/^(https?:)?\/\//i.test(url)) return url;
  if (/^data:.*,.*$/i.test(url)) return url;
  if (/^blob:.*$/i.test(url)) return url;
  return path + url;
}
var POSSIBLE_SPEC_VERSIONS5 = /* @__PURE__ */ new Set(["1.0", "1.0-beta"]);
var VRMMetaLoaderPlugin = class {
  get name() {
    return "VRMMetaLoaderPlugin";
  }
  constructor(parser, options) {
    var _a2, _b2, _c;
    this.parser = parser;
    this.needThumbnailImage = (_a2 = options == null ? void 0 : options.needThumbnailImage) != null ? _a2 : false;
    this.acceptLicenseUrls = (_b2 = options == null ? void 0 : options.acceptLicenseUrls) != null ? _b2 : ["https://vrm.dev/licenses/1.0/"];
    this.acceptV0Meta = (_c = options == null ? void 0 : options.acceptV0Meta) != null ? _c : true;
  }
  afterRoot(gltf) {
    return __async2(this, null, function* () {
      gltf.userData.vrmMeta = yield this._import(gltf);
    });
  }
  _import(gltf) {
    return __async2(this, null, function* () {
      const v1Result = yield this._v1Import(gltf);
      if (v1Result != null) {
        return v1Result;
      }
      const v0Result = yield this._v0Import(gltf);
      if (v0Result != null) {
        return v0Result;
      }
      return null;
    });
  }
  _v1Import(gltf) {
    return __async2(this, null, function* () {
      var _a2, _b2, _c;
      const json = this.parser.json;
      const isVRMUsed = ((_a2 = json.extensionsUsed) == null ? void 0 : _a2.indexOf("VRMC_vrm")) !== -1;
      if (!isVRMUsed) {
        return null;
      }
      const extension = (_b2 = json.extensions) == null ? void 0 : _b2["VRMC_vrm"];
      if (extension == null) {
        return null;
      }
      const specVersion = extension.specVersion;
      if (!POSSIBLE_SPEC_VERSIONS5.has(specVersion)) {
        console.warn(`VRMMetaLoaderPlugin: Unknown VRMC_vrm specVersion "${specVersion}"`);
        return null;
      }
      const schemaMeta = extension.meta;
      if (!schemaMeta) {
        return null;
      }
      const licenseUrl = schemaMeta.licenseUrl;
      const acceptLicenseUrlsSet = new Set(this.acceptLicenseUrls);
      if (!acceptLicenseUrlsSet.has(licenseUrl)) {
        throw new Error(`VRMMetaLoaderPlugin: The license url "${licenseUrl}" is not accepted`);
      }
      let thumbnailImage = void 0;
      if (this.needThumbnailImage && schemaMeta.thumbnailImage != null) {
        thumbnailImage = (_c = yield this._extractGLTFImage(schemaMeta.thumbnailImage)) != null ? _c : void 0;
      }
      return {
        metaVersion: "1",
        name: schemaMeta.name,
        version: schemaMeta.version,
        authors: schemaMeta.authors,
        copyrightInformation: schemaMeta.copyrightInformation,
        contactInformation: schemaMeta.contactInformation,
        references: schemaMeta.references,
        thirdPartyLicenses: schemaMeta.thirdPartyLicenses,
        thumbnailImage,
        licenseUrl: schemaMeta.licenseUrl,
        avatarPermission: schemaMeta.avatarPermission,
        allowExcessivelyViolentUsage: schemaMeta.allowExcessivelyViolentUsage,
        allowExcessivelySexualUsage: schemaMeta.allowExcessivelySexualUsage,
        commercialUsage: schemaMeta.commercialUsage,
        allowPoliticalOrReligiousUsage: schemaMeta.allowPoliticalOrReligiousUsage,
        allowAntisocialOrHateUsage: schemaMeta.allowAntisocialOrHateUsage,
        creditNotation: schemaMeta.creditNotation,
        allowRedistribution: schemaMeta.allowRedistribution,
        modification: schemaMeta.modification,
        otherLicenseUrl: schemaMeta.otherLicenseUrl
      };
    });
  }
  _v0Import(gltf) {
    return __async2(this, null, function* () {
      var _a2;
      const json = this.parser.json;
      const vrmExt = (_a2 = json.extensions) == null ? void 0 : _a2.VRM;
      if (!vrmExt) {
        return null;
      }
      const schemaMeta = vrmExt.meta;
      if (!schemaMeta) {
        return null;
      }
      if (!this.acceptV0Meta) {
        throw new Error("VRMMetaLoaderPlugin: Attempted to load VRM0.0 meta but acceptV0Meta is false");
      }
      let texture;
      if (this.needThumbnailImage && schemaMeta.texture != null && schemaMeta.texture !== -1) {
        texture = yield this.parser.getDependency("texture", schemaMeta.texture);
      }
      return {
        metaVersion: "0",
        allowedUserName: schemaMeta.allowedUserName,
        author: schemaMeta.author,
        commercialUssageName: schemaMeta.commercialUssageName,
        contactInformation: schemaMeta.contactInformation,
        licenseName: schemaMeta.licenseName,
        otherLicenseUrl: schemaMeta.otherLicenseUrl,
        otherPermissionUrl: schemaMeta.otherPermissionUrl,
        reference: schemaMeta.reference,
        sexualUssageName: schemaMeta.sexualUssageName,
        texture: texture != null ? texture : void 0,
        title: schemaMeta.title,
        version: schemaMeta.version,
        violentUssageName: schemaMeta.violentUssageName
      };
    });
  }
  _extractGLTFImage(index) {
    return __async2(this, null, function* () {
      var _a2;
      const json = this.parser.json;
      const source = (_a2 = json.images) == null ? void 0 : _a2[index];
      if (source == null) {
        console.warn(
          `VRMMetaLoaderPlugin: Attempt to use images[${index}] of glTF as a thumbnail but the image doesn't exist`
        );
        return null;
      }
      let sourceURI = source.uri;
      if (source.bufferView != null) {
        const bufferView = yield this.parser.getDependency("bufferView", source.bufferView);
        const blob = new Blob([bufferView], { type: source.mimeType });
        sourceURI = URL.createObjectURL(blob);
      }
      if (sourceURI == null) {
        console.warn(
          `VRMMetaLoaderPlugin: Attempt to use images[${index}] of glTF as a thumbnail but the image couldn't load properly`
        );
        return null;
      }
      const loader = new THREE16.ImageLoader();
      return yield loader.loadAsync(resolveURL(sourceURI, this.parser.options.path)).catch((error) => {
        console.error(error);
        console.warn("VRMMetaLoaderPlugin: Failed to load a thumbnail image");
        return null;
      });
    });
  }
};
var VRMCore = class {
  /**
   * Create a new VRM instance.
   *
   * @param params {@link VRMParameters} that represents components of the VRM
   */
  constructor(params) {
    this.scene = params.scene;
    this.meta = params.meta;
    this.humanoid = params.humanoid;
    this.expressionManager = params.expressionManager;
    this.firstPerson = params.firstPerson;
    this.lookAt = params.lookAt;
  }
  /**
   * **You need to call this on your update loop.**
   *
   * This function updates every VRM components.
   *
   * @param delta deltaTime
   */
  update(delta) {
    this.humanoid.update();
    if (this.lookAt) {
      this.lookAt.update(delta);
    }
    if (this.expressionManager) {
      this.expressionManager.update();
    }
  }
};
var VRM = class extends VRMCore {
  /**
   * Create a new VRM instance.
   *
   * @param params {@link VRMParameters} that represents components of the VRM
   */
  constructor(params) {
    super(params);
    this.materials = params.materials;
    this.springBoneManager = params.springBoneManager;
    this.nodeConstraintManager = params.nodeConstraintManager;
  }
  /**
   * **You need to call this on your update loop.**
   *
   * This function updates every VRM components.
   *
   * @param delta deltaTime
   */
  update(delta) {
    super.update(delta);
    if (this.nodeConstraintManager) {
      this.nodeConstraintManager.update();
    }
    if (this.springBoneManager) {
      this.springBoneManager.update(delta);
    }
    if (this.materials) {
      this.materials.forEach((material) => {
        if (material.update) {
          material.update(delta);
        }
      });
    }
  }
};
var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __async3 = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected2 = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected2);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
var colorSpaceEncodingMap = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "": 3e3,
  srgb: 3001
};
function setTextureColorSpace(texture, colorSpace) {
  if (parseInt(THREE17.REVISION, 10) >= 152) {
    texture.colorSpace = colorSpace;
  } else {
    texture.encoding = colorSpaceEncodingMap[colorSpace];
  }
}
var GLTFMToonMaterialParamsAssignHelper = class {
  get pending() {
    return Promise.all(this._pendings);
  }
  constructor(parser, materialParams) {
    this._parser = parser;
    this._materialParams = materialParams;
    this._pendings = [];
  }
  assignPrimitive(key, value) {
    if (value != null) {
      this._materialParams[key] = value;
    }
  }
  assignColor(key, value, convertSRGBToLinear) {
    if (value != null) {
      const color = new THREE22.Color().fromArray(value);
      if (convertSRGBToLinear) {
        color.convertSRGBToLinear();
      }
      this._materialParams[key] = color;
    }
  }
  assignTexture(key, schemaTexture, isColorTexture) {
    return __async3(this, null, function* () {
      const promise = (() => __async3(this, null, function* () {
        if (schemaTexture != null) {
          const texture = yield this._parser.assignTexture(this._materialParams, key, schemaTexture);
          if (texture == null) {
            console.warn(
              "GLTFMToonMaterialParamsAssignHelper: Failed to load texture. The rendering result may be wrong"
            );
            return;
          }
          if (isColorTexture) {
            setTextureColorSpace(texture, "srgb");
          }
        }
      }))();
      this._pendings.push(promise);
      return promise;
    });
  }
  assignTextureByIndex(key, textureIndex, isColorTexture) {
    return __async3(this, null, function* () {
      return this.assignTexture(key, textureIndex != null ? { index: textureIndex } : void 0, isColorTexture);
    });
  }
};
var mtoon_default = "// #define PHONG\n\nvarying vec3 vViewPosition;\n\n#ifndef FLAT_SHADED\n  varying vec3 vNormal;\n#endif\n\n#include <common>\n\n// #include <uv_pars_vertex>\n#ifdef MTOON_USE_UV\n  varying vec2 vUv;\n\n  // COMPAT: pre-r151 uses a common uvTransform\n  #if THREE_VRM_THREE_REVISION < 151\n    uniform mat3 uvTransform;\n  #endif\n#endif\n\n// #include <uv2_pars_vertex>\n// COMAPT: pre-r151 uses uv2 for lightMap and aoMap\n#if THREE_VRM_THREE_REVISION < 151\n  #if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )\n    attribute vec2 uv2;\n    varying vec2 vUv2;\n    uniform mat3 uv2Transform;\n  #endif\n#endif\n\n// #include <displacementmap_pars_vertex>\n// #include <envmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\n\n#ifdef USE_OUTLINEWIDTHMULTIPLYTEXTURE\n  uniform sampler2D outlineWidthMultiplyTexture;\n  uniform mat3 outlineWidthMultiplyTextureUvTransform;\n#endif\n\nuniform float outlineWidthFactor;\n\nvoid main() {\n\n  // #include <uv_vertex>\n  #ifdef MTOON_USE_UV\n    // COMPAT: pre-r151 uses a common uvTransform\n    #if THREE_VRM_THREE_REVISION >= 151\n      vUv = uv;\n    #else\n      vUv = ( uvTransform * vec3( uv, 1 ) ).xy;\n    #endif\n  #endif\n\n  // #include <uv2_vertex>\n  // COMAPT: pre-r151 uses uv2 for lightMap and aoMap\n  #if THREE_VRM_THREE_REVISION < 151\n    #if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )\n      vUv2 = ( uv2Transform * vec3( uv2, 1 ) ).xy;\n    #endif\n  #endif\n\n  #include <color_vertex>\n\n  #include <beginnormal_vertex>\n  #include <morphnormal_vertex>\n  #include <skinbase_vertex>\n  #include <skinnormal_vertex>\n\n  // we need this to compute the outline properly\n  objectNormal = normalize( objectNormal );\n\n  #include <defaultnormal_vertex>\n\n  #ifndef FLAT_SHADED // Normal computed with derivatives when FLAT_SHADED\n    vNormal = normalize( transformedNormal );\n  #endif\n\n  #include <begin_vertex>\n\n  #include <morphtarget_vertex>\n  #include <skinning_vertex>\n  // #include <displacementmap_vertex>\n  #include <project_vertex>\n  #include <logdepthbuf_vertex>\n  #include <clipping_planes_vertex>\n\n  vViewPosition = - mvPosition.xyz;\n\n  #ifdef OUTLINE\n    float worldNormalLength = length( transformedNormal );\n    vec3 outlineOffset = outlineWidthFactor * worldNormalLength * objectNormal;\n\n    #ifdef USE_OUTLINEWIDTHMULTIPLYTEXTURE\n      vec2 outlineWidthMultiplyTextureUv = ( outlineWidthMultiplyTextureUvTransform * vec3( vUv, 1 ) ).xy;\n      float outlineTex = texture2D( outlineWidthMultiplyTexture, outlineWidthMultiplyTextureUv ).g;\n      outlineOffset *= outlineTex;\n    #endif\n\n    #ifdef OUTLINE_WIDTH_SCREEN\n      outlineOffset *= vViewPosition.z / projectionMatrix[ 1 ].y;\n    #endif\n\n    gl_Position = projectionMatrix * modelViewMatrix * vec4( outlineOffset + transformed, 1.0 );\n\n    gl_Position.z += 1E-6 * gl_Position.w; // anti-artifact magic\n  #endif\n\n  #include <worldpos_vertex>\n  // #include <envmap_vertex>\n  #include <shadowmap_vertex>\n  #include <fog_vertex>\n\n}";
var mtoon_default2 = "// #define PHONG\n\nuniform vec3 litFactor;\n\nuniform float opacity;\n\nuniform vec3 shadeColorFactor;\n#ifdef USE_SHADEMULTIPLYTEXTURE\n  uniform sampler2D shadeMultiplyTexture;\n  uniform mat3 shadeMultiplyTextureUvTransform;\n#endif\n\nuniform float shadingShiftFactor;\nuniform float shadingToonyFactor;\n\n#ifdef USE_SHADINGSHIFTTEXTURE\n  uniform sampler2D shadingShiftTexture;\n  uniform mat3 shadingShiftTextureUvTransform;\n  uniform float shadingShiftTextureScale;\n#endif\n\nuniform float giEqualizationFactor;\n\nuniform vec3 parametricRimColorFactor;\n#ifdef USE_RIMMULTIPLYTEXTURE\n  uniform sampler2D rimMultiplyTexture;\n  uniform mat3 rimMultiplyTextureUvTransform;\n#endif\nuniform float rimLightingMixFactor;\nuniform float parametricRimFresnelPowerFactor;\nuniform float parametricRimLiftFactor;\n\n#ifdef USE_MATCAPTEXTURE\n  uniform vec3 matcapFactor;\n  uniform sampler2D matcapTexture;\n  uniform mat3 matcapTextureUvTransform;\n#endif\n\nuniform vec3 emissive;\nuniform float emissiveIntensity;\n\nuniform vec3 outlineColorFactor;\nuniform float outlineLightingMixFactor;\n\n#ifdef USE_UVANIMATIONMASKTEXTURE\n  uniform sampler2D uvAnimationMaskTexture;\n  uniform mat3 uvAnimationMaskTextureUvTransform;\n#endif\n\nuniform float uvAnimationScrollXOffset;\nuniform float uvAnimationScrollYOffset;\nuniform float uvAnimationRotationPhase;\n\n#include <common>\n#include <packing>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n\n// #include <uv_pars_fragment>\n#if ( defined( MTOON_USE_UV ) && !defined( MTOON_UVS_VERTEX_ONLY ) )\n  varying vec2 vUv;\n#endif\n\n// #include <uv2_pars_fragment>\n// COMAPT: pre-r151 uses uv2 for lightMap and aoMap\n#if THREE_VRM_THREE_REVISION < 151\n  #if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )\n    varying vec2 vUv2;\n  #endif\n#endif\n\n#include <map_pars_fragment>\n\n#ifdef USE_MAP\n  uniform mat3 mapUvTransform;\n#endif\n\n// #include <alphamap_pars_fragment>\n\n#include <alphatest_pars_fragment>\n\n#include <aomap_pars_fragment>\n// #include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n\n#ifdef USE_EMISSIVEMAP\n  uniform mat3 emissiveMapUvTransform;\n#endif\n\n// #include <envmap_common_pars_fragment>\n// #include <envmap_pars_fragment>\n// #include <cube_uv_reflection_fragment>\n#include <fog_pars_fragment>\n\n// #include <bsdfs>\n// COMPAT: pre-r151 doesn't have BRDF_Lambert in <common>\n#if THREE_VRM_THREE_REVISION < 151\n  vec3 BRDF_Lambert( const in vec3 diffuseColor ) {\n    return RECIPROCAL_PI * diffuseColor;\n  }\n#endif\n\n#include <lights_pars_begin>\n\n#include <normal_pars_fragment>\n\n// #include <lights_phong_pars_fragment>\nvarying vec3 vViewPosition;\n\nstruct MToonMaterial {\n  vec3 diffuseColor;\n  vec3 shadeColor;\n  float shadingShift;\n};\n\nfloat linearstep( float a, float b, float t ) {\n  return clamp( ( t - a ) / ( b - a ), 0.0, 1.0 );\n}\n\n/**\n * Convert NdotL into toon shading factor using shadingShift and shadingToony\n */\nfloat getShading(\n  const in float dotNL,\n  const in float shadow,\n  const in float shadingShift\n) {\n  float shading = dotNL;\n  shading = shading + shadingShift;\n  shading = linearstep( -1.0 + shadingToonyFactor, 1.0 - shadingToonyFactor, shading );\n  shading *= shadow;\n  return shading;\n}\n\n/**\n * Mix diffuseColor and shadeColor using shading factor and light color\n */\nvec3 getDiffuse(\n  const in MToonMaterial material,\n  const in float shading,\n  in vec3 lightColor\n) {\n  #ifdef DEBUG_LITSHADERATE\n    return vec3( BRDF_Lambert( shading * lightColor ) );\n  #endif\n\n  vec3 col = lightColor * BRDF_Lambert( mix( material.shadeColor, material.diffuseColor, shading ) );\n\n  // The \"comment out if you want to PBR absolutely\" line\n  #ifdef V0_COMPAT_SHADE\n    col = min( col, material.diffuseColor );\n  #endif\n\n  return col;\n}\n\n// COMPAT: pre-r156 uses a struct GeometricContext\n#if THREE_VRM_THREE_REVISION >= 157\n  void RE_Direct_MToon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in MToonMaterial material, const in float shadow, inout ReflectedLight reflectedLight ) {\n    float dotNL = clamp( dot( geometryNormal, directLight.direction ), -1.0, 1.0 );\n    vec3 irradiance = directLight.color;\n\n    // directSpecular will be used for rim lighting, not an actual specular\n    reflectedLight.directSpecular += irradiance;\n\n    irradiance *= dotNL;\n\n    float shading = getShading( dotNL, shadow, material.shadingShift );\n\n    // toon shaded diffuse\n    reflectedLight.directDiffuse += getDiffuse( material, shading, directLight.color );\n  }\n\n  void RE_IndirectDiffuse_MToon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in MToonMaterial material, inout ReflectedLight reflectedLight ) {\n    // indirect diffuse will use diffuseColor, no shadeColor involved\n    reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n\n    // directSpecular will be used for rim lighting, not an actual specular\n    reflectedLight.directSpecular += irradiance;\n  }\n#else\n  void RE_Direct_MToon( const in IncidentLight directLight, const in GeometricContext geometry, const in MToonMaterial material, const in float shadow, inout ReflectedLight reflectedLight ) {\n    float dotNL = clamp( dot( geometry.normal, directLight.direction ), -1.0, 1.0 );\n    vec3 irradiance = directLight.color;\n\n    // directSpecular will be used for rim lighting, not an actual specular\n    reflectedLight.directSpecular += irradiance;\n\n    irradiance *= dotNL;\n\n    float shading = getShading( dotNL, shadow, material.shadingShift );\n\n    // toon shaded diffuse\n    reflectedLight.directDiffuse += getDiffuse( material, shading, directLight.color );\n  }\n\n  void RE_IndirectDiffuse_MToon( const in vec3 irradiance, const in GeometricContext geometry, const in MToonMaterial material, inout ReflectedLight reflectedLight ) {\n    // indirect diffuse will use diffuseColor, no shadeColor involved\n    reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n\n    // directSpecular will be used for rim lighting, not an actual specular\n    reflectedLight.directSpecular += irradiance;\n  }\n#endif\n\n#define RE_Direct RE_Direct_MToon\n#define RE_IndirectDiffuse RE_IndirectDiffuse_MToon\n#define Material_LightProbeLOD( material ) (0)\n\n#include <shadowmap_pars_fragment>\n// #include <bumpmap_pars_fragment>\n\n// #include <normalmap_pars_fragment>\n#ifdef USE_NORMALMAP\n\n  uniform sampler2D normalMap;\n  uniform mat3 normalMapUvTransform;\n  uniform vec2 normalScale;\n\n#endif\n\n// COMPAT: pre-r151\n// USE_NORMALMAP_OBJECTSPACE used to be OBJECTSPACE_NORMALMAP in pre-r151\n#if defined( USE_NORMALMAP_OBJECTSPACE ) || defined( OBJECTSPACE_NORMALMAP )\n\n  uniform mat3 normalMatrix;\n\n#endif\n\n// COMPAT: pre-r151\n// USE_NORMALMAP_TANGENTSPACE used to be TANGENTSPACE_NORMALMAP in pre-r151\n#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( TANGENTSPACE_NORMALMAP ) )\n\n  // Per-Pixel Tangent Space Normal Mapping\n  // http://hacksoflife.blogspot.ch/2009/11/per-pixel-tangent-space-normal-mapping.html\n\n  // three-vrm specific change: it requires `uv` as an input in order to support uv scrolls\n\n  // Temporary compat against shader change @ Three.js r126, r151\n  #if THREE_VRM_THREE_REVISION >= 151\n\n    mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {\n\n      vec3 q0 = dFdx( eye_pos.xyz );\n      vec3 q1 = dFdy( eye_pos.xyz );\n      vec2 st0 = dFdx( uv.st );\n      vec2 st1 = dFdy( uv.st );\n\n      vec3 N = surf_norm;\n\n      vec3 q1perp = cross( q1, N );\n      vec3 q0perp = cross( N, q0 );\n\n      vec3 T = q1perp * st0.x + q0perp * st1.x;\n      vec3 B = q1perp * st0.y + q0perp * st1.y;\n\n      float det = max( dot( T, T ), dot( B, B ) );\n      float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );\n\n      return mat3( T * scale, B * scale, N );\n\n    }\n\n  #else\n\n    vec3 perturbNormal2Arb( vec2 uv, vec3 eye_pos, vec3 surf_norm, vec3 mapN, float faceDirection ) {\n\n      vec3 q0 = vec3( dFdx( eye_pos.x ), dFdx( eye_pos.y ), dFdx( eye_pos.z ) );\n      vec3 q1 = vec3( dFdy( eye_pos.x ), dFdy( eye_pos.y ), dFdy( eye_pos.z ) );\n      vec2 st0 = dFdx( uv.st );\n      vec2 st1 = dFdy( uv.st );\n\n      vec3 N = normalize( surf_norm );\n\n      vec3 q1perp = cross( q1, N );\n      vec3 q0perp = cross( N, q0 );\n\n      vec3 T = q1perp * st0.x + q0perp * st1.x;\n      vec3 B = q1perp * st0.y + q0perp * st1.y;\n\n      // three-vrm specific change: Workaround for the issue that happens when delta of uv = 0.0\n      // TODO: Is this still required? Or shall I make a PR about it?\n      if ( length( T ) == 0.0 || length( B ) == 0.0 ) {\n        return surf_norm;\n      }\n\n      float det = max( dot( T, T ), dot( B, B ) );\n      float scale = ( det == 0.0 ) ? 0.0 : faceDirection * inversesqrt( det );\n\n      return normalize( T * ( mapN.x * scale ) + B * ( mapN.y * scale ) + N * mapN.z );\n\n    }\n\n  #endif\n\n#endif\n\n// #include <specularmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\n\n// == post correction ==========================================================\nvoid postCorrection() {\n  #include <tonemapping_fragment>\n  #include <colorspace_fragment>\n  #include <fog_fragment>\n  #include <premultiplied_alpha_fragment>\n  #include <dithering_fragment>\n}\n\n// == main procedure ===========================================================\nvoid main() {\n  #include <clipping_planes_fragment>\n\n  vec2 uv = vec2(0.5, 0.5);\n\n  #if ( defined( MTOON_USE_UV ) && !defined( MTOON_UVS_VERTEX_ONLY ) )\n    uv = vUv;\n\n    float uvAnimMask = 1.0;\n    #ifdef USE_UVANIMATIONMASKTEXTURE\n      vec2 uvAnimationMaskTextureUv = ( uvAnimationMaskTextureUvTransform * vec3( uv, 1 ) ).xy;\n      uvAnimMask = texture2D( uvAnimationMaskTexture, uvAnimationMaskTextureUv ).b;\n    #endif\n\n    float uvRotCos = cos( uvAnimationRotationPhase * uvAnimMask );\n    float uvRotSin = sin( uvAnimationRotationPhase * uvAnimMask );\n    uv = mat2( uvRotCos, -uvRotSin, uvRotSin, uvRotCos ) * ( uv - 0.5 ) + 0.5;\n    uv = uv + vec2( uvAnimationScrollXOffset, uvAnimationScrollYOffset ) * uvAnimMask;\n  #endif\n\n  #ifdef DEBUG_UV\n    gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );\n    #if ( defined( MTOON_USE_UV ) && !defined( MTOON_UVS_VERTEX_ONLY ) )\n      gl_FragColor = vec4( uv, 0.0, 1.0 );\n    #endif\n    return;\n  #endif\n\n  vec4 diffuseColor = vec4( litFactor, opacity );\n  ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n  vec3 totalEmissiveRadiance = emissive * emissiveIntensity;\n\n  #include <logdepthbuf_fragment>\n\n  // #include <map_fragment>\n  #ifdef USE_MAP\n    vec2 mapUv = ( mapUvTransform * vec3( uv, 1 ) ).xy;\n    vec4 sampledDiffuseColor = texture2D( map, mapUv );\n    #ifdef DECODE_VIDEO_TEXTURE\n      sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );\n    #endif\n    diffuseColor *= sampledDiffuseColor;\n  #endif\n\n  // #include <color_fragment>\n  #if ( defined( USE_COLOR ) && !defined( IGNORE_VERTEX_COLOR ) )\n    diffuseColor.rgb *= vColor;\n  #endif\n\n  // #include <alphamap_fragment>\n\n  #include <alphatest_fragment>\n\n  // #include <specularmap_fragment>\n\n  // #include <normal_fragment_begin>\n  float faceDirection = gl_FrontFacing ? 1.0 : -1.0;\n\n  #ifdef FLAT_SHADED\n\n    vec3 fdx = dFdx( vViewPosition );\n    vec3 fdy = dFdy( vViewPosition );\n    vec3 normal = normalize( cross( fdx, fdy ) );\n\n  #else\n\n    vec3 normal = normalize( vNormal );\n\n    #ifdef DOUBLE_SIDED\n\n      normal *= faceDirection;\n\n    #endif\n\n  #endif\n\n  #ifdef USE_NORMALMAP\n\n    vec2 normalMapUv = ( normalMapUvTransform * vec3( uv, 1 ) ).xy;\n\n  #endif\n\n  #ifdef USE_NORMALMAP_TANGENTSPACE\n\n    #ifdef USE_TANGENT\n\n      mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );\n\n    #else\n\n      mat3 tbn = getTangentFrame( - vViewPosition, normal, normalMapUv );\n\n    #endif\n\n    #if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )\n\n      tbn[0] *= faceDirection;\n      tbn[1] *= faceDirection;\n\n    #endif\n\n  #endif\n\n  #ifdef USE_CLEARCOAT_NORMALMAP\n\n    #ifdef USE_TANGENT\n\n      mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );\n\n    #else\n\n      mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );\n\n    #endif\n\n    #if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )\n\n      tbn2[0] *= faceDirection;\n      tbn2[1] *= faceDirection;\n\n    #endif\n\n  #endif\n\n  // non perturbed normal for clearcoat among others\n\n  vec3 nonPerturbedNormal = normal;\n\n  #ifdef OUTLINE\n    normal *= -1.0;\n  #endif\n\n  // #include <normal_fragment_maps>\n\n  // COMPAT: pre-r151\n  // USE_NORMALMAP_OBJECTSPACE used to be OBJECTSPACE_NORMALMAP in pre-r151\n  #if defined( USE_NORMALMAP_OBJECTSPACE ) || defined( OBJECTSPACE_NORMALMAP )\n\n    normal = texture2D( normalMap, normalMapUv ).xyz * 2.0 - 1.0; // overrides both flatShading and attribute normals\n\n    #ifdef FLIP_SIDED\n\n      normal = - normal;\n\n    #endif\n\n    #ifdef DOUBLE_SIDED\n\n      normal = normal * faceDirection;\n\n    #endif\n\n    normal = normalize( normalMatrix * normal );\n\n  // COMPAT: pre-r151\n  // USE_NORMALMAP_TANGENTSPACE used to be TANGENTSPACE_NORMALMAP in pre-r151\n  #elif defined( USE_NORMALMAP_TANGENTSPACE ) || defined( TANGENTSPACE_NORMALMAP )\n\n    vec3 mapN = texture2D( normalMap, normalMapUv ).xyz * 2.0 - 1.0;\n    mapN.xy *= normalScale;\n\n    // COMPAT: pre-r151\n    #if THREE_VRM_THREE_REVISION >= 151 || defined( USE_TANGENT )\n\n      normal = normalize( tbn * mapN );\n\n    #else\n\n      normal = perturbNormal2Arb( uv, -vViewPosition, normal, mapN, faceDirection );\n\n    #endif\n\n  #endif\n\n  // #include <emissivemap_fragment>\n  #ifdef USE_EMISSIVEMAP\n    vec2 emissiveMapUv = ( emissiveMapUvTransform * vec3( uv, 1 ) ).xy;\n    totalEmissiveRadiance *= texture2D( emissiveMap, emissiveMapUv ).rgb;\n  #endif\n\n  #ifdef DEBUG_NORMAL\n    gl_FragColor = vec4( 0.5 + 0.5 * normal, 1.0 );\n    return;\n  #endif\n\n  // -- MToon: lighting --------------------------------------------------------\n  // accumulation\n  // #include <lights_phong_fragment>\n  MToonMaterial material;\n\n  material.diffuseColor = diffuseColor.rgb;\n\n  material.shadeColor = shadeColorFactor;\n  #ifdef USE_SHADEMULTIPLYTEXTURE\n    vec2 shadeMultiplyTextureUv = ( shadeMultiplyTextureUvTransform * vec3( uv, 1 ) ).xy;\n    material.shadeColor *= texture2D( shadeMultiplyTexture, shadeMultiplyTextureUv ).rgb;\n  #endif\n\n  #if ( defined( USE_COLOR ) && !defined( IGNORE_VERTEX_COLOR ) )\n    material.shadeColor.rgb *= vColor;\n  #endif\n\n  material.shadingShift = shadingShiftFactor;\n  #ifdef USE_SHADINGSHIFTTEXTURE\n    vec2 shadingShiftTextureUv = ( shadingShiftTextureUvTransform * vec3( uv, 1 ) ).xy;\n    material.shadingShift += texture2D( shadingShiftTexture, shadingShiftTextureUv ).r * shadingShiftTextureScale;\n  #endif\n\n  // #include <lights_fragment_begin>\n\n  // MToon Specific changes:\n  // Since we want to take shadows into account of shading instead of irradiance,\n  // we had to modify the codes that multiplies the results of shadowmap into color of direct lights.\n\n  // COMPAT: pre-r156 uses a struct GeometricContext\n  #if THREE_VRM_THREE_REVISION >= 157\n    vec3 geometryPosition = - vViewPosition;\n    vec3 geometryNormal = normal;\n    vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );\n\n    vec3 geometryClearcoatNormal;\n\n    #ifdef USE_CLEARCOAT\n\n      geometryClearcoatNormal = clearcoatNormal;\n\n    #endif\n  #else\n    GeometricContext geometry;\n\n    geometry.position = - vViewPosition;\n    geometry.normal = normal;\n    geometry.viewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );\n\n    #ifdef USE_CLEARCOAT\n\n      geometry.clearcoatNormal = clearcoatNormal;\n\n    #endif\n  #endif\n\n  IncidentLight directLight;\n\n  // since these variables will be used in unrolled loop, we have to define in prior\n  float shadow;\n\n  #if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )\n\n    PointLight pointLight;\n    #if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0\n    PointLightShadow pointLightShadow;\n    #endif\n\n    #pragma unroll_loop_start\n    for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {\n\n      pointLight = pointLights[ i ];\n\n      // COMPAT: pre-r156 uses a struct GeometricContext\n      #if THREE_VRM_THREE_REVISION >= 157\n        getPointLightInfo( pointLight, geometryPosition, directLight );\n      #else\n        getPointLightInfo( pointLight, geometry, directLight );\n      #endif\n\n      shadow = 1.0;\n      #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )\n      pointLightShadow = pointLightShadows[ i ];\n      // COMPAT: pre-r166\n      // r166 introduced shadowIntensity\n      #if THREE_VRM_THREE_REVISION >= 166\n        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;\n      #else\n        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;\n      #endif\n      #endif\n\n      // COMPAT: pre-r156 uses a struct GeometricContext\n      #if THREE_VRM_THREE_REVISION >= 157\n        RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, shadow, reflectedLight );\n      #else\n        RE_Direct( directLight, geometry, material, shadow, reflectedLight );\n      #endif\n\n    }\n    #pragma unroll_loop_end\n\n  #endif\n\n  #if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )\n\n    SpotLight spotLight;\n    // COMPAT: pre-r144 uses NUM_SPOT_LIGHT_SHADOWS, r144+ uses NUM_SPOT_LIGHT_COORDS\n    #if THREE_VRM_THREE_REVISION >= 144\n      #if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_COORDS > 0\n      SpotLightShadow spotLightShadow;\n      #endif\n    #elif defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0\n    SpotLightShadow spotLightShadow;\n    #endif\n\n    #pragma unroll_loop_start\n    for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {\n\n      spotLight = spotLights[ i ];\n\n      // COMPAT: pre-r156 uses a struct GeometricContext\n      #if THREE_VRM_THREE_REVISION >= 157\n        getSpotLightInfo( spotLight, geometryPosition, directLight );\n      #else\n        getSpotLightInfo( spotLight, geometry, directLight );\n      #endif\n\n      shadow = 1.0;\n      // COMPAT: pre-r144 uses NUM_SPOT_LIGHT_SHADOWS and vSpotShadowCoord, r144+ uses NUM_SPOT_LIGHT_COORDS and vSpotLightCoord\n      // COMPAT: pre-r166 does not have shadowIntensity, r166+ has shadowIntensity\n      #if THREE_VRM_THREE_REVISION >= 166\n        #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_COORDS )\n        spotLightShadow = spotLightShadows[ i ];\n        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;\n        #endif\n      #elif THREE_VRM_THREE_REVISION >= 144\n        #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_COORDS )\n        spotLightShadow = spotLightShadows[ i ];\n        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;\n        #endif\n      #elif defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )\n      spotLightShadow = spotLightShadows[ i ];\n      shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotShadowCoord[ i ] ) : 1.0;\n      #endif\n\n      // COMPAT: pre-r156 uses a struct GeometricContext\n      #if THREE_VRM_THREE_REVISION >= 157\n        RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, shadow, reflectedLight );\n      #else\n        RE_Direct( directLight, geometry, material, shadow, reflectedLight );\n      #endif\n\n    }\n    #pragma unroll_loop_end\n\n  #endif\n\n  #if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )\n\n    DirectionalLight directionalLight;\n    #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0\n    DirectionalLightShadow directionalLightShadow;\n    #endif\n\n    #pragma unroll_loop_start\n    for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {\n\n      directionalLight = directionalLights[ i ];\n\n      // COMPAT: pre-r156 uses a struct GeometricContext\n      #if THREE_VRM_THREE_REVISION >= 157\n        getDirectionalLightInfo( directionalLight, directLight );\n      #else\n        getDirectionalLightInfo( directionalLight, geometry, directLight );\n      #endif\n\n      shadow = 1.0;\n      #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )\n      directionalLightShadow = directionalLightShadows[ i ];\n      // COMPAT: pre-r166\n      // r166 introduced shadowIntensity\n      #if THREE_VRM_THREE_REVISION >= 166\n        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;\n      #else\n        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;\n      #endif\n      #endif\n\n      // COMPAT: pre-r156 uses a struct GeometricContext\n      #if THREE_VRM_THREE_REVISION >= 157\n        RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, shadow, reflectedLight );\n      #else\n        RE_Direct( directLight, geometry, material, shadow, reflectedLight );\n      #endif\n\n    }\n    #pragma unroll_loop_end\n\n  #endif\n\n  // #if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )\n\n  //   RectAreaLight rectAreaLight;\n\n  //   #pragma unroll_loop_start\n  //   for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {\n\n  //     rectAreaLight = rectAreaLights[ i ];\n  //     RE_Direct_RectArea( rectAreaLight, geometry, material, reflectedLight );\n\n  //   }\n  //   #pragma unroll_loop_end\n\n  // #endif\n\n  #if defined( RE_IndirectDiffuse )\n\n    vec3 iblIrradiance = vec3( 0.0 );\n\n    vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );\n\n    // COMPAT: pre-r156 uses a struct GeometricContext\n    // COMPAT: pre-r156 doesn't have a define USE_LIGHT_PROBES\n    #if THREE_VRM_THREE_REVISION >= 157\n      #if defined( USE_LIGHT_PROBES )\n        irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );\n      #endif\n    #else\n      irradiance += getLightProbeIrradiance( lightProbe, geometry.normal );\n    #endif\n\n    #if ( NUM_HEMI_LIGHTS > 0 )\n\n      #pragma unroll_loop_start\n      for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {\n\n        // COMPAT: pre-r156 uses a struct GeometricContext\n        #if THREE_VRM_THREE_REVISION >= 157\n          irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );\n        #else\n          irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry.normal );\n        #endif\n\n      }\n      #pragma unroll_loop_end\n\n    #endif\n\n  #endif\n\n  // #if defined( RE_IndirectSpecular )\n\n  //   vec3 radiance = vec3( 0.0 );\n  //   vec3 clearcoatRadiance = vec3( 0.0 );\n\n  // #endif\n\n  #include <lights_fragment_maps>\n  #include <lights_fragment_end>\n\n  // modulation\n  #include <aomap_fragment>\n\n  vec3 col = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;\n\n  #ifdef DEBUG_LITSHADERATE\n    gl_FragColor = vec4( col, diffuseColor.a );\n    postCorrection();\n    return;\n  #endif\n\n  // -- MToon: rim lighting -----------------------------------------\n  vec3 viewDir = normalize( vViewPosition );\n\n  #ifndef PHYSICALLY_CORRECT_LIGHTS\n    reflectedLight.directSpecular /= PI;\n  #endif\n  vec3 rimMix = mix( vec3( 1.0 ), reflectedLight.directSpecular, rimLightingMixFactor );\n\n  vec3 rim = parametricRimColorFactor * pow( saturate( 1.0 - dot( viewDir, normal ) + parametricRimLiftFactor ), parametricRimFresnelPowerFactor );\n\n  #ifdef USE_MATCAPTEXTURE\n    {\n      vec3 x = normalize( vec3( viewDir.z, 0.0, -viewDir.x ) );\n      vec3 y = cross( viewDir, x ); // guaranteed to be normalized\n      vec2 sphereUv = 0.5 + 0.5 * vec2( dot( x, normal ), -dot( y, normal ) );\n      sphereUv = ( matcapTextureUvTransform * vec3( sphereUv, 1 ) ).xy;\n      vec3 matcap = texture2D( matcapTexture, sphereUv ).rgb;\n      rim += matcapFactor * matcap;\n    }\n  #endif\n\n  #ifdef USE_RIMMULTIPLYTEXTURE\n    vec2 rimMultiplyTextureUv = ( rimMultiplyTextureUvTransform * vec3( uv, 1 ) ).xy;\n    rim *= texture2D( rimMultiplyTexture, rimMultiplyTextureUv ).rgb;\n  #endif\n\n  col += rimMix * rim;\n\n  // -- MToon: Emission --------------------------------------------------------\n  col += totalEmissiveRadiance;\n\n  // #include <envmap_fragment>\n\n  // -- Almost done! -----------------------------------------------------------\n  #if defined( OUTLINE )\n    col = outlineColorFactor.rgb * mix( vec3( 1.0 ), col, outlineLightingMixFactor );\n  #endif\n\n  #ifdef OPAQUE\n    diffuseColor.a = 1.0;\n  #endif\n\n  gl_FragColor = vec4( col, diffuseColor.a );\n  postCorrection();\n}\n";
var MToonMaterialDebugMode = {
  /**
   * Render normally.
   */
  None: "none",
  /**
   * Visualize normals of the surface.
   */
  Normal: "normal",
  /**
   * Visualize lit/shade of the surface.
   */
  LitShadeRate: "litShadeRate",
  /**
   * Visualize UV of the surface.
   */
  UV: "uv"
};
var MToonMaterialOutlineWidthMode = {
  None: "none",
  WorldCoordinates: "worldCoordinates",
  ScreenCoordinates: "screenCoordinates"
};
var encodingColorSpaceMap = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  3e3: "",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  3001: "srgb"
};
function getTextureColorSpace(texture) {
  if (parseInt(THREE32.REVISION, 10) >= 152) {
    return texture.colorSpace;
  } else {
    return encodingColorSpaceMap[texture.encoding];
  }
}
var MToonMaterial = class extends THREE42.ShaderMaterial {
  constructor(parameters = {}) {
    var _a2;
    super({ vertexShader: mtoon_default, fragmentShader: mtoon_default2 });
    this.uvAnimationScrollXSpeedFactor = 0;
    this.uvAnimationScrollYSpeedFactor = 0;
    this.uvAnimationRotationSpeedFactor = 0;
    this.fog = true;
    this.normalMapType = THREE42.TangentSpaceNormalMap;
    this._ignoreVertexColor = true;
    this._v0CompatShade = false;
    this._debugMode = MToonMaterialDebugMode.None;
    this._outlineWidthMode = MToonMaterialOutlineWidthMode.None;
    this._isOutline = false;
    if (parameters.transparentWithZWrite) {
      parameters.depthWrite = true;
    }
    delete parameters.transparentWithZWrite;
    parameters.fog = true;
    parameters.lights = true;
    parameters.clipping = true;
    this.uniforms = THREE42.UniformsUtils.merge([
      THREE42.UniformsLib.common,
      // map
      THREE42.UniformsLib.normalmap,
      // normalMap
      THREE42.UniformsLib.emissivemap,
      // emissiveMap
      THREE42.UniformsLib.fog,
      THREE42.UniformsLib.lights,
      {
        litFactor: { value: new THREE42.Color(1, 1, 1) },
        mapUvTransform: { value: new THREE42.Matrix3() },
        colorAlpha: { value: 1 },
        normalMapUvTransform: { value: new THREE42.Matrix3() },
        shadeColorFactor: { value: new THREE42.Color(0, 0, 0) },
        shadeMultiplyTexture: { value: null },
        shadeMultiplyTextureUvTransform: { value: new THREE42.Matrix3() },
        shadingShiftFactor: { value: 0 },
        shadingShiftTexture: { value: null },
        shadingShiftTextureUvTransform: { value: new THREE42.Matrix3() },
        shadingShiftTextureScale: { value: 1 },
        shadingToonyFactor: { value: 0.9 },
        giEqualizationFactor: { value: 0.9 },
        matcapFactor: { value: new THREE42.Color(1, 1, 1) },
        matcapTexture: { value: null },
        matcapTextureUvTransform: { value: new THREE42.Matrix3() },
        parametricRimColorFactor: { value: new THREE42.Color(0, 0, 0) },
        rimMultiplyTexture: { value: null },
        rimMultiplyTextureUvTransform: { value: new THREE42.Matrix3() },
        rimLightingMixFactor: { value: 1 },
        parametricRimFresnelPowerFactor: { value: 5 },
        parametricRimLiftFactor: { value: 0 },
        emissive: { value: new THREE42.Color(0, 0, 0) },
        emissiveIntensity: { value: 1 },
        emissiveMapUvTransform: { value: new THREE42.Matrix3() },
        outlineWidthMultiplyTexture: { value: null },
        outlineWidthMultiplyTextureUvTransform: { value: new THREE42.Matrix3() },
        outlineWidthFactor: { value: 0 },
        outlineColorFactor: { value: new THREE42.Color(0, 0, 0) },
        outlineLightingMixFactor: { value: 1 },
        uvAnimationMaskTexture: { value: null },
        uvAnimationMaskTextureUvTransform: { value: new THREE42.Matrix3() },
        uvAnimationScrollXOffset: { value: 0 },
        uvAnimationScrollYOffset: { value: 0 },
        uvAnimationRotationPhase: { value: 0 }
      },
      (_a2 = parameters.uniforms) != null ? _a2 : {}
    ]);
    this.setValues(parameters);
    this._uploadUniformsWorkaround();
    this.customProgramCacheKey = () => [
      ...Object.entries(this._generateDefines()).map(([token, macro]) => `${token}:${macro}`),
      this.matcapTexture ? `matcapTextureColorSpace:${getTextureColorSpace(this.matcapTexture)}` : "",
      this.shadeMultiplyTexture ? `shadeMultiplyTextureColorSpace:${getTextureColorSpace(this.shadeMultiplyTexture)}` : "",
      this.rimMultiplyTexture ? `rimMultiplyTextureColorSpace:${getTextureColorSpace(this.rimMultiplyTexture)}` : ""
    ].join(",");
    this.onBeforeCompile = (shader) => {
      const threeRevision = parseInt(THREE42.REVISION, 10);
      const defines = Object.entries(__spreadValues(__spreadValues({}, this._generateDefines()), this.defines)).filter(([token, macro]) => !!macro).map(([token, macro]) => `#define ${token} ${macro}`).join("\n") + "\n";
      shader.vertexShader = defines + shader.vertexShader;
      shader.fragmentShader = defines + shader.fragmentShader;
      if (threeRevision < 154) {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <colorspace_fragment>",
          "#include <encodings_fragment>"
        );
      }
    };
  }
  get color() {
    return this.uniforms.litFactor.value;
  }
  set color(value) {
    this.uniforms.litFactor.value = value;
  }
  get map() {
    return this.uniforms.map.value;
  }
  set map(value) {
    this.uniforms.map.value = value;
  }
  get normalMap() {
    return this.uniforms.normalMap.value;
  }
  set normalMap(value) {
    this.uniforms.normalMap.value = value;
  }
  get normalScale() {
    return this.uniforms.normalScale.value;
  }
  set normalScale(value) {
    this.uniforms.normalScale.value = value;
  }
  get emissive() {
    return this.uniforms.emissive.value;
  }
  set emissive(value) {
    this.uniforms.emissive.value = value;
  }
  get emissiveIntensity() {
    return this.uniforms.emissiveIntensity.value;
  }
  set emissiveIntensity(value) {
    this.uniforms.emissiveIntensity.value = value;
  }
  get emissiveMap() {
    return this.uniforms.emissiveMap.value;
  }
  set emissiveMap(value) {
    this.uniforms.emissiveMap.value = value;
  }
  get shadeColorFactor() {
    return this.uniforms.shadeColorFactor.value;
  }
  set shadeColorFactor(value) {
    this.uniforms.shadeColorFactor.value = value;
  }
  get shadeMultiplyTexture() {
    return this.uniforms.shadeMultiplyTexture.value;
  }
  set shadeMultiplyTexture(value) {
    this.uniforms.shadeMultiplyTexture.value = value;
  }
  get shadingShiftFactor() {
    return this.uniforms.shadingShiftFactor.value;
  }
  set shadingShiftFactor(value) {
    this.uniforms.shadingShiftFactor.value = value;
  }
  get shadingShiftTexture() {
    return this.uniforms.shadingShiftTexture.value;
  }
  set shadingShiftTexture(value) {
    this.uniforms.shadingShiftTexture.value = value;
  }
  get shadingShiftTextureScale() {
    return this.uniforms.shadingShiftTextureScale.value;
  }
  set shadingShiftTextureScale(value) {
    this.uniforms.shadingShiftTextureScale.value = value;
  }
  get shadingToonyFactor() {
    return this.uniforms.shadingToonyFactor.value;
  }
  set shadingToonyFactor(value) {
    this.uniforms.shadingToonyFactor.value = value;
  }
  get giEqualizationFactor() {
    return this.uniforms.giEqualizationFactor.value;
  }
  set giEqualizationFactor(value) {
    this.uniforms.giEqualizationFactor.value = value;
  }
  get matcapFactor() {
    return this.uniforms.matcapFactor.value;
  }
  set matcapFactor(value) {
    this.uniforms.matcapFactor.value = value;
  }
  get matcapTexture() {
    return this.uniforms.matcapTexture.value;
  }
  set matcapTexture(value) {
    this.uniforms.matcapTexture.value = value;
  }
  get parametricRimColorFactor() {
    return this.uniforms.parametricRimColorFactor.value;
  }
  set parametricRimColorFactor(value) {
    this.uniforms.parametricRimColorFactor.value = value;
  }
  get rimMultiplyTexture() {
    return this.uniforms.rimMultiplyTexture.value;
  }
  set rimMultiplyTexture(value) {
    this.uniforms.rimMultiplyTexture.value = value;
  }
  get rimLightingMixFactor() {
    return this.uniforms.rimLightingMixFactor.value;
  }
  set rimLightingMixFactor(value) {
    this.uniforms.rimLightingMixFactor.value = value;
  }
  get parametricRimFresnelPowerFactor() {
    return this.uniforms.parametricRimFresnelPowerFactor.value;
  }
  set parametricRimFresnelPowerFactor(value) {
    this.uniforms.parametricRimFresnelPowerFactor.value = value;
  }
  get parametricRimLiftFactor() {
    return this.uniforms.parametricRimLiftFactor.value;
  }
  set parametricRimLiftFactor(value) {
    this.uniforms.parametricRimLiftFactor.value = value;
  }
  get outlineWidthMultiplyTexture() {
    return this.uniforms.outlineWidthMultiplyTexture.value;
  }
  set outlineWidthMultiplyTexture(value) {
    this.uniforms.outlineWidthMultiplyTexture.value = value;
  }
  get outlineWidthFactor() {
    return this.uniforms.outlineWidthFactor.value;
  }
  set outlineWidthFactor(value) {
    this.uniforms.outlineWidthFactor.value = value;
  }
  get outlineColorFactor() {
    return this.uniforms.outlineColorFactor.value;
  }
  set outlineColorFactor(value) {
    this.uniforms.outlineColorFactor.value = value;
  }
  get outlineLightingMixFactor() {
    return this.uniforms.outlineLightingMixFactor.value;
  }
  set outlineLightingMixFactor(value) {
    this.uniforms.outlineLightingMixFactor.value = value;
  }
  get uvAnimationMaskTexture() {
    return this.uniforms.uvAnimationMaskTexture.value;
  }
  set uvAnimationMaskTexture(value) {
    this.uniforms.uvAnimationMaskTexture.value = value;
  }
  get uvAnimationScrollXOffset() {
    return this.uniforms.uvAnimationScrollXOffset.value;
  }
  set uvAnimationScrollXOffset(value) {
    this.uniforms.uvAnimationScrollXOffset.value = value;
  }
  get uvAnimationScrollYOffset() {
    return this.uniforms.uvAnimationScrollYOffset.value;
  }
  set uvAnimationScrollYOffset(value) {
    this.uniforms.uvAnimationScrollYOffset.value = value;
  }
  get uvAnimationRotationPhase() {
    return this.uniforms.uvAnimationRotationPhase.value;
  }
  set uvAnimationRotationPhase(value) {
    this.uniforms.uvAnimationRotationPhase.value = value;
  }
  /**
   * When this is `true`, vertex colors will be ignored.
   * `true` by default.
   */
  get ignoreVertexColor() {
    return this._ignoreVertexColor;
  }
  set ignoreVertexColor(value) {
    this._ignoreVertexColor = value;
    this.needsUpdate = true;
  }
  /**
   * There is a line of the shader called "comment out if you want to PBR absolutely" in VRM0.0 MToon.
   * When this is true, the material enables the line to make it compatible with the legacy rendering of VRM.
   * Usually not recommended to turn this on.
   * `false` by default.
   */
  get v0CompatShade() {
    return this._v0CompatShade;
  }
  /**
   * There is a line of the shader called "comment out if you want to PBR absolutely" in VRM0.0 MToon.
   * When this is true, the material enables the line to make it compatible with the legacy rendering of VRM.
   * Usually not recommended to turn this on.
   * `false` by default.
   */
  set v0CompatShade(v) {
    this._v0CompatShade = v;
    this.needsUpdate = true;
  }
  /**
   * Debug mode for the material.
   * You can visualize several components for diagnosis using debug mode.
   *
   * See: {@link MToonMaterialDebugMode}
   */
  get debugMode() {
    return this._debugMode;
  }
  /**
   * Debug mode for the material.
   * You can visualize several components for diagnosis using debug mode.
   *
   * See: {@link MToonMaterialDebugMode}
   */
  set debugMode(m) {
    this._debugMode = m;
    this.needsUpdate = true;
  }
  get outlineWidthMode() {
    return this._outlineWidthMode;
  }
  set outlineWidthMode(m) {
    this._outlineWidthMode = m;
    this.needsUpdate = true;
  }
  get isOutline() {
    return this._isOutline;
  }
  set isOutline(b) {
    this._isOutline = b;
    this.needsUpdate = true;
  }
  /**
   * Readonly boolean that indicates this is a {@link MToonMaterial}.
   */
  get isMToonMaterial() {
    return true;
  }
  /**
   * Update this material.
   *
   * @param delta deltaTime since last update
   */
  update(delta) {
    this._uploadUniformsWorkaround();
    this._updateUVAnimation(delta);
  }
  copy(source) {
    super.copy(source);
    this.map = source.map;
    this.normalMap = source.normalMap;
    this.emissiveMap = source.emissiveMap;
    this.shadeMultiplyTexture = source.shadeMultiplyTexture;
    this.shadingShiftTexture = source.shadingShiftTexture;
    this.matcapTexture = source.matcapTexture;
    this.rimMultiplyTexture = source.rimMultiplyTexture;
    this.outlineWidthMultiplyTexture = source.outlineWidthMultiplyTexture;
    this.uvAnimationMaskTexture = source.uvAnimationMaskTexture;
    this.normalMapType = source.normalMapType;
    this.uvAnimationScrollXSpeedFactor = source.uvAnimationScrollXSpeedFactor;
    this.uvAnimationScrollYSpeedFactor = source.uvAnimationScrollYSpeedFactor;
    this.uvAnimationRotationSpeedFactor = source.uvAnimationRotationSpeedFactor;
    this.ignoreVertexColor = source.ignoreVertexColor;
    this.v0CompatShade = source.v0CompatShade;
    this.debugMode = source.debugMode;
    this.outlineWidthMode = source.outlineWidthMode;
    this.isOutline = source.isOutline;
    this.needsUpdate = true;
    return this;
  }
  /**
   * Update UV animation state.
   * Intended to be called via {@link update}.
   * @param delta deltaTime
   */
  _updateUVAnimation(delta) {
    this.uniforms.uvAnimationScrollXOffset.value += delta * this.uvAnimationScrollXSpeedFactor;
    this.uniforms.uvAnimationScrollYOffset.value += delta * this.uvAnimationScrollYSpeedFactor;
    this.uniforms.uvAnimationRotationPhase.value += delta * this.uvAnimationRotationSpeedFactor;
    this.uniforms.alphaTest.value = this.alphaTest;
    this.uniformsNeedUpdate = true;
  }
  /**
   * Upload uniforms that need to upload but doesn't automatically because of reasons.
   * Intended to be called via {@link constructor} and {@link update}.
   */
  _uploadUniformsWorkaround() {
    this.uniforms.opacity.value = this.opacity;
    this._updateTextureMatrix(this.uniforms.map, this.uniforms.mapUvTransform);
    this._updateTextureMatrix(this.uniforms.normalMap, this.uniforms.normalMapUvTransform);
    this._updateTextureMatrix(this.uniforms.emissiveMap, this.uniforms.emissiveMapUvTransform);
    this._updateTextureMatrix(this.uniforms.shadeMultiplyTexture, this.uniforms.shadeMultiplyTextureUvTransform);
    this._updateTextureMatrix(this.uniforms.shadingShiftTexture, this.uniforms.shadingShiftTextureUvTransform);
    this._updateTextureMatrix(this.uniforms.matcapTexture, this.uniforms.matcapTextureUvTransform);
    this._updateTextureMatrix(this.uniforms.rimMultiplyTexture, this.uniforms.rimMultiplyTextureUvTransform);
    this._updateTextureMatrix(
      this.uniforms.outlineWidthMultiplyTexture,
      this.uniforms.outlineWidthMultiplyTextureUvTransform
    );
    this._updateTextureMatrix(this.uniforms.uvAnimationMaskTexture, this.uniforms.uvAnimationMaskTextureUvTransform);
    this.uniformsNeedUpdate = true;
  }
  /**
   * Returns a map object of preprocessor token and macro of the shader program.
   */
  _generateDefines() {
    const threeRevision = parseInt(THREE42.REVISION, 10);
    const useUvInVert = this.outlineWidthMultiplyTexture !== null;
    const useUvInFrag = this.map !== null || this.normalMap !== null || this.emissiveMap !== null || this.shadeMultiplyTexture !== null || this.shadingShiftTexture !== null || this.rimMultiplyTexture !== null || this.uvAnimationMaskTexture !== null;
    return {
      // Temporary compat against shader change @ Three.js r126
      // See: #21205, #21307, #21299
      THREE_VRM_THREE_REVISION: threeRevision,
      OUTLINE: this._isOutline,
      MTOON_USE_UV: useUvInVert || useUvInFrag,
      // we can't use `USE_UV` , it will be redefined in WebGLProgram.js
      MTOON_UVS_VERTEX_ONLY: useUvInVert && !useUvInFrag,
      V0_COMPAT_SHADE: this._v0CompatShade,
      USE_SHADEMULTIPLYTEXTURE: this.shadeMultiplyTexture !== null,
      USE_SHADINGSHIFTTEXTURE: this.shadingShiftTexture !== null,
      USE_MATCAPTEXTURE: this.matcapTexture !== null,
      USE_RIMMULTIPLYTEXTURE: this.rimMultiplyTexture !== null,
      USE_OUTLINEWIDTHMULTIPLYTEXTURE: this._isOutline && this.outlineWidthMultiplyTexture !== null,
      USE_UVANIMATIONMASKTEXTURE: this.uvAnimationMaskTexture !== null,
      IGNORE_VERTEX_COLOR: this._ignoreVertexColor === true,
      DEBUG_NORMAL: this._debugMode === "normal",
      DEBUG_LITSHADERATE: this._debugMode === "litShadeRate",
      DEBUG_UV: this._debugMode === "uv",
      OUTLINE_WIDTH_SCREEN: this._isOutline && this._outlineWidthMode === MToonMaterialOutlineWidthMode.ScreenCoordinates
    };
  }
  _updateTextureMatrix(src, dst) {
    if (src.value) {
      if (src.value.matrixAutoUpdate) {
        src.value.updateMatrix();
      }
      dst.value.copy(src.value.matrix);
    }
  }
};
var POSSIBLE_SPEC_VERSIONS6 = /* @__PURE__ */ new Set(["1.0", "1.0-beta"]);
var _MToonMaterialLoaderPlugin = class _MToonMaterialLoaderPlugin2 {
  get name() {
    return _MToonMaterialLoaderPlugin2.EXTENSION_NAME;
  }
  constructor(parser, options = {}) {
    var _a2, _b2, _c, _d2;
    this.parser = parser;
    this.materialType = (_a2 = options.materialType) != null ? _a2 : MToonMaterial;
    this.renderOrderOffset = (_b2 = options.renderOrderOffset) != null ? _b2 : 0;
    this.v0CompatShade = (_c = options.v0CompatShade) != null ? _c : false;
    this.debugMode = (_d2 = options.debugMode) != null ? _d2 : "none";
    this._mToonMaterialSet = /* @__PURE__ */ new Set();
  }
  beforeRoot() {
    return __async3(this, null, function* () {
      this._removeUnlitExtensionIfMToonExists();
    });
  }
  afterRoot(gltf) {
    return __async3(this, null, function* () {
      gltf.userData.vrmMToonMaterials = Array.from(this._mToonMaterialSet);
    });
  }
  getMaterialType(materialIndex) {
    const v1Extension = this._getMToonExtension(materialIndex);
    if (v1Extension) {
      return this.materialType;
    }
    return null;
  }
  extendMaterialParams(materialIndex, materialParams) {
    const extension = this._getMToonExtension(materialIndex);
    if (extension) {
      return this._extendMaterialParams(extension, materialParams);
    }
    return null;
  }
  loadMesh(meshIndex) {
    return __async3(this, null, function* () {
      var _a2;
      const parser = this.parser;
      const json = parser.json;
      const meshDef = (_a2 = json.meshes) == null ? void 0 : _a2[meshIndex];
      if (meshDef == null) {
        throw new Error(
          `MToonMaterialLoaderPlugin: Attempt to use meshes[${meshIndex}] of glTF but the mesh doesn't exist`
        );
      }
      const primitivesDef = meshDef.primitives;
      const meshOrGroup = yield parser.loadMesh(meshIndex);
      if (primitivesDef.length === 1) {
        const mesh = meshOrGroup;
        const materialIndex = primitivesDef[0].material;
        if (materialIndex != null) {
          this._setupPrimitive(mesh, materialIndex);
        }
      } else {
        const group = meshOrGroup;
        for (let i = 0; i < primitivesDef.length; i++) {
          const mesh = group.children[i];
          const materialIndex = primitivesDef[i].material;
          if (materialIndex != null) {
            this._setupPrimitive(mesh, materialIndex);
          }
        }
      }
      return meshOrGroup;
    });
  }
  /**
   * Delete use of `KHR_materials_unlit` from its `materials` if the material is using MToon.
   *
   * Since GLTFLoader have so many hardcoded procedure related to `KHR_materials_unlit`
   * we have to delete the extension before we start to parse the glTF.
   */
  _removeUnlitExtensionIfMToonExists() {
    const parser = this.parser;
    const json = parser.json;
    const materialDefs = json.materials;
    materialDefs == null ? void 0 : materialDefs.map((materialDef, iMaterial) => {
      var _a2;
      const extension = this._getMToonExtension(iMaterial);
      if (extension && ((_a2 = materialDef.extensions) == null ? void 0 : _a2["KHR_materials_unlit"])) {
        delete materialDef.extensions["KHR_materials_unlit"];
      }
    });
  }
  _getMToonExtension(materialIndex) {
    var _a2, _b2;
    const parser = this.parser;
    const json = parser.json;
    const materialDef = (_a2 = json.materials) == null ? void 0 : _a2[materialIndex];
    if (materialDef == null) {
      console.warn(
        `MToonMaterialLoaderPlugin: Attempt to use materials[${materialIndex}] of glTF but the material doesn't exist`
      );
      return void 0;
    }
    const extension = (_b2 = materialDef.extensions) == null ? void 0 : _b2[_MToonMaterialLoaderPlugin2.EXTENSION_NAME];
    if (extension == null) {
      return void 0;
    }
    const specVersion = extension.specVersion;
    if (!POSSIBLE_SPEC_VERSIONS6.has(specVersion)) {
      console.warn(
        `MToonMaterialLoaderPlugin: Unknown ${_MToonMaterialLoaderPlugin2.EXTENSION_NAME} specVersion "${specVersion}"`
      );
      return void 0;
    }
    return extension;
  }
  _extendMaterialParams(extension, materialParams) {
    return __async3(this, null, function* () {
      var _a2;
      delete materialParams.metalness;
      delete materialParams.roughness;
      const assignHelper = new GLTFMToonMaterialParamsAssignHelper(this.parser, materialParams);
      assignHelper.assignPrimitive("transparentWithZWrite", extension.transparentWithZWrite);
      assignHelper.assignColor("shadeColorFactor", extension.shadeColorFactor);
      assignHelper.assignTexture("shadeMultiplyTexture", extension.shadeMultiplyTexture, true);
      assignHelper.assignPrimitive("shadingShiftFactor", extension.shadingShiftFactor);
      assignHelper.assignTexture("shadingShiftTexture", extension.shadingShiftTexture, true);
      assignHelper.assignPrimitive("shadingShiftTextureScale", (_a2 = extension.shadingShiftTexture) == null ? void 0 : _a2.scale);
      assignHelper.assignPrimitive("shadingToonyFactor", extension.shadingToonyFactor);
      assignHelper.assignPrimitive("giEqualizationFactor", extension.giEqualizationFactor);
      assignHelper.assignColor("matcapFactor", extension.matcapFactor);
      assignHelper.assignTexture("matcapTexture", extension.matcapTexture, true);
      assignHelper.assignColor("parametricRimColorFactor", extension.parametricRimColorFactor);
      assignHelper.assignTexture("rimMultiplyTexture", extension.rimMultiplyTexture, true);
      assignHelper.assignPrimitive("rimLightingMixFactor", extension.rimLightingMixFactor);
      assignHelper.assignPrimitive("parametricRimFresnelPowerFactor", extension.parametricRimFresnelPowerFactor);
      assignHelper.assignPrimitive("parametricRimLiftFactor", extension.parametricRimLiftFactor);
      assignHelper.assignPrimitive("outlineWidthMode", extension.outlineWidthMode);
      assignHelper.assignPrimitive("outlineWidthFactor", extension.outlineWidthFactor);
      assignHelper.assignTexture("outlineWidthMultiplyTexture", extension.outlineWidthMultiplyTexture, false);
      assignHelper.assignColor("outlineColorFactor", extension.outlineColorFactor);
      assignHelper.assignPrimitive("outlineLightingMixFactor", extension.outlineLightingMixFactor);
      assignHelper.assignTexture("uvAnimationMaskTexture", extension.uvAnimationMaskTexture, false);
      assignHelper.assignPrimitive("uvAnimationScrollXSpeedFactor", extension.uvAnimationScrollXSpeedFactor);
      assignHelper.assignPrimitive("uvAnimationScrollYSpeedFactor", extension.uvAnimationScrollYSpeedFactor);
      assignHelper.assignPrimitive("uvAnimationRotationSpeedFactor", extension.uvAnimationRotationSpeedFactor);
      assignHelper.assignPrimitive("v0CompatShade", this.v0CompatShade);
      assignHelper.assignPrimitive("debugMode", this.debugMode);
      yield assignHelper.pending;
    });
  }
  /**
   * This will do two processes that is required to render MToon properly.
   *
   * - Set render order
   * - Generate outline
   *
   * @param mesh A target GLTF primitive
   * @param materialIndex The material index of the primitive
   */
  _setupPrimitive(mesh, materialIndex) {
    const extension = this._getMToonExtension(materialIndex);
    if (extension) {
      const renderOrder = this._parseRenderOrder(extension);
      mesh.renderOrder = renderOrder + this.renderOrderOffset;
      this._generateOutline(mesh);
      this._addToMaterialSet(mesh);
      return;
    }
  }
  /**
   * Check whether the material should generate outline or not.
   * @param surfaceMaterial The material to check
   * @returns True if the material should generate outline
   */
  _shouldGenerateOutline(surfaceMaterial) {
    return typeof surfaceMaterial.outlineWidthMode === "string" && surfaceMaterial.outlineWidthMode !== "none" && typeof surfaceMaterial.outlineWidthFactor === "number" && surfaceMaterial.outlineWidthFactor > 0;
  }
  /**
   * Generate outline for the given mesh, if it needs.
   *
   * @param mesh The target mesh
   */
  _generateOutline(mesh) {
    const surfaceMaterial = mesh.material;
    if (!(surfaceMaterial instanceof THREE52.Material)) {
      return;
    }
    if (!this._shouldGenerateOutline(surfaceMaterial)) {
      return;
    }
    mesh.material = [surfaceMaterial];
    const outlineMaterial = surfaceMaterial.clone();
    outlineMaterial.name += " (Outline)";
    outlineMaterial.isOutline = true;
    outlineMaterial.side = THREE52.BackSide;
    mesh.material.push(outlineMaterial);
    const geometry = mesh.geometry;
    const primitiveVertices = geometry.index ? geometry.index.count : geometry.attributes.position.count / 3;
    geometry.addGroup(0, primitiveVertices, 0);
    geometry.addGroup(0, primitiveVertices, 1);
  }
  _addToMaterialSet(mesh) {
    const materialOrMaterials = mesh.material;
    const materialSet = /* @__PURE__ */ new Set();
    if (Array.isArray(materialOrMaterials)) {
      materialOrMaterials.forEach((material) => materialSet.add(material));
    } else {
      materialSet.add(materialOrMaterials);
    }
    for (const material of materialSet) {
      this._mToonMaterialSet.add(material);
    }
  }
  _parseRenderOrder(extension) {
    var _a2;
    const enabledZWrite = extension.transparentWithZWrite;
    return (enabledZWrite ? 0 : 19) + ((_a2 = extension.renderQueueOffsetNumber) != null ? _a2 : 0);
  }
};
_MToonMaterialLoaderPlugin.EXTENSION_NAME = "VRMC_materials_mtoon";
var MToonMaterialLoaderPlugin = _MToonMaterialLoaderPlugin;
var __async4 = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected2 = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected2);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
var _VRMMaterialsHDREmissiveMultiplierLoaderPlugin = class _VRMMaterialsHDREmissiveMultiplierLoaderPlugin2 {
  get name() {
    return _VRMMaterialsHDREmissiveMultiplierLoaderPlugin2.EXTENSION_NAME;
  }
  constructor(parser) {
    this.parser = parser;
  }
  extendMaterialParams(materialIndex, materialParams) {
    return __async4(this, null, function* () {
      const extension = this._getHDREmissiveMultiplierExtension(materialIndex);
      if (extension == null) {
        return;
      }
      console.warn(
        "VRMMaterialsHDREmissiveMultiplierLoaderPlugin: `VRMC_materials_hdr_emissiveMultiplier` is archived. Use `KHR_materials_emissive_strength` instead."
      );
      const emissiveMultiplier = extension.emissiveMultiplier;
      materialParams.emissiveIntensity = emissiveMultiplier;
    });
  }
  _getHDREmissiveMultiplierExtension(materialIndex) {
    var _a2, _b2;
    const parser = this.parser;
    const json = parser.json;
    const materialDef = (_a2 = json.materials) == null ? void 0 : _a2[materialIndex];
    if (materialDef == null) {
      console.warn(
        `VRMMaterialsHDREmissiveMultiplierLoaderPlugin: Attempt to use materials[${materialIndex}] of glTF but the material doesn't exist`
      );
      return void 0;
    }
    const extension = (_b2 = materialDef.extensions) == null ? void 0 : _b2[_VRMMaterialsHDREmissiveMultiplierLoaderPlugin2.EXTENSION_NAME];
    if (extension == null) {
      return void 0;
    }
    return extension;
  }
};
_VRMMaterialsHDREmissiveMultiplierLoaderPlugin.EXTENSION_NAME = "VRMC_materials_hdr_emissiveMultiplier";
var VRMMaterialsHDREmissiveMultiplierLoaderPlugin = _VRMMaterialsHDREmissiveMultiplierLoaderPlugin;
var __defProp2 = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols2 = Object.getOwnPropertySymbols;
var __hasOwnProp2 = Object.prototype.hasOwnProperty;
var __propIsEnum2 = Object.prototype.propertyIsEnumerable;
var __defNormalProp2 = (obj, key, value) => key in obj ? __defProp2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues2 = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp2.call(b, prop))
      __defNormalProp2(a, prop, b[prop]);
  if (__getOwnPropSymbols2)
    for (var prop of __getOwnPropSymbols2(b)) {
      if (__propIsEnum2.call(b, prop))
        __defNormalProp2(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __async5 = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected2 = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected2);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
function gammaEOTF(e) {
  return Math.pow(e, 2.2);
}
var VRMMaterialsV0CompatPlugin = class {
  get name() {
    return "VRMMaterialsV0CompatPlugin";
  }
  constructor(parser) {
    var _a2;
    this.parser = parser;
    this._renderQueueMapTransparent = /* @__PURE__ */ new Map();
    this._renderQueueMapTransparentZWrite = /* @__PURE__ */ new Map();
    const json = this.parser.json;
    json.extensionsUsed = (_a2 = json.extensionsUsed) != null ? _a2 : [];
    if (json.extensionsUsed.indexOf("KHR_texture_transform") === -1) {
      json.extensionsUsed.push("KHR_texture_transform");
    }
  }
  beforeRoot() {
    return __async5(this, null, function* () {
      var _a2;
      const json = this.parser.json;
      const v0VRMExtension = (_a2 = json.extensions) == null ? void 0 : _a2["VRM"];
      const v0MaterialProperties = v0VRMExtension == null ? void 0 : v0VRMExtension.materialProperties;
      if (!v0MaterialProperties) {
        return;
      }
      this._populateRenderQueueMap(v0MaterialProperties);
      v0MaterialProperties.forEach((materialProperties, materialIndex) => {
        var _a22, _b2;
        const materialDef = (_a22 = json.materials) == null ? void 0 : _a22[materialIndex];
        if (materialDef == null) {
          console.warn(
            `VRMMaterialsV0CompatPlugin: Attempt to use materials[${materialIndex}] of glTF but the material doesn't exist`
          );
          return;
        }
        if (materialProperties.shader === "VRM/MToon") {
          const material = this._parseV0MToonProperties(materialProperties, materialDef);
          json.materials[materialIndex] = material;
        } else if ((_b2 = materialProperties.shader) == null ? void 0 : _b2.startsWith("VRM/Unlit")) {
          const material = this._parseV0UnlitProperties(materialProperties, materialDef);
          json.materials[materialIndex] = material;
        } else if (materialProperties.shader === "VRM_USE_GLTFSHADER") {
        } else {
          console.warn(`VRMMaterialsV0CompatPlugin: Unknown shader: ${materialProperties.shader}`);
        }
      });
    });
  }
  _parseV0MToonProperties(materialProperties, schemaMaterial) {
    var _a2, _b2, _c, _d2, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v3, _w, _x, _y, _z, _A, _B, _C, _D, _E, _F, _G, _H, _I, _J, _K, _L, _M, _N, _O, _P, _Q, _R, _S, _T, _U, _V, _W, _X, _Y, _Z, __, _$, _aa;
    const isTransparent = (_b2 = (_a2 = materialProperties.keywordMap) == null ? void 0 : _a2["_ALPHABLEND_ON"]) != null ? _b2 : false;
    const enabledZWrite = ((_c = materialProperties.floatProperties) == null ? void 0 : _c["_ZWrite"]) === 1;
    const transparentWithZWrite = enabledZWrite && isTransparent;
    const renderQueueOffsetNumber = this._v0ParseRenderQueue(materialProperties);
    const isCutoff = (_e = (_d2 = materialProperties.keywordMap) == null ? void 0 : _d2["_ALPHATEST_ON"]) != null ? _e : false;
    const alphaMode = isTransparent ? "BLEND" : isCutoff ? "MASK" : "OPAQUE";
    const alphaCutoff = isCutoff ? (_g = (_f = materialProperties.floatProperties) == null ? void 0 : _f["_Cutoff"]) != null ? _g : 0.5 : void 0;
    const cullMode = (_i = (_h = materialProperties.floatProperties) == null ? void 0 : _h["_CullMode"]) != null ? _i : 2;
    const doubleSided = cullMode === 0;
    const textureTransformExt = this._portTextureTransform(materialProperties);
    const baseColorFactor = ((_k = (_j = materialProperties.vectorProperties) == null ? void 0 : _j["_Color"]) != null ? _k : [1, 1, 1, 1]).map(
      (v, i) => i === 3 ? v : gammaEOTF(v)
      // alpha channel is stored in linear
    );
    const baseColorTextureIndex = (_l = materialProperties.textureProperties) == null ? void 0 : _l["_MainTex"];
    const baseColorTexture = baseColorTextureIndex != null ? {
      index: baseColorTextureIndex,
      extensions: __spreadValues2({}, textureTransformExt)
    } : void 0;
    const normalTextureScale = (_n = (_m = materialProperties.floatProperties) == null ? void 0 : _m["_BumpScale"]) != null ? _n : 1;
    const normalTextureIndex = (_o = materialProperties.textureProperties) == null ? void 0 : _o["_BumpMap"];
    const normalTexture = normalTextureIndex != null ? {
      index: normalTextureIndex,
      scale: normalTextureScale,
      extensions: __spreadValues2({}, textureTransformExt)
    } : void 0;
    const emissiveFactor = ((_q = (_p = materialProperties.vectorProperties) == null ? void 0 : _p["_EmissionColor"]) != null ? _q : [0, 0, 0, 1]).map(
      gammaEOTF
    );
    const emissiveTextureIndex = (_r = materialProperties.textureProperties) == null ? void 0 : _r["_EmissionMap"];
    const emissiveTexture = emissiveTextureIndex != null ? {
      index: emissiveTextureIndex,
      extensions: __spreadValues2({}, textureTransformExt)
    } : void 0;
    const shadeColorFactor = ((_t = (_s = materialProperties.vectorProperties) == null ? void 0 : _s["_ShadeColor"]) != null ? _t : [0.97, 0.81, 0.86, 1]).map(
      gammaEOTF
    );
    const shadeMultiplyTextureIndex = (_u = materialProperties.textureProperties) == null ? void 0 : _u["_ShadeTexture"];
    const shadeMultiplyTexture = shadeMultiplyTextureIndex != null ? {
      index: shadeMultiplyTextureIndex,
      extensions: __spreadValues2({}, textureTransformExt)
    } : void 0;
    let shadingShiftFactor = (_w = (_v3 = materialProperties.floatProperties) == null ? void 0 : _v3["_ShadeShift"]) != null ? _w : 0;
    let shadingToonyFactor = (_y = (_x = materialProperties.floatProperties) == null ? void 0 : _x["_ShadeToony"]) != null ? _y : 0.9;
    shadingToonyFactor = THREE18.MathUtils.lerp(shadingToonyFactor, 1, 0.5 + 0.5 * shadingShiftFactor);
    shadingShiftFactor = -shadingShiftFactor - (1 - shadingToonyFactor);
    const giIntensityFactor = (_A = (_z = materialProperties.floatProperties) == null ? void 0 : _z["_IndirectLightIntensity"]) != null ? _A : 0.1;
    const giEqualizationFactor = giIntensityFactor ? 1 - giIntensityFactor : void 0;
    const matcapTextureIndex = (_B = materialProperties.textureProperties) == null ? void 0 : _B["_SphereAdd"];
    const matcapFactor = matcapTextureIndex != null ? [1, 1, 1] : void 0;
    const matcapTexture = matcapTextureIndex != null ? {
      index: matcapTextureIndex
    } : void 0;
    const rimLightingMixFactor = (_D = (_C = materialProperties.floatProperties) == null ? void 0 : _C["_RimLightingMix"]) != null ? _D : 0;
    const rimMultiplyTextureIndex = (_E = materialProperties.textureProperties) == null ? void 0 : _E["_RimTexture"];
    const rimMultiplyTexture = rimMultiplyTextureIndex != null ? {
      index: rimMultiplyTextureIndex,
      extensions: __spreadValues2({}, textureTransformExt)
    } : void 0;
    const parametricRimColorFactor = ((_G = (_F = materialProperties.vectorProperties) == null ? void 0 : _F["_RimColor"]) != null ? _G : [0, 0, 0, 1]).map(
      gammaEOTF
    );
    const parametricRimFresnelPowerFactor = (_I = (_H = materialProperties.floatProperties) == null ? void 0 : _H["_RimFresnelPower"]) != null ? _I : 1;
    const parametricRimLiftFactor = (_K = (_J = materialProperties.floatProperties) == null ? void 0 : _J["_RimLift"]) != null ? _K : 0;
    const outlineWidthMode = ["none", "worldCoordinates", "screenCoordinates"][(_M = (_L = materialProperties.floatProperties) == null ? void 0 : _L["_OutlineWidthMode"]) != null ? _M : 0];
    let outlineWidthFactor = (_O = (_N = materialProperties.floatProperties) == null ? void 0 : _N["_OutlineWidth"]) != null ? _O : 0;
    outlineWidthFactor = 0.01 * outlineWidthFactor;
    const outlineWidthMultiplyTextureIndex = (_P = materialProperties.textureProperties) == null ? void 0 : _P["_OutlineWidthTexture"];
    const outlineWidthMultiplyTexture = outlineWidthMultiplyTextureIndex != null ? {
      index: outlineWidthMultiplyTextureIndex,
      extensions: __spreadValues2({}, textureTransformExt)
    } : void 0;
    const outlineColorFactor = ((_R = (_Q = materialProperties.vectorProperties) == null ? void 0 : _Q["_OutlineColor"]) != null ? _R : [0, 0, 0]).map(
      gammaEOTF
    );
    const outlineColorMode = (_T = (_S = materialProperties.floatProperties) == null ? void 0 : _S["_OutlineColorMode"]) != null ? _T : 0;
    const outlineLightingMixFactor = outlineColorMode === 1 ? (_V = (_U = materialProperties.floatProperties) == null ? void 0 : _U["_OutlineLightingMix"]) != null ? _V : 1 : 0;
    const uvAnimationMaskTextureIndex = (_W = materialProperties.textureProperties) == null ? void 0 : _W["_UvAnimMaskTexture"];
    const uvAnimationMaskTexture = uvAnimationMaskTextureIndex != null ? {
      index: uvAnimationMaskTextureIndex,
      extensions: __spreadValues2({}, textureTransformExt)
    } : void 0;
    const uvAnimationScrollXSpeedFactor = (_Y = (_X = materialProperties.floatProperties) == null ? void 0 : _X["_UvAnimScrollX"]) != null ? _Y : 0;
    let uvAnimationScrollYSpeedFactor = (__ = (_Z = materialProperties.floatProperties) == null ? void 0 : _Z["_UvAnimScrollY"]) != null ? __ : 0;
    if (uvAnimationScrollYSpeedFactor != null) {
      uvAnimationScrollYSpeedFactor = -uvAnimationScrollYSpeedFactor;
    }
    const uvAnimationRotationSpeedFactor = (_aa = (_$ = materialProperties.floatProperties) == null ? void 0 : _$["_UvAnimRotation"]) != null ? _aa : 0;
    const mtoonExtension = {
      specVersion: "1.0",
      transparentWithZWrite,
      renderQueueOffsetNumber,
      shadeColorFactor,
      shadeMultiplyTexture,
      shadingShiftFactor,
      shadingToonyFactor,
      giEqualizationFactor,
      matcapFactor,
      matcapTexture,
      rimLightingMixFactor,
      rimMultiplyTexture,
      parametricRimColorFactor,
      parametricRimFresnelPowerFactor,
      parametricRimLiftFactor,
      outlineWidthMode,
      outlineWidthFactor,
      outlineWidthMultiplyTexture,
      outlineColorFactor,
      outlineLightingMixFactor,
      uvAnimationMaskTexture,
      uvAnimationScrollXSpeedFactor,
      uvAnimationScrollYSpeedFactor,
      uvAnimationRotationSpeedFactor
    };
    return __spreadProps(__spreadValues2({}, schemaMaterial), {
      pbrMetallicRoughness: {
        baseColorFactor,
        baseColorTexture
      },
      normalTexture,
      emissiveTexture,
      emissiveFactor,
      alphaMode,
      alphaCutoff,
      doubleSided,
      extensions: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        VRMC_materials_mtoon: mtoonExtension
      }
    });
  }
  _parseV0UnlitProperties(materialProperties, schemaMaterial) {
    var _a2, _b2, _c, _d2, _e;
    const isTransparentZWrite = materialProperties.shader === "VRM/UnlitTransparentZWrite";
    const isTransparent = materialProperties.shader === "VRM/UnlitTransparent" || isTransparentZWrite;
    const renderQueueOffsetNumber = this._v0ParseRenderQueue(materialProperties);
    const isCutoff = materialProperties.shader === "VRM/UnlitCutout";
    const alphaMode = isTransparent ? "BLEND" : isCutoff ? "MASK" : "OPAQUE";
    const alphaCutoff = isCutoff ? (_b2 = (_a2 = materialProperties.floatProperties) == null ? void 0 : _a2["_Cutoff"]) != null ? _b2 : 0.5 : void 0;
    const textureTransformExt = this._portTextureTransform(materialProperties);
    const baseColorFactor = ((_d2 = (_c = materialProperties.vectorProperties) == null ? void 0 : _c["_Color"]) != null ? _d2 : [1, 1, 1, 1]).map(gammaEOTF);
    const baseColorTextureIndex = (_e = materialProperties.textureProperties) == null ? void 0 : _e["_MainTex"];
    const baseColorTexture = baseColorTextureIndex != null ? {
      index: baseColorTextureIndex,
      extensions: __spreadValues2({}, textureTransformExt)
    } : void 0;
    const mtoonExtension = {
      specVersion: "1.0",
      transparentWithZWrite: isTransparentZWrite,
      renderQueueOffsetNumber,
      shadeColorFactor: baseColorFactor,
      shadeMultiplyTexture: baseColorTexture
    };
    return __spreadProps(__spreadValues2({}, schemaMaterial), {
      pbrMetallicRoughness: {
        baseColorFactor,
        baseColorTexture
      },
      alphaMode,
      alphaCutoff,
      extensions: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        VRMC_materials_mtoon: mtoonExtension
      }
    });
  }
  /**
   * Create a glTF `KHR_texture_transform` extension from v0 texture transform info.
   */
  _portTextureTransform(materialProperties) {
    var _a2, _b2, _c, _d2, _e;
    const textureTransform = (_a2 = materialProperties.vectorProperties) == null ? void 0 : _a2["_MainTex"];
    if (textureTransform == null) {
      return {};
    }
    const offset = [(_b2 = textureTransform == null ? void 0 : textureTransform[0]) != null ? _b2 : 0, (_c = textureTransform == null ? void 0 : textureTransform[1]) != null ? _c : 0];
    const scale = [(_d2 = textureTransform == null ? void 0 : textureTransform[2]) != null ? _d2 : 1, (_e = textureTransform == null ? void 0 : textureTransform[3]) != null ? _e : 1];
    offset[1] = 1 - scale[1] - offset[1];
    return {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      KHR_texture_transform: { offset, scale }
    };
  }
  /**
   * Convert v0 render order into v1 render order.
   * This uses a map from v0 render queue to v1 compliant render queue offset which is generated in {@link _populateRenderQueueMap}.
   */
  _v0ParseRenderQueue(materialProperties) {
    var _a2, _b2;
    const isTransparentZWrite = materialProperties.shader === "VRM/UnlitTransparentZWrite";
    const isTransparent = ((_a2 = materialProperties.keywordMap) == null ? void 0 : _a2["_ALPHABLEND_ON"]) != void 0 || materialProperties.shader === "VRM/UnlitTransparent" || isTransparentZWrite;
    const enabledZWrite = ((_b2 = materialProperties.floatProperties) == null ? void 0 : _b2["_ZWrite"]) === 1 || isTransparentZWrite;
    let offset = 0;
    if (isTransparent) {
      const v0Queue = materialProperties.renderQueue;
      if (v0Queue != null) {
        if (enabledZWrite) {
          offset = this._renderQueueMapTransparentZWrite.get(v0Queue);
        } else {
          offset = this._renderQueueMapTransparent.get(v0Queue);
        }
      }
    }
    return offset;
  }
  /**
   * Create a map which maps v0 render queue to v1 compliant render queue offset.
   * This lists up all render queues the model use and creates a map to new render queue offsets in the same order.
   */
  _populateRenderQueueMap(materialPropertiesList) {
    const renderQueuesTransparent = /* @__PURE__ */ new Set();
    const renderQueuesTransparentZWrite = /* @__PURE__ */ new Set();
    materialPropertiesList.forEach((materialProperties) => {
      var _a2, _b2;
      const isTransparentZWrite = materialProperties.shader === "VRM/UnlitTransparentZWrite";
      const isTransparent = ((_a2 = materialProperties.keywordMap) == null ? void 0 : _a2["_ALPHABLEND_ON"]) != void 0 || materialProperties.shader === "VRM/UnlitTransparent" || isTransparentZWrite;
      const enabledZWrite = ((_b2 = materialProperties.floatProperties) == null ? void 0 : _b2["_ZWrite"]) === 1 || isTransparentZWrite;
      if (isTransparent) {
        const v0Queue = materialProperties.renderQueue;
        if (v0Queue != null) {
          if (enabledZWrite) {
            renderQueuesTransparentZWrite.add(v0Queue);
          } else {
            renderQueuesTransparent.add(v0Queue);
          }
        }
      }
    });
    if (renderQueuesTransparent.size > 10) {
      console.warn(
        `VRMMaterialsV0CompatPlugin: This VRM uses ${renderQueuesTransparent.size} render queues for Transparent materials while VRM 1.0 only supports up to 10 render queues. The model might not be rendered correctly.`
      );
    }
    if (renderQueuesTransparentZWrite.size > 10) {
      console.warn(
        `VRMMaterialsV0CompatPlugin: This VRM uses ${renderQueuesTransparentZWrite.size} render queues for TransparentZWrite materials while VRM 1.0 only supports up to 10 render queues. The model might not be rendered correctly.`
      );
    }
    Array.from(renderQueuesTransparent).sort().forEach((queue, i) => {
      const newQueueOffset = Math.min(Math.max(i - renderQueuesTransparent.size + 1, -9), 0);
      this._renderQueueMapTransparent.set(queue, newQueueOffset);
    });
    Array.from(renderQueuesTransparentZWrite).sort().forEach((queue, i) => {
      const newQueueOffset = Math.min(Math.max(i, 0), 9);
      this._renderQueueMapTransparentZWrite.set(queue, newQueueOffset);
    });
  }
};
var __async6 = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected2 = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected2);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
var _v3A6 = new THREE19.Vector3();
var VRMNodeConstraintHelper = class extends THREE19.Group {
  constructor(constraint) {
    super();
    this._attrPosition = new THREE19.BufferAttribute(new Float32Array([0, 0, 0, 0, 0, 0]), 3);
    this._attrPosition.setUsage(THREE19.DynamicDrawUsage);
    const geometry = new THREE19.BufferGeometry();
    geometry.setAttribute("position", this._attrPosition);
    const material = new THREE19.LineBasicMaterial({
      color: 16711935,
      depthTest: false,
      depthWrite: false
    });
    this._line = new THREE19.Line(geometry, material);
    this.add(this._line);
    this.constraint = constraint;
  }
  updateMatrixWorld(force) {
    _v3A6.setFromMatrixPosition(this.constraint.destination.matrixWorld);
    this._attrPosition.setXYZ(0, _v3A6.x, _v3A6.y, _v3A6.z);
    if (this.constraint.source) {
      _v3A6.setFromMatrixPosition(this.constraint.source.matrixWorld);
    }
    this._attrPosition.setXYZ(1, _v3A6.x, _v3A6.y, _v3A6.z);
    this._attrPosition.needsUpdate = true;
    super.updateMatrixWorld(force);
  }
};
function decomposePosition(matrix2, target) {
  return target.set(matrix2.elements[12], matrix2.elements[13], matrix2.elements[14]);
}
var _v3A22 = new THREE23.Vector3();
var _v3B4 = new THREE23.Vector3();
function decomposeRotation(matrix2, target) {
  matrix2.decompose(_v3A22, target, _v3B4);
  return target;
}
function quatInvertCompat2(target) {
  if (target.invert) {
    target.invert();
  } else {
    target.inverse();
  }
  return target;
}
var VRMNodeConstraint = class {
  /**
   * @param destination The destination object
   * @param source The source object
   */
  constructor(destination, source) {
    this.destination = destination;
    this.source = source;
    this.weight = 1;
  }
};
var _v3A32 = new THREE33.Vector3();
var _v3B22 = new THREE33.Vector3();
var _v3C2 = new THREE33.Vector3();
var _quatA7 = new THREE33.Quaternion();
var _quatB4 = new THREE33.Quaternion();
var _quatC2 = new THREE33.Quaternion();
var VRMAimConstraint = class extends VRMNodeConstraint {
  /**
   * The aim axis of the constraint.
   */
  get aimAxis() {
    return this._aimAxis;
  }
  /**
   * The aim axis of the constraint.
   */
  set aimAxis(aimAxis) {
    this._aimAxis = aimAxis;
    this._v3AimAxis.set(
      aimAxis === "PositiveX" ? 1 : aimAxis === "NegativeX" ? -1 : 0,
      aimAxis === "PositiveY" ? 1 : aimAxis === "NegativeY" ? -1 : 0,
      aimAxis === "PositiveZ" ? 1 : aimAxis === "NegativeZ" ? -1 : 0
    );
  }
  get dependencies() {
    const set = /* @__PURE__ */ new Set([this.source]);
    if (this.destination.parent) {
      set.add(this.destination.parent);
    }
    return set;
  }
  constructor(destination, source) {
    super(destination, source);
    this._aimAxis = "PositiveX";
    this._v3AimAxis = new THREE33.Vector3(1, 0, 0);
    this._dstRestQuat = new THREE33.Quaternion();
  }
  setInitState() {
    this._dstRestQuat.copy(this.destination.quaternion);
  }
  update() {
    this.destination.updateWorldMatrix(true, false);
    this.source.updateWorldMatrix(true, false);
    const dstParentWorldQuat = _quatA7.identity();
    const invDstParentWorldQuat = _quatB4.identity();
    if (this.destination.parent) {
      decomposeRotation(this.destination.parent.matrixWorld, dstParentWorldQuat);
      quatInvertCompat2(invDstParentWorldQuat.copy(dstParentWorldQuat));
    }
    const a0 = _v3A32.copy(this._v3AimAxis).applyQuaternion(this._dstRestQuat).applyQuaternion(dstParentWorldQuat);
    const a1 = decomposePosition(this.source.matrixWorld, _v3B22).sub(decomposePosition(this.destination.matrixWorld, _v3C2)).normalize();
    const targetQuat = _quatC2.setFromUnitVectors(a0, a1).premultiply(invDstParentWorldQuat).multiply(dstParentWorldQuat).multiply(this._dstRestQuat);
    this.destination.quaternion.copy(this._dstRestQuat).slerp(targetQuat, this.weight);
  }
};
function traverseAncestorsFromRoot(object, callback) {
  const ancestors = [object];
  let head = object.parent;
  while (head !== null) {
    ancestors.unshift(head);
    head = head.parent;
  }
  ancestors.forEach((ancestor) => {
    callback(ancestor);
  });
}
var VRMNodeConstraintManager = class {
  constructor() {
    this._constraints = /* @__PURE__ */ new Set();
    this._objectConstraintsMap = /* @__PURE__ */ new Map();
  }
  get constraints() {
    return this._constraints;
  }
  addConstraint(constraint) {
    this._constraints.add(constraint);
    let objectSet = this._objectConstraintsMap.get(constraint.destination);
    if (objectSet == null) {
      objectSet = /* @__PURE__ */ new Set();
      this._objectConstraintsMap.set(constraint.destination, objectSet);
    }
    objectSet.add(constraint);
  }
  deleteConstraint(constraint) {
    this._constraints.delete(constraint);
    const objectSet = this._objectConstraintsMap.get(constraint.destination);
    objectSet.delete(constraint);
  }
  setInitState() {
    const constraintsTried = /* @__PURE__ */ new Set();
    const constraintsDone = /* @__PURE__ */ new Set();
    for (const constraint of this._constraints) {
      this._processConstraint(constraint, constraintsTried, constraintsDone, (constraint2) => constraint2.setInitState());
    }
  }
  update() {
    const constraintsTried = /* @__PURE__ */ new Set();
    const constraintsDone = /* @__PURE__ */ new Set();
    for (const constraint of this._constraints) {
      this._processConstraint(constraint, constraintsTried, constraintsDone, (constraint2) => constraint2.update());
    }
  }
  /**
   * Update a constraint.
   * If there are other constraints that are dependant, it will try to update them recursively.
   * It might throw an error if there are circular dependencies.
   *
   * Intended to be used in {@link update} and {@link _processConstraint} itself recursively.
   *
   * @param constraint A constraint you want to update
   * @param constraintsTried Set of constraints that are already tried to be updated
   * @param constraintsDone Set of constraints that are already up to date
   */
  _processConstraint(constraint, constraintsTried, constraintsDone, callback) {
    if (constraintsDone.has(constraint)) {
      return;
    }
    if (constraintsTried.has(constraint)) {
      throw new Error("VRMNodeConstraintManager: Circular dependency detected while updating constraints");
    }
    constraintsTried.add(constraint);
    const depObjects = constraint.dependencies;
    for (const depObject of depObjects) {
      traverseAncestorsFromRoot(depObject, (depObjectAncestor) => {
        const objectSet = this._objectConstraintsMap.get(depObjectAncestor);
        if (objectSet) {
          for (const depConstraint of objectSet) {
            this._processConstraint(depConstraint, constraintsTried, constraintsDone, callback);
          }
        }
      });
    }
    callback(constraint);
    constraintsDone.add(constraint);
  }
};
var _quatA22 = new THREE43.Quaternion();
var _quatB22 = new THREE43.Quaternion();
var VRMRotationConstraint = class extends VRMNodeConstraint {
  get dependencies() {
    return /* @__PURE__ */ new Set([this.source]);
  }
  constructor(destination, source) {
    super(destination, source);
    this._dstRestQuat = new THREE43.Quaternion();
    this._invSrcRestQuat = new THREE43.Quaternion();
  }
  setInitState() {
    this._dstRestQuat.copy(this.destination.quaternion);
    quatInvertCompat2(this._invSrcRestQuat.copy(this.source.quaternion));
  }
  update() {
    const srcDeltaQuat = _quatA22.copy(this._invSrcRestQuat).multiply(this.source.quaternion);
    const targetQuat = _quatB22.copy(this._dstRestQuat).multiply(srcDeltaQuat);
    this.destination.quaternion.copy(this._dstRestQuat).slerp(targetQuat, this.weight);
  }
};
var _v3A42 = new THREE53.Vector3();
var _quatA32 = new THREE53.Quaternion();
var _quatB32 = new THREE53.Quaternion();
var VRMRollConstraint = class extends VRMNodeConstraint {
  /**
   * The roll axis of the constraint.
   */
  get rollAxis() {
    return this._rollAxis;
  }
  /**
   * The roll axis of the constraint.
   */
  set rollAxis(rollAxis) {
    this._rollAxis = rollAxis;
    this._v3RollAxis.set(rollAxis === "X" ? 1 : 0, rollAxis === "Y" ? 1 : 0, rollAxis === "Z" ? 1 : 0);
  }
  get dependencies() {
    return /* @__PURE__ */ new Set([this.source]);
  }
  constructor(destination, source) {
    super(destination, source);
    this._rollAxis = "X";
    this._v3RollAxis = new THREE53.Vector3(1, 0, 0);
    this._dstRestQuat = new THREE53.Quaternion();
    this._invDstRestQuat = new THREE53.Quaternion();
    this._invSrcRestQuatMulDstRestQuat = new THREE53.Quaternion();
  }
  setInitState() {
    this._dstRestQuat.copy(this.destination.quaternion);
    quatInvertCompat2(this._invDstRestQuat.copy(this._dstRestQuat));
    quatInvertCompat2(this._invSrcRestQuatMulDstRestQuat.copy(this.source.quaternion)).multiply(this._dstRestQuat);
  }
  update() {
    const quatDelta = _quatA32.copy(this._invDstRestQuat).multiply(this.source.quaternion).multiply(this._invSrcRestQuatMulDstRestQuat);
    const n1 = _v3A42.copy(this._v3RollAxis).applyQuaternion(quatDelta);
    const quatFromTo = _quatB32.setFromUnitVectors(n1, this._v3RollAxis);
    const targetQuat = quatFromTo.premultiply(this._dstRestQuat).multiply(quatDelta);
    this.destination.quaternion.copy(this._dstRestQuat).slerp(targetQuat, this.weight);
  }
};
var POSSIBLE_SPEC_VERSIONS7 = /* @__PURE__ */ new Set(["1.0", "1.0-beta"]);
var _VRMNodeConstraintLoaderPlugin = class _VRMNodeConstraintLoaderPlugin2 {
  get name() {
    return _VRMNodeConstraintLoaderPlugin2.EXTENSION_NAME;
  }
  constructor(parser, options) {
    this.parser = parser;
    this.helperRoot = options == null ? void 0 : options.helperRoot;
  }
  afterRoot(gltf) {
    return __async6(this, null, function* () {
      gltf.userData.vrmNodeConstraintManager = yield this._import(gltf);
    });
  }
  /**
   * Import constraints from a GLTF and returns a {@link VRMNodeConstraintManager}.
   * It might return `null` instead when it does not need to be created or something go wrong.
   *
   * @param gltf A parsed result of GLTF taken from GLTFLoader
   */
  _import(gltf) {
    return __async6(this, null, function* () {
      var _a2;
      const json = this.parser.json;
      const isConstraintsUsed = ((_a2 = json.extensionsUsed) == null ? void 0 : _a2.indexOf(_VRMNodeConstraintLoaderPlugin2.EXTENSION_NAME)) !== -1;
      if (!isConstraintsUsed) {
        return null;
      }
      const manager = new VRMNodeConstraintManager();
      const threeNodes = yield this.parser.getDependencies("node");
      threeNodes.forEach((node, nodeIndex) => {
        var _a22;
        const schemaNode = json.nodes[nodeIndex];
        const extension = (_a22 = schemaNode == null ? void 0 : schemaNode.extensions) == null ? void 0 : _a22[_VRMNodeConstraintLoaderPlugin2.EXTENSION_NAME];
        if (extension == null) {
          return;
        }
        const specVersion = extension.specVersion;
        if (!POSSIBLE_SPEC_VERSIONS7.has(specVersion)) {
          console.warn(
            `VRMNodeConstraintLoaderPlugin: Unknown ${_VRMNodeConstraintLoaderPlugin2.EXTENSION_NAME} specVersion "${specVersion}"`
          );
          return;
        }
        const constraintDef = extension.constraint;
        if (constraintDef.roll != null) {
          const constraint = this._importRollConstraint(node, threeNodes, constraintDef.roll);
          manager.addConstraint(constraint);
        } else if (constraintDef.aim != null) {
          const constraint = this._importAimConstraint(node, threeNodes, constraintDef.aim);
          manager.addConstraint(constraint);
        } else if (constraintDef.rotation != null) {
          const constraint = this._importRotationConstraint(node, threeNodes, constraintDef.rotation);
          manager.addConstraint(constraint);
        }
      });
      gltf.scene.updateMatrixWorld();
      manager.setInitState();
      return manager;
    });
  }
  _importRollConstraint(destination, nodes, rollConstraintDef) {
    const { source: sourceIndex, rollAxis, weight } = rollConstraintDef;
    const source = nodes[sourceIndex];
    const constraint = new VRMRollConstraint(destination, source);
    if (rollAxis != null) {
      constraint.rollAxis = rollAxis;
    }
    if (weight != null) {
      constraint.weight = weight;
    }
    if (this.helperRoot) {
      const helper = new VRMNodeConstraintHelper(constraint);
      this.helperRoot.add(helper);
    }
    return constraint;
  }
  _importAimConstraint(destination, nodes, aimConstraintDef) {
    const { source: sourceIndex, aimAxis, weight } = aimConstraintDef;
    const source = nodes[sourceIndex];
    const constraint = new VRMAimConstraint(destination, source);
    if (aimAxis != null) {
      constraint.aimAxis = aimAxis;
    }
    if (weight != null) {
      constraint.weight = weight;
    }
    if (this.helperRoot) {
      const helper = new VRMNodeConstraintHelper(constraint);
      this.helperRoot.add(helper);
    }
    return constraint;
  }
  _importRotationConstraint(destination, nodes, rotationConstraintDef) {
    const { source: sourceIndex, weight } = rotationConstraintDef;
    const source = nodes[sourceIndex];
    const constraint = new VRMRotationConstraint(destination, source);
    if (weight != null) {
      constraint.weight = weight;
    }
    if (this.helperRoot) {
      const helper = new VRMNodeConstraintHelper(constraint);
      this.helperRoot.add(helper);
    }
    return constraint;
  }
};
_VRMNodeConstraintLoaderPlugin.EXTENSION_NAME = "VRMC_node_constraint";
var VRMNodeConstraintLoaderPlugin = _VRMNodeConstraintLoaderPlugin;
var __async7 = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected2 = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected2);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
var VRMSpringBoneColliderShape = class {
};
var _v3A7 = new THREE20.Vector3();
var _v3B5 = new THREE20.Vector3();
var VRMSpringBoneColliderShapeCapsule = class extends VRMSpringBoneColliderShape {
  get type() {
    return "capsule";
  }
  constructor(params) {
    var _a2, _b2, _c, _d2;
    super();
    this.offset = (_a2 = params == null ? void 0 : params.offset) != null ? _a2 : new THREE20.Vector3(0, 0, 0);
    this.tail = (_b2 = params == null ? void 0 : params.tail) != null ? _b2 : new THREE20.Vector3(0, 0, 0);
    this.radius = (_c = params == null ? void 0 : params.radius) != null ? _c : 0;
    this.inside = (_d2 = params == null ? void 0 : params.inside) != null ? _d2 : false;
  }
  calculateCollision(colliderMatrix, objectPosition, objectRadius, target) {
    _v3A7.setFromMatrixPosition(colliderMatrix);
    _v3B5.subVectors(this.tail, this.offset).applyMatrix4(colliderMatrix);
    _v3B5.sub(_v3A7);
    const lengthSqCapsule = _v3B5.lengthSq();
    target.copy(objectPosition).sub(_v3A7);
    const dot2 = _v3B5.dot(target);
    if (dot2 <= 0) {
    } else if (lengthSqCapsule <= dot2) {
      target.sub(_v3B5);
    } else {
      _v3B5.multiplyScalar(dot2 / lengthSqCapsule);
      target.sub(_v3B5);
    }
    const length2 = target.length();
    const distance2 = this.inside ? this.radius - objectRadius - length2 : length2 - objectRadius - this.radius;
    if (distance2 < 0) {
      target.multiplyScalar(1 / length2);
      if (this.inside) {
        target.negate();
      }
    }
    return distance2;
  }
};
var _v3A23 = new THREE24.Vector3();
var _mat3A = new THREE24.Matrix3();
var VRMSpringBoneColliderShapePlane = class extends VRMSpringBoneColliderShape {
  get type() {
    return "plane";
  }
  constructor(params) {
    var _a2, _b2;
    super();
    this.offset = (_a2 = params == null ? void 0 : params.offset) != null ? _a2 : new THREE24.Vector3(0, 0, 0);
    this.normal = (_b2 = params == null ? void 0 : params.normal) != null ? _b2 : new THREE24.Vector3(0, 0, 1);
  }
  calculateCollision(colliderMatrix, objectPosition, objectRadius, target) {
    target.setFromMatrixPosition(colliderMatrix);
    target.negate().add(objectPosition);
    _mat3A.getNormalMatrix(colliderMatrix);
    _v3A23.copy(this.normal).applyNormalMatrix(_mat3A).normalize();
    const distance2 = target.dot(_v3A23) - objectRadius;
    target.copy(_v3A23);
    return distance2;
  }
};
var _v3A33 = new THREE34.Vector3();
var VRMSpringBoneColliderShapeSphere = class extends VRMSpringBoneColliderShape {
  get type() {
    return "sphere";
  }
  constructor(params) {
    var _a2, _b2, _c;
    super();
    this.offset = (_a2 = params == null ? void 0 : params.offset) != null ? _a2 : new THREE34.Vector3(0, 0, 0);
    this.radius = (_b2 = params == null ? void 0 : params.radius) != null ? _b2 : 0;
    this.inside = (_c = params == null ? void 0 : params.inside) != null ? _c : false;
  }
  calculateCollision(colliderMatrix, objectPosition, objectRadius, target) {
    target.subVectors(objectPosition, _v3A33.setFromMatrixPosition(colliderMatrix));
    const length2 = target.length();
    const distance2 = this.inside ? this.radius - objectRadius - length2 : length2 - objectRadius - this.radius;
    if (distance2 < 0) {
      target.multiplyScalar(1 / length2);
      if (this.inside) {
        target.negate();
      }
    }
    return distance2;
  }
};
var _v3A43 = new THREE44.Vector3();
var ColliderShapeCapsuleBufferGeometry = class extends THREE44.BufferGeometry {
  constructor(shape) {
    super();
    this.worldScale = 1;
    this._currentRadius = 0;
    this._currentOffset = new THREE44.Vector3();
    this._currentTail = new THREE44.Vector3();
    this._shape = shape;
    this._attrPos = new THREE44.BufferAttribute(new Float32Array(396), 3);
    this.setAttribute("position", this._attrPos);
    this._attrIndex = new THREE44.BufferAttribute(new Uint16Array(264), 1);
    this.setIndex(this._attrIndex);
    this._buildIndex();
    this.update();
  }
  update() {
    let shouldUpdateGeometry = false;
    const radius = this._shape.radius / this.worldScale;
    if (this._currentRadius !== radius) {
      this._currentRadius = radius;
      shouldUpdateGeometry = true;
    }
    if (!this._currentOffset.equals(this._shape.offset)) {
      this._currentOffset.copy(this._shape.offset);
      shouldUpdateGeometry = true;
    }
    const tail = _v3A43.copy(this._shape.tail).divideScalar(this.worldScale);
    if (this._currentTail.distanceToSquared(tail) > 1e-10) {
      this._currentTail.copy(tail);
      shouldUpdateGeometry = true;
    }
    if (shouldUpdateGeometry) {
      this._buildPosition();
    }
  }
  _buildPosition() {
    _v3A43.copy(this._currentTail).sub(this._currentOffset);
    const l = _v3A43.length() / this._currentRadius;
    for (let i = 0; i <= 16; i++) {
      const t = i / 16 * Math.PI;
      this._attrPos.setXYZ(i, -Math.sin(t), -Math.cos(t), 0);
      this._attrPos.setXYZ(17 + i, l + Math.sin(t), Math.cos(t), 0);
      this._attrPos.setXYZ(34 + i, -Math.sin(t), 0, -Math.cos(t));
      this._attrPos.setXYZ(51 + i, l + Math.sin(t), 0, Math.cos(t));
    }
    for (let i = 0; i < 32; i++) {
      const t = i / 16 * Math.PI;
      this._attrPos.setXYZ(68 + i, 0, Math.sin(t), Math.cos(t));
      this._attrPos.setXYZ(100 + i, l, Math.sin(t), Math.cos(t));
    }
    const theta = Math.atan2(_v3A43.y, Math.sqrt(_v3A43.x * _v3A43.x + _v3A43.z * _v3A43.z));
    const phi = -Math.atan2(_v3A43.z, _v3A43.x);
    this.rotateZ(theta);
    this.rotateY(phi);
    this.scale(this._currentRadius, this._currentRadius, this._currentRadius);
    this.translate(this._currentOffset.x, this._currentOffset.y, this._currentOffset.z);
    this._attrPos.needsUpdate = true;
  }
  _buildIndex() {
    for (let i = 0; i < 34; i++) {
      const i1 = (i + 1) % 34;
      this._attrIndex.setXY(i * 2, i, i1);
      this._attrIndex.setXY(68 + i * 2, 34 + i, 34 + i1);
    }
    for (let i = 0; i < 32; i++) {
      const i1 = (i + 1) % 32;
      this._attrIndex.setXY(136 + i * 2, 68 + i, 68 + i1);
      this._attrIndex.setXY(200 + i * 2, 100 + i, 100 + i1);
    }
    this._attrIndex.needsUpdate = true;
  }
};
var ColliderShapePlaneBufferGeometry = class extends THREE54.BufferGeometry {
  constructor(shape) {
    super();
    this.worldScale = 1;
    this._currentOffset = new THREE54.Vector3();
    this._currentNormal = new THREE54.Vector3();
    this._shape = shape;
    this._attrPos = new THREE54.BufferAttribute(new Float32Array(6 * 3), 3);
    this.setAttribute("position", this._attrPos);
    this._attrIndex = new THREE54.BufferAttribute(new Uint16Array(10), 1);
    this.setIndex(this._attrIndex);
    this._buildIndex();
    this.update();
  }
  update() {
    let shouldUpdateGeometry = false;
    if (!this._currentOffset.equals(this._shape.offset)) {
      this._currentOffset.copy(this._shape.offset);
      shouldUpdateGeometry = true;
    }
    if (!this._currentNormal.equals(this._shape.normal)) {
      this._currentNormal.copy(this._shape.normal);
      shouldUpdateGeometry = true;
    }
    if (shouldUpdateGeometry) {
      this._buildPosition();
    }
  }
  _buildPosition() {
    this._attrPos.setXYZ(0, -0.5, -0.5, 0);
    this._attrPos.setXYZ(1, 0.5, -0.5, 0);
    this._attrPos.setXYZ(2, 0.5, 0.5, 0);
    this._attrPos.setXYZ(3, -0.5, 0.5, 0);
    this._attrPos.setXYZ(4, 0, 0, 0);
    this._attrPos.setXYZ(5, 0, 0, 0.25);
    this.translate(this._currentOffset.x, this._currentOffset.y, this._currentOffset.z);
    this.lookAt(this._currentNormal);
    this._attrPos.needsUpdate = true;
  }
  _buildIndex() {
    this._attrIndex.setXY(0, 0, 1);
    this._attrIndex.setXY(2, 1, 2);
    this._attrIndex.setXY(4, 2, 3);
    this._attrIndex.setXY(6, 3, 0);
    this._attrIndex.setXY(8, 4, 5);
    this._attrIndex.needsUpdate = true;
  }
};
var ColliderShapeSphereBufferGeometry = class extends THREE62.BufferGeometry {
  constructor(shape) {
    super();
    this.worldScale = 1;
    this._currentRadius = 0;
    this._currentOffset = new THREE62.Vector3();
    this._shape = shape;
    this._attrPos = new THREE62.BufferAttribute(new Float32Array(32 * 3 * 3), 3);
    this.setAttribute("position", this._attrPos);
    this._attrIndex = new THREE62.BufferAttribute(new Uint16Array(64 * 3), 1);
    this.setIndex(this._attrIndex);
    this._buildIndex();
    this.update();
  }
  update() {
    let shouldUpdateGeometry = false;
    const radius = this._shape.radius / this.worldScale;
    if (this._currentRadius !== radius) {
      this._currentRadius = radius;
      shouldUpdateGeometry = true;
    }
    if (!this._currentOffset.equals(this._shape.offset)) {
      this._currentOffset.copy(this._shape.offset);
      shouldUpdateGeometry = true;
    }
    if (shouldUpdateGeometry) {
      this._buildPosition();
    }
  }
  _buildPosition() {
    for (let i = 0; i < 32; i++) {
      const t = i / 16 * Math.PI;
      this._attrPos.setXYZ(i, Math.cos(t), Math.sin(t), 0);
      this._attrPos.setXYZ(32 + i, 0, Math.cos(t), Math.sin(t));
      this._attrPos.setXYZ(64 + i, Math.sin(t), 0, Math.cos(t));
    }
    this.scale(this._currentRadius, this._currentRadius, this._currentRadius);
    this.translate(this._currentOffset.x, this._currentOffset.y, this._currentOffset.z);
    this._attrPos.needsUpdate = true;
  }
  _buildIndex() {
    for (let i = 0; i < 32; i++) {
      const i1 = (i + 1) % 32;
      this._attrIndex.setXY(i * 2, i, i1);
      this._attrIndex.setXY(64 + i * 2, 32 + i, 32 + i1);
      this._attrIndex.setXY(128 + i * 2, 64 + i, 64 + i1);
    }
    this._attrIndex.needsUpdate = true;
  }
};
var _v3A52 = new THREE72.Vector3();
var VRMSpringBoneColliderHelper = class extends THREE72.Group {
  constructor(collider) {
    super();
    this.matrixAutoUpdate = false;
    this.collider = collider;
    if (this.collider.shape instanceof VRMSpringBoneColliderShapeSphere) {
      this._geometry = new ColliderShapeSphereBufferGeometry(this.collider.shape);
    } else if (this.collider.shape instanceof VRMSpringBoneColliderShapeCapsule) {
      this._geometry = new ColliderShapeCapsuleBufferGeometry(this.collider.shape);
    } else if (this.collider.shape instanceof VRMSpringBoneColliderShapePlane) {
      this._geometry = new ColliderShapePlaneBufferGeometry(this.collider.shape);
    } else {
      throw new Error("VRMSpringBoneColliderHelper: Unknown collider shape type detected");
    }
    const material = new THREE72.LineBasicMaterial({
      color: 16711935,
      depthTest: false,
      depthWrite: false
    });
    this._line = new THREE72.LineSegments(this._geometry, material);
    this.add(this._line);
  }
  dispose() {
    this._geometry.dispose();
  }
  updateMatrixWorld(force) {
    this.collider.updateWorldMatrix(true, false);
    this.matrix.copy(this.collider.matrixWorld);
    const matrixWorldElements = this.matrix.elements;
    this._geometry.worldScale = _v3A52.set(matrixWorldElements[0], matrixWorldElements[1], matrixWorldElements[2]).length();
    this._geometry.update();
    super.updateMatrixWorld(force);
  }
};
var SpringBoneBufferGeometry = class extends THREE82.BufferGeometry {
  constructor(springBone) {
    super();
    this.worldScale = 1;
    this._currentRadius = 0;
    this._currentTail = new THREE82.Vector3();
    this._springBone = springBone;
    this._attrPos = new THREE82.BufferAttribute(new Float32Array(294), 3);
    this.setAttribute("position", this._attrPos);
    this._attrIndex = new THREE82.BufferAttribute(new Uint16Array(194), 1);
    this.setIndex(this._attrIndex);
    this._buildIndex();
    this.update();
  }
  update() {
    let shouldUpdateGeometry = false;
    const radius = this._springBone.settings.hitRadius / this.worldScale;
    if (this._currentRadius !== radius) {
      this._currentRadius = radius;
      shouldUpdateGeometry = true;
    }
    if (!this._currentTail.equals(this._springBone.initialLocalChildPosition)) {
      this._currentTail.copy(this._springBone.initialLocalChildPosition);
      shouldUpdateGeometry = true;
    }
    if (shouldUpdateGeometry) {
      this._buildPosition();
    }
  }
  _buildPosition() {
    for (let i = 0; i < 32; i++) {
      const t = i / 16 * Math.PI;
      this._attrPos.setXYZ(i, Math.cos(t), Math.sin(t), 0);
      this._attrPos.setXYZ(32 + i, 0, Math.cos(t), Math.sin(t));
      this._attrPos.setXYZ(64 + i, Math.sin(t), 0, Math.cos(t));
    }
    this.scale(this._currentRadius, this._currentRadius, this._currentRadius);
    this.translate(this._currentTail.x, this._currentTail.y, this._currentTail.z);
    this._attrPos.setXYZ(96, 0, 0, 0);
    this._attrPos.setXYZ(97, this._currentTail.x, this._currentTail.y, this._currentTail.z);
    this._attrPos.needsUpdate = true;
  }
  _buildIndex() {
    for (let i = 0; i < 32; i++) {
      const i1 = (i + 1) % 32;
      this._attrIndex.setXY(i * 2, i, i1);
      this._attrIndex.setXY(64 + i * 2, 32 + i, 32 + i1);
      this._attrIndex.setXY(128 + i * 2, 64 + i, 64 + i1);
    }
    this._attrIndex.setXY(192, 96, 97);
    this._attrIndex.needsUpdate = true;
  }
};
var _v3A62 = new THREE92.Vector3();
var VRMSpringBoneJointHelper = class extends THREE92.Group {
  constructor(springBone) {
    super();
    this.matrixAutoUpdate = false;
    this.springBone = springBone;
    this._geometry = new SpringBoneBufferGeometry(this.springBone);
    const material = new THREE92.LineBasicMaterial({
      color: 16776960,
      depthTest: false,
      depthWrite: false
    });
    this._line = new THREE92.LineSegments(this._geometry, material);
    this.add(this._line);
  }
  dispose() {
    this._geometry.dispose();
  }
  updateMatrixWorld(force) {
    this.springBone.bone.updateWorldMatrix(true, false);
    this.matrix.copy(this.springBone.bone.matrixWorld);
    const matrixWorldElements = this.matrix.elements;
    this._geometry.worldScale = _v3A62.set(matrixWorldElements[0], matrixWorldElements[1], matrixWorldElements[2]).length();
    this._geometry.update();
    super.updateMatrixWorld(force);
  }
};
var VRMSpringBoneCollider = class extends THREE102.Object3D {
  constructor(shape) {
    super();
    this.colliderMatrix = new THREE102.Matrix4();
    this.shape = shape;
  }
  updateWorldMatrix(updateParents, updateChildren) {
    super.updateWorldMatrix(updateParents, updateChildren);
    updateColliderMatrix(this.colliderMatrix, this.matrixWorld, this.shape.offset);
  }
};
function updateColliderMatrix(colliderMatrix, matrixWorld, offset) {
  const me = matrixWorld.elements;
  colliderMatrix.copy(matrixWorld);
  if (offset) {
    colliderMatrix.elements[12] = me[0] * offset.x + me[4] * offset.y + me[8] * offset.z + me[12];
    colliderMatrix.elements[13] = me[1] * offset.x + me[5] * offset.y + me[9] * offset.z + me[13];
    colliderMatrix.elements[14] = me[2] * offset.x + me[6] * offset.y + me[10] * offset.z + me[14];
  }
}
var _matA = new THREE112.Matrix4();
function mat4InvertCompat(target) {
  if (target.invert) {
    target.invert();
  } else {
    target.getInverse(_matA.copy(target));
  }
  return target;
}
var Matrix4InverseCache = class {
  constructor(matrix2) {
    this._inverseCache = new THREE122.Matrix4();
    this._shouldUpdateInverse = true;
    this.matrix = matrix2;
    const handler = {
      set: (obj, prop, newVal) => {
        this._shouldUpdateInverse = true;
        obj[prop] = newVal;
        return true;
      }
    };
    this._originalElements = matrix2.elements;
    matrix2.elements = new Proxy(matrix2.elements, handler);
  }
  /**
   * Inverse of given matrix.
   * Note that it will return its internal private instance.
   * Make sure copying this before mutate this.
   */
  get inverse() {
    if (this._shouldUpdateInverse) {
      mat4InvertCompat(this._inverseCache.copy(this.matrix));
      this._shouldUpdateInverse = false;
    }
    return this._inverseCache;
  }
  revert() {
    this.matrix.elements = this._originalElements;
  }
};
var IDENTITY_MATRIX4 = new THREE132.Matrix4();
var _v3A72 = new THREE132.Vector3();
var _v3B23 = new THREE132.Vector3();
var _worldSpacePosition = new THREE132.Vector3();
var _nextTail = new THREE132.Vector3();
var _matA2 = new THREE132.Matrix4();
var VRMSpringBoneJoint = class {
  /**
   * Create a new VRMSpringBone.
   *
   * @param bone An Object3D that will be attached to this bone
   * @param child An Object3D that will be used as a tail of this spring bone. It can be null when the spring bone is imported from VRM 0.0
   * @param settings Several parameters related to behavior of the spring bone
   * @param colliderGroups Collider groups that will be collided with this spring bone
   */
  constructor(bone, child, settings = {}, colliderGroups = []) {
    this._currentTail = new THREE132.Vector3();
    this._prevTail = new THREE132.Vector3();
    this._boneAxis = new THREE132.Vector3();
    this._worldSpaceBoneLength = 0;
    this._center = null;
    this._initialLocalMatrix = new THREE132.Matrix4();
    this._initialLocalRotation = new THREE132.Quaternion();
    this._initialLocalChildPosition = new THREE132.Vector3();
    var _a2, _b2, _c, _d2, _e, _f;
    this.bone = bone;
    this.bone.matrixAutoUpdate = false;
    this.child = child;
    this.settings = {
      hitRadius: (_a2 = settings.hitRadius) != null ? _a2 : 0,
      stiffness: (_b2 = settings.stiffness) != null ? _b2 : 1,
      gravityPower: (_c = settings.gravityPower) != null ? _c : 0,
      gravityDir: (_e = (_d2 = settings.gravityDir) == null ? void 0 : _d2.clone()) != null ? _e : new THREE132.Vector3(0, -1, 0),
      dragForce: (_f = settings.dragForce) != null ? _f : 0.4
    };
    this.colliderGroups = colliderGroups;
  }
  /**
   * Set of dependencies that need to be updated before this joint.
   */
  get dependencies() {
    const set = /* @__PURE__ */ new Set();
    const parent = this.bone.parent;
    if (parent) {
      set.add(parent);
    }
    for (let cg = 0; cg < this.colliderGroups.length; cg++) {
      for (let c = 0; c < this.colliderGroups[cg].colliders.length; c++) {
        set.add(this.colliderGroups[cg].colliders[c]);
      }
    }
    return set;
  }
  get center() {
    return this._center;
  }
  set center(center) {
    var _a2;
    if ((_a2 = this._center) == null ? void 0 : _a2.userData.inverseCacheProxy) {
      this._center.userData.inverseCacheProxy.revert();
      delete this._center.userData.inverseCacheProxy;
    }
    this._center = center;
    if (this._center) {
      if (!this._center.userData.inverseCacheProxy) {
        this._center.userData.inverseCacheProxy = new Matrix4InverseCache(this._center.matrixWorld);
      }
    }
  }
  get initialLocalChildPosition() {
    return this._initialLocalChildPosition;
  }
  /**
   * Returns the world matrix of its parent object.
   * Note that it returns a reference to the matrix. Don't mutate this directly!
   */
  get _parentMatrixWorld() {
    return this.bone.parent ? this.bone.parent.matrixWorld : IDENTITY_MATRIX4;
  }
  /**
   * Set the initial state of this spring bone.
   * You might want to call {@link VRMSpringBoneManager.setInitState} instead.
   */
  setInitState() {
    this._initialLocalMatrix.copy(this.bone.matrix);
    this._initialLocalRotation.copy(this.bone.quaternion);
    if (this.child) {
      this._initialLocalChildPosition.copy(this.child.position);
    } else {
      this._initialLocalChildPosition.copy(this.bone.position).normalize().multiplyScalar(0.07);
    }
    const matrixWorldToCenter = this._getMatrixWorldToCenter();
    this.bone.localToWorld(this._currentTail.copy(this._initialLocalChildPosition)).applyMatrix4(matrixWorldToCenter);
    this._prevTail.copy(this._currentTail);
    this._boneAxis.copy(this._initialLocalChildPosition).normalize();
  }
  /**
   * Reset the state of this bone.
   * You might want to call {@link VRMSpringBoneManager.reset} instead.
   */
  reset() {
    this.bone.quaternion.copy(this._initialLocalRotation);
    this.bone.updateMatrix();
    this.bone.matrixWorld.multiplyMatrices(this._parentMatrixWorld, this.bone.matrix);
    const matrixWorldToCenter = this._getMatrixWorldToCenter();
    this.bone.localToWorld(this._currentTail.copy(this._initialLocalChildPosition)).applyMatrix4(matrixWorldToCenter);
    this._prevTail.copy(this._currentTail);
  }
  /**
   * Update the state of this bone.
   * You might want to call {@link VRMSpringBoneManager.update} instead.
   *
   * @param delta deltaTime
   */
  update(delta) {
    if (delta <= 0) return;
    this._calcWorldSpaceBoneLength();
    const worldSpaceBoneAxis = _v3B23.copy(this._boneAxis).transformDirection(this._initialLocalMatrix).transformDirection(this._parentMatrixWorld);
    _nextTail.copy(this._currentTail).add(_v3A72.subVectors(this._currentTail, this._prevTail).multiplyScalar(1 - this.settings.dragForce)).applyMatrix4(this._getMatrixCenterToWorld()).addScaledVector(worldSpaceBoneAxis, this.settings.stiffness * delta).addScaledVector(this.settings.gravityDir, this.settings.gravityPower * delta);
    _worldSpacePosition.setFromMatrixPosition(this.bone.matrixWorld);
    _nextTail.sub(_worldSpacePosition).normalize().multiplyScalar(this._worldSpaceBoneLength).add(_worldSpacePosition);
    this._collision(_nextTail);
    this._prevTail.copy(this._currentTail);
    this._currentTail.copy(_nextTail).applyMatrix4(this._getMatrixWorldToCenter());
    const worldSpaceInitialMatrixInv = _matA2.multiplyMatrices(this._parentMatrixWorld, this._initialLocalMatrix).invert();
    this.bone.quaternion.setFromUnitVectors(this._boneAxis, _v3A72.copy(_nextTail).applyMatrix4(worldSpaceInitialMatrixInv).normalize()).premultiply(this._initialLocalRotation);
    this.bone.updateMatrix();
    this.bone.matrixWorld.multiplyMatrices(this._parentMatrixWorld, this.bone.matrix);
  }
  /**
   * Do collision math against every colliders attached to this bone.
   *
   * @param tail The tail you want to process
   */
  _collision(tail) {
    for (let cg = 0; cg < this.colliderGroups.length; cg++) {
      for (let c = 0; c < this.colliderGroups[cg].colliders.length; c++) {
        const collider = this.colliderGroups[cg].colliders[c];
        const dist = collider.shape.calculateCollision(collider.colliderMatrix, tail, this.settings.hitRadius, _v3A72);
        if (dist < 0) {
          tail.addScaledVector(_v3A72, -dist);
          tail.sub(_worldSpacePosition);
          const length2 = tail.length();
          tail.multiplyScalar(this._worldSpaceBoneLength / length2).add(_worldSpacePosition);
        }
      }
    }
  }
  /**
   * Calculate the {@link _worldSpaceBoneLength}.
   * Intended to be used in {@link update}.
   */
  _calcWorldSpaceBoneLength() {
    _v3A72.setFromMatrixPosition(this.bone.matrixWorld);
    if (this.child) {
      _v3B23.setFromMatrixPosition(this.child.matrixWorld);
    } else {
      _v3B23.copy(this._initialLocalChildPosition);
      _v3B23.applyMatrix4(this.bone.matrixWorld);
    }
    this._worldSpaceBoneLength = _v3A72.sub(_v3B23).length();
  }
  /**
   * Create a matrix that converts center space into world space.
   */
  _getMatrixCenterToWorld() {
    return this._center ? this._center.matrixWorld : IDENTITY_MATRIX4;
  }
  /**
   * Create a matrix that converts world space into center space.
   */
  _getMatrixWorldToCenter() {
    return this._center ? this._center.userData.inverseCacheProxy.inverse : IDENTITY_MATRIX4;
  }
};
function traverseAncestorsFromRoot2(object, callback) {
  const ancestors = [];
  let head = object;
  while (head !== null) {
    ancestors.unshift(head);
    head = head.parent;
  }
  ancestors.forEach((ancestor) => {
    callback(ancestor);
  });
}
function traverseChildrenUntilConditionMet(object, callback) {
  object.children.forEach((child) => {
    const result = callback(child);
    if (!result) {
      traverseChildrenUntilConditionMet(child, callback);
    }
  });
}
function lowestCommonAncestor(objects) {
  var _a2;
  const sharedAncestors = /* @__PURE__ */ new Map();
  for (const object of objects) {
    let current = object;
    do {
      const newValue = ((_a2 = sharedAncestors.get(current)) != null ? _a2 : 0) + 1;
      if (newValue === objects.size) {
        return current;
      }
      sharedAncestors.set(current, newValue);
      current = current.parent;
    } while (current !== null);
  }
  return null;
}
var VRMSpringBoneManager = class {
  constructor() {
    this._joints = /* @__PURE__ */ new Set();
    this._sortedJoints = [];
    this._hasWarnedCircularDependency = false;
    this._ancestors = [];
    this._objectSpringBonesMap = /* @__PURE__ */ new Map();
    this._isSortedJointsDirty = false;
    this._relevantChildrenUpdated = this._relevantChildrenUpdated.bind(this);
  }
  get joints() {
    return this._joints;
  }
  /**
   * @deprecated Use {@link joints} instead.
   */
  get springBones() {
    console.warn("VRMSpringBoneManager: springBones is deprecated. use joints instead.");
    return this._joints;
  }
  get colliderGroups() {
    const set = /* @__PURE__ */ new Set();
    this._joints.forEach((springBone) => {
      springBone.colliderGroups.forEach((colliderGroup) => {
        set.add(colliderGroup);
      });
    });
    return Array.from(set);
  }
  get colliders() {
    const set = /* @__PURE__ */ new Set();
    this.colliderGroups.forEach((colliderGroup) => {
      colliderGroup.colliders.forEach((collider) => {
        set.add(collider);
      });
    });
    return Array.from(set);
  }
  addJoint(joint) {
    this._joints.add(joint);
    let objectSet = this._objectSpringBonesMap.get(joint.bone);
    if (objectSet == null) {
      objectSet = /* @__PURE__ */ new Set();
      this._objectSpringBonesMap.set(joint.bone, objectSet);
    }
    objectSet.add(joint);
    this._isSortedJointsDirty = true;
  }
  /**
   * @deprecated Use {@link addJoint} instead.
   */
  addSpringBone(joint) {
    console.warn("VRMSpringBoneManager: addSpringBone() is deprecated. use addJoint() instead.");
    this.addJoint(joint);
  }
  deleteJoint(joint) {
    this._joints.delete(joint);
    const objectSet = this._objectSpringBonesMap.get(joint.bone);
    objectSet.delete(joint);
    this._isSortedJointsDirty = true;
  }
  /**
   * @deprecated Use {@link deleteJoint} instead.
   */
  deleteSpringBone(joint) {
    console.warn("VRMSpringBoneManager: deleteSpringBone() is deprecated. use deleteJoint() instead.");
    this.deleteJoint(joint);
  }
  setInitState() {
    this._sortJoints();
    for (let i = 0; i < this._sortedJoints.length; i++) {
      const springBone = this._sortedJoints[i];
      springBone.bone.updateMatrix();
      springBone.bone.updateWorldMatrix(false, false);
      springBone.setInitState();
    }
  }
  reset() {
    this._sortJoints();
    for (let i = 0; i < this._sortedJoints.length; i++) {
      const springBone = this._sortedJoints[i];
      springBone.bone.updateMatrix();
      springBone.bone.updateWorldMatrix(false, false);
      springBone.reset();
    }
  }
  update(delta) {
    this._sortJoints();
    for (let i = 0; i < this._ancestors.length; i++) {
      this._ancestors[i].updateWorldMatrix(i === 0, false);
    }
    for (let i = 0; i < this._sortedJoints.length; i++) {
      const springBone = this._sortedJoints[i];
      springBone.bone.updateMatrix();
      springBone.bone.updateWorldMatrix(false, false);
      springBone.update(delta);
      traverseChildrenUntilConditionMet(springBone.bone, this._relevantChildrenUpdated);
    }
  }
  /**
   * Sorts the joints ensuring they are updated in the correct order taking dependencies into account.
   *
   * This method updates {@link _sortedJoints} and {@link _ancestors}.
   * Make sure to call this before using them.
   */
  _sortJoints() {
    if (!this._isSortedJointsDirty) {
      return;
    }
    const springBoneOrder = [];
    const springBonesTried = /* @__PURE__ */ new Set();
    const springBonesDone = /* @__PURE__ */ new Set();
    const ancestors = /* @__PURE__ */ new Set();
    for (const springBone of this._joints) {
      this._insertJointSort(springBone, springBonesTried, springBonesDone, springBoneOrder, ancestors);
    }
    this._sortedJoints = springBoneOrder;
    const lca = lowestCommonAncestor(ancestors);
    this._ancestors = [];
    if (lca) {
      this._ancestors.push(lca);
      traverseChildrenUntilConditionMet(lca, (object) => {
        var _a2, _b2;
        if (((_b2 = (_a2 = this._objectSpringBonesMap.get(object)) == null ? void 0 : _a2.size) != null ? _b2 : 0) > 0) {
          return true;
        }
        this._ancestors.push(object);
        return false;
      });
    }
    this._isSortedJointsDirty = false;
  }
  _insertJointSort(springBone, springBonesTried, springBonesDone, springBoneOrder, ancestors) {
    if (springBonesDone.has(springBone)) {
      return;
    }
    if (springBonesTried.has(springBone)) {
      if (!this._hasWarnedCircularDependency) {
        console.warn("VRMSpringBoneManager: Circular dependency detected");
        this._hasWarnedCircularDependency = true;
      }
      return;
    }
    springBonesTried.add(springBone);
    const depObjects = springBone.dependencies;
    for (const depObject of depObjects) {
      let encounteredSpringBone = false;
      let ancestor = null;
      traverseAncestorsFromRoot2(depObject, (depObjectAncestor) => {
        const objectSet = this._objectSpringBonesMap.get(depObjectAncestor);
        if (objectSet) {
          for (const depSpringBone of objectSet) {
            encounteredSpringBone = true;
            this._insertJointSort(depSpringBone, springBonesTried, springBonesDone, springBoneOrder, ancestors);
          }
        } else if (!encounteredSpringBone) {
          ancestor = depObjectAncestor;
        }
      });
      if (ancestor) {
        ancestors.add(ancestor);
      }
    }
    springBoneOrder.push(springBone);
    springBonesDone.add(springBone);
  }
  _relevantChildrenUpdated(object) {
    var _a2, _b2;
    if (((_b2 = (_a2 = this._objectSpringBonesMap.get(object)) == null ? void 0 : _a2.size) != null ? _b2 : 0) > 0) {
      return true;
    }
    object.updateWorldMatrix(false, false);
    return false;
  }
};
var EXTENSION_NAME_EXTENDED_COLLIDER = "VRMC_springBone_extended_collider";
var POSSIBLE_SPEC_VERSIONS8 = /* @__PURE__ */ new Set(["1.0", "1.0-beta"]);
var POSSIBLE_SPEC_VERSIONS_EXTENDED_COLLIDERS = /* @__PURE__ */ new Set(["1.0"]);
var _VRMSpringBoneLoaderPlugin = class _VRMSpringBoneLoaderPlugin2 {
  get name() {
    return _VRMSpringBoneLoaderPlugin2.EXTENSION_NAME;
  }
  constructor(parser, options) {
    var _a2;
    this.parser = parser;
    this.jointHelperRoot = options == null ? void 0 : options.jointHelperRoot;
    this.colliderHelperRoot = options == null ? void 0 : options.colliderHelperRoot;
    this.useExtendedColliders = (_a2 = options == null ? void 0 : options.useExtendedColliders) != null ? _a2 : true;
  }
  afterRoot(gltf) {
    return __async7(this, null, function* () {
      gltf.userData.vrmSpringBoneManager = yield this._import(gltf);
    });
  }
  /**
   * Import spring bones from a GLTF and return a {@link VRMSpringBoneManager}.
   * It might return `null` instead when it does not need to be created or something go wrong.
   *
   * @param gltf A parsed result of GLTF taken from GLTFLoader
   */
  _import(gltf) {
    return __async7(this, null, function* () {
      const v1Result = yield this._v1Import(gltf);
      if (v1Result != null) {
        return v1Result;
      }
      const v0Result = yield this._v0Import(gltf);
      if (v0Result != null) {
        return v0Result;
      }
      return null;
    });
  }
  _v1Import(gltf) {
    return __async7(this, null, function* () {
      var _a2, _b2, _c, _d2, _e;
      const json = gltf.parser.json;
      const isSpringBoneUsed = ((_a2 = json.extensionsUsed) == null ? void 0 : _a2.indexOf(_VRMSpringBoneLoaderPlugin2.EXTENSION_NAME)) !== -1;
      if (!isSpringBoneUsed) {
        return null;
      }
      const manager = new VRMSpringBoneManager();
      const threeNodes = yield gltf.parser.getDependencies("node");
      const extension = (_b2 = json.extensions) == null ? void 0 : _b2[_VRMSpringBoneLoaderPlugin2.EXTENSION_NAME];
      if (!extension) {
        return null;
      }
      const specVersion = extension.specVersion;
      if (!POSSIBLE_SPEC_VERSIONS8.has(specVersion)) {
        console.warn(
          `VRMSpringBoneLoaderPlugin: Unknown ${_VRMSpringBoneLoaderPlugin2.EXTENSION_NAME} specVersion "${specVersion}"`
        );
        return null;
      }
      const colliders = (_c = extension.colliders) == null ? void 0 : _c.map((schemaCollider, iCollider) => {
        var _a22, _b22, _c2, _d22, _e2, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o;
        const node = threeNodes[schemaCollider.node];
        if (node == null) {
          console.warn(
            `VRMSpringBoneLoaderPlugin: The collider #${iCollider} attempted to reference a node #${schemaCollider.node} but not found. Skipping the collider`
          );
          return null;
        }
        const schemaShape = schemaCollider.shape;
        const schemaExCollider = (_a22 = schemaCollider.extensions) == null ? void 0 : _a22[EXTENSION_NAME_EXTENDED_COLLIDER];
        if (this.useExtendedColliders && schemaExCollider != null) {
          const specVersionExCollider = schemaExCollider.specVersion;
          if (!POSSIBLE_SPEC_VERSIONS_EXTENDED_COLLIDERS.has(specVersionExCollider)) {
            console.warn(
              `VRMSpringBoneLoaderPlugin: Unknown ${EXTENSION_NAME_EXTENDED_COLLIDER} specVersion "${specVersionExCollider}". Fallbacking to the ${_VRMSpringBoneLoaderPlugin2.EXTENSION_NAME} definition`
            );
          } else {
            const schemaExShape = schemaExCollider.shape;
            if (schemaExShape.sphere) {
              return this._importSphereCollider(node, {
                offset: new THREE142.Vector3().fromArray((_b22 = schemaExShape.sphere.offset) != null ? _b22 : [0, 0, 0]),
                radius: (_c2 = schemaExShape.sphere.radius) != null ? _c2 : 0,
                inside: (_d22 = schemaExShape.sphere.inside) != null ? _d22 : false
              });
            } else if (schemaExShape.capsule) {
              return this._importCapsuleCollider(node, {
                offset: new THREE142.Vector3().fromArray((_e2 = schemaExShape.capsule.offset) != null ? _e2 : [0, 0, 0]),
                radius: (_f = schemaExShape.capsule.radius) != null ? _f : 0,
                tail: new THREE142.Vector3().fromArray((_g = schemaExShape.capsule.tail) != null ? _g : [0, 0, 0]),
                inside: (_h = schemaExShape.capsule.inside) != null ? _h : false
              });
            } else if (schemaExShape.plane) {
              return this._importPlaneCollider(node, {
                offset: new THREE142.Vector3().fromArray((_i = schemaExShape.plane.offset) != null ? _i : [0, 0, 0]),
                normal: new THREE142.Vector3().fromArray((_j = schemaExShape.plane.normal) != null ? _j : [0, 0, 1])
              });
            }
          }
        }
        if (schemaShape.sphere) {
          return this._importSphereCollider(node, {
            offset: new THREE142.Vector3().fromArray((_k = schemaShape.sphere.offset) != null ? _k : [0, 0, 0]),
            radius: (_l = schemaShape.sphere.radius) != null ? _l : 0,
            inside: false
          });
        } else if (schemaShape.capsule) {
          return this._importCapsuleCollider(node, {
            offset: new THREE142.Vector3().fromArray((_m = schemaShape.capsule.offset) != null ? _m : [0, 0, 0]),
            radius: (_n = schemaShape.capsule.radius) != null ? _n : 0,
            tail: new THREE142.Vector3().fromArray((_o = schemaShape.capsule.tail) != null ? _o : [0, 0, 0]),
            inside: false
          });
        }
        console.warn(`VRMSpringBoneLoaderPlugin: The collider #${iCollider} has no valid shape. Skipping the collider`);
      });
      const colliderGroups = (_d2 = extension.colliderGroups) == null ? void 0 : _d2.map(
        (schemaColliderGroup, iColliderGroup) => {
          var _a22;
          const cols = ((_a22 = schemaColliderGroup.colliders) != null ? _a22 : []).map((iCollider) => {
            const col = colliders == null ? void 0 : colliders[iCollider];
            if (col == null) {
              console.warn(
                `VRMSpringBoneLoaderPlugin: The collider group #${iColliderGroup} attempted to reference a collider #${iCollider} but not found. Skipping the collider`
              );
              return null;
            }
            return col;
          }).filter((col) => col != null);
          return {
            colliders: cols,
            name: schemaColliderGroup.name
          };
        }
      );
      (_e = extension.springs) == null ? void 0 : _e.forEach((schemaSpring, iSpring) => {
        var _a22;
        const schemaJoints = schemaSpring.joints;
        const colliderGroupsForSpring = (_a22 = schemaSpring.colliderGroups) == null ? void 0 : _a22.map((iColliderGroup) => {
          const group = colliderGroups == null ? void 0 : colliderGroups[iColliderGroup];
          if (group == null) {
            console.warn(
              `VRMSpringBoneLoaderPlugin: The spring #${iSpring} attempted to reference a collider group #${iColliderGroup} but not found. Skipping the collider group`
            );
            return null;
          }
          return group;
        }).filter((group) => group != null);
        const center = schemaSpring.center != null ? threeNodes[schemaSpring.center] : void 0;
        let prevSchemaJoint;
        schemaJoints.forEach((schemaJoint) => {
          if (prevSchemaJoint) {
            const nodeIndex = prevSchemaJoint.node;
            const node = threeNodes[nodeIndex];
            const childIndex = schemaJoint.node;
            const child = threeNodes[childIndex];
            const setting = {
              hitRadius: prevSchemaJoint.hitRadius,
              dragForce: prevSchemaJoint.dragForce,
              gravityPower: prevSchemaJoint.gravityPower,
              stiffness: prevSchemaJoint.stiffness,
              gravityDir: prevSchemaJoint.gravityDir != null ? new THREE142.Vector3().fromArray(prevSchemaJoint.gravityDir) : void 0
            };
            const joint = this._importJoint(node, child, setting, colliderGroupsForSpring);
            if (center) {
              joint.center = center;
            }
            manager.addJoint(joint);
          }
          prevSchemaJoint = schemaJoint;
        });
      });
      manager.setInitState();
      return manager;
    });
  }
  _v0Import(gltf) {
    return __async7(this, null, function* () {
      var _a2, _b2, _c;
      const json = gltf.parser.json;
      const isVRMUsed = ((_a2 = json.extensionsUsed) == null ? void 0 : _a2.indexOf("VRM")) !== -1;
      if (!isVRMUsed) {
        return null;
      }
      const extension = (_b2 = json.extensions) == null ? void 0 : _b2["VRM"];
      const schemaSecondaryAnimation = extension == null ? void 0 : extension.secondaryAnimation;
      if (!schemaSecondaryAnimation) {
        return null;
      }
      const schemaBoneGroups = schemaSecondaryAnimation == null ? void 0 : schemaSecondaryAnimation.boneGroups;
      if (!schemaBoneGroups) {
        return null;
      }
      const manager = new VRMSpringBoneManager();
      const threeNodes = yield gltf.parser.getDependencies("node");
      const colliderGroups = (_c = schemaSecondaryAnimation.colliderGroups) == null ? void 0 : _c.map(
        (schemaColliderGroup, iColliderGroup) => {
          var _a22;
          const node = threeNodes[schemaColliderGroup.node];
          if (node == null) {
            console.warn(
              `VRMSpringBoneLoaderPlugin: The collider group #${iColliderGroup} attempted to reference a node #${schemaColliderGroup.node} but not found. Skipping the collider group`
            );
            return null;
          }
          const colliders = ((_a22 = schemaColliderGroup.colliders) != null ? _a22 : []).map((schemaCollider, iCollider) => {
            var _a3, _b22, _c2;
            const offset = new THREE142.Vector3(0, 0, 0);
            if (schemaCollider.offset) {
              offset.set(
                (_a3 = schemaCollider.offset.x) != null ? _a3 : 0,
                (_b22 = schemaCollider.offset.y) != null ? _b22 : 0,
                schemaCollider.offset.z ? -schemaCollider.offset.z : 0
                // z is opposite in VRM0.0
              );
            }
            return this._importSphereCollider(node, {
              offset,
              radius: (_c2 = schemaCollider.radius) != null ? _c2 : 0,
              inside: false
            });
          });
          return { colliders };
        }
      );
      schemaBoneGroups == null ? void 0 : schemaBoneGroups.forEach((schemaBoneGroup, iBoneGroup) => {
        const rootIndices = schemaBoneGroup.bones;
        if (!rootIndices) {
          return;
        }
        rootIndices.forEach((rootIndex) => {
          var _a22, _b22, _c2, _d2;
          const root = threeNodes[rootIndex];
          if (root == null) {
            console.warn(
              `VRMSpringBoneLoaderPlugin: The spring bone group #${iBoneGroup} attempted to reference a node #${rootIndex} but not found. Skipping the node`
            );
            return;
          }
          const gravityDir = new THREE142.Vector3();
          if (schemaBoneGroup.gravityDir) {
            gravityDir.set(
              (_a22 = schemaBoneGroup.gravityDir.x) != null ? _a22 : 0,
              (_b22 = schemaBoneGroup.gravityDir.y) != null ? _b22 : 0,
              (_c2 = schemaBoneGroup.gravityDir.z) != null ? _c2 : 0
            );
          } else {
            gravityDir.set(0, -1, 0);
          }
          const center = schemaBoneGroup.center != null ? threeNodes[schemaBoneGroup.center] : void 0;
          const setting = {
            hitRadius: schemaBoneGroup.hitRadius,
            dragForce: schemaBoneGroup.dragForce,
            gravityPower: schemaBoneGroup.gravityPower,
            stiffness: schemaBoneGroup.stiffiness,
            gravityDir
          };
          const colliderGroupsForSpring = (_d2 = schemaBoneGroup.colliderGroups) == null ? void 0 : _d2.map((iColliderGroup) => {
            const group = colliderGroups == null ? void 0 : colliderGroups[iColliderGroup];
            if (group == null) {
              console.warn(
                `VRMSpringBoneLoaderPlugin: The spring #${iBoneGroup} attempted to reference a collider group #${iColliderGroup} but not found. Skipping the collider group`
              );
              return null;
            }
            return group;
          }).filter((group) => group != null);
          root.traverse((node) => {
            var _a3;
            const child = (_a3 = node.children[0]) != null ? _a3 : null;
            const joint = this._importJoint(node, child, setting, colliderGroupsForSpring);
            if (center) {
              joint.center = center;
            }
            manager.addJoint(joint);
          });
        });
      });
      gltf.scene.updateMatrixWorld();
      manager.setInitState();
      return manager;
    });
  }
  _importJoint(node, child, setting, colliderGroupsForSpring) {
    const springBone = new VRMSpringBoneJoint(node, child, setting, colliderGroupsForSpring);
    if (this.jointHelperRoot) {
      const helper = new VRMSpringBoneJointHelper(springBone);
      this.jointHelperRoot.add(helper);
      helper.renderOrder = this.jointHelperRoot.renderOrder;
    }
    return springBone;
  }
  _importSphereCollider(destination, params) {
    const shape = new VRMSpringBoneColliderShapeSphere(params);
    const collider = new VRMSpringBoneCollider(shape);
    destination.add(collider);
    if (this.colliderHelperRoot) {
      const helper = new VRMSpringBoneColliderHelper(collider);
      this.colliderHelperRoot.add(helper);
      helper.renderOrder = this.colliderHelperRoot.renderOrder;
    }
    return collider;
  }
  _importCapsuleCollider(destination, params) {
    const shape = new VRMSpringBoneColliderShapeCapsule(params);
    const collider = new VRMSpringBoneCollider(shape);
    destination.add(collider);
    if (this.colliderHelperRoot) {
      const helper = new VRMSpringBoneColliderHelper(collider);
      this.colliderHelperRoot.add(helper);
      helper.renderOrder = this.colliderHelperRoot.renderOrder;
    }
    return collider;
  }
  _importPlaneCollider(destination, params) {
    const shape = new VRMSpringBoneColliderShapePlane(params);
    const collider = new VRMSpringBoneCollider(shape);
    destination.add(collider);
    if (this.colliderHelperRoot) {
      const helper = new VRMSpringBoneColliderHelper(collider);
      this.colliderHelperRoot.add(helper);
      helper.renderOrder = this.colliderHelperRoot.renderOrder;
    }
    return collider;
  }
};
_VRMSpringBoneLoaderPlugin.EXTENSION_NAME = "VRMC_springBone";
var VRMSpringBoneLoaderPlugin = _VRMSpringBoneLoaderPlugin;
var VRMLoaderPlugin = class {
  get name() {
    return "VRMLoaderPlugin";
  }
  constructor(parser, options) {
    var _a2, _b2, _c, _d2, _e, _f, _g, _h, _i, _j;
    this.parser = parser;
    const helperRoot = options == null ? void 0 : options.helperRoot;
    const autoUpdateHumanBones = options == null ? void 0 : options.autoUpdateHumanBones;
    this.expressionPlugin = (_a2 = options == null ? void 0 : options.expressionPlugin) != null ? _a2 : new VRMExpressionLoaderPlugin(parser);
    this.firstPersonPlugin = (_b2 = options == null ? void 0 : options.firstPersonPlugin) != null ? _b2 : new VRMFirstPersonLoaderPlugin(parser);
    this.humanoidPlugin = (_c = options == null ? void 0 : options.humanoidPlugin) != null ? _c : new VRMHumanoidLoaderPlugin(parser, {
      helperRoot,
      autoUpdateHumanBones
    });
    this.lookAtPlugin = (_d2 = options == null ? void 0 : options.lookAtPlugin) != null ? _d2 : new VRMLookAtLoaderPlugin(parser, { helperRoot });
    this.metaPlugin = (_e = options == null ? void 0 : options.metaPlugin) != null ? _e : new VRMMetaLoaderPlugin(parser);
    this.mtoonMaterialPlugin = (_f = options == null ? void 0 : options.mtoonMaterialPlugin) != null ? _f : new MToonMaterialLoaderPlugin(parser);
    this.materialsHDREmissiveMultiplierPlugin = (_g = options == null ? void 0 : options.materialsHDREmissiveMultiplierPlugin) != null ? _g : new VRMMaterialsHDREmissiveMultiplierLoaderPlugin(parser);
    this.materialsV0CompatPlugin = (_h = options == null ? void 0 : options.materialsV0CompatPlugin) != null ? _h : new VRMMaterialsV0CompatPlugin(parser);
    this.springBonePlugin = (_i = options == null ? void 0 : options.springBonePlugin) != null ? _i : new VRMSpringBoneLoaderPlugin(parser, {
      colliderHelperRoot: helperRoot,
      jointHelperRoot: helperRoot
    });
    this.nodeConstraintPlugin = (_j = options == null ? void 0 : options.nodeConstraintPlugin) != null ? _j : new VRMNodeConstraintLoaderPlugin(parser, { helperRoot });
  }
  beforeRoot() {
    return __async(this, null, function* () {
      yield this.materialsV0CompatPlugin.beforeRoot();
      yield this.mtoonMaterialPlugin.beforeRoot();
    });
  }
  loadMesh(meshIndex) {
    return __async(this, null, function* () {
      return yield this.mtoonMaterialPlugin.loadMesh(meshIndex);
    });
  }
  getMaterialType(materialIndex) {
    const mtoonType = this.mtoonMaterialPlugin.getMaterialType(materialIndex);
    if (mtoonType != null) {
      return mtoonType;
    }
    return null;
  }
  extendMaterialParams(materialIndex, materialParams) {
    return __async(this, null, function* () {
      yield this.materialsHDREmissiveMultiplierPlugin.extendMaterialParams(materialIndex, materialParams);
      yield this.mtoonMaterialPlugin.extendMaterialParams(materialIndex, materialParams);
    });
  }
  afterRoot(gltf) {
    return __async(this, null, function* () {
      yield this.metaPlugin.afterRoot(gltf);
      yield this.humanoidPlugin.afterRoot(gltf);
      yield this.expressionPlugin.afterRoot(gltf);
      yield this.lookAtPlugin.afterRoot(gltf);
      yield this.firstPersonPlugin.afterRoot(gltf);
      yield this.springBonePlugin.afterRoot(gltf);
      yield this.nodeConstraintPlugin.afterRoot(gltf);
      yield this.mtoonMaterialPlugin.afterRoot(gltf);
      const meta = gltf.userData.vrmMeta;
      const humanoid = gltf.userData.vrmHumanoid;
      if (meta && humanoid) {
        const vrm = new VRM({
          scene: gltf.scene,
          expressionManager: gltf.userData.vrmExpressionManager,
          firstPerson: gltf.userData.vrmFirstPerson,
          humanoid,
          lookAt: gltf.userData.vrmLookAt,
          meta,
          materials: gltf.userData.vrmMToonMaterials,
          springBoneManager: gltf.userData.vrmSpringBoneManager,
          nodeConstraintManager: gltf.userData.vrmNodeConstraintManager
        });
        gltf.userData.vrm = vrm;
      }
    });
  }
};
function collectMeshes(scene) {
  const meshes = /* @__PURE__ */ new Set();
  scene.traverse((obj) => {
    if (!obj.isMesh) {
      return;
    }
    const mesh = obj;
    meshes.add(mesh);
  });
  return meshes;
}
function combineMorph(positionAttributes, binds, morphTargetsRelative) {
  if (binds.size === 1) {
    const bind = binds.values().next().value;
    if (bind.weight === 1) {
      return positionAttributes[bind.index];
    }
  }
  const newArray = new Float32Array(positionAttributes[0].count * 3);
  let weightSum = 0;
  if (morphTargetsRelative) {
    weightSum = 1;
  } else {
    for (const bind of binds) {
      weightSum += bind.weight;
    }
  }
  for (const bind of binds) {
    const src = positionAttributes[bind.index];
    const weight = bind.weight / weightSum;
    for (let i = 0; i < src.count; i++) {
      newArray[i * 3 + 0] += src.getX(i) * weight;
      newArray[i * 3 + 1] += src.getY(i) * weight;
      newArray[i * 3 + 2] += src.getZ(i) * weight;
    }
  }
  const newAttribute = new THREE21.BufferAttribute(newArray, 3);
  return newAttribute;
}
function combineMorphs(vrm) {
  var _a2;
  const meshes = collectMeshes(vrm.scene);
  const meshNameBindSetMapMap = /* @__PURE__ */ new Map();
  const expressionMap = (_a2 = vrm.expressionManager) == null ? void 0 : _a2.expressionMap;
  if (expressionMap != null) {
    for (const [expressionName, expression] of Object.entries(expressionMap)) {
      const bindsToDeleteSet = /* @__PURE__ */ new Set();
      for (const bind of expression.binds) {
        if (bind instanceof VRMExpressionMorphTargetBind) {
          if (bind.weight !== 0) {
            for (const mesh of bind.primitives) {
              let nameBindSetMap = meshNameBindSetMapMap.get(mesh);
              if (nameBindSetMap == null) {
                nameBindSetMap = /* @__PURE__ */ new Map();
                meshNameBindSetMapMap.set(mesh, nameBindSetMap);
              }
              let bindSet = nameBindSetMap.get(expressionName);
              if (bindSet == null) {
                bindSet = /* @__PURE__ */ new Set();
                nameBindSetMap.set(expressionName, bindSet);
              }
              bindSet.add(bind);
            }
          }
          bindsToDeleteSet.add(bind);
        }
      }
      for (const bind of bindsToDeleteSet) {
        expression.deleteBind(bind);
      }
    }
  }
  for (const mesh of meshes) {
    const nameBindSetMap = meshNameBindSetMapMap.get(mesh);
    if (nameBindSetMap == null) {
      continue;
    }
    const originalMorphAttributes = mesh.geometry.morphAttributes;
    mesh.geometry.morphAttributes = {};
    const geometry = mesh.geometry.clone();
    mesh.geometry = geometry;
    const morphTargetsRelative = geometry.morphTargetsRelative;
    const hasPMorph = originalMorphAttributes.position != null;
    const hasNMorph = originalMorphAttributes.normal != null;
    const morphAttributes = {};
    const morphTargetDictionary = {};
    const morphTargetInfluences = [];
    if (hasPMorph || hasNMorph) {
      if (hasPMorph) {
        morphAttributes.position = [];
      }
      if (hasNMorph) {
        morphAttributes.normal = [];
      }
      let i = 0;
      for (const [name, bindSet] of nameBindSetMap) {
        if (hasPMorph) {
          morphAttributes.position[i] = combineMorph(originalMorphAttributes.position, bindSet, morphTargetsRelative);
        }
        if (hasNMorph) {
          morphAttributes.normal[i] = combineMorph(originalMorphAttributes.normal, bindSet, morphTargetsRelative);
        }
        expressionMap == null ? void 0 : expressionMap[name].addBind(
          new VRMExpressionMorphTargetBind({
            index: i,
            weight: 1,
            primitives: [mesh]
          })
        );
        morphTargetDictionary[name] = i;
        morphTargetInfluences.push(0);
        i++;
      }
    }
    geometry.morphAttributes = morphAttributes;
    mesh.morphTargetDictionary = morphTargetDictionary;
    mesh.morphTargetInfluences = morphTargetInfluences;
  }
}
function attributeGetComponentCompat(attribute, index, component2) {
  if (attribute.getComponent) {
    return attribute.getComponent(index, component2);
  } else {
    let value = attribute.array[index * attribute.itemSize + component2];
    if (attribute.normalized) {
      value = THREE25.MathUtils.denormalize(value, attribute.array);
    }
    return value;
  }
}
function attributeSetComponentCompat(attribute, index, component2, value) {
  if (attribute.setComponent) {
    attribute.setComponent(index, component2, value);
  } else {
    if (attribute.normalized) {
      value = THREE26.MathUtils.normalize(value, attribute.array);
    }
    attribute.array[index * attribute.itemSize + component2] = value;
  }
}
function combineSkeletons(root) {
  var _a2;
  const skinnedMeshes = collectSkinnedMeshes(root);
  const geometries = /* @__PURE__ */ new Set();
  for (const mesh of skinnedMeshes) {
    if (geometries.has(mesh.geometry)) {
      mesh.geometry = shallowCloneBufferGeometry(mesh.geometry);
    }
    geometries.add(mesh.geometry);
  }
  const attributeUsedIndexSetMap = /* @__PURE__ */ new Map();
  for (const geometry of geometries) {
    const skinIndexAttr = geometry.getAttribute("skinIndex");
    const skinIndexMap = (_a2 = attributeUsedIndexSetMap.get(skinIndexAttr)) != null ? _a2 : /* @__PURE__ */ new Map();
    attributeUsedIndexSetMap.set(skinIndexAttr, skinIndexMap);
    const skinWeightAttr = geometry.getAttribute("skinWeight");
    const usedIndicesSet = listUsedIndices(skinIndexAttr, skinWeightAttr);
    skinIndexMap.set(skinWeightAttr, usedIndicesSet);
  }
  const meshBoneInverseMapMap = /* @__PURE__ */ new Map();
  for (const mesh of skinnedMeshes) {
    const boneInverseMap = listUsedBones(mesh, attributeUsedIndexSetMap);
    meshBoneInverseMapMap.set(mesh, boneInverseMap);
  }
  const groups = [];
  for (const [mesh, boneInverseMap] of meshBoneInverseMapMap) {
    let foundMergeableGroup = false;
    for (const candidate of groups) {
      const isMergeable = boneInverseMapIsMergeable(boneInverseMap, candidate.boneInverseMap);
      if (isMergeable) {
        foundMergeableGroup = true;
        candidate.meshes.add(mesh);
        for (const [bone, boneInverse] of boneInverseMap) {
          candidate.boneInverseMap.set(bone, boneInverse);
        }
        break;
      }
    }
    if (!foundMergeableGroup) {
      groups.push({ boneInverseMap, meshes: /* @__PURE__ */ new Set([mesh]) });
    }
  }
  const cache = /* @__PURE__ */ new Map();
  const skinIndexDispatcher = new ObjectIndexDispatcher();
  const skeletonDispatcher = new ObjectIndexDispatcher();
  const boneDispatcher = new ObjectIndexDispatcher();
  for (const group of groups) {
    const { boneInverseMap, meshes } = group;
    const newBones = Array.from(boneInverseMap.keys());
    const newBoneInverses = Array.from(boneInverseMap.values());
    const newSkeleton = new THREE27.Skeleton(newBones, newBoneInverses);
    const skeletonKey = skeletonDispatcher.getOrCreate(newSkeleton);
    for (const mesh of meshes) {
      const skinIndexAttr = mesh.geometry.getAttribute("skinIndex");
      const skinIndexKey = skinIndexDispatcher.getOrCreate(skinIndexAttr);
      const bones = mesh.skeleton.bones;
      const bonesKey = bones.map((bone) => boneDispatcher.getOrCreate(bone)).join(",");
      const key = `${skinIndexKey};${skeletonKey};${bonesKey}`;
      let newSkinIndexAttr = cache.get(key);
      if (newSkinIndexAttr == null) {
        newSkinIndexAttr = skinIndexAttr.clone();
        remapSkinIndexAttribute(newSkinIndexAttr, bones, newBones);
        cache.set(key, newSkinIndexAttr);
      }
      mesh.geometry.setAttribute("skinIndex", newSkinIndexAttr);
    }
    for (const mesh of meshes) {
      mesh.bind(newSkeleton, new THREE27.Matrix4());
    }
  }
}
function collectSkinnedMeshes(scene) {
  const skinnedMeshes = /* @__PURE__ */ new Set();
  scene.traverse((obj) => {
    if (!obj.isSkinnedMesh) {
      return;
    }
    const skinnedMesh = obj;
    skinnedMeshes.add(skinnedMesh);
  });
  return skinnedMeshes;
}
function listUsedIndices(skinIndexAttr, skinWeightAttr) {
  const usedIndices = /* @__PURE__ */ new Set();
  for (let i = 0; i < skinIndexAttr.count; i++) {
    for (let j = 0; j < skinIndexAttr.itemSize; j++) {
      const index = attributeGetComponentCompat(skinIndexAttr, i, j);
      const weight = attributeGetComponentCompat(skinWeightAttr, i, j);
      if (weight !== 0) {
        usedIndices.add(index);
      }
    }
  }
  return usedIndices;
}
function listUsedBones(mesh, attributeUsedIndexSetMap) {
  const boneInverseMap = /* @__PURE__ */ new Map();
  const skeleton = mesh.skeleton;
  const geometry = mesh.geometry;
  const skinIndexAttr = geometry.getAttribute("skinIndex");
  const skinWeightAttr = geometry.getAttribute("skinWeight");
  const skinIndexMap = attributeUsedIndexSetMap.get(skinIndexAttr);
  const usedIndicesSet = skinIndexMap == null ? void 0 : skinIndexMap.get(skinWeightAttr);
  if (!usedIndicesSet) {
    throw new Error(
      "Unreachable. attributeUsedIndexSetMap does not know the skin index attribute or the skin weight attribute."
    );
  }
  for (const index of usedIndicesSet) {
    boneInverseMap.set(skeleton.bones[index], skeleton.boneInverses[index]);
  }
  return boneInverseMap;
}
function boneInverseMapIsMergeable(toCheck, candidate) {
  for (const [bone, boneInverse] of toCheck.entries()) {
    const candidateBoneInverse = candidate.get(bone);
    if (candidateBoneInverse != null) {
      if (!matrixEquals(boneInverse, candidateBoneInverse)) {
        return false;
      }
    }
  }
  return true;
}
function remapSkinIndexAttribute(attribute, oldBones, newBones) {
  const boneOldIndexMap = /* @__PURE__ */ new Map();
  for (const bone of oldBones) {
    boneOldIndexMap.set(bone, boneOldIndexMap.size);
  }
  const oldToNew = /* @__PURE__ */ new Map();
  for (const [i, bone] of newBones.entries()) {
    const oldIndex = boneOldIndexMap.get(bone);
    oldToNew.set(oldIndex, i);
  }
  for (let i = 0; i < attribute.count; i++) {
    for (let j = 0; j < attribute.itemSize; j++) {
      const oldIndex = attributeGetComponentCompat(attribute, i, j);
      const newIndex = oldToNew.get(oldIndex);
      attributeSetComponentCompat(attribute, i, j, newIndex);
    }
  }
  attribute.needsUpdate = true;
}
function matrixEquals(a, b, tolerance) {
  tolerance = tolerance || 1e-4;
  if (a.elements.length != b.elements.length) {
    return false;
  }
  for (let i = 0, il = a.elements.length; i < il; i++) {
    const delta = Math.abs(a.elements[i] - b.elements[i]);
    if (delta > tolerance) {
      return false;
    }
  }
  return true;
}
var ObjectIndexDispatcher = class {
  constructor() {
    this._objectIndexMap = /* @__PURE__ */ new Map();
    this._index = 0;
  }
  get(obj) {
    return this._objectIndexMap.get(obj);
  }
  getOrCreate(obj) {
    let index = this._objectIndexMap.get(obj);
    if (index == null) {
      index = this._index;
      this._objectIndexMap.set(obj, index);
      this._index++;
    }
    return index;
  }
};
function shallowCloneBufferGeometry(geometry) {
  var _a2, _b2, _c, _d2;
  const clone = new THREE27.BufferGeometry();
  clone.name = geometry.name;
  clone.setIndex(geometry.index);
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    clone.setAttribute(name, attribute);
  }
  for (const [key, morphAttributes] of Object.entries(geometry.morphAttributes)) {
    const attributeName = key;
    clone.morphAttributes[attributeName] = morphAttributes.concat();
  }
  clone.morphTargetsRelative = geometry.morphTargetsRelative;
  clone.groups = [];
  for (const group of geometry.groups) {
    clone.addGroup(group.start, group.count, group.materialIndex);
  }
  clone.boundingSphere = (_b2 = (_a2 = geometry.boundingSphere) == null ? void 0 : _a2.clone()) != null ? _b2 : null;
  clone.boundingBox = (_d2 = (_c = geometry.boundingBox) == null ? void 0 : _c.clone()) != null ? _d2 : null;
  clone.drawRange.start = geometry.drawRange.start;
  clone.drawRange.count = geometry.drawRange.count;
  clone.userData = geometry.userData;
  return clone;
}
function disposeMaterial(material) {
  Object.values(material).forEach((value) => {
    if (value == null ? void 0 : value.isTexture) {
      const texture = value;
      texture.dispose();
    }
  });
  if (material.isShaderMaterial) {
    const uniforms = material.uniforms;
    if (uniforms) {
      Object.values(uniforms).forEach((uniform) => {
        const value = uniform.value;
        if (value == null ? void 0 : value.isTexture) {
          const texture = value;
          texture.dispose();
        }
      });
    }
  }
  material.dispose();
}
function dispose(object3D) {
  const geometry = object3D.geometry;
  if (geometry) {
    geometry.dispose();
  }
  const skeleton = object3D.skeleton;
  if (skeleton) {
    skeleton.dispose();
  }
  const material = object3D.material;
  if (material) {
    if (Array.isArray(material)) {
      material.forEach((material2) => disposeMaterial(material2));
    } else if (material) {
      disposeMaterial(material);
    }
  }
}
function deepDispose(object3D) {
  object3D.traverse(dispose);
}
function removeUnnecessaryJoints(root, options) {
  var _a2, _b2;
  console.warn(
    "VRMUtils.removeUnnecessaryJoints: removeUnnecessaryJoints is deprecated. Use combineSkeletons instead. combineSkeletons contributes more to the performance improvement. This function will be removed in the next major version."
  );
  const experimentalSameBoneCounts = (_a2 = options == null ? void 0 : options.experimentalSameBoneCounts) != null ? _a2 : false;
  const skinnedMeshes = [];
  root.traverse((obj) => {
    if (obj.type !== "SkinnedMesh") {
      return;
    }
    skinnedMeshes.push(obj);
  });
  const attributeToBoneIndexMapMap = /* @__PURE__ */ new Map();
  let maxBones = 0;
  for (const mesh of skinnedMeshes) {
    const geometry = mesh.geometry;
    const attribute = geometry.getAttribute("skinIndex");
    if (attributeToBoneIndexMapMap.has(attribute)) {
      continue;
    }
    const oldToNew = /* @__PURE__ */ new Map();
    const newToOld = /* @__PURE__ */ new Map();
    for (let i = 0; i < attribute.count; i++) {
      for (let j = 0; j < attribute.itemSize; j++) {
        const oldIndex = attributeGetComponentCompat(attribute, i, j);
        let newIndex = oldToNew.get(oldIndex);
        if (newIndex == null) {
          newIndex = oldToNew.size;
          oldToNew.set(oldIndex, newIndex);
          newToOld.set(newIndex, oldIndex);
        }
        attributeSetComponentCompat(attribute, i, j, newIndex);
      }
    }
    attribute.needsUpdate = true;
    attributeToBoneIndexMapMap.set(attribute, newToOld);
    maxBones = Math.max(maxBones, oldToNew.size);
  }
  for (const mesh of skinnedMeshes) {
    const geometry = mesh.geometry;
    const attribute = geometry.getAttribute("skinIndex");
    const newToOld = attributeToBoneIndexMapMap.get(attribute);
    const bones = [];
    const boneInverses = [];
    const nBones = experimentalSameBoneCounts ? maxBones : newToOld.size;
    for (let newIndex = 0; newIndex < nBones; newIndex++) {
      const oldIndex = (_b2 = newToOld.get(newIndex)) != null ? _b2 : 0;
      bones.push(mesh.skeleton.bones[oldIndex]);
      boneInverses.push(mesh.skeleton.boneInverses[oldIndex]);
    }
    const skeleton = new THREE28.Skeleton(bones, boneInverses);
    mesh.bind(skeleton, new THREE28.Matrix4());
  }
}
function checkIsVertexUsed(attributes, originalIndex) {
  const vertexCount = attributes.position.count;
  const isVertexUsed = new Array(vertexCount);
  let verticesUsed = 0;
  const originalIndexArray = originalIndex.array;
  for (let i = 0; i < originalIndexArray.length; i++) {
    const index = originalIndexArray[i];
    if (!isVertexUsed[index]) {
      isVertexUsed[index] = true;
      verticesUsed++;
    }
  }
  return { isVertexUsed, vertexCount, verticesUsed };
}
function buildIndexMapsFromIsVertexUsed(isVertexUsed) {
  const originalIndexNewIndexMap = [];
  const newIndexOriginalIndexMap = [];
  let indexHead = 0;
  for (let i = 0; i < isVertexUsed.length; i++) {
    if (isVertexUsed[i]) {
      const newIndex = indexHead++;
      originalIndexNewIndexMap[i] = newIndex;
      newIndexOriginalIndexMap[newIndex] = i;
    }
  }
  return { originalIndexNewIndexMap, newIndexOriginalIndexMap };
}
function copyGeometryProperties(source, target) {
  var _a2, _b2, _c, _d2;
  target.name = source.name;
  target.morphTargetsRelative = source.morphTargetsRelative;
  source.groups.forEach((group) => {
    target.addGroup(group.start, group.count, group.materialIndex);
  });
  target.boundingBox = (_b2 = (_a2 = source.boundingBox) == null ? void 0 : _a2.clone()) != null ? _b2 : null;
  target.boundingSphere = (_d2 = (_c = source.boundingSphere) == null ? void 0 : _c.clone()) != null ? _d2 : null;
  target.setDrawRange(source.drawRange.start, source.drawRange.count);
  target.userData = source.userData;
}
function reorganizeIndexAttribute(newGeometry, originalIndex, originalIndexNewIndexMap) {
  const originalIndexArray = originalIndex.array;
  const newIndexArray = new originalIndexArray.constructor(originalIndexArray.length);
  for (let i = 0; i < originalIndexArray.length; i++) {
    const index = originalIndexArray[i];
    newIndexArray[i] = originalIndexNewIndexMap[index];
  }
  newGeometry.setIndex(new BufferAttribute9(newIndexArray, originalIndex.itemSize, originalIndex.normalized));
}
function remapAttributeArray(originalArray, newIndexOriginalIndexMap, stride) {
  const ArrayCtor = originalArray.constructor;
  const newArray = new ArrayCtor(newIndexOriginalIndexMap.length * stride);
  let isAllZero = true;
  for (let i = 0; i < newIndexOriginalIndexMap.length; i++) {
    const originalIndex = newIndexOriginalIndexMap[i];
    const srcBase = originalIndex * stride;
    const dstBase = i * stride;
    for (let j = 0; j < stride; j++) {
      const v = originalArray[srcBase + j];
      newArray[dstBase + j] = v;
      isAllZero = isAllZero && v === 0;
    }
  }
  return [newArray, isAllZero];
}
function collectGeometryAttributeGroups(attributes) {
  var _a2;
  const interleavedBufferAttributeMap = /* @__PURE__ */ new Map();
  const nonInterleavedAttributes = [];
  for (const [attributeName, originalAttribute] of Object.entries(attributes)) {
    if (originalAttribute.isInterleavedBufferAttribute) {
      const interleavedAttribute = originalAttribute;
      const interleavedBuffer = interleavedAttribute.data;
      const group = (_a2 = interleavedBufferAttributeMap.get(interleavedBuffer)) != null ? _a2 : [];
      interleavedBufferAttributeMap.set(interleavedBuffer, group);
      group.push([attributeName, interleavedAttribute]);
    } else {
      const attribute = originalAttribute;
      nonInterleavedAttributes.push([attributeName, attribute]);
    }
  }
  return [interleavedBufferAttributeMap, nonInterleavedAttributes];
}
function reorganizeGeometryAttributes(newGeometry, attributes, newIndexOriginalIndexMap) {
  const [interleavedBufferAttributeMap, nonInterleavedAttributes] = collectGeometryAttributeGroups(attributes);
  for (const [interleavedBuffer, attributesInGroup] of interleavedBufferAttributeMap) {
    const originalInterleavedBufferArray = interleavedBuffer.array;
    const { stride } = interleavedBuffer;
    const [newInterleavedArray, _] = remapAttributeArray(
      originalInterleavedBufferArray,
      newIndexOriginalIndexMap,
      stride
    );
    const newInterleavedBuffer = new THREE29.InterleavedBuffer(newInterleavedArray, stride);
    newInterleavedBuffer.setUsage(interleavedBuffer.usage);
    for (const [attributeName, originalAttribute] of attributesInGroup) {
      const { itemSize, offset, normalized } = originalAttribute;
      const newAttribute = new THREE29.InterleavedBufferAttribute(newInterleavedBuffer, itemSize, offset, normalized);
      newGeometry.setAttribute(attributeName, newAttribute);
    }
  }
  for (const [attributeName, originalAttribute] of nonInterleavedAttributes) {
    const originalAttributeArray = originalAttribute.array;
    const { itemSize, normalized } = originalAttribute;
    const [newAttributeArray, _] = remapAttributeArray(originalAttributeArray, newIndexOriginalIndexMap, itemSize);
    newGeometry.setAttribute(attributeName, new BufferAttribute9(newAttributeArray, itemSize, normalized));
  }
}
function collectMorphAttributeGroups(morphAttributes) {
  var _a2;
  const interleavedBufferAttributeMap = /* @__PURE__ */ new Map();
  const nonInterleavedAttributes = [];
  for (const [key, attributes] of Object.entries(morphAttributes)) {
    const attributeName = key;
    for (let iMorph = 0; iMorph < attributes.length; iMorph++) {
      const originalAttribute = attributes[iMorph];
      if (originalAttribute.isInterleavedBufferAttribute) {
        const interleavedAttribute = originalAttribute;
        const interleavedBuffer = interleavedAttribute.data;
        const group = (_a2 = interleavedBufferAttributeMap.get(interleavedBuffer)) != null ? _a2 : [];
        interleavedBufferAttributeMap.set(interleavedBuffer, group);
        group.push([attributeName, iMorph, interleavedAttribute]);
      } else {
        const attribute = originalAttribute;
        nonInterleavedAttributes.push([attributeName, iMorph, attribute]);
      }
    }
  }
  return [interleavedBufferAttributeMap, nonInterleavedAttributes];
}
function reorganizeMorphAttributes(newGeometry, morphAttributes, newIndexOriginalIndexMap) {
  var _a2, _b2;
  let allMorphsAreZero = true;
  const [interleavedBufferAttributeMap, nonInterleavedAttributes] = collectMorphAttributeGroups(morphAttributes);
  const newMorphAttributes = {};
  for (const [interleavedBuffer, attributesInGroup] of interleavedBufferAttributeMap) {
    const originalInterleavedBufferArray = interleavedBuffer.array;
    const { stride } = interleavedBuffer;
    const [newInterleavedArray, isAllZero] = remapAttributeArray(
      originalInterleavedBufferArray,
      newIndexOriginalIndexMap,
      stride
    );
    allMorphsAreZero = allMorphsAreZero && isAllZero;
    const newInterleavedBuffer = new THREE29.InterleavedBuffer(newInterleavedArray, stride);
    newInterleavedBuffer.setUsage(interleavedBuffer.usage);
    for (const [attributeName, morphIndex, attribute] of attributesInGroup) {
      const { itemSize, offset, normalized } = attribute;
      const newAttribute = new THREE29.InterleavedBufferAttribute(newInterleavedBuffer, itemSize, offset, normalized);
      (_a2 = newMorphAttributes[attributeName]) != null ? _a2 : newMorphAttributes[attributeName] = [];
      newMorphAttributes[attributeName][morphIndex] = newAttribute;
    }
  }
  for (const [attributeName, morphIndex, attribute] of nonInterleavedAttributes) {
    const originalAttribute = attribute;
    const originalAttributeArray = originalAttribute.array;
    const { itemSize, normalized } = originalAttribute;
    const [newAttributeArray, isAllZero] = remapAttributeArray(
      originalAttributeArray,
      newIndexOriginalIndexMap,
      itemSize
    );
    allMorphsAreZero = allMorphsAreZero && isAllZero;
    (_b2 = newMorphAttributes[attributeName]) != null ? _b2 : newMorphAttributes[attributeName] = [];
    newMorphAttributes[attributeName][morphIndex] = new BufferAttribute9(newAttributeArray, itemSize, normalized);
  }
  newGeometry.morphAttributes = allMorphsAreZero ? {} : newMorphAttributes;
}
function removeUnnecessaryVertices(root) {
  const geometryMap = /* @__PURE__ */ new Map();
  root.traverse((obj) => {
    if (!obj.isMesh) {
      return;
    }
    const mesh = obj;
    const geometry = mesh.geometry;
    const originalIndex = geometry.index;
    if (originalIndex == null) {
      return;
    }
    const newGeometryAlreadyExisted = geometryMap.get(geometry);
    if (newGeometryAlreadyExisted != null) {
      mesh.geometry = newGeometryAlreadyExisted;
      return;
    }
    const { isVertexUsed, vertexCount, verticesUsed } = checkIsVertexUsed(geometry.attributes, originalIndex);
    if (verticesUsed === vertexCount) {
      return;
    }
    const { originalIndexNewIndexMap, newIndexOriginalIndexMap } = buildIndexMapsFromIsVertexUsed(isVertexUsed);
    const newGeometry = new THREE29.BufferGeometry();
    copyGeometryProperties(geometry, newGeometry);
    geometryMap.set(geometry, newGeometry);
    reorganizeIndexAttribute(newGeometry, originalIndex, originalIndexNewIndexMap);
    reorganizeGeometryAttributes(newGeometry, geometry.attributes, newIndexOriginalIndexMap);
    reorganizeMorphAttributes(newGeometry, geometry.morphAttributes, newIndexOriginalIndexMap);
    mesh.geometry = newGeometry;
  });
  Array.from(geometryMap.keys()).forEach((originalGeometry) => {
    originalGeometry.dispose();
  });
}
function rotateVRM0(vrm) {
  var _a2;
  if (((_a2 = vrm.meta) == null ? void 0 : _a2.metaVersion) === "0") {
    vrm.scene.rotation.y = Math.PI;
  }
}
var VRMUtils = class {
  constructor() {
  }
};
VRMUtils.combineMorphs = combineMorphs;
VRMUtils.combineSkeletons = combineSkeletons;
VRMUtils.deepDispose = deepDispose;
VRMUtils.removeUnnecessaryJoints = removeUnnecessaryJoints;
VRMUtils.removeUnnecessaryVertices = removeUnnecessaryVertices;
VRMUtils.rotateVRM0 = rotateVRM0;

// stage/node_modules/@pixiv/three-vrm-animation/lib/three-vrm-animation.module.js
import * as THREE182 from "three";
import * as THREE30 from "three";
import * as THREE45 from "three";
import * as THREE210 from "three";
import * as THREE35 from "three";
import * as THREE55 from "three";
import * as THREE63 from "three";
import * as THREE73 from "three";
import * as THREE83 from "three";
import * as THREE113 from "three";
import * as THREE93 from "three";
import * as THREE103 from "three";
import * as THREE133 from "three";
import * as THREE123 from "three";
import * as THREE143 from "three";
import * as THREE152 from "three";
import * as THREE162 from "three";
import * as THREE172 from "three";
import * as THREE192 from "three";
import * as THREE202 from "three";
var __async8 = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected2 = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected2);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
var __async22 = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected2 = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected2);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
var VRMExpression2 = class extends THREE30.Object3D {
  constructor(expressionName) {
    super();
    this.weight = 0;
    this.isBinary = false;
    this.overrideBlink = "none";
    this.overrideLookAt = "none";
    this.overrideMouth = "none";
    this._binds = [];
    this.name = `VRMExpression_${expressionName}`;
    this.expressionName = expressionName;
    this.type = "VRMExpression";
    this.visible = false;
  }
  /**
   * Binds that this expression influences.
   */
  get binds() {
    return this._binds;
  }
  /**
   * A value represents how much it should override blink expressions.
   * `0.0` == no override at all, `1.0` == completely block the expressions.
   */
  get overrideBlinkAmount() {
    if (this.overrideBlink === "block") {
      return 0 < this.outputWeight ? 1 : 0;
    } else if (this.overrideBlink === "blend") {
      return this.outputWeight;
    } else {
      return 0;
    }
  }
  /**
   * A value represents how much it should override lookAt expressions.
   * `0.0` == no override at all, `1.0` == completely block the expressions.
   */
  get overrideLookAtAmount() {
    if (this.overrideLookAt === "block") {
      return 0 < this.outputWeight ? 1 : 0;
    } else if (this.overrideLookAt === "blend") {
      return this.outputWeight;
    } else {
      return 0;
    }
  }
  /**
   * A value represents how much it should override mouth expressions.
   * `0.0` == no override at all, `1.0` == completely block the expressions.
   */
  get overrideMouthAmount() {
    if (this.overrideMouth === "block") {
      return 0 < this.outputWeight ? 1 : 0;
    } else if (this.overrideMouth === "blend") {
      return this.outputWeight;
    } else {
      return 0;
    }
  }
  /**
   * An output weight of this expression, considering the {@link isBinary}.
   */
  get outputWeight() {
    if (this.isBinary) {
      return this.weight > 0.5 ? 1 : 0;
    }
    return this.weight;
  }
  /**
   * Add an expression bind to the expression.
   *
   * @param bind A bind to add
   */
  addBind(bind) {
    this._binds.push(bind);
  }
  /**
   * Delete an expression bind from the expression.
   *
   * @param bind A bind to delete
   */
  deleteBind(bind) {
    const index = this._binds.indexOf(bind);
    if (index >= 0) {
      this._binds.splice(index, 1);
    }
  }
  /**
   * Apply weight to every assigned blend shapes.
   * Should be called every frame.
   */
  applyWeight(options) {
    var _a2;
    let actualWeight = this.outputWeight;
    actualWeight *= (_a2 = options == null ? void 0 : options.multiplier) != null ? _a2 : 1;
    if (this.isBinary && actualWeight < 1) {
      actualWeight = 0;
    }
    this._binds.forEach((bind) => bind.applyWeight(actualWeight));
  }
  /**
   * Clear previously assigned blend shapes.
   */
  clearAppliedWeight() {
    this._binds.forEach((bind) => bind.clearAppliedWeight());
  }
};
function extractPrimitivesInternal2(gltf, nodeIndex, node) {
  var _a2, _b2;
  const json = gltf.parser.json;
  const schemaNode = (_a2 = json.nodes) == null ? void 0 : _a2[nodeIndex];
  if (schemaNode == null) {
    console.warn(`extractPrimitivesInternal: Attempt to use nodes[${nodeIndex}] of glTF but the node doesn't exist`);
    return null;
  }
  const meshIndex = schemaNode.mesh;
  if (meshIndex == null) {
    return null;
  }
  const schemaMesh = (_b2 = json.meshes) == null ? void 0 : _b2[meshIndex];
  if (schemaMesh == null) {
    console.warn(`extractPrimitivesInternal: Attempt to use meshes[${meshIndex}] of glTF but the mesh doesn't exist`);
    return null;
  }
  const primitiveCount = schemaMesh.primitives.length;
  const primitives = [];
  node.traverse((object) => {
    if (primitives.length < primitiveCount) {
      if (object.isMesh) {
        primitives.push(object);
      }
    }
  });
  return primitives;
}
function gltfExtractPrimitivesFromNode2(gltf, nodeIndex) {
  return __async22(this, null, function* () {
    const node = yield gltf.parser.getDependency("node", nodeIndex);
    return extractPrimitivesInternal2(gltf, nodeIndex, node);
  });
}
var VRMExpressionPresetName2 = {
  Aa: "aa",
  Ih: "ih",
  Ou: "ou",
  Ee: "ee",
  Oh: "oh",
  Blink: "blink",
  Happy: "happy",
  Angry: "angry",
  Sad: "sad",
  Relaxed: "relaxed",
  LookUp: "lookUp",
  Surprised: "surprised",
  LookDown: "lookDown",
  LookLeft: "lookLeft",
  LookRight: "lookRight",
  BlinkLeft: "blinkLeft",
  BlinkRight: "blinkRight",
  Neutral: "neutral"
};
function saturate2(value) {
  return Math.max(Math.min(value, 1), 0);
}
var VRMExpressionManager2 = class _VRMExpressionManager2 {
  /**
   * Create a new {@link VRMExpressionManager}.
   */
  constructor() {
    this.blinkExpressionNames = ["blink", "blinkLeft", "blinkRight"];
    this.lookAtExpressionNames = ["lookLeft", "lookRight", "lookUp", "lookDown"];
    this.mouthExpressionNames = ["aa", "ee", "ih", "oh", "ou"];
    this._expressions = [];
    this._expressionMap = {};
  }
  get expressions() {
    return this._expressions.concat();
  }
  get expressionMap() {
    return Object.assign({}, this._expressionMap);
  }
  /**
   * A map from name to expression, but excluding custom expressions.
   */
  get presetExpressionMap() {
    const result = {};
    const presetNameSet = new Set(Object.values(VRMExpressionPresetName2));
    Object.entries(this._expressionMap).forEach(([name, expression]) => {
      if (presetNameSet.has(name)) {
        result[name] = expression;
      }
    });
    return result;
  }
  /**
   * A map from name to expression, but excluding preset expressions.
   */
  get customExpressionMap() {
    const result = {};
    const presetNameSet = new Set(Object.values(VRMExpressionPresetName2));
    Object.entries(this._expressionMap).forEach(([name, expression]) => {
      if (!presetNameSet.has(name)) {
        result[name] = expression;
      }
    });
    return result;
  }
  /**
   * Copy the given {@link VRMExpressionManager} into this one.
   * @param source The {@link VRMExpressionManager} you want to copy
   * @returns this
   */
  copy(source) {
    const expressions = this._expressions.concat();
    expressions.forEach((expression) => {
      this.unregisterExpression(expression);
    });
    source._expressions.forEach((expression) => {
      this.registerExpression(expression);
    });
    this.blinkExpressionNames = source.blinkExpressionNames.concat();
    this.lookAtExpressionNames = source.lookAtExpressionNames.concat();
    this.mouthExpressionNames = source.mouthExpressionNames.concat();
    return this;
  }
  /**
   * Returns a clone of this {@link VRMExpressionManager}.
   * @returns Copied {@link VRMExpressionManager}
   */
  clone() {
    return new _VRMExpressionManager2().copy(this);
  }
  /**
   * Return a registered expression.
   * If it cannot find an expression, it will return `null` instead.
   *
   * @param name Name or preset name of the expression
   */
  getExpression(name) {
    var _a2;
    return (_a2 = this._expressionMap[name]) != null ? _a2 : null;
  }
  /**
   * Register an expression.
   *
   * @param expression {@link VRMExpression} that describes the expression
   */
  registerExpression(expression) {
    this._expressions.push(expression);
    this._expressionMap[expression.expressionName] = expression;
  }
  /**
   * Unregister an expression.
   *
   * @param expression The expression you want to unregister
   */
  unregisterExpression(expression) {
    const index = this._expressions.indexOf(expression);
    if (index === -1) {
      console.warn("VRMExpressionManager: The specified expressions is not registered");
    }
    this._expressions.splice(index, 1);
    delete this._expressionMap[expression.expressionName];
  }
  /**
   * Get the current weight of the specified expression.
   * If it doesn't have an expression of given name, it will return `null` instead.
   *
   * @param name Name of the expression
   */
  getValue(name) {
    var _a2;
    const expression = this.getExpression(name);
    return (_a2 = expression == null ? void 0 : expression.weight) != null ? _a2 : null;
  }
  /**
   * Set a weight to the specified expression.
   *
   * @param name Name of the expression
   * @param weight Weight
   */
  setValue(name, weight) {
    const expression = this.getExpression(name);
    if (expression) {
      expression.weight = saturate2(weight);
    }
  }
  /**
   * Reset weights of all expressions to `0.0`.
   */
  resetValues() {
    this._expressions.forEach((expression) => {
      expression.weight = 0;
    });
  }
  /**
   * Get a track name of specified expression.
   * This track name is needed to manipulate its expression via keyframe animations.
   *
   * @example Manipulate an expression using keyframe animation
   * ```js
   * const trackName = vrm.expressionManager.getExpressionTrackName( 'blink' );
   * const track = new THREE.NumberKeyframeTrack(
   *   name,
   *   [ 0.0, 0.5, 1.0 ], // times
   *   [ 0.0, 1.0, 0.0 ] // values
   * );
   *
   * const clip = new THREE.AnimationClip(
   *   'blink', // name
   *   1.0, // duration
   *   [ track ] // tracks
   * );
   *
   * const mixer = new THREE.AnimationMixer( vrm.scene );
   * const action = mixer.clipAction( clip );
   * action.play();
   * ```
   *
   * @param name Name of the expression
   */
  getExpressionTrackName(name) {
    const expression = this.getExpression(name);
    return expression ? `${expression.name}.weight` : null;
  }
  /**
   * Update every expressions.
   */
  update() {
    const weightMultipliers = this._calculateWeightMultipliers();
    this._expressions.forEach((expression) => {
      expression.clearAppliedWeight();
    });
    this._expressions.forEach((expression) => {
      let multiplier = 1;
      const name = expression.expressionName;
      if (this.blinkExpressionNames.indexOf(name) !== -1) {
        multiplier *= weightMultipliers.blink;
      }
      if (this.lookAtExpressionNames.indexOf(name) !== -1) {
        multiplier *= weightMultipliers.lookAt;
      }
      if (this.mouthExpressionNames.indexOf(name) !== -1) {
        multiplier *= weightMultipliers.mouth;
      }
      expression.applyWeight({ multiplier });
    });
  }
  /**
   * Calculate sum of override amounts to see how much we should multiply weights of certain expressions.
   */
  _calculateWeightMultipliers() {
    let blink = 1;
    let lookAt = 1;
    let mouth = 1;
    this._expressions.forEach((expression) => {
      blink -= expression.overrideBlinkAmount;
      lookAt -= expression.overrideLookAtAmount;
      mouth -= expression.overrideMouthAmount;
    });
    blink = Math.max(0, blink);
    lookAt = Math.max(0, lookAt);
    mouth = Math.max(0, mouth);
    return { blink, lookAt, mouth };
  }
};
var VRMExpressionMaterialColorType2 = {
  Color: "color",
  EmissionColor: "emissionColor",
  ShadeColor: "shadeColor",
  MatcapColor: "matcapColor",
  RimColor: "rimColor",
  OutlineColor: "outlineColor"
};
var v0ExpressionMaterialColorMap2 = {
  _Color: VRMExpressionMaterialColorType2.Color,
  _EmissionColor: VRMExpressionMaterialColorType2.EmissionColor,
  _ShadeColor: VRMExpressionMaterialColorType2.ShadeColor,
  _RimColor: VRMExpressionMaterialColorType2.RimColor,
  _OutlineColor: VRMExpressionMaterialColorType2.OutlineColor
};
var _color2 = new THREE210.Color();
var _VRMExpressionMaterialColorBind3 = class _VRMExpressionMaterialColorBind22 {
  constructor({
    material,
    type,
    targetValue,
    targetAlpha
  }) {
    this.material = material;
    this.type = type;
    this.targetValue = targetValue;
    this.targetAlpha = targetAlpha != null ? targetAlpha : 1;
    const color = this._initColorBindState();
    const alpha = this._initAlphaBindState();
    this._state = { color, alpha };
  }
  applyWeight(weight) {
    const { color, alpha } = this._state;
    if (color != null) {
      const { propertyName, deltaValue } = color;
      const target = this.material[propertyName];
      if (target != void 0) {
        target.add(_color2.copy(deltaValue).multiplyScalar(weight));
      }
    }
    if (alpha != null) {
      const { propertyName, deltaValue } = alpha;
      const target = this.material[propertyName];
      if (target != void 0) {
        this.material[propertyName] += deltaValue * weight;
      }
    }
  }
  clearAppliedWeight() {
    const { color, alpha } = this._state;
    if (color != null) {
      const { propertyName, initialValue } = color;
      const target = this.material[propertyName];
      if (target != void 0) {
        target.copy(initialValue);
      }
    }
    if (alpha != null) {
      const { propertyName, initialValue } = alpha;
      const target = this.material[propertyName];
      if (target != void 0) {
        this.material[propertyName] = initialValue;
      }
    }
  }
  _initColorBindState() {
    var _a2, _b2, _c;
    const { material, type, targetValue } = this;
    const propertyNameMap = this._getPropertyNameMap();
    const propertyName = (_b2 = (_a2 = propertyNameMap == null ? void 0 : propertyNameMap[type]) == null ? void 0 : _a2[0]) != null ? _b2 : null;
    if (propertyName == null) {
      console.warn(
        `Tried to add a material color bind to the material ${(_c = material.name) != null ? _c : "(no name)"}, the type ${type} but the material or the type is not supported.`
      );
      return null;
    }
    const target = material[propertyName];
    const initialValue = target.clone();
    const deltaValue = new THREE210.Color(
      targetValue.r - initialValue.r,
      targetValue.g - initialValue.g,
      targetValue.b - initialValue.b
    );
    return { propertyName, initialValue, deltaValue };
  }
  _initAlphaBindState() {
    var _a2, _b2, _c;
    const { material, type, targetAlpha } = this;
    const propertyNameMap = this._getPropertyNameMap();
    const propertyName = (_b2 = (_a2 = propertyNameMap == null ? void 0 : propertyNameMap[type]) == null ? void 0 : _a2[1]) != null ? _b2 : null;
    if (propertyName == null && targetAlpha !== 1) {
      console.warn(
        `Tried to add a material alpha bind to the material ${(_c = material.name) != null ? _c : "(no name)"}, the type ${type} but the material or the type does not support alpha.`
      );
      return null;
    }
    if (propertyName == null) {
      return null;
    }
    const initialValue = material[propertyName];
    const deltaValue = targetAlpha - initialValue;
    return { propertyName, initialValue, deltaValue };
  }
  _getPropertyNameMap() {
    var _a2, _b2;
    return (_b2 = (_a2 = Object.entries(_VRMExpressionMaterialColorBind22._propertyNameMapMap).find(([distinguisher]) => {
      return this.material[distinguisher] === true;
    })) == null ? void 0 : _a2[1]) != null ? _b2 : null;
  }
};
_VRMExpressionMaterialColorBind3._propertyNameMapMap = {
  isMeshStandardMaterial: {
    color: ["color", "opacity"],
    emissionColor: ["emissive", null]
  },
  isMeshBasicMaterial: {
    color: ["color", "opacity"]
  },
  isMToonMaterial: {
    color: ["color", "opacity"],
    emissionColor: ["emissive", null],
    outlineColor: ["outlineColorFactor", null],
    matcapColor: ["matcapFactor", null],
    rimColor: ["parametricRimColorFactor", null],
    shadeColor: ["shadeColorFactor", null]
  }
};
var VRMExpressionMaterialColorBind2 = _VRMExpressionMaterialColorBind3;
var VRMExpressionMorphTargetBind2 = class {
  constructor({
    primitives,
    index,
    weight
  }) {
    this.primitives = primitives;
    this.index = index;
    this.weight = weight;
  }
  applyWeight(weight) {
    this.primitives.forEach((mesh) => {
      var _a2;
      if (((_a2 = mesh.morphTargetInfluences) == null ? void 0 : _a2[this.index]) != null) {
        mesh.morphTargetInfluences[this.index] += this.weight * weight;
      }
    });
  }
  clearAppliedWeight() {
    this.primitives.forEach((mesh) => {
      var _a2;
      if (((_a2 = mesh.morphTargetInfluences) == null ? void 0 : _a2[this.index]) != null) {
        mesh.morphTargetInfluences[this.index] = 0;
      }
    });
  }
};
var _v22 = new THREE35.Vector2();
var _VRMExpressionTextureTransformBind3 = class _VRMExpressionTextureTransformBind22 {
  constructor({
    material,
    scale,
    offset
  }) {
    var _a2, _b2;
    this.material = material;
    this.scale = scale;
    this.offset = offset;
    const propertyNames = (_a2 = Object.entries(_VRMExpressionTextureTransformBind22._propertyNamesMap).find(
      ([distinguisher]) => {
        return material[distinguisher] === true;
      }
    )) == null ? void 0 : _a2[1];
    if (propertyNames == null) {
      console.warn(
        `Tried to add a texture transform bind to the material ${(_b2 = material.name) != null ? _b2 : "(no name)"} but the material is not supported.`
      );
      this._properties = [];
    } else {
      this._properties = [];
      propertyNames.forEach((propertyName) => {
        var _a22;
        const texture = (_a22 = material[propertyName]) == null ? void 0 : _a22.clone();
        if (!texture) {
          return null;
        }
        material[propertyName] = texture;
        const initialOffset = texture.offset.clone();
        const initialScale = texture.repeat.clone();
        const deltaOffset = offset.clone().sub(initialOffset);
        const deltaScale = scale.clone().sub(initialScale);
        this._properties.push({
          name: propertyName,
          initialOffset,
          deltaOffset,
          initialScale,
          deltaScale
        });
      });
    }
  }
  applyWeight(weight) {
    this._properties.forEach((property) => {
      const target = this.material[property.name];
      if (target === void 0) {
        return;
      }
      target.offset.add(_v22.copy(property.deltaOffset).multiplyScalar(weight));
      target.repeat.add(_v22.copy(property.deltaScale).multiplyScalar(weight));
    });
  }
  clearAppliedWeight() {
    this._properties.forEach((property) => {
      const target = this.material[property.name];
      if (target === void 0) {
        return;
      }
      target.offset.copy(property.initialOffset);
      target.repeat.copy(property.initialScale);
    });
  }
};
_VRMExpressionTextureTransformBind3._propertyNamesMap = {
  isMeshStandardMaterial: [
    "map",
    "emissiveMap",
    "bumpMap",
    "normalMap",
    "displacementMap",
    "roughnessMap",
    "metalnessMap",
    "alphaMap"
  ],
  isMeshBasicMaterial: ["map", "specularMap", "alphaMap"],
  isMToonMaterial: [
    "map",
    "normalMap",
    "emissiveMap",
    "shadeMultiplyTexture",
    "rimMultiplyTexture",
    "outlineWidthMultiplyTexture",
    "uvAnimationMaskTexture"
  ]
};
var VRMExpressionTextureTransformBind2 = _VRMExpressionTextureTransformBind3;
var POSSIBLE_SPEC_VERSIONS9 = /* @__PURE__ */ new Set(["1.0", "1.0-beta"]);
var _VRMExpressionLoaderPlugin3 = class _VRMExpressionLoaderPlugin22 {
  get name() {
    return "VRMExpressionLoaderPlugin";
  }
  constructor(parser) {
    this.parser = parser;
  }
  afterRoot(gltf) {
    return __async22(this, null, function* () {
      gltf.userData.vrmExpressionManager = yield this._import(gltf);
    });
  }
  /**
   * Import a {@link VRMExpressionManager} from a VRM.
   *
   * @param gltf A parsed result of GLTF taken from GLTFLoader
   */
  _import(gltf) {
    return __async22(this, null, function* () {
      const v1Result = yield this._v1Import(gltf);
      if (v1Result) {
        return v1Result;
      }
      const v0Result = yield this._v0Import(gltf);
      if (v0Result) {
        return v0Result;
      }
      return null;
    });
  }
  _v1Import(gltf) {
    return __async22(this, null, function* () {
      var _a2, _b2;
      const json = this.parser.json;
      const isVRMUsed = ((_a2 = json.extensionsUsed) == null ? void 0 : _a2.indexOf("VRMC_vrm")) !== -1;
      if (!isVRMUsed) {
        return null;
      }
      const extension = (_b2 = json.extensions) == null ? void 0 : _b2["VRMC_vrm"];
      if (!extension) {
        return null;
      }
      const specVersion = extension.specVersion;
      if (!POSSIBLE_SPEC_VERSIONS9.has(specVersion)) {
        console.warn(`VRMExpressionLoaderPlugin: Unknown VRMC_vrm specVersion "${specVersion}"`);
        return null;
      }
      const schemaExpressions = extension.expressions;
      if (!schemaExpressions) {
        return null;
      }
      const presetNameSet = new Set(Object.values(VRMExpressionPresetName2));
      const nameSchemaExpressionMap = /* @__PURE__ */ new Map();
      if (schemaExpressions.preset != null) {
        Object.entries(schemaExpressions.preset).forEach(([name, schemaExpression]) => {
          if (schemaExpression == null) {
            return;
          }
          if (!presetNameSet.has(name)) {
            console.warn(`VRMExpressionLoaderPlugin: Unknown preset name "${name}" detected. Ignoring the expression`);
            return;
          }
          nameSchemaExpressionMap.set(name, schemaExpression);
        });
      }
      if (schemaExpressions.custom != null) {
        Object.entries(schemaExpressions.custom).forEach(([name, schemaExpression]) => {
          if (presetNameSet.has(name)) {
            console.warn(
              `VRMExpressionLoaderPlugin: Custom expression cannot have preset name "${name}". Ignoring the expression`
            );
            return;
          }
          nameSchemaExpressionMap.set(name, schemaExpression);
        });
      }
      const manager = new VRMExpressionManager2();
      yield Promise.all(
        Array.from(nameSchemaExpressionMap.entries()).map((_0) => __async22(this, [_0], function* ([name, schemaExpression]) {
          var _a22, _b22, _c, _d2, _e, _f, _g;
          const expression = new VRMExpression2(name);
          gltf.scene.add(expression);
          expression.isBinary = (_a22 = schemaExpression.isBinary) != null ? _a22 : false;
          expression.overrideBlink = (_b22 = schemaExpression.overrideBlink) != null ? _b22 : "none";
          expression.overrideLookAt = (_c = schemaExpression.overrideLookAt) != null ? _c : "none";
          expression.overrideMouth = (_d2 = schemaExpression.overrideMouth) != null ? _d2 : "none";
          (_e = schemaExpression.morphTargetBinds) == null ? void 0 : _e.forEach((bind) => __async22(this, null, function* () {
            var _a3;
            if (bind.node === void 0 || bind.index === void 0) {
              return;
            }
            const primitives = yield gltfExtractPrimitivesFromNode2(gltf, bind.node);
            const morphTargetIndex = bind.index;
            if (!primitives.every(
              (primitive) => Array.isArray(primitive.morphTargetInfluences) && morphTargetIndex < primitive.morphTargetInfluences.length
            )) {
              console.warn(
                `VRMExpressionLoaderPlugin: ${schemaExpression.name} attempts to index morph #${morphTargetIndex} but not found.`
              );
              return;
            }
            expression.addBind(
              new VRMExpressionMorphTargetBind2({
                primitives,
                index: morphTargetIndex,
                weight: (_a3 = bind.weight) != null ? _a3 : 1
              })
            );
          }));
          if (schemaExpression.materialColorBinds || schemaExpression.textureTransformBinds) {
            const gltfMaterials = [];
            gltf.scene.traverse((object) => {
              const material = object.material;
              if (material) {
                if (Array.isArray(material)) {
                  gltfMaterials.push(...material);
                } else {
                  gltfMaterials.push(material);
                }
              }
            });
            (_f = schemaExpression.materialColorBinds) == null ? void 0 : _f.forEach((bind) => __async22(this, null, function* () {
              const materials = gltfMaterials.filter((material) => {
                var _a3;
                const materialIndex = (_a3 = this.parser.associations.get(material)) == null ? void 0 : _a3.materials;
                return bind.material === materialIndex;
              });
              materials.forEach((material) => {
                expression.addBind(
                  new VRMExpressionMaterialColorBind2({
                    material,
                    type: bind.type,
                    targetValue: new THREE45.Color().fromArray(bind.targetValue),
                    targetAlpha: bind.targetValue[3]
                  })
                );
              });
            }));
            (_g = schemaExpression.textureTransformBinds) == null ? void 0 : _g.forEach((bind) => __async22(this, null, function* () {
              const materials = gltfMaterials.filter((material) => {
                var _a3;
                const materialIndex = (_a3 = this.parser.associations.get(material)) == null ? void 0 : _a3.materials;
                return bind.material === materialIndex;
              });
              materials.forEach((material) => {
                var _a3, _b3;
                expression.addBind(
                  new VRMExpressionTextureTransformBind2({
                    material,
                    offset: new THREE45.Vector2().fromArray((_a3 = bind.offset) != null ? _a3 : [0, 0]),
                    scale: new THREE45.Vector2().fromArray((_b3 = bind.scale) != null ? _b3 : [1, 1])
                  })
                );
              });
            }));
          }
          manager.registerExpression(expression);
        }))
      );
      return manager;
    });
  }
  _v0Import(gltf) {
    return __async22(this, null, function* () {
      var _a2;
      const json = this.parser.json;
      const vrmExt = (_a2 = json.extensions) == null ? void 0 : _a2.VRM;
      if (!vrmExt) {
        return null;
      }
      const schemaBlendShape = vrmExt.blendShapeMaster;
      if (!schemaBlendShape) {
        return null;
      }
      const manager = new VRMExpressionManager2();
      const schemaBlendShapeGroups = schemaBlendShape.blendShapeGroups;
      if (!schemaBlendShapeGroups) {
        return manager;
      }
      const blendShapeNameSet = /* @__PURE__ */ new Set();
      yield Promise.all(
        schemaBlendShapeGroups.map((schemaGroup) => __async22(this, null, function* () {
          var _a22;
          const v0PresetName = schemaGroup.presetName;
          const v1PresetName = v0PresetName != null && _VRMExpressionLoaderPlugin22.v0v1PresetNameMap[v0PresetName] || null;
          const name = v1PresetName != null ? v1PresetName : schemaGroup.name;
          if (name == null) {
            console.warn("VRMExpressionLoaderPlugin: One of custom expressions has no name. Ignoring the expression");
            return;
          }
          if (blendShapeNameSet.has(name)) {
            console.warn(
              `VRMExpressionLoaderPlugin: An expression preset ${v0PresetName} has duplicated entries. Ignoring the expression`
            );
            return;
          }
          blendShapeNameSet.add(name);
          const expression = new VRMExpression2(name);
          gltf.scene.add(expression);
          expression.isBinary = (_a22 = schemaGroup.isBinary) != null ? _a22 : false;
          if (schemaGroup.binds) {
            schemaGroup.binds.forEach((bind) => __async22(this, null, function* () {
              var _a3;
              if (bind.mesh === void 0 || bind.index === void 0) {
                return;
              }
              const nodesUsingMesh = [];
              (_a3 = json.nodes) == null ? void 0 : _a3.forEach((node, i) => {
                if (node.mesh === bind.mesh) {
                  nodesUsingMesh.push(i);
                }
              });
              if (nodesUsingMesh.length === 0) {
                console.warn(
                  `VRMExpressionLoaderPlugin: ${schemaGroup.name} attempts to bind a morph target to the mesh #${bind.mesh} but the mesh is not found or not used in the scene. Ignoring the bind.`
                );
                return;
              }
              const morphTargetIndex = bind.index;
              yield Promise.all(
                nodesUsingMesh.map((nodeIndex) => __async22(this, null, function* () {
                  var _a4;
                  const primitives = yield gltfExtractPrimitivesFromNode2(gltf, nodeIndex);
                  if (!primitives.every(
                    (primitive) => Array.isArray(primitive.morphTargetInfluences) && morphTargetIndex < primitive.morphTargetInfluences.length
                  )) {
                    console.warn(
                      `VRMExpressionLoaderPlugin: ${schemaGroup.name} attempts to index ${morphTargetIndex}th morph but not found.`
                    );
                    return;
                  }
                  expression.addBind(
                    new VRMExpressionMorphTargetBind2({
                      primitives,
                      index: morphTargetIndex,
                      weight: 0.01 * ((_a4 = bind.weight) != null ? _a4 : 100)
                      // narrowing the range from [ 0.0 - 100.0 ] to [ 0.0 - 1.0 ]
                    })
                  );
                }))
              );
            }));
          }
          const materialValues = schemaGroup.materialValues;
          if (materialValues && materialValues.length !== 0) {
            materialValues.forEach((materialValue) => {
              if (materialValue.materialName === void 0 || materialValue.propertyName === void 0 || materialValue.targetValue === void 0) {
                return;
              }
              const materials = [];
              gltf.scene.traverse((object) => {
                if (object.material) {
                  const material = object.material;
                  if (Array.isArray(material)) {
                    materials.push(
                      ...material.filter(
                        (mtl) => (mtl.name === materialValue.materialName || mtl.name === materialValue.materialName + " (Outline)") && materials.indexOf(mtl) === -1
                      )
                    );
                  } else if (material.name === materialValue.materialName && materials.indexOf(material) === -1) {
                    materials.push(material);
                  }
                }
              });
              const materialPropertyName = materialValue.propertyName;
              materials.forEach((material) => {
                if (materialPropertyName === "_MainTex_ST") {
                  const scale = new THREE45.Vector2(materialValue.targetValue[0], materialValue.targetValue[1]);
                  const offset = new THREE45.Vector2(materialValue.targetValue[2], materialValue.targetValue[3]);
                  offset.y = 1 - offset.y - scale.y;
                  expression.addBind(
                    new VRMExpressionTextureTransformBind2({
                      material,
                      scale,
                      offset
                    })
                  );
                  return;
                }
                const materialColorType = v0ExpressionMaterialColorMap2[materialPropertyName];
                if (materialColorType) {
                  expression.addBind(
                    new VRMExpressionMaterialColorBind2({
                      material,
                      type: materialColorType,
                      targetValue: new THREE45.Color().fromArray(materialValue.targetValue),
                      targetAlpha: materialValue.targetValue[3]
                    })
                  );
                  return;
                }
                console.warn(materialPropertyName + " is not supported");
              });
            });
          }
          manager.registerExpression(expression);
        }))
      );
      return manager;
    });
  }
};
_VRMExpressionLoaderPlugin3.v0v1PresetNameMap = {
  a: "aa",
  e: "ee",
  i: "ih",
  o: "oh",
  u: "ou",
  blink: "blink",
  joy: "happy",
  angry: "angry",
  sorrow: "sad",
  fun: "relaxed",
  lookup: "lookUp",
  lookdown: "lookDown",
  lookleft: "lookLeft",
  lookright: "lookRight",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  blink_l: "blinkLeft",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  blink_r: "blinkRight",
  neutral: "neutral"
};
var _VRMFirstPerson3 = class _VRMFirstPerson22 {
  /**
   * Create a new VRMFirstPerson object.
   *
   * @param humanoid A {@link VRMHumanoid}
   * @param meshAnnotations A {@link VRMFirstPersonMeshAnnotation}
   */
  constructor(humanoid, meshAnnotations) {
    this._firstPersonOnlyLayer = _VRMFirstPerson22.DEFAULT_FIRSTPERSON_ONLY_LAYER;
    this._thirdPersonOnlyLayer = _VRMFirstPerson22.DEFAULT_THIRDPERSON_ONLY_LAYER;
    this._initializedLayers = false;
    this.humanoid = humanoid;
    this.meshAnnotations = meshAnnotations;
  }
  /**
   * Copy the given {@link VRMFirstPerson} into this one.
   * {@link humanoid} must be same as the source one.
   * @param source The {@link VRMFirstPerson} you want to copy
   * @returns this
   */
  copy(source) {
    if (this.humanoid !== source.humanoid) {
      throw new Error("VRMFirstPerson: humanoid must be same in order to copy");
    }
    this.meshAnnotations = source.meshAnnotations.map((annotation) => ({
      meshes: annotation.meshes.concat(),
      type: annotation.type
    }));
    return this;
  }
  /**
   * Returns a clone of this {@link VRMFirstPerson}.
   * @returns Copied {@link VRMFirstPerson}
   */
  clone() {
    return new _VRMFirstPerson22(this.humanoid, this.meshAnnotations).copy(this);
  }
  /**
   * A camera layer represents `FirstPersonOnly` layer.
   * Note that **you must call {@link setup} first before you use the layer feature** or it does not work properly.
   *
   * The value is {@link DEFAULT_FIRSTPERSON_ONLY_LAYER} by default but you can change the layer by specifying via {@link setup} if you prefer.
   *
   * @see https://vrm.dev/en/univrm/api/univrm_use_firstperson/
   * @see https://threejs.org/docs/#api/en/core/Layers
   */
  get firstPersonOnlyLayer() {
    return this._firstPersonOnlyLayer;
  }
  /**
   * A camera layer represents `ThirdPersonOnly` layer.
   * Note that **you must call {@link setup} first before you use the layer feature** or it does not work properly.
   *
   * The value is {@link DEFAULT_THIRDPERSON_ONLY_LAYER} by default but you can change the layer by specifying via {@link setup} if you prefer.
   *
   * @see https://vrm.dev/en/univrm/api/univrm_use_firstperson/
   * @see https://threejs.org/docs/#api/en/core/Layers
   */
  get thirdPersonOnlyLayer() {
    return this._thirdPersonOnlyLayer;
  }
  /**
   * In this method, it assigns layers for every meshes based on mesh annotations.
   * You must call this method first before you use the layer feature.
   *
   * This is an equivalent of [VRMFirstPerson.Setup](https://github.com/vrm-c/UniVRM/blob/73a5bd8fcddaa2a7a8735099a97e63c9db3e5ea0/Assets/VRM/Runtime/FirstPerson/VRMFirstPerson.cs#L295-L299) of the UniVRM.
   *
   * The `cameraLayer` parameter specifies which layer will be assigned for `FirstPersonOnly` / `ThirdPersonOnly`.
   * In UniVRM, we specified those by naming each desired layer as `FIRSTPERSON_ONLY_LAYER` / `THIRDPERSON_ONLY_LAYER`
   * but we are going to specify these layers at here since we are unable to name layers in Three.js.
   *
   * @param cameraLayer Specify which layer will be for `FirstPersonOnly` / `ThirdPersonOnly`.
   */
  setup({
    firstPersonOnlyLayer = _VRMFirstPerson22.DEFAULT_FIRSTPERSON_ONLY_LAYER,
    thirdPersonOnlyLayer = _VRMFirstPerson22.DEFAULT_THIRDPERSON_ONLY_LAYER
  } = {}) {
    if (this._initializedLayers) {
      return;
    }
    this._firstPersonOnlyLayer = firstPersonOnlyLayer;
    this._thirdPersonOnlyLayer = thirdPersonOnlyLayer;
    this.meshAnnotations.forEach((item) => {
      item.meshes.forEach((mesh) => {
        if (item.type === "firstPersonOnly") {
          mesh.layers.set(this._firstPersonOnlyLayer);
          mesh.traverse((child) => child.layers.set(this._firstPersonOnlyLayer));
        } else if (item.type === "thirdPersonOnly") {
          mesh.layers.set(this._thirdPersonOnlyLayer);
          mesh.traverse((child) => child.layers.set(this._thirdPersonOnlyLayer));
        } else if (item.type === "auto") {
          this._createHeadlessModel(mesh);
        }
      });
    });
    this._initializedLayers = true;
  }
  _excludeTriangles(triangles, bws, skinIndex, exclude) {
    let count = 0;
    if (bws != null && bws.length > 0) {
      for (let i = 0; i < triangles.length; i += 3) {
        const a = triangles[i];
        const b = triangles[i + 1];
        const c = triangles[i + 2];
        const bw0 = bws[a];
        const skin0 = skinIndex[a];
        if (bw0[0] > 0 && exclude.includes(skin0[0])) continue;
        if (bw0[1] > 0 && exclude.includes(skin0[1])) continue;
        if (bw0[2] > 0 && exclude.includes(skin0[2])) continue;
        if (bw0[3] > 0 && exclude.includes(skin0[3])) continue;
        const bw1 = bws[b];
        const skin1 = skinIndex[b];
        if (bw1[0] > 0 && exclude.includes(skin1[0])) continue;
        if (bw1[1] > 0 && exclude.includes(skin1[1])) continue;
        if (bw1[2] > 0 && exclude.includes(skin1[2])) continue;
        if (bw1[3] > 0 && exclude.includes(skin1[3])) continue;
        const bw2 = bws[c];
        const skin2 = skinIndex[c];
        if (bw2[0] > 0 && exclude.includes(skin2[0])) continue;
        if (bw2[1] > 0 && exclude.includes(skin2[1])) continue;
        if (bw2[2] > 0 && exclude.includes(skin2[2])) continue;
        if (bw2[3] > 0 && exclude.includes(skin2[3])) continue;
        triangles[count++] = a;
        triangles[count++] = b;
        triangles[count++] = c;
      }
    }
    return count;
  }
  _createErasedMesh(src, erasingBonesIndex) {
    const dst = new THREE55.SkinnedMesh(src.geometry.clone(), src.material);
    dst.name = `${src.name}(erase)`;
    dst.frustumCulled = src.frustumCulled;
    dst.layers.set(this._firstPersonOnlyLayer);
    const geometry = dst.geometry;
    const skinIndexAttr = geometry.getAttribute("skinIndex");
    const skinIndexAttrArray = skinIndexAttr instanceof THREE55.GLBufferAttribute ? [] : skinIndexAttr.array;
    const skinIndex = [];
    for (let i = 0; i < skinIndexAttrArray.length; i += 4) {
      skinIndex.push([
        skinIndexAttrArray[i],
        skinIndexAttrArray[i + 1],
        skinIndexAttrArray[i + 2],
        skinIndexAttrArray[i + 3]
      ]);
    }
    const skinWeightAttr = geometry.getAttribute("skinWeight");
    const skinWeightAttrArray = skinWeightAttr instanceof THREE55.GLBufferAttribute ? [] : skinWeightAttr.array;
    const skinWeight = [];
    for (let i = 0; i < skinWeightAttrArray.length; i += 4) {
      skinWeight.push([
        skinWeightAttrArray[i],
        skinWeightAttrArray[i + 1],
        skinWeightAttrArray[i + 2],
        skinWeightAttrArray[i + 3]
      ]);
    }
    const index = geometry.getIndex();
    if (!index) {
      throw new Error("The geometry doesn't have an index buffer");
    }
    const oldTriangles = Array.from(index.array);
    const count = this._excludeTriangles(oldTriangles, skinWeight, skinIndex, erasingBonesIndex);
    const newTriangle = [];
    for (let i = 0; i < count; i++) {
      newTriangle[i] = oldTriangles[i];
    }
    geometry.setIndex(newTriangle);
    if (src.onBeforeRender) {
      dst.onBeforeRender = src.onBeforeRender;
    }
    dst.bind(new THREE55.Skeleton(src.skeleton.bones, src.skeleton.boneInverses), new THREE55.Matrix4());
    return dst;
  }
  _createHeadlessModelForSkinnedMesh(parent, mesh) {
    const eraseBoneIndexes = [];
    mesh.skeleton.bones.forEach((bone, index) => {
      if (this._isEraseTarget(bone)) eraseBoneIndexes.push(index);
    });
    if (!eraseBoneIndexes.length) {
      mesh.layers.enable(this._thirdPersonOnlyLayer);
      mesh.layers.enable(this._firstPersonOnlyLayer);
      return;
    }
    mesh.layers.set(this._thirdPersonOnlyLayer);
    const newMesh = this._createErasedMesh(mesh, eraseBoneIndexes);
    parent.add(newMesh);
  }
  _createHeadlessModel(node) {
    if (node.type === "Group") {
      node.layers.set(this._thirdPersonOnlyLayer);
      if (this._isEraseTarget(node)) {
        node.traverse((child) => child.layers.set(this._thirdPersonOnlyLayer));
      } else {
        const parent = new THREE55.Group();
        parent.name = `_headless_${node.name}`;
        parent.layers.set(this._firstPersonOnlyLayer);
        node.parent.add(parent);
        node.children.filter((child) => child.type === "SkinnedMesh").forEach((child) => {
          const skinnedMesh = child;
          this._createHeadlessModelForSkinnedMesh(parent, skinnedMesh);
        });
      }
    } else if (node.type === "SkinnedMesh") {
      const skinnedMesh = node;
      this._createHeadlessModelForSkinnedMesh(node.parent, skinnedMesh);
    } else {
      if (this._isEraseTarget(node)) {
        node.layers.set(this._thirdPersonOnlyLayer);
        node.traverse((child) => child.layers.set(this._thirdPersonOnlyLayer));
      }
    }
  }
  _isEraseTarget(bone) {
    if (bone === this.humanoid.getRawBoneNode("head")) {
      return true;
    } else if (!bone.parent) {
      return false;
    } else {
      return this._isEraseTarget(bone.parent);
    }
  }
};
_VRMFirstPerson3.DEFAULT_FIRSTPERSON_ONLY_LAYER = 9;
_VRMFirstPerson3.DEFAULT_THIRDPERSON_ONLY_LAYER = 10;
var _v3A8 = new THREE63.Vector3();
var _v3B6 = new THREE63.Vector3();
var _quatA8 = new THREE63.Quaternion();
var VRMHumanBoneParentMap2 = {
  hips: null,
  spine: "hips",
  chest: "spine",
  upperChest: "chest",
  neck: "upperChest",
  head: "neck",
  leftEye: "head",
  rightEye: "head",
  jaw: "head",
  leftUpperLeg: "hips",
  leftLowerLeg: "leftUpperLeg",
  leftFoot: "leftLowerLeg",
  leftToes: "leftFoot",
  rightUpperLeg: "hips",
  rightLowerLeg: "rightUpperLeg",
  rightFoot: "rightLowerLeg",
  rightToes: "rightFoot",
  leftShoulder: "upperChest",
  leftUpperArm: "leftShoulder",
  leftLowerArm: "leftUpperArm",
  leftHand: "leftLowerArm",
  rightShoulder: "upperChest",
  rightUpperArm: "rightShoulder",
  rightLowerArm: "rightUpperArm",
  rightHand: "rightLowerArm",
  leftThumbMetacarpal: "leftHand",
  leftThumbProximal: "leftThumbMetacarpal",
  leftThumbDistal: "leftThumbProximal",
  leftIndexProximal: "leftHand",
  leftIndexIntermediate: "leftIndexProximal",
  leftIndexDistal: "leftIndexIntermediate",
  leftMiddleProximal: "leftHand",
  leftMiddleIntermediate: "leftMiddleProximal",
  leftMiddleDistal: "leftMiddleIntermediate",
  leftRingProximal: "leftHand",
  leftRingIntermediate: "leftRingProximal",
  leftRingDistal: "leftRingIntermediate",
  leftLittleProximal: "leftHand",
  leftLittleIntermediate: "leftLittleProximal",
  leftLittleDistal: "leftLittleIntermediate",
  rightThumbMetacarpal: "rightHand",
  rightThumbProximal: "rightThumbMetacarpal",
  rightThumbDistal: "rightThumbProximal",
  rightIndexProximal: "rightHand",
  rightIndexIntermediate: "rightIndexProximal",
  rightIndexDistal: "rightIndexIntermediate",
  rightMiddleProximal: "rightHand",
  rightMiddleIntermediate: "rightMiddleProximal",
  rightMiddleDistal: "rightMiddleIntermediate",
  rightRingProximal: "rightHand",
  rightRingIntermediate: "rightRingProximal",
  rightRingDistal: "rightRingIntermediate",
  rightLittleProximal: "rightHand",
  rightLittleIntermediate: "rightLittleProximal",
  rightLittleDistal: "rightLittleIntermediate"
};
function quatInvertCompat3(target) {
  if (target.invert) {
    target.invert();
  } else {
    target.inverse();
  }
  return target;
}
var _v3A24 = new THREE73.Vector3();
var _quatA23 = new THREE73.Quaternion();
var _v3A34 = new THREE83.Vector3();
var _quatA33 = new THREE83.Quaternion();
var _boneWorldPos2 = new THREE83.Vector3();
var _quatA42 = new THREE113.Quaternion();
var _quatB5 = new THREE113.Quaternion();
var _v3A44 = new THREE113.Vector3();
var _v3B24 = new THREE113.Vector3();
var SQRT_2_OVER_22 = Math.sqrt(2) / 2;
var QUAT_XY_CW902 = new THREE113.Quaternion(0, 0, -SQRT_2_OVER_22, SQRT_2_OVER_22);
var VEC3_POSITIVE_Y2 = new THREE113.Vector3(0, 1, 0);
var _position2 = new THREE123.Vector3();
var _scale2 = new THREE123.Vector3();
function getWorldQuaternionLite2(object, out) {
  object.matrixWorld.decompose(_position2, out, _scale2);
  return out;
}
function calcAzimuthAltitude2(vector) {
  return [Math.atan2(-vector.z, vector.x), Math.atan2(vector.y, Math.sqrt(vector.x * vector.x + vector.z * vector.z))];
}
function sanitizeAngle2(angle) {
  const roundTurn = Math.round(angle / 2 / Math.PI);
  return angle - 2 * Math.PI * roundTurn;
}
var VEC3_POSITIVE_Z3 = new THREE133.Vector3(0, 0, 1);
var _v3A53 = new THREE133.Vector3();
var _v3B32 = new THREE133.Vector3();
var _v3C3 = new THREE133.Vector3();
var _quatA52 = new THREE133.Quaternion();
var _quatB23 = new THREE133.Quaternion();
var _quatC3 = new THREE133.Quaternion();
var _quatD2 = new THREE133.Quaternion();
var _eulerA3 = new THREE133.Euler();
var _VRMLookAt3 = class _VRMLookAt22 {
  /**
   * Create a new {@link VRMLookAt}.
   *
   * @param humanoid A {@link VRMHumanoid}
   * @param applier A {@link VRMLookAtApplier}
   */
  constructor(humanoid, applier) {
    this.offsetFromHeadBone = new THREE133.Vector3();
    this.autoUpdate = true;
    this.faceFront = new THREE133.Vector3(0, 0, 1);
    this.humanoid = humanoid;
    this.applier = applier;
    this._yaw = 0;
    this._pitch = 0;
    this._needsUpdate = true;
    this._restHeadWorldQuaternion = this.getLookAtWorldQuaternion(new THREE133.Quaternion());
  }
  /**
   * Its current angle around Y axis, in degree.
   */
  get yaw() {
    return this._yaw;
  }
  /**
   * Its current angle around Y axis, in degree.
   */
  set yaw(value) {
    this._yaw = value;
    this._needsUpdate = true;
  }
  /**
   * Its current angle around X axis, in degree.
   */
  get pitch() {
    return this._pitch;
  }
  /**
   * Its current angle around X axis, in degree.
   */
  set pitch(value) {
    this._pitch = value;
    this._needsUpdate = true;
  }
  /**
   * @deprecated Use {@link getEuler} instead.
   */
  get euler() {
    console.warn("VRMLookAt: euler is deprecated. use getEuler() instead.");
    return this.getEuler(new THREE133.Euler());
  }
  /**
   * Get its yaw-pitch angles as an `Euler`.
   * Does NOT consider {@link faceFront}; it returns `Euler(0, 0, 0; "YXZ")` by default regardless of the faceFront value.
   *
   * @param target The target euler
   */
  getEuler(target) {
    return target.set(THREE133.MathUtils.DEG2RAD * this._pitch, THREE133.MathUtils.DEG2RAD * this._yaw, 0, "YXZ");
  }
  /**
   * Copy the given {@link VRMLookAt} into this one.
   * {@link humanoid} must be same as the source one.
   * {@link applier} will reference the same instance as the source one.
   * @param source The {@link VRMLookAt} you want to copy
   * @returns this
   */
  copy(source) {
    if (this.humanoid !== source.humanoid) {
      throw new Error("VRMLookAt: humanoid must be same in order to copy");
    }
    this.offsetFromHeadBone.copy(source.offsetFromHeadBone);
    this.applier = source.applier;
    this.autoUpdate = source.autoUpdate;
    this.target = source.target;
    this.faceFront.copy(source.faceFront);
    return this;
  }
  /**
   * Returns a clone of this {@link VRMLookAt}.
   * Note that {@link humanoid} and {@link applier} will reference the same instance as this one.
   * @returns Copied {@link VRMLookAt}
   */
  clone() {
    return new _VRMLookAt22(this.humanoid, this.applier).copy(this);
  }
  /**
   * Reset the lookAt direction (yaw and pitch) to the initial direction.
   */
  reset() {
    this._yaw = 0;
    this._pitch = 0;
    this._needsUpdate = true;
  }
  /**
   * Get its lookAt position in world coordinate.
   *
   * @param target A target `THREE.Vector3`
   */
  getLookAtWorldPosition(target) {
    const head = this.humanoid.getRawBoneNode("head");
    return target.copy(this.offsetFromHeadBone).applyMatrix4(head.matrixWorld);
  }
  /**
   * Get its lookAt rotation in world coordinate.
   * Does NOT consider {@link faceFront}.
   *
   * @param target A target `THREE.Quaternion`
   */
  getLookAtWorldQuaternion(target) {
    const head = this.humanoid.getRawBoneNode("head");
    return getWorldQuaternionLite2(head, target);
  }
  /**
   * Get a quaternion that rotates the +Z unit vector of the humanoid Head to the {@link faceFront} direction.
   *
   * @param target A target `THREE.Quaternion`
   */
  getFaceFrontQuaternion(target) {
    if (this.faceFront.distanceToSquared(VEC3_POSITIVE_Z3) < 0.01) {
      return target.copy(this._restHeadWorldQuaternion).invert();
    }
    const [faceFrontAzimuth, faceFrontAltitude] = calcAzimuthAltitude2(this.faceFront);
    _eulerA3.set(0, 0.5 * Math.PI + faceFrontAzimuth, faceFrontAltitude, "YZX");
    return target.setFromEuler(_eulerA3).premultiply(_quatD2.copy(this._restHeadWorldQuaternion).invert());
  }
  /**
   * Get its LookAt direction in world coordinate.
   *
   * @param target A target `THREE.Vector3`
   */
  getLookAtWorldDirection(target) {
    this.getLookAtWorldQuaternion(_quatB23);
    this.getFaceFrontQuaternion(_quatC3);
    return target.copy(VEC3_POSITIVE_Z3).applyQuaternion(_quatB23).applyQuaternion(_quatC3).applyEuler(this.getEuler(_eulerA3));
  }
  /**
   * Set its lookAt target position.
   *
   * Note that its result will be instantly overwritten if {@link VRMLookAtHead.autoUpdate} is enabled.
   *
   * If you want to track an object continuously, you might want to use {@link target} instead.
   *
   * @param position A target position, in world space
   */
  lookAt(position) {
    const headRotDiffInv = _quatA52.copy(this._restHeadWorldQuaternion).multiply(quatInvertCompat3(this.getLookAtWorldQuaternion(_quatB23)));
    const headPos = this.getLookAtWorldPosition(_v3B32);
    const lookAtDir = _v3C3.copy(position).sub(headPos).applyQuaternion(headRotDiffInv).normalize();
    const [azimuthFrom, altitudeFrom] = calcAzimuthAltitude2(this.faceFront);
    const [azimuthTo, altitudeTo] = calcAzimuthAltitude2(lookAtDir);
    const yaw = sanitizeAngle2(azimuthTo - azimuthFrom);
    const pitch = sanitizeAngle2(altitudeFrom - altitudeTo);
    this._yaw = THREE133.MathUtils.RAD2DEG * yaw;
    this._pitch = THREE133.MathUtils.RAD2DEG * pitch;
    this._needsUpdate = true;
  }
  /**
   * Update the VRMLookAtHead.
   * If {@link autoUpdate} is enabled, this will make it look at the {@link target}.
   *
   * @param delta deltaTime, it isn't used though. You can use the parameter if you want to use this in your own extended {@link VRMLookAt}.
   */
  update(delta) {
    if (this.target != null && this.autoUpdate) {
      this.lookAt(this.target.getWorldPosition(_v3A53));
    }
    if (this._needsUpdate) {
      this._needsUpdate = false;
      this.applier.applyYawPitch(this._yaw, this._pitch);
    }
  }
};
_VRMLookAt3.EULER_ORDER = "YXZ";
var VRMLookAt2 = _VRMLookAt3;
var VEC3_POSITIVE_Z22 = new THREE143.Vector3(0, 0, 1);
var _quatA62 = new THREE143.Quaternion();
var _quatB33 = new THREE143.Quaternion();
var _eulerA22 = new THREE143.Euler(0, 0, 0, "YXZ");
var VRMLookAtBoneApplier2 = class {
  /**
   * Create a new {@link VRMLookAtBoneApplier}.
   *
   * @param humanoid A {@link VRMHumanoid}
   * @param rangeMapHorizontalInner A {@link VRMLookAtRangeMap} used for inner transverse direction
   * @param rangeMapHorizontalOuter A {@link VRMLookAtRangeMap} used for outer transverse direction
   * @param rangeMapVerticalDown A {@link VRMLookAtRangeMap} used for down direction
   * @param rangeMapVerticalUp A {@link VRMLookAtRangeMap} used for up direction
   */
  constructor(humanoid, rangeMapHorizontalInner, rangeMapHorizontalOuter, rangeMapVerticalDown, rangeMapVerticalUp) {
    this.humanoid = humanoid;
    this.rangeMapHorizontalInner = rangeMapHorizontalInner;
    this.rangeMapHorizontalOuter = rangeMapHorizontalOuter;
    this.rangeMapVerticalDown = rangeMapVerticalDown;
    this.rangeMapVerticalUp = rangeMapVerticalUp;
    this.faceFront = new THREE143.Vector3(0, 0, 1);
    this._restQuatLeftEye = new THREE143.Quaternion();
    this._restQuatRightEye = new THREE143.Quaternion();
    this._restLeftEyeParentWorldQuat = new THREE143.Quaternion();
    this._restRightEyeParentWorldQuat = new THREE143.Quaternion();
    const leftEye = this.humanoid.getRawBoneNode("leftEye");
    const rightEye = this.humanoid.getRawBoneNode("rightEye");
    if (leftEye) {
      this._restQuatLeftEye.copy(leftEye.quaternion);
      getWorldQuaternionLite2(leftEye.parent, this._restLeftEyeParentWorldQuat);
    }
    if (rightEye) {
      this._restQuatRightEye.copy(rightEye.quaternion);
      getWorldQuaternionLite2(rightEye.parent, this._restRightEyeParentWorldQuat);
    }
  }
  /**
   * Apply the input angle to its associated VRM model.
   *
   * @param yaw Rotation around Y axis, in degree
   * @param pitch Rotation around X axis, in degree
   */
  applyYawPitch(yaw, pitch) {
    const leftEye = this.humanoid.getRawBoneNode("leftEye");
    const rightEye = this.humanoid.getRawBoneNode("rightEye");
    const leftEyeNormalized = this.humanoid.getNormalizedBoneNode("leftEye");
    const rightEyeNormalized = this.humanoid.getNormalizedBoneNode("rightEye");
    if (leftEye) {
      if (pitch < 0) {
        _eulerA22.x = -THREE143.MathUtils.DEG2RAD * this.rangeMapVerticalDown.map(-pitch);
      } else {
        _eulerA22.x = THREE143.MathUtils.DEG2RAD * this.rangeMapVerticalUp.map(pitch);
      }
      if (yaw < 0) {
        _eulerA22.y = -THREE143.MathUtils.DEG2RAD * this.rangeMapHorizontalInner.map(-yaw);
      } else {
        _eulerA22.y = THREE143.MathUtils.DEG2RAD * this.rangeMapHorizontalOuter.map(yaw);
      }
      _quatA62.setFromEuler(_eulerA22);
      this._getWorldFaceFrontQuat(_quatB33);
      leftEyeNormalized.quaternion.copy(_quatB33).multiply(_quatA62).multiply(_quatB33.invert());
      _quatA62.copy(this._restLeftEyeParentWorldQuat);
      leftEye.quaternion.copy(leftEyeNormalized.quaternion).multiply(_quatA62).premultiply(_quatA62.invert()).multiply(this._restQuatLeftEye);
    }
    if (rightEye) {
      if (pitch < 0) {
        _eulerA22.x = -THREE143.MathUtils.DEG2RAD * this.rangeMapVerticalDown.map(-pitch);
      } else {
        _eulerA22.x = THREE143.MathUtils.DEG2RAD * this.rangeMapVerticalUp.map(pitch);
      }
      if (yaw < 0) {
        _eulerA22.y = -THREE143.MathUtils.DEG2RAD * this.rangeMapHorizontalOuter.map(-yaw);
      } else {
        _eulerA22.y = THREE143.MathUtils.DEG2RAD * this.rangeMapHorizontalInner.map(yaw);
      }
      _quatA62.setFromEuler(_eulerA22);
      this._getWorldFaceFrontQuat(_quatB33);
      rightEyeNormalized.quaternion.copy(_quatB33).multiply(_quatA62).multiply(_quatB33.invert());
      _quatA62.copy(this._restRightEyeParentWorldQuat);
      rightEye.quaternion.copy(rightEyeNormalized.quaternion).multiply(_quatA62).premultiply(_quatA62.invert()).multiply(this._restQuatRightEye);
    }
  }
  /**
   * @deprecated Use {@link applyYawPitch} instead.
   */
  lookAt(euler) {
    console.warn("VRMLookAtBoneApplier: lookAt() is deprecated. use apply() instead.");
    const yaw = THREE143.MathUtils.RAD2DEG * euler.y;
    const pitch = THREE143.MathUtils.RAD2DEG * euler.x;
    this.applyYawPitch(yaw, pitch);
  }
  /**
   * Get a quaternion that rotates the world-space +Z unit vector to the {@link faceFront} direction.
   *
   * @param target A target `THREE.Quaternion`
   */
  _getWorldFaceFrontQuat(target) {
    if (this.faceFront.distanceToSquared(VEC3_POSITIVE_Z22) < 0.01) {
      return target.identity();
    }
    const [faceFrontAzimuth, faceFrontAltitude] = calcAzimuthAltitude2(this.faceFront);
    _eulerA22.set(0, 0.5 * Math.PI + faceFrontAzimuth, faceFrontAltitude, "YZX");
    return target.setFromEuler(_eulerA22);
  }
};
VRMLookAtBoneApplier2.type = "bone";
var VRMLookAtExpressionApplier2 = class {
  /**
   * Create a new {@link VRMLookAtExpressionApplier}.
   *
   * @param expressions A {@link VRMExpressionManager}
   * @param rangeMapHorizontalInner A {@link VRMLookAtRangeMap} used for inner transverse direction
   * @param rangeMapHorizontalOuter A {@link VRMLookAtRangeMap} used for outer transverse direction
   * @param rangeMapVerticalDown A {@link VRMLookAtRangeMap} used for down direction
   * @param rangeMapVerticalUp A {@link VRMLookAtRangeMap} used for up direction
   */
  constructor(expressions, rangeMapHorizontalInner, rangeMapHorizontalOuter, rangeMapVerticalDown, rangeMapVerticalUp) {
    this.expressions = expressions;
    this.rangeMapHorizontalInner = rangeMapHorizontalInner;
    this.rangeMapHorizontalOuter = rangeMapHorizontalOuter;
    this.rangeMapVerticalDown = rangeMapVerticalDown;
    this.rangeMapVerticalUp = rangeMapVerticalUp;
  }
  /**
   * Apply the input angle to its associated VRM model.
   *
   * @param yaw Rotation around Y axis, in degree
   * @param pitch Rotation around X axis, in degree
   */
  applyYawPitch(yaw, pitch) {
    if (pitch < 0) {
      this.expressions.setValue("lookDown", 0);
      this.expressions.setValue("lookUp", this.rangeMapVerticalUp.map(-pitch));
    } else {
      this.expressions.setValue("lookUp", 0);
      this.expressions.setValue("lookDown", this.rangeMapVerticalDown.map(pitch));
    }
    if (yaw < 0) {
      this.expressions.setValue("lookLeft", 0);
      this.expressions.setValue("lookRight", this.rangeMapHorizontalOuter.map(-yaw));
    } else {
      this.expressions.setValue("lookRight", 0);
      this.expressions.setValue("lookLeft", this.rangeMapHorizontalOuter.map(yaw));
    }
  }
  /**
   * @deprecated Use {@link applyYawPitch} instead.
   */
  lookAt(euler) {
    console.warn("VRMLookAtBoneApplier: lookAt() is deprecated. use apply() instead.");
    const yaw = THREE152.MathUtils.RAD2DEG * euler.y;
    const pitch = THREE152.MathUtils.RAD2DEG * euler.x;
    this.applyYawPitch(yaw, pitch);
  }
};
VRMLookAtExpressionApplier2.type = "expression";
var RAD2DEG = 180 / Math.PI;
var _eulerA32 = /* @__PURE__ */ new THREE172.Euler();
var VRMLookAtQuaternionProxy = class extends THREE172.Object3D {
  constructor(lookAt) {
    super();
    this.vrmLookAt = lookAt;
    this.type = "VRMLookAtQuaternionProxy";
    const prevRotationOnChangeCallback = this.rotation._onChangeCallback;
    this.rotation._onChange(() => {
      prevRotationOnChangeCallback();
      this._applyToLookAt();
    });
    const prevQuaternionOnChangeCallback = this.quaternion._onChangeCallback;
    this.quaternion._onChange(() => {
      prevQuaternionOnChangeCallback();
      this._applyToLookAt();
    });
  }
  _applyToLookAt() {
    _eulerA32.setFromQuaternion(this.quaternion, VRMLookAt2.EULER_ORDER);
    this.vrmLookAt.yaw = RAD2DEG * _eulerA32.y;
    this.vrmLookAt.pitch = RAD2DEG * _eulerA32.x;
  }
};
function createVRMAnimationHumanoidTracks(vrmAnimation, humanoid, metaVersion) {
  var _a2, _b2;
  const translation = /* @__PURE__ */ new Map();
  const rotation = /* @__PURE__ */ new Map();
  for (const [name, origTrack] of vrmAnimation.humanoidTracks.rotation.entries()) {
    const nodeName = (_a2 = humanoid.getNormalizedBoneNode(name)) == null ? void 0 : _a2.name;
    if (nodeName != null) {
      const track = new THREE182.QuaternionKeyframeTrack(
        `${nodeName}.quaternion`,
        origTrack.times,
        origTrack.values.map((v, i) => metaVersion === "0" && i % 2 === 0 ? -v : v)
      );
      rotation.set(name, track);
    }
  }
  for (const [name, origTrack] of vrmAnimation.humanoidTracks.translation.entries()) {
    const nodeName = (_b2 = humanoid.getNormalizedBoneNode(name)) == null ? void 0 : _b2.name;
    if (nodeName != null) {
      const animationY = vrmAnimation.restHipsPosition.y;
      const humanoidY = humanoid.normalizedRestPose.hips.position[1];
      const scale = humanoidY / animationY;
      const track = origTrack.clone();
      track.values = track.values.map((v, i) => (metaVersion === "0" && i % 3 !== 1 ? -v : v) * scale);
      track.name = `${nodeName}.position`;
      translation.set(name, track);
    }
  }
  return { translation, rotation };
}
function createVRMAnimationExpressionTracks(vrmAnimation, expressionManager) {
  const preset = /* @__PURE__ */ new Map();
  const custom = /* @__PURE__ */ new Map();
  for (const [name, origTrack] of vrmAnimation.expressionTracks.preset.entries()) {
    const trackName = expressionManager.getExpressionTrackName(name);
    if (trackName != null) {
      const track = origTrack.clone();
      track.name = trackName;
      preset.set(name, track);
    }
  }
  for (const [name, origTrack] of vrmAnimation.expressionTracks.custom.entries()) {
    const trackName = expressionManager.getExpressionTrackName(name);
    if (trackName != null) {
      const track = origTrack.clone();
      track.name = trackName;
      custom.set(name, track);
    }
  }
  return { preset, custom };
}
function createVRMAnimationLookAtTrack(vrmAnimation, trackName) {
  if (vrmAnimation.lookAtTrack == null) {
    return null;
  }
  const track = vrmAnimation.lookAtTrack.clone();
  track.name = trackName;
  return track;
}
function createVRMAnimationClip(vrmAnimation, vrm) {
  const tracks = [];
  const humanoidTracks = createVRMAnimationHumanoidTracks(vrmAnimation, vrm.humanoid, vrm.meta.metaVersion);
  tracks.push(...humanoidTracks.translation.values());
  tracks.push(...humanoidTracks.rotation.values());
  if (vrm.expressionManager != null) {
    const expressionTracks = createVRMAnimationExpressionTracks(vrmAnimation, vrm.expressionManager);
    tracks.push(...expressionTracks.preset.values());
    tracks.push(...expressionTracks.custom.values());
  }
  if (vrm.lookAt != null) {
    let proxy = vrm.scene.children.find((obj) => obj instanceof VRMLookAtQuaternionProxy);
    if (proxy == null) {
      console.warn(
        "createVRMAnimationClip: VRMLookAtQuaternionProxy is not found. Creating a new one automatically. To suppress this warning, create a VRMLookAtQuaternionProxy manually"
      );
      proxy = new VRMLookAtQuaternionProxy(vrm.lookAt);
      proxy.name = "VRMLookAtQuaternionProxy";
      vrm.scene.add(proxy);
    } else if (proxy.name === "") {
      console.warn(
        "createVRMAnimationClip: VRMLookAtQuaternionProxy is found but its name is not set. Setting the name automatically. To suppress this warning, set the name manually"
      );
      proxy.name = "VRMLookAtQuaternionProxy";
    }
    const track = createVRMAnimationLookAtTrack(vrmAnimation, `${proxy.name}.quaternion`);
    if (track != null) {
      tracks.push(track);
    }
  }
  return new THREE182.AnimationClip("Clip", vrmAnimation.duration, tracks);
}
var VRMAnimation = class {
  constructor() {
    this.duration = 0;
    this.restHipsPosition = new THREE192.Vector3();
    this.humanoidTracks = {
      translation: /* @__PURE__ */ new Map(),
      rotation: /* @__PURE__ */ new Map()
    };
    this.expressionTracks = {
      preset: /* @__PURE__ */ new Map(),
      custom: /* @__PURE__ */ new Map()
    };
    this.lookAtTrack = null;
  }
};
function arrayChunk(array, every) {
  const N = array.length;
  const ret = [];
  let current = [];
  let remaining = 0;
  for (let i = 0; i < N; i++) {
    const el = array[i];
    if (remaining <= 0) {
      remaining = every;
      current = [];
      ret.push(current);
    }
    current.push(el);
    remaining--;
  }
  return ret;
}
var MAT4_IDENTITY = /* @__PURE__ */ new THREE202.Matrix4();
var _v3A63 = /* @__PURE__ */ new THREE202.Vector3();
var _quatA72 = /* @__PURE__ */ new THREE202.Quaternion();
var _quatB42 = /* @__PURE__ */ new THREE202.Quaternion();
var _quatC22 = /* @__PURE__ */ new THREE202.Quaternion();
var POSSIBLE_SPEC_VERSIONS22 = /* @__PURE__ */ new Set(["1.0", "1.0-draft"]);
var vrmExpressionPresetNameSet = /* @__PURE__ */ new Set(Object.values(VRMExpressionPresetName2));
var VRMAnimationLoaderPlugin = class {
  constructor(parser) {
    this.parser = parser;
  }
  get name() {
    return "VRMC_vrm_animation";
  }
  afterRoot(gltf) {
    return __async8(this, null, function* () {
      var _a2, _b2, _c;
      const defGltf = gltf.parser.json;
      const defExtensionsUsed = defGltf.extensionsUsed;
      if (defExtensionsUsed == null || defExtensionsUsed.indexOf(this.name) == -1) {
        return;
      }
      const defExtension = (_a2 = defGltf.extensions) == null ? void 0 : _a2[this.name];
      if (defExtension == null) {
        return;
      }
      const specVersion = defExtension.specVersion;
      if (specVersion == null) {
        console.warn(
          "VRMAnimationLoaderPlugin: specVersion of the VRMA is not defined. Consider updating the animation file. Assuming the spec version is 1.0."
        );
      } else {
        if (!POSSIBLE_SPEC_VERSIONS22.has(specVersion)) {
          console.warn(`VRMAnimationLoaderPlugin: Unknown VRMC_vrm_animation spec version: ${specVersion}`);
          return;
        }
        if (specVersion === "1.0-draft") {
          console.warn(
            "VRMAnimationLoaderPlugin: Using a draft spec version: 1.0-draft. Some behaviors may be different. Consider updating the animation file."
          );
        }
      }
      const nodeMap = this._createNodeMap(defExtension);
      const worldMatrixMap = yield this._createBoneWorldMatrixMap(gltf, defExtension);
      const hipsNode = (_c = (_b2 = defExtension.humanoid) == null ? void 0 : _b2.humanBones["hips"]) == null ? void 0 : _c.node;
      const hips = hipsNode != null ? yield gltf.parser.getDependency("node", hipsNode) : null;
      const restHipsPosition = new THREE202.Vector3();
      hips == null ? void 0 : hips.getWorldPosition(restHipsPosition);
      if (restHipsPosition.y < 1e-3) {
        console.warn(
          "VRMAnimationLoaderPlugin: The loaded VRM Animation might violate the VRM T-pose (The y component of the rest hips position is approximately zero or below.)"
        );
      }
      const clips = gltf.animations;
      const animations = clips.map((clip, iAnimation) => {
        const defAnimation = defGltf.animations[iAnimation];
        const animation = this._parseAnimation(clip, defAnimation, nodeMap, worldMatrixMap);
        animation.restHipsPosition = restHipsPosition;
        return animation;
      });
      gltf.userData.vrmAnimations = animations;
    });
  }
  _createNodeMap(defExtension) {
    var _a2, _b2, _c, _d2, _e;
    const humanoidIndexToName = /* @__PURE__ */ new Map();
    const expressionsIndexToName = /* @__PURE__ */ new Map();
    const humanBones = (_a2 = defExtension.humanoid) == null ? void 0 : _a2.humanBones;
    if (humanBones) {
      Object.entries(humanBones).forEach(([name, bone]) => {
        const node = bone == null ? void 0 : bone.node;
        if (node != null) {
          humanoidIndexToName.set(node, name);
        }
      });
    }
    const preset = (_b2 = defExtension.expressions) == null ? void 0 : _b2.preset;
    if (preset) {
      Object.entries(preset).forEach(([name, expression]) => {
        const node = expression == null ? void 0 : expression.node;
        if (node != null) {
          expressionsIndexToName.set(node, name);
        }
      });
    }
    const custom = (_c = defExtension.expressions) == null ? void 0 : _c.custom;
    if (custom) {
      Object.entries(custom).forEach(([name, expression]) => {
        const { node } = expression;
        expressionsIndexToName.set(node, name);
      });
    }
    const lookAtIndex = (_e = (_d2 = defExtension.lookAt) == null ? void 0 : _d2.node) != null ? _e : null;
    return { humanoidIndexToName, expressionsIndexToName, lookAtIndex };
  }
  _createBoneWorldMatrixMap(gltf, defExtension) {
    return __async8(this, null, function* () {
      var _a2, _b2;
      gltf.scene.updateWorldMatrix(false, true);
      const threeNodes = yield gltf.parser.getDependencies("node");
      const worldMatrixMap = /* @__PURE__ */ new Map();
      if (defExtension.humanoid == null) {
        return worldMatrixMap;
      }
      for (const [boneName, humanBone] of Object.entries(defExtension.humanoid.humanBones)) {
        const node = humanBone == null ? void 0 : humanBone.node;
        if (node != null) {
          const threeNode = threeNodes[node];
          worldMatrixMap.set(boneName, threeNode.matrixWorld);
          if (boneName === "hips") {
            worldMatrixMap.set("hipsParent", (_b2 = (_a2 = threeNode.parent) == null ? void 0 : _a2.matrixWorld) != null ? _b2 : MAT4_IDENTITY);
          }
        }
      }
      return worldMatrixMap;
    });
  }
  _parseAnimation(animationClip, defAnimation, nodeMap, worldMatrixMap) {
    const tracks = animationClip.tracks;
    const defChannels = defAnimation.channels;
    const result = new VRMAnimation();
    result.duration = animationClip.duration;
    defChannels.forEach((channel, iChannel) => {
      const { node, path } = channel.target;
      const origTrack = tracks[iChannel];
      if (node == null) {
        return;
      }
      const boneName = nodeMap.humanoidIndexToName.get(node);
      if (boneName != null) {
        let parentBoneName = VRMHumanBoneParentMap2[boneName];
        while (parentBoneName != null && worldMatrixMap.get(parentBoneName) == null) {
          parentBoneName = VRMHumanBoneParentMap2[parentBoneName];
        }
        if (parentBoneName == null) {
          parentBoneName = "hipsParent";
        }
        if (path === "translation") {
          if (boneName !== "hips") {
            console.warn(
              `The loading animation contains a translation track for ${boneName}, which is not permitted in the VRMC_vrm_animation spec. ignoring the track`
            );
          } else {
            const hipsParentWorldMatrix = worldMatrixMap.get("hipsParent");
            const trackValues = arrayChunk(origTrack.values, 3).flatMap(
              (v) => _v3A63.fromArray(v).applyMatrix4(hipsParentWorldMatrix).toArray()
            );
            const track = origTrack.clone();
            track.values = new Float32Array(trackValues);
            result.humanoidTracks.translation.set(boneName, track);
          }
        } else if (path === "rotation") {
          const worldMatrix = worldMatrixMap.get(boneName);
          const parentWorldMatrix = worldMatrixMap.get(parentBoneName);
          worldMatrix.decompose(_v3A63, _quatA72, _v3A63);
          _quatA72.invert();
          parentWorldMatrix.decompose(_v3A63, _quatB42, _v3A63);
          const trackValues = arrayChunk(origTrack.values, 4).flatMap(
            (q) => _quatC22.fromArray(q).premultiply(_quatB42).multiply(_quatA72).toArray()
          );
          const track = origTrack.clone();
          track.values = new Float32Array(trackValues);
          result.humanoidTracks.rotation.set(boneName, track);
        } else {
          throw new Error(`Invalid path "${path}"`);
        }
        return;
      }
      const expressionName = nodeMap.expressionsIndexToName.get(node);
      if (expressionName != null) {
        if (path === "translation") {
          const times = origTrack.times;
          const values = new Float32Array(origTrack.values.length / 3);
          for (let i = 0; i < values.length; i++) {
            values[i] = origTrack.values[3 * i];
          }
          const newTrack = new THREE202.NumberKeyframeTrack(`${expressionName}.weight`, times, values);
          if (vrmExpressionPresetNameSet.has(expressionName)) {
            result.expressionTracks.preset.set(expressionName, newTrack);
          } else {
            result.expressionTracks.custom.set(expressionName, newTrack);
          }
        } else {
          throw new Error(`Invalid path "${path}"`);
        }
        return;
      }
      if (node === nodeMap.lookAtIndex) {
        if (path === "rotation") {
          result.lookAtTrack = origTrack;
        } else {
          throw new Error(`Invalid path "${path}"`);
        }
      }
    });
    return result;
  }
};

// packages/npc-core/src/types.ts
var TIME_EPSILON_MS = 1e-6;

// packages/npc-core/src/clock/sim-clock.ts
var EPSILON_MS = 1e-9;
var SimClock = class {
  stepHz;
  stepMs;
  maxCatchUpSteps;
  simTimeMs = 0;
  pendingMs = 0;
  droppedTotalMs = 0;
  constructor(options = {}) {
    const hz = options.stepHz ?? 60;
    const cap = options.maxCatchUpSteps ?? 15;
    if (!Number.isFinite(hz) || hz <= 0 || hz > 1e3) {
      throw new Error(`SimClock: stepHz must be in (0, 1000], got ${String(hz)}`);
    }
    if (!Number.isInteger(cap) || cap < 1) {
      throw new Error(`SimClock: maxCatchUpSteps must be an integer >= 1, got ${String(cap)}`);
    }
    this.stepHz = hz;
    this.stepMs = 1e3 / hz;
    this.maxCatchUpSteps = cap;
  }
  get timeMs() {
    return this.simTimeMs;
  }
  get totalDroppedMs() {
    return this.droppedTotalMs;
  }
  /**
   * Feed real elapsed milliseconds and receive whole simulation steps.
   * Negative or non-finite deltas are programming errors, not input to absorb.
   */
  advance(realDeltaMs) {
    if (!Number.isFinite(realDeltaMs) || realDeltaMs < 0) {
      throw new Error(`SimClock: delta must be a finite non-negative number, got ${String(realDeltaMs)}`);
    }
    this.pendingMs += realDeltaMs;
    let steps = 0;
    while (this.pendingMs + EPSILON_MS >= this.stepMs && steps < this.maxCatchUpSteps) {
      this.pendingMs -= this.stepMs;
      if (this.pendingMs < 0) this.pendingMs = 0;
      this.simTimeMs += this.stepMs;
      steps += 1;
    }
    let droppedMs = 0;
    if (this.pendingMs + EPSILON_MS >= this.stepMs) {
      const whole = Math.floor(this.pendingMs / this.stepMs);
      droppedMs = whole * this.stepMs;
      this.pendingMs -= droppedMs;
      this.droppedTotalMs += droppedMs;
    }
    const alpha = Math.min(Math.max(this.pendingMs / this.stepMs, 0), 1 - Number.EPSILON);
    return {
      steps,
      simTimeMs: this.simTimeMs,
      droppedMs,
      lagMs: droppedMs + this.pendingMs,
      alpha
    };
  }
};

// packages/npc-core/src/domain/config.ts
var DEFAULT_AUTONOMY_GOALS = ["idle", "lookAround"];
function resolveConfig(worldId, input = {}) {
  const config = {
    worldId,
    idleCooldownMs: input.idleCooldownMs ?? 3e4,
    heartbeatStaleAfterMs: input.heartbeatStaleAfterMs ?? 8e3,
    minDwellMs: input.minDwellMs ?? 1e4,
    hysteresisScore: input.hysteresisScore ?? 0.15,
    autonomyIntervalMs: input.autonomyIntervalMs ?? 12e4,
    autonomyScores: {
      idle: input.autonomyScores?.idle ?? 0.5,
      lookAround: input.autonomyScores?.lookAround ?? 0.7,
      rest: input.autonomyScores?.rest ?? 0.35
    },
    enabledAutonomyGoals: [...input.enabledAutonomyGoals ?? DEFAULT_AUTONOMY_GOALS],
    allowSleep: input.allowSleep ?? false,
    requireLivenessForAutonomy: input.requireLivenessForAutonomy ?? true,
    maxActionHistory: input.maxActionHistory ?? 64,
    maxOpenActions: input.maxOpenActions ?? 4,
    maxGoalHistory: input.maxGoalHistory ?? 32,
    maxActors: input.maxActors ?? 16,
    maxTerminalRecordsPerScope: input.maxTerminalRecordsPerScope ?? 512,
    terminalRecordRetentionMs: input.terminalRecordRetentionMs ?? 3e5,
    tombstoneRetentionMs: input.tombstoneRetentionMs ?? 9e5,
    maxTombstoneRecords: input.maxTombstoneRecords ?? 1024,
    maxCommandRecords: input.maxCommandRecords ?? 256,
    commandRetentionMs: input.commandRetentionMs ?? 6e5,
    factDedupeLimit: input.factDedupeLimit ?? 8192,
    eventHistoryLimit: input.eventHistoryLimit ?? 2e4
  };
  if (config.idleCooldownMs < 0) throw new Error("idleCooldownMs must be >= 0");
  if (config.minDwellMs < 0) throw new Error("minDwellMs must be >= 0");
  if (config.hysteresisScore < 0) throw new Error("hysteresisScore must be >= 0");
  if (config.heartbeatStaleAfterMs <= 0) throw new Error("heartbeatStaleAfterMs must be > 0");
  if (config.autonomyIntervalMs < 0) throw new Error("autonomyIntervalMs must be >= 0");
  if (config.eventHistoryLimit < 1) throw new Error("eventHistoryLimit must be >= 1");
  if (config.maxGoalHistory < 1 || config.maxActionHistory < 1) throw new Error("history limits must be >= 1");
  if (!Number.isInteger(config.maxOpenActions) || config.maxOpenActions < 1) {
    throw new Error("maxOpenActions must be an integer >= 1");
  }
  if (!Number.isInteger(config.maxActors) || config.maxActors < 1) throw new Error("maxActors must be an integer >= 1");
  if (!Number.isInteger(config.maxTerminalRecordsPerScope) || config.maxTerminalRecordsPerScope < 1) {
    throw new Error("maxTerminalRecordsPerScope must be an integer >= 1");
  }
  if (config.terminalRecordRetentionMs < 0) throw new Error("terminalRecordRetentionMs must be >= 0");
  if (config.tombstoneRetentionMs < config.terminalRecordRetentionMs) {
    throw new Error("tombstoneRetentionMs must be >= terminalRecordRetentionMs");
  }
  if (!Number.isInteger(config.maxTombstoneRecords) || config.maxTombstoneRecords < 1) {
    throw new Error("maxTombstoneRecords must be an integer >= 1");
  }
  if (!Number.isInteger(config.maxCommandRecords) || config.maxCommandRecords < 1) {
    throw new Error("maxCommandRecords must be an integer >= 1");
  }
  if (config.commandRetentionMs < 0) throw new Error("commandRetentionMs must be >= 0");
  if (!Number.isInteger(config.factDedupeLimit) || config.factDedupeLimit < 1) {
    throw new Error("factDedupeLimit must be an integer >= 1");
  }
  if (config.allowSleep) {
    throw new Error("sleep is not implemented in v1; allowSleep must stay false");
  }
  return config;
}

// packages/npc-core/src/domain/idmap.ts
function createIdMap() {
  return /* @__PURE__ */ Object.create(null);
}
function copyIdMap(source) {
  const out = createIdMap();
  for (const key of Object.keys(source)) writeId(out, key, source[key]);
  return out;
}
function hasId(map, key) {
  return Object.hasOwn(map, key);
}
function readId(map, key) {
  return Object.hasOwn(map, key) ? map[key] : void 0;
}
function writeId(map, key, value) {
  Object.defineProperty(map, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true
  });
}
function deleteId(map, key) {
  if (Object.hasOwn(map, key)) delete map[key];
}

// packages/npc-core/src/domain/state.ts
function emptyGoalState() {
  return {
    active: null,
    winner: null,
    interrupt: null,
    heldReason: null,
    candidates: [],
    suppressed: [],
    history: [],
    expired: []
  };
}
function createActorState(actorId) {
  return {
    actorId,
    presence: { status: "unknown", lastHeartbeatWallMs: null, heartbeatCount: 0, samples: [] },
    sources: createIdMap(),
    tools: createIdMap(),
    runs: createIdMap(),
    speeches: createIdMap(),
    commands: createIdMap(),
    activity: { lastActiveSimMs: null, workActive: false },
    goal: emptyGoalState(),
    manual: null,
    safety: null,
    actions: createIdMap(),
    actionOrder: [],
    posture: "standing",
    tombstones: createIdMap(),
    tombstoneOrder: [],
    tombstoneSweptSimMs: 0,
    counters: {
      lateStartsIgnored: 0,
      manualExpired: 0,
      commandsExpired: 0
    }
  };
}
function createInitialState(config, actors = []) {
  const unique = [...new Set(actors)];
  if (unique.length > config.maxActors) {
    throw new Error(`createInitialState: ${unique.length} actors exceed maxActors ${config.maxActors}`);
  }
  const state = {
    worldId: config.worldId,
    revision: 0,
    factsRevision: 0,
    simTimeMs: 0,
    wallTimeMs: 0,
    config,
    actorOrder: unique,
    actors: createIdMap(),
    worldPaused: false
  };
  for (const id of unique) writeId(state.actors, id, createActorState(id));
  return deepFreeze(state);
}
function cloneActorState(actor) {
  const sources = createIdMap();
  for (const [source, src] of Object.entries(actor.sources)) {
    writeId(sources, source, { ...src, retiredEpochs: [...src.retiredEpochs] });
  }
  return {
    actorId: actor.actorId,
    presence: { ...actor.presence },
    sources,
    tools: copyIdMap(actor.tools),
    runs: copyIdMap(actor.runs),
    speeches: copyIdMap(actor.speeches),
    commands: copyIdMap(actor.commands),
    activity: { ...actor.activity },
    goal: {
      active: actor.goal.active ? { ...actor.goal.active } : null,
      winner: actor.goal.winner ? { ...actor.goal.winner } : null,
      interrupt: actor.goal.interrupt ? { ...actor.goal.interrupt } : null,
      heldReason: actor.goal.heldReason,
      candidates: [...actor.goal.candidates],
      suppressed: [...actor.goal.suppressed],
      history: [...actor.goal.history],
      expired: [...actor.goal.expired]
    },
    manual: actor.manual ? { ...actor.manual } : null,
    safety: actor.safety ? { ...actor.safety } : null,
    actions: copyIdMap(actor.actions),
    actionOrder: [...actor.actionOrder],
    posture: actor.posture,
    // Tombstones are shared until a write: they are the largest bounded
    // collection and rarely change once the cap is reached.
    tombstones: actor.tombstones,
    tombstoneOrder: actor.tombstoneOrder,
    tombstoneSweptSimMs: actor.tombstoneSweptSimMs,
    counters: { ...actor.counters }
  };
}
function beginActor(state, actorId, maxActors) {
  const existing = readId(state.actors, actorId);
  if (existing) {
    const copy = cloneActorState(existing);
    writeId(state.actors, actorId, copy);
    return copy;
  }
  if (state.actorOrder.length >= maxActors) return null;
  const created = createActorState(actorId);
  writeId(state.actors, actorId, created);
  state.actorOrder.push(actorId);
  return created;
}
function mutableActor(state, actorId) {
  const existing = readId(state.actors, actorId);
  if (!existing) return void 0;
  const copy = cloneActorState(existing);
  writeId(state.actors, actorId, copy);
  return copy;
}
function deepFreeze(value) {
  if (value === null || typeof value !== "object") return value;
  if (Object.isFrozen(value)) return value;
  Object.freeze(value);
  if (Array.isArray(value)) {
    for (const item of value) deepFreeze(item);
    return value;
  }
  for (const key of Object.keys(value)) {
    deepFreeze(value[key]);
  }
  return value;
}

// packages/npc-core/src/domain/keys.ts
var SEP = "";
function scopeKey(source, sourceEpoch, sessionId) {
  return [source, sourceEpoch, sessionId ?? ""].join(SEP);
}
function toolKey(source, epoch, sessionId, toolCallId) {
  return scopeKey(source, epoch, sessionId) + SEP + toolCallId;
}
function runKey(source, epoch, sessionId, runId) {
  return scopeKey(source, epoch, sessionId) + SEP + runId;
}
function speechKey(source, epoch, sessionId, speechId) {
  return scopeKey(source, epoch, sessionId) + SEP + speechId;
}
function factDedupeKey(source, sourceEpoch, eventId) {
  return [source, sourceEpoch, eventId].join(SEP);
}

// packages/npc-core/src/domain/retention.ts
var TOMBSTONE_SWEEP_MS = 3e4;
var BATCH_THRESHOLD = 8;
function mutableTombstoneMaps(actor) {
  if (Object.isFrozen(actor.tombstones)) {
    actor.tombstones = copyIdMap(actor.tombstones);
    actor.tombstoneOrder = [...actor.tombstoneOrder];
  }
}
function addTombstone(actor, key, at, config) {
  if (hasId(actor.tombstones, key)) return;
  mutableTombstoneMaps(actor);
  writeId(actor.tombstones, key, at);
  actor.tombstoneOrder.push(key);
  while (actor.tombstoneOrder.length > config.maxTombstoneRecords) {
    const oldest = actor.tombstoneOrder.shift();
    if (oldest === void 0) break;
    deleteId(actor.tombstones, oldest);
  }
}
function retainMap(records, actor, config, nowSimMs) {
  const cutoff = nowSimMs - config.terminalRecordRetentionMs;
  const scopes = /* @__PURE__ */ new Map();
  for (const key of Object.keys(records)) {
    const rec = readId(records, key);
    if (!rec || rec.phase !== "terminal") continue;
    const scope = scopeKey(rec.source, rec.sourceEpoch, rec.sessionId);
    const ended = rec.endedSimMs ?? nowSimMs;
    const stat = scopes.get(scope);
    if (stat) {
      stat.count += 1;
      if (ended < stat.oldestAt) {
        stat.oldestAt = ended;
        stat.oldestKey = key;
      }
      if (ended < cutoff) (stat.oldKeys ??= []).push(key);
    } else {
      scopes.set(scope, {
        count: 1,
        oldestKey: key,
        oldestAt: ended,
        oldKeys: ended < cutoff ? [key] : null
      });
    }
  }
  for (const [scope, stat] of scopes) {
    let remaining = stat.count;
    if (stat.oldKeys) {
      for (const key of stat.oldKeys) {
        const rec = readId(records, key);
        if (!rec) continue;
        addTombstone(actor, key, rec.endedSimMs ?? nowSimMs, config);
        deleteId(records, key);
        remaining -= 1;
      }
    }
    if (remaining <= config.maxTerminalRecordsPerScope) continue;
    const excess = remaining - config.maxTerminalRecordsPerScope;
    if (excess > BATCH_THRESHOLD) {
      const entries = [];
      for (const key of Object.keys(records)) {
        const rec = readId(records, key);
        if (!rec || rec.phase !== "terminal") continue;
        if (scopeKey(rec.source, rec.sourceEpoch, rec.sessionId) !== scope) continue;
        entries.push({ key, endedAt: rec.endedSimMs ?? nowSimMs });
      }
      entries.sort((a, b) => a.endedAt - b.endedAt);
      for (const entry of entries.slice(0, excess)) {
        addTombstone(actor, entry.key, entry.endedAt, config);
        deleteId(records, entry.key);
      }
      continue;
    }
    for (let i = 0; i < excess; i += 1) {
      let oldestKey = null;
      let oldestAt = Number.POSITIVE_INFINITY;
      for (const key of Object.keys(records)) {
        const rec = readId(records, key);
        if (!rec || rec.phase !== "terminal") continue;
        if (scopeKey(rec.source, rec.sourceEpoch, rec.sessionId) !== scope) continue;
        const ended = rec.endedSimMs ?? nowSimMs;
        if (ended < oldestAt) {
          oldestAt = ended;
          oldestKey = key;
        }
      }
      if (oldestKey === null) break;
      addTombstone(actor, oldestKey, oldestAt, config);
      deleteId(records, oldestKey);
    }
  }
}
function pruneToolRecords(actor, config, nowSimMs) {
  retainMap(actor.tools, actor, config, nowSimMs);
}
function pruneRunRecords(actor, config, nowSimMs) {
  retainMap(actor.runs, actor, config, nowSimMs);
}
function pruneSpeechRecords(actor, config, nowSimMs) {
  retainMap(actor.speeches, actor, config, nowSimMs);
}
function sweepTombstones(actor, config, nowSimMs) {
  if (nowSimMs - actor.tombstoneSweptSimMs < TOMBSTONE_SWEEP_MS) return;
  actor.tombstoneSweptSimMs = nowSimMs;
  const cutoff = nowSimMs - config.tombstoneRetentionMs;
  let changed = false;
  const keep = [];
  for (const key of actor.tombstoneOrder) {
    const at = readId(actor.tombstones, key);
    if (at === void 0) continue;
    if (at < cutoff) {
      changed = true;
      continue;
    }
    keep.push(key);
  }
  if (!changed) return;
  mutableTombstoneMaps(actor);
  const kept = new Set(keep);
  for (const key of Object.keys(actor.tombstones)) {
    if (!kept.has(key)) deleteId(actor.tombstones, key);
  }
  actor.tombstoneOrder = keep;
}
function pruneCommandRecords(actor, config, nowWallMs) {
  const cutoff = nowWallMs - config.commandRetentionMs;
  const terminal = [];
  for (const [id, cmd] of Object.entries(actor.commands)) {
    if (cmd.status === "active") continue;
    terminal.push({ id, at: cmd.expiresAtWallMs ?? cmd.receivedAtWallMs });
  }
  if (terminal.length === 0) return;
  const hasOld = terminal.some((entry) => entry.at < cutoff);
  if (!hasOld && terminal.length <= config.maxCommandRecords) return;
  terminal.sort((a, b) => a.at - b.at);
  let remaining = terminal.length;
  for (const entry of terminal) {
    if (entry.at < cutoff || remaining > config.maxCommandRecords) {
      deleteId(actor.commands, entry.id);
      remaining -= 1;
    }
  }
}
function isPrunedTombstone(actor, key) {
  return hasId(actor.tombstones, key);
}

// packages/npc-core/src/domain/presence.ts
var MAX_HEARTBEAT_SCOPES = 64;
function recordHeartbeat(actor, fact, wallMs) {
  const sessionId = fact.sessionId ?? null;
  const sameScope = (sample) => sample.source === fact.source && sample.epoch === fact.sourceEpoch && sample.sessionId === sessionId;
  const previous = actor.presence.samples.find(sameScope);
  if (previous && fact.sequence <= previous.sequence) return { status: "rejected", reason: "STALE_HEARTBEAT" };
  actor.presence = {
    status: fact.data.status,
    lastHeartbeatWallMs: wallMs,
    heartbeatCount: actor.presence.heartbeatCount + 1,
    heartbeatScope: { source: fact.source, epoch: fact.sourceEpoch, sessionId },
    samples: [...actor.presence.samples.filter((sample) => !sameScope(sample)), {
      source: fact.source,
      epoch: fact.sourceEpoch,
      sessionId,
      sequence: fact.sequence,
      status: fact.data.status,
      receivedAtWallMs: wallMs
    }].slice(-MAX_HEARTBEAT_SCOPES)
  };
  return { status: "applied" };
}

// packages/npc-core/src/domain/facts.ts
var MAX_RETIRED_EPOCHS = 16;
function applyFact(draft, actor, ev, _config) {
  const fact = ev.fact;
  const sourceState = sourceForFact(actor, fact.source, fact.sourceEpoch);
  if (sourceState === "undeclared") return { status: "rejected", reason: "EPOCH_NOT_DECLARED" };
  if (sourceState === "retired") return { status: "rejected", reason: "STALE_EPOCH" };
  sourceState.eventCount += 1;
  if (fact.sequence < sourceState.lastSequence) sourceState.outOfOrderCount += 1;
  if (fact.sequence > sourceState.lastSequence) sourceState.lastSequence = fact.sequence;
  if (fact.type !== "presence.heartbeat") {
    actor.presence = { ...actor.presence, samples: actor.presence.samples.map((sample) => sample.source === fact.source && sample.epoch === fact.sourceEpoch && sample.sessionId === (fact.sessionId ?? null) ? { ...sample, sequence: Math.max(sample.sequence, fact.sequence) } : sample) };
  }
  switch (fact.type) {
    case "presence.heartbeat": {
      return recordHeartbeat(actor, fact, ev.wallMs);
    }
    case "run.started": {
      if (!fact.runId) return { status: "rejected", reason: "MISSING_RUN_ID" };
      return startRun(actor, fact.source, fact.sourceEpoch, fact.sessionId ?? null, fact.runId, ev);
    }
    case "run.completed": {
      if (!fact.runId) return { status: "rejected", reason: "MISSING_RUN_ID" };
      return completeRun(
        actor,
        fact.source,
        fact.sourceEpoch,
        fact.sessionId ?? null,
        fact.runId,
        fact.data.outcome,
        ev
      );
    }
    case "tool.started": {
      return startTool(
        actor,
        fact.source,
        fact.sourceEpoch,
        fact.sessionId ?? null,
        fact.data.toolCallId,
        fact.data.activityClass,
        ev
      );
    }
    case "tool.completed": {
      return completeTool(
        actor,
        fact.source,
        fact.sourceEpoch,
        fact.sessionId ?? null,
        fact.data.toolCallId,
        fact.data.outcome,
        ev
      );
    }
    case "speech.started": {
      return startSpeech(
        actor,
        fact.source,
        fact.sourceEpoch,
        fact.sessionId ?? null,
        fact.data.speechId,
        ev
      );
    }
    case "speech.completed": {
      return completeSpeech(
        actor,
        fact.source,
        fact.sourceEpoch,
        fact.sessionId ?? null,
        fact.data.speechId,
        ev
      );
    }
    default: {
      return { status: "rejected", reason: "UNKNOWN_FACT_TYPE" };
    }
  }
}
function createSource(source, epoch) {
  return {
    source,
    epoch,
    lastSequence: -1,
    eventCount: 0,
    outOfOrderCount: 0,
    retiredEpochs: []
  };
}
function sourceForFact(actor, source, epoch) {
  const current = actor.sources[source];
  if (!current) {
    const created = createSource(source, epoch);
    actor.sources[source] = created;
    return created;
  }
  if (current.epoch === epoch) return current;
  if (current.retiredEpochs.includes(epoch)) return "retired";
  return "undeclared";
}
function adoptSourceEpoch(actor, source, epoch, simMs, wallMs) {
  const current = actor.sources[source];
  if (!current) {
    actor.sources[source] = createSource(source, epoch);
    return { status: "applied" };
  }
  if (current.epoch === epoch) return { status: "noop", reason: "ALREADY_CURRENT_EPOCH" };
  if (current.retiredEpochs.includes(epoch)) return { status: "rejected", reason: "EPOCH_RETIRED" };
  retireEpoch(actor, source, current.epoch, simMs, wallMs);
  current.retiredEpochs = [...current.retiredEpochs, current.epoch].slice(-MAX_RETIRED_EPOCHS);
  current.epoch = epoch;
  current.lastSequence = -1;
  return { status: "applied" };
}
function retireRecords(records, source, epoch, simMs, wallMs) {
  for (const [key, rec] of Object.entries(records)) {
    if (rec.source !== source || rec.sourceEpoch !== epoch || rec.phase !== "active") continue;
    records[key] = {
      ...rec,
      phase: "terminal",
      outcome: "cancelled",
      reason: "epoch_retired",
      endedSimMs: simMs,
      endedWallMs: wallMs
    };
  }
}
function retireEpoch(actor, source, epoch, simMs, wallMs) {
  retireRecords(actor.tools, source, epoch, simMs, wallMs);
  retireRecords(actor.runs, source, epoch, simMs, wallMs);
  retireRecords(actor.speeches, source, epoch, simMs, wallMs);
}
function lookupCounterpart(records, source, epoch, idOf, id, sessionId) {
  let found = null;
  for (const key in records) {
    const rec = records[key];
    if (!rec || rec.source !== source || rec.sourceEpoch !== epoch) continue;
    if (idOf(rec) !== id) continue;
    if (rec.sessionId !== null && sessionId !== null && rec.sessionId !== sessionId) continue;
    if (found) return { kind: "ambiguous" };
    found = { key, rec };
  }
  return found ? { kind: "found", ...found } : { kind: "none" };
}
function lateStartOutcome(existing) {
  return {
    status: "applied",
    reason: existing.tombstoned ? "TOMBSTONED_START" : "ALREADY_COMPLETED"
  };
}
function explicitSessionMismatch(records, source, epoch, idOf, id, sessionId) {
  if (sessionId === null) return false;
  for (const key in records) {
    const rec = records[key];
    if (!rec || rec.source !== source || rec.sourceEpoch !== epoch) continue;
    if (idOf(rec) !== id) continue;
    if (rec.phase !== "active") continue;
    if (rec.sessionId !== null && rec.sessionId !== sessionId) return true;
  }
  return false;
}
function startTool(actor, source, epoch, sessionId, toolCallId, activityClass, ev) {
  const key = toolKey(source, epoch, sessionId, toolCallId);
  const existing = actor.tools[key];
  if (existing) {
    if (existing.phase === "terminal") {
      actor.counters.lateStartsIgnored += 1;
      return lateStartOutcome(existing);
    }
    return { status: "noop", reason: "ALREADY_ACTIVE" };
  }
  if (isPrunedTombstone(actor, key)) {
    actor.counters.lateStartsIgnored += 1;
    return { status: "applied", reason: "TOMBSTONED_START" };
  }
  const counterpart = lookupCounterpart(actor.tools, source, epoch, (rec) => rec.toolCallId, toolCallId, sessionId);
  if (counterpart.kind === "ambiguous") return { status: "rejected", reason: "AMBIGUOUS_SESSION" };
  if (counterpart.kind === "found") {
    if (counterpart.rec.phase === "terminal") {
      actor.counters.lateStartsIgnored += 1;
      return lateStartOutcome(counterpart.rec);
    }
    return { status: "noop", reason: "ALREADY_ACTIVE" };
  }
  actor.tools[key] = {
    key,
    toolCallId,
    source,
    sourceEpoch: epoch,
    sessionId,
    activityClass,
    phase: "active",
    outcome: null,
    reason: null,
    tombstoned: false,
    startedSimMs: ev.simMs,
    endedSimMs: null,
    startedWallMs: ev.wallMs,
    endedWallMs: null
  };
  return { status: "applied" };
}
function completeTool(actor, source, epoch, sessionId, toolCallId, outcome, ev) {
  const key = toolKey(source, epoch, sessionId, toolCallId);
  const existing = actor.tools[key];
  if (existing) {
    if (existing.phase === "terminal") return { status: "noop", reason: "ALREADY_TERMINAL" };
    actor.tools[key] = {
      ...existing,
      phase: "terminal",
      outcome,
      reason: "completed",
      endedSimMs: ev.simMs,
      endedWallMs: ev.wallMs
    };
    return { status: "applied" };
  }
  if (isPrunedTombstone(actor, key)) return { status: "noop", reason: "ALREADY_TERMINAL" };
  const counterpart = lookupCounterpart(actor.tools, source, epoch, (rec) => rec.toolCallId, toolCallId, sessionId);
  if (counterpart.kind === "ambiguous") return { status: "rejected", reason: "AMBIGUOUS_SESSION" };
  if (counterpart.kind === "found") {
    if (counterpart.rec.phase === "terminal") return { status: "noop", reason: "ALREADY_TERMINAL" };
    actor.tools[counterpart.key] = {
      ...counterpart.rec,
      phase: "terminal",
      outcome,
      reason: "completed",
      endedSimMs: ev.simMs,
      endedWallMs: ev.wallMs
    };
    return { status: "applied" };
  }
  if (explicitSessionMismatch(actor.tools, source, epoch, (rec) => rec.toolCallId, toolCallId, sessionId)) {
    return { status: "rejected", reason: "SESSION_MISMATCH" };
  }
  actor.tools[key] = {
    key,
    toolCallId,
    source,
    sourceEpoch: epoch,
    sessionId,
    activityClass: "unknown",
    phase: "terminal",
    outcome,
    reason: "completed_before_start",
    tombstoned: true,
    startedSimMs: null,
    endedSimMs: ev.simMs,
    startedWallMs: null,
    endedWallMs: ev.wallMs
  };
  return { status: "applied" };
}
function startRun(actor, source, epoch, sessionId, runId, ev) {
  const key = runKey(source, epoch, sessionId, runId);
  const existing = actor.runs[key];
  if (existing) {
    if (existing.phase === "terminal") {
      actor.counters.lateStartsIgnored += 1;
      return lateStartOutcome(existing);
    }
    return { status: "noop", reason: "ALREADY_ACTIVE" };
  }
  if (isPrunedTombstone(actor, key)) {
    actor.counters.lateStartsIgnored += 1;
    return { status: "applied", reason: "TOMBSTONED_START" };
  }
  const counterpart = lookupCounterpart(actor.runs, source, epoch, (rec) => rec.runId, runId, sessionId);
  if (counterpart.kind === "ambiguous") return { status: "rejected", reason: "AMBIGUOUS_SESSION" };
  if (counterpart.kind === "found") {
    if (counterpart.rec.phase === "terminal") {
      actor.counters.lateStartsIgnored += 1;
      return lateStartOutcome(counterpart.rec);
    }
    return { status: "noop", reason: "ALREADY_ACTIVE" };
  }
  actor.runs[key] = {
    key,
    runId,
    source,
    sourceEpoch: epoch,
    sessionId,
    phase: "active",
    outcome: null,
    reason: null,
    tombstoned: false,
    startedSimMs: ev.simMs,
    endedSimMs: null,
    startedWallMs: ev.wallMs,
    endedWallMs: null
  };
  return { status: "applied" };
}
function completeRun(actor, source, epoch, sessionId, runId, outcome, ev) {
  const key = runKey(source, epoch, sessionId, runId);
  const existing = actor.runs[key];
  if (existing) {
    if (existing.phase === "terminal") return { status: "noop", reason: "ALREADY_TERMINAL" };
    actor.runs[key] = {
      ...existing,
      phase: "terminal",
      outcome,
      reason: "completed",
      endedSimMs: ev.simMs,
      endedWallMs: ev.wallMs
    };
    return { status: "applied" };
  }
  if (isPrunedTombstone(actor, key)) return { status: "noop", reason: "ALREADY_TERMINAL" };
  const counterpart = lookupCounterpart(actor.runs, source, epoch, (rec) => rec.runId, runId, sessionId);
  if (counterpart.kind === "ambiguous") return { status: "rejected", reason: "AMBIGUOUS_SESSION" };
  if (counterpart.kind === "found") {
    if (counterpart.rec.phase === "terminal") return { status: "noop", reason: "ALREADY_TERMINAL" };
    actor.runs[counterpart.key] = {
      ...counterpart.rec,
      phase: "terminal",
      outcome,
      reason: "completed",
      endedSimMs: ev.simMs,
      endedWallMs: ev.wallMs
    };
    return { status: "applied" };
  }
  if (explicitSessionMismatch(actor.runs, source, epoch, (rec) => rec.runId, runId, sessionId)) {
    return { status: "rejected", reason: "SESSION_MISMATCH" };
  }
  actor.runs[key] = {
    key,
    runId,
    source,
    sourceEpoch: epoch,
    sessionId,
    phase: "terminal",
    outcome,
    reason: "completed_before_start",
    tombstoned: true,
    startedSimMs: null,
    endedSimMs: ev.simMs,
    startedWallMs: null,
    endedWallMs: ev.wallMs
  };
  return { status: "applied" };
}
function startSpeech(actor, source, epoch, sessionId, speechId, ev) {
  const key = speechKey(source, epoch, sessionId, speechId);
  const existing = actor.speeches[key];
  if (existing) {
    if (existing.phase === "terminal") {
      actor.counters.lateStartsIgnored += 1;
      return lateStartOutcome(existing);
    }
    return { status: "noop", reason: "ALREADY_ACTIVE" };
  }
  if (isPrunedTombstone(actor, key)) {
    actor.counters.lateStartsIgnored += 1;
    return { status: "applied", reason: "TOMBSTONED_START" };
  }
  const counterpart = lookupCounterpart(actor.speeches, source, epoch, (rec) => rec.speechId, speechId, sessionId);
  if (counterpart.kind === "ambiguous") return { status: "rejected", reason: "AMBIGUOUS_SESSION" };
  if (counterpart.kind === "found") {
    if (counterpart.rec.phase === "terminal") {
      actor.counters.lateStartsIgnored += 1;
      return lateStartOutcome(counterpart.rec);
    }
    return { status: "noop", reason: "ALREADY_ACTIVE" };
  }
  actor.speeches[key] = {
    key,
    speechId,
    source,
    sourceEpoch: epoch,
    sessionId,
    phase: "active",
    outcome: null,
    reason: null,
    tombstoned: false,
    startedSimMs: ev.simMs,
    endedSimMs: null,
    startedWallMs: ev.wallMs,
    endedWallMs: null
  };
  return { status: "applied" };
}
function completeSpeech(actor, source, epoch, sessionId, speechId, ev) {
  const key = speechKey(source, epoch, sessionId, speechId);
  const existing = actor.speeches[key];
  if (existing) {
    if (existing.phase === "terminal") return { status: "noop", reason: "ALREADY_TERMINAL" };
    actor.speeches[key] = {
      ...existing,
      phase: "terminal",
      outcome: "success",
      reason: "completed",
      endedSimMs: ev.simMs,
      endedWallMs: ev.wallMs
    };
    return { status: "applied" };
  }
  if (isPrunedTombstone(actor, key)) return { status: "noop", reason: "ALREADY_TERMINAL" };
  const counterpart = lookupCounterpart(actor.speeches, source, epoch, (rec) => rec.speechId, speechId, sessionId);
  if (counterpart.kind === "ambiguous") return { status: "rejected", reason: "AMBIGUOUS_SESSION" };
  if (counterpart.kind === "found") {
    if (counterpart.rec.phase === "terminal") return { status: "noop", reason: "ALREADY_TERMINAL" };
    actor.speeches[counterpart.key] = {
      ...counterpart.rec,
      phase: "terminal",
      outcome: "success",
      reason: "completed",
      endedSimMs: ev.simMs,
      endedWallMs: ev.wallMs
    };
    return { status: "applied" };
  }
  if (explicitSessionMismatch(actor.speeches, source, epoch, (rec) => rec.speechId, speechId, sessionId)) {
    return { status: "rejected", reason: "SESSION_MISMATCH" };
  }
  actor.speeches[key] = {
    key,
    speechId,
    source,
    sourceEpoch: epoch,
    sessionId,
    phase: "terminal",
    outcome: "success",
    reason: "completed_before_start",
    tombstoned: true,
    startedSimMs: null,
    endedSimMs: ev.simMs,
    startedWallMs: null,
    endedWallMs: ev.wallMs
  };
  return { status: "applied" };
}

// packages/npc-core/src/goals/layers.ts
var LAYER_RANK = Object.freeze({
  safety: 4,
  manual: 3,
  task: 2,
  autonomy: 1
});
function layerRank(layer) {
  return LAYER_RANK[layer];
}
var GOAL_SCORES = Object.freeze({
  work: 0.7,
  think: 0.68,
  converse: 0.65,
  rest: 0.4,
  idle: 0.5,
  lookAround: 0.7,
  sleep: 0.3,
  // Manual appliance goals. They sit just under `work` so an operator request
  // wins over autonomy but does not preempt an active work activity by score
  // alone (the command's `replace` flag is what preempts).
  lampOn: 0.66,
  lampOff: 0.66,
  // Operator-requested standing door operation.
  fridgeOpen: 0.66
});

// packages/npc-core/src/domain/commands.ts
function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const record = value;
  const keys = Object.keys(record).filter((key) => record[key] !== void 0).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}
function payloadHash(event) {
  return canonicalJson(event.command);
}
function applyCommand(draft, actor, ev, _config) {
  const command = ev.command;
  if (command.worldId !== draft.worldId) return { status: "rejected", reason: "WORLD_MISMATCH" };
  const hash = payloadHash(ev);
  const existing = readId(actor.commands, command.commandId);
  if (existing) {
    if (existing.payloadHash !== hash) return { status: "rejected", reason: "COMMAND_CONFLICT" };
    return { status: "noop", reason: "DUPLICATE_COMMAND" };
  }
  const record = {
    commandId: command.commandId,
    type: command.type,
    goalId: "goal" in command ? command.goal : null,
    priorityClass: command.priorityClass,
    status: "completed",
    receivedAtWallMs: ev.wallMs,
    expiresAtWallMs: null,
    payloadHash: hash,
    onConflict: command.onConflict ?? "queue"
  };
  switch (command.type) {
    case "goal.request": {
      if (command.priorityClass === "safety") return { status: "rejected", reason: "SAFETY_RESERVED" };
      if (command.onConflict === "reject") {
        const active = actor.goal.active;
        const conflict = active !== null && active.goalId !== command.goal && layerRank(active.layer) >= layerRank(command.priorityClass);
        if (conflict) return { status: "rejected", reason: "GOAL_CONFLICT" };
      }
      record.status = "active";
      record.expiresAtWallMs = ev.wallMs + command.ttlMs;
      writeId(actor.commands, command.commandId, record);
      return { status: "applied" };
    }
    case "goal.cancel": {
      const target = readId(actor.commands, command.targetCommandId);
      if (!target) return { status: "rejected", reason: "UNKNOWN_COMMAND" };
      if (target.type !== "goal.request") return { status: "rejected", reason: "COMMAND_NOT_CANCELLABLE" };
      if (target.status !== "active") return { status: "rejected", reason: "COMMAND_NOT_ACTIVE" };
      writeId(actor.commands, command.targetCommandId, { ...target, status: "cancelled" });
      writeId(actor.commands, command.commandId, record);
      return { status: "applied" };
    }
    case "manual.acquire": {
      if (actor.manual) {
        const previous = readId(actor.commands, actor.manual.commandId);
        if (previous && previous.status === "active") {
          writeId(actor.commands, actor.manual.commandId, { ...previous, status: "cancelled" });
        }
      }
      record.status = "active";
      record.expiresAtWallMs = ev.wallMs + command.ttlMs;
      writeId(actor.commands, command.commandId, record);
      actor.manual = {
        commandId: command.commandId,
        expiresAtWallMs: ev.wallMs + command.ttlMs
      };
      return { status: "applied" };
    }
    case "manual.release": {
      if (!actor.manual || actor.manual.commandId !== command.targetCommandId) {
        return { status: "rejected", reason: "MANUAL_MISMATCH" };
      }
      const lease = readId(actor.commands, actor.manual.commandId);
      if (lease && lease.status === "active") {
        writeId(actor.commands, actor.manual.commandId, { ...lease, status: "completed" });
      }
      actor.manual = null;
      writeId(actor.commands, command.commandId, record);
      return { status: "applied" };
    }
    case "world.pause": {
      draft.worldPaused = true;
      writeId(actor.commands, command.commandId, record);
      return { status: "applied" };
    }
    case "world.resume": {
      draft.worldPaused = false;
      writeId(actor.commands, command.commandId, record);
      return { status: "applied" };
    }
    default: {
      return { status: "rejected", reason: "UNKNOWN_COMMAND_TYPE" };
    }
  }
}

// packages/npc-core/src/domain/runtime.ts
function applyRuntime(draft, actor, ev, config, prevFactsRevision) {
  switch (ev.kind) {
    case "safety.request": {
      if (ev.goalId === "sleep") return { status: "rejected", reason: "SLEEP_DISABLED" };
      if (ev.ttlMs !== void 0 && (!Number.isFinite(ev.ttlMs) || ev.ttlMs <= 0)) {
        return { status: "rejected", reason: "SAFETY_TTL_INVALID" };
      }
      actor.safety = {
        reason: ev.reason,
        goalId: ev.goalId,
        requestedAtWallMs: ev.wallMs,
        expiresAtWallMs: ev.ttlMs === void 0 ? null : ev.wallMs + ev.ttlMs
      };
      return { status: "applied" };
    }
    case "safety.clear": {
      if (!actor.safety) return { status: "noop", reason: "NO_SAFETY_HOLD" };
      actor.safety = null;
      return { status: "applied" };
    }
    case "source.epoch.adopt": {
      return adoptSourceEpoch(actor, ev.source, ev.epoch, ev.simMs, ev.wallMs);
    }
    case "action.request": {
      const active = actor.goal.active;
      if (!active || active.goalId !== ev.goalId) return { status: "rejected", reason: "GOAL_NOT_ACTIVE" };
      const sameId = readId(actor.actions, ev.actionId);
      if (sameId) {
        if (sameId.goalId !== ev.goalId || sameId.actionKey !== ev.actionKey) {
          return { status: "rejected", reason: "DUPLICATE_ACTION_ID" };
        }
        return { status: "rejected", reason: sameId.phase === "terminal" ? "ALREADY_TERMINAL" : "DUPLICATE_ACTION" };
      }
      const duplicateKey = Object.values(actor.actions).some(
        (a) => a.goalId === ev.goalId && a.actionKey === ev.actionKey && a.phase !== "terminal"
      );
      if (duplicateKey) return { status: "rejected", reason: "DUPLICATE_ACTION" };
      let open = 0;
      for (const intent2 of Object.values(actor.actions)) if (intent2.phase !== "terminal") open += 1;
      if (open >= config.maxOpenActions) return { status: "rejected", reason: "ACTION_LIMIT" };
      const intent = {
        actionId: ev.actionId,
        goalId: ev.goalId,
        actionKey: ev.actionKey,
        phase: "pending",
        outcome: null,
        reason: null,
        requestedAtSimMs: ev.simMs,
        endedAtSimMs: null
      };
      writeId(actor.actions, ev.actionId, intent);
      actor.actionOrder.push(ev.actionId);
      return { status: "applied" };
    }
    case "action.started": {
      const intent = readId(actor.actions, ev.actionId);
      if (!intent) return { status: "rejected", reason: "UNKNOWN_ACTION" };
      if (intent.phase === "terminal") return { status: "rejected", reason: "ALREADY_TERMINAL" };
      if (intent.phase === "running") return { status: "noop", reason: "ALREADY_RUNNING" };
      writeId(actor.actions, ev.actionId, { ...intent, phase: "running" });
      return { status: "applied" };
    }
    case "action.terminal": {
      const intent = readId(actor.actions, ev.actionId);
      if (!intent) return { status: "rejected", reason: "UNKNOWN_ACTION" };
      if (intent.phase === "terminal") {
        return { status: "noop", reason: "ALREADY_TERMINAL" };
      }
      writeId(actor.actions, ev.actionId, {
        ...intent,
        phase: "terminal",
        outcome: ev.outcome,
        reason: ev.reason ?? null,
        endedAtSimMs: ev.simMs
      });
      return { status: "applied" };
    }
    case "goal.commit": {
      if (ev.atRevision === void 0) return { status: "rejected", reason: "MISSING_REVISION" };
      if (ev.atRevision !== prevFactsRevision) return { status: "rejected", reason: "STALE_COMMIT" };
      const interrupt = actor.goal.interrupt;
      if (!interrupt) return { status: "rejected", reason: "NO_INTERRUPT_PENDING" };
      const target = ev.goalId ?? null;
      if ((interrupt.toGoalId ?? null) !== target) return { status: "rejected", reason: "INTERRUPT_MISMATCH" };
      let candidate = null;
      if (target !== null) {
        candidate = actor.goal.candidates.find((c) => c.goalId === target) ?? null;
        if (!candidate) return { status: "rejected", reason: "STALE_INTERRUPT" };
        if (interrupt.toLayer !== null && candidate.layer !== interrupt.toLayer) {
          return { status: "rejected", reason: "STALE_INTERRUPT" };
        }
        if (interrupt.toScore !== null && Math.abs(candidate.score - interrupt.toScore) > 1e-6) {
          return { status: "rejected", reason: "STALE_INTERRUPT" };
        }
      }
      const previous = actor.goal.active;
      if (previous && previous.goalId !== target) abandonActions(actor, previous.goalId, ev.simMs);
      actor.goal.active = candidate ? {
        goalId: candidate.goalId,
        layer: candidate.layer,
        score: candidate.score,
        sinceSimMs: ev.simMs
      } : null;
      actor.goal.interrupt = null;
      actor.goal.history.push({
        atSimMs: ev.simMs,
        from: previous?.goalId ?? null,
        to: target,
        fromLayer: previous?.layer ?? null,
        toLayer: candidate?.layer ?? null,
        reason: ev.reason
      });
      return { status: "applied" };
    }
    case "posture.changed": {
      if (actor.posture === ev.posture) return { status: "noop", reason: "SAME_POSTURE" };
      actor.posture = ev.posture;
      return { status: "applied" };
    }
    default:
      return { status: "rejected", reason: "UNKNOWN_RUNTIME_EVENT" };
  }
}
function abandonActions(actor, goalId, simMs) {
  for (const [actionId, intent] of Object.entries(actor.actions)) {
    if (intent.goalId === goalId && intent.phase !== "terminal") {
      writeId(actor.actions, actionId, {
        ...intent,
        phase: "terminal",
        outcome: "cancelled",
        reason: "goal_switch",
        endedAtSimMs: simMs
      });
    }
  }
}

// packages/npc-core/src/domain/activity.ts
function deriveActivity(actor) {
  const activeToolKeys = Object.values(actor.tools).filter((t) => t.phase === "active").map((t) => t.key);
  const activeRunKeys = Object.values(actor.runs).filter((r) => r.phase === "active").map((r) => r.key);
  const activeSpeechKeys = Object.values(actor.speeches).filter((s) => s.phase === "active").map((s) => s.key);
  return {
    work: activeToolKeys.length > 0 || activeRunKeys.length > 0,
    speech: activeSpeechKeys.length > 0,
    activeToolKeys,
    activeRunKeys,
    activeSpeechKeys
  };
}

// packages/npc-core/src/goals/arbiter.ts
function compareCandidates(a, b) {
  const byLayer = layerRank(b.layer) - layerRank(a.layer);
  if (byLayer !== 0) return byLayer;
  if (a.preempt !== b.preempt) return a.preempt ? -1 : 1;
  if (a.preempt && b.preempt) {
    if (a.requestedAtWallMs !== b.requestedAtWallMs) return b.requestedAtWallMs - a.requestedAtWallMs;
  } else {
    if (a.score !== b.score) return b.score - a.score;
    if (a.requestedAtWallMs !== b.requestedAtWallMs) return a.requestedAtWallMs - b.requestedAtWallMs;
  }
  return a.candidateId < b.candidateId ? -1 : a.candidateId > b.candidateId ? 1 : 0;
}
function arbitrate(input) {
  const { active, manual, worldPaused, livenessStale, nowSimMs, revision, config } = input;
  const suppressed = [];
  const considered = [];
  for (const candidate of input.candidates) {
    let reason = null;
    if (worldPaused && candidate.layer !== "safety") reason = "WORLD_PAUSED";
    else if (manual && candidate.layer === "autonomy") reason = "MANUAL_PIN";
    else if (livenessStale && config.requireLivenessForAutonomy && candidate.layer === "autonomy") {
      reason = "LIVENESS_STALE";
    } else if (candidate.goalId === "sleep" && !config.allowSleep) reason = "SLEEP_DISABLED";
    if (reason) suppressed.push({ candidateId: candidate.candidateId, goalId: candidate.goalId, reason });
    else considered.push(candidate);
  }
  considered.sort(compareCandidates);
  const winner = considered[0] ?? null;
  const pinned = manual && active !== null && active.layer !== "safety";
  const activeSupported = active ? pinned || considered.some(
    (c) => c.goalId === active.goalId && layerRank(c.layer) >= layerRank(active.layer)
  ) : false;
  const base = { considered, suppressed };
  const interruptTo = (candidate, reason) => ({
    ...base,
    winner: candidate,
    heldReason: null,
    interrupt: {
      toGoalId: candidate?.goalId ?? null,
      fromGoalId: active?.goalId ?? null,
      fromLayer: active?.layer ?? null,
      toLayer: candidate?.layer ?? null,
      toScore: candidate?.score ?? null,
      atRevision: revision,
      reason,
      requestedAtSimMs: nowSimMs
    }
  });
  const hold = (reason) => ({
    ...base,
    winner,
    heldReason: reason,
    interrupt: null
  });
  if (!winner) {
    if (!active) return hold("NO_CANDIDATE");
    if (pinned) return hold("MANUAL_PIN");
    return interruptTo(null, worldPaused ? "WORLD_PAUSED" : "NO_CANDIDATE");
  }
  if (!active) return hold(null);
  const effective = pinned ? "manual" : active.layer;
  if (winner.goalId === active.goalId && layerRank(winner.layer) === layerRank(effective)) {
    return hold(null);
  }
  if (!activeSupported) return interruptTo(winner, "ACTIVE_WITHDRAWN");
  const activeRank = layerRank(effective);
  const winnerRank = layerRank(winner.layer);
  if (pinned && winnerRank < layerRank("manual")) return hold("MANUAL_PIN");
  if (winnerRank > activeRank) {
    return interruptTo(winner, winner.layer === "safety" ? "SAFETY" : "HIGHER_LAYER");
  }
  const dwellSatisfied = nowSimMs - active.sinceSimMs >= config.minDwellMs - TIME_EPSILON_MS;
  if (winner.preempt) {
    return dwellSatisfied ? interruptTo(winner, "REPLACE_REQUESTED") : hold("MIN_DWELL");
  }
  if (winner.score >= active.score + config.hysteresisScore - TIME_EPSILON_MS) {
    return dwellSatisfied ? interruptTo(winner, "HIGHER_SCORE") : hold("MIN_DWELL");
  }
  return hold("HOLD_HYSTERESIS");
}

// packages/npc-core/src/goals/candidates.ts
function scoreFor(layer, goalId, config) {
  if (layer === "autonomy") {
    if (goalId === "idle") return config.autonomyScores.idle;
    if (goalId === "lookAround") return config.autonomyScores.lookAround;
    if (goalId === "rest") return config.autonomyScores.rest;
    return 0.5;
  }
  if (layer === "safety") return 1;
  if (layer === "manual") return 0.9;
  return GOAL_SCORES[goalId];
}
function buildCandidates(actor, config, nowSimMs) {
  const list = [];
  for (const cmd of Object.values(actor.commands)) {
    if (cmd.status !== "active" || cmd.type !== "goal.request" || cmd.goalId === null) continue;
    list.push({
      candidateId: `command:${cmd.commandId}`,
      goalId: cmd.goalId,
      layer: cmd.priorityClass,
      score: scoreFor(cmd.priorityClass, cmd.goalId, config),
      preempt: cmd.onConflict === "replace",
      kind: "command",
      commandId: cmd.commandId,
      requestedAtWallMs: cmd.receivedAtWallMs,
      reason: `command:${cmd.priorityClass}`
    });
  }
  const activity = deriveActivity(actor);
  if (activity.work) {
    list.push({
      candidateId: "activity:work",
      goalId: "work",
      layer: "task",
      score: scoreFor("task", "work", config),
      preempt: false,
      kind: "activity",
      commandId: null,
      requestedAtWallMs: 0,
      reason: "tool_or_run_active"
    });
  }
  if (activity.speech) {
    list.push({
      candidateId: "activity:converse",
      goalId: "converse",
      layer: "task",
      score: scoreFor("task", "converse", config),
      preempt: false,
      kind: "activity",
      commandId: null,
      requestedAtWallMs: 0,
      reason: "speech_active"
    });
  }
  if (actor.safety) {
    list.push({
      candidateId: "safety",
      goalId: actor.safety.goalId,
      layer: "safety",
      score: 1,
      preempt: true,
      kind: "safety",
      commandId: null,
      requestedAtWallMs: actor.safety.requestedAtWallMs,
      reason: `safety:${actor.safety.reason}`
    });
  }
  const autonomyAllowed = actor.goal.active === null || actor.goal.active.layer === "autonomy";
  if (autonomyAllowed && !activity.work) {
    const cooldownEnd = actor.activity.lastActiveSimMs === null ? null : actor.activity.lastActiveSimMs + config.idleCooldownMs;
    const idleReady = cooldownEnd === null || nowSimMs + TIME_EPSILON_MS >= cooldownEnd;
    if (idleReady && config.enabledAutonomyGoals.includes("idle")) {
      list.push({
        candidateId: "autonomy:idle",
        goalId: "idle",
        layer: "autonomy",
        score: config.autonomyScores.idle,
        preempt: false,
        kind: "autonomy",
        commandId: null,
        requestedAtWallMs: 0,
        reason: cooldownEnd === null ? "no_work_yet" : "work_cooldown_elapsed"
      });
    }
    const idleFor = actor.goal.active?.goalId === "idle" ? nowSimMs - actor.goal.active.sinceSimMs : -1;
    if (config.enabledAutonomyGoals.includes("lookAround") && idleFor >= config.autonomyIntervalMs - TIME_EPSILON_MS) {
      list.push({
        candidateId: "autonomy:lookAround",
        goalId: "lookAround",
        layer: "autonomy",
        score: config.autonomyScores.lookAround,
        preempt: false,
        kind: "autonomy",
        commandId: null,
        requestedAtWallMs: 0,
        reason: "idle_interval_elapsed"
      });
    }
  }
  const active = actor.goal.active;
  if (active && active.layer === "autonomy" && config.enabledAutonomyGoals.includes(active.goalId) && !list.some((candidate) => candidate.goalId === active.goalId)) {
    list.push({
      candidateId: `autonomy:continue:${active.goalId}`,
      goalId: active.goalId,
      layer: "autonomy",
      score: active.score,
      preempt: false,
      kind: "autonomy",
      commandId: null,
      requestedAtWallMs: 0,
      reason: "active_autonomy_session"
    });
  }
  return dedupeByGoal(list);
}
function dedupeByGoal(list) {
  const sorted = [...list].sort(compareCandidates);
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const candidate of sorted) {
    if (seen.has(candidate.goalId)) continue;
    seen.add(candidate.goalId);
    out.push(candidate);
  }
  return out.sort(compareCandidates);
}

// packages/npc-core/src/domain/finalize.ts
function isPresenceStale(actor, wallMs, config) {
  if (actor.presence.lastHeartbeatWallMs === null) return true;
  return wallMs - actor.presence.lastHeartbeatWallMs >= config.heartbeatStaleAfterMs - TIME_EPSILON_MS;
}
function finalize(draft, ev, touchedActorId, factsRevision = draft.factsRevision) {
  for (const actorId of draft.actorOrder) {
    const actor = actorId === touchedActorId ? readId(draft.actors, actorId) : mutableActor(draft, actorId);
    if (!actor) continue;
    expireTimers(actor, draft.wallTimeMs);
    const activity = deriveActivity(actor);
    if (activity.work) {
      if (!actor.activity.workActive || ev.kind === "tick") actor.activity.lastActiveSimMs = ev.simMs;
      actor.activity.workActive = true;
    } else if (actor.activity.workActive) {
      actor.activity.workActive = false;
      actor.activity.lastActiveSimMs = ev.simMs;
    }
    const candidates = buildCandidates(actor, draft.config, ev.simMs);
    const arbitration = arbitrate({
      candidates,
      active: actor.goal.active,
      manual: actor.manual !== null,
      worldPaused: draft.worldPaused,
      livenessStale: isPresenceStale(actor, draft.wallTimeMs, draft.config),
      nowSimMs: ev.simMs,
      revision: factsRevision,
      config: draft.config
    });
    actor.goal.candidates = arbitration.considered;
    actor.goal.suppressed = arbitration.suppressed;
    actor.goal.winner = arbitration.winner;
    const nextInterrupt = arbitration.interrupt;
    const pending = actor.goal.interrupt;
    const sameInterrupt = nextInterrupt !== null && pending !== null && pending.toGoalId === nextInterrupt.toGoalId && pending.reason === nextInterrupt.reason && pending.fromGoalId === nextInterrupt.fromGoalId && pending.toLayer === nextInterrupt.toLayer && pending.toScore === nextInterrupt.toScore;
    actor.goal.interrupt = sameInterrupt ? pending.atRevision === factsRevision ? pending : { ...pending, atRevision: factsRevision } : nextInterrupt;
    actor.goal.heldReason = arbitration.heldReason;
    if (!actor.goal.active && arbitration.winner) {
      const winner = arbitration.winner;
      actor.goal.active = {
        goalId: winner.goalId,
        layer: winner.layer,
        score: winner.score,
        sinceSimMs: ev.simMs
      };
      actor.goal.history.push({
        atSimMs: ev.simMs,
        from: null,
        to: winner.goalId,
        fromLayer: null,
        toLayer: winner.layer,
        reason: "AUTO_START"
      });
    }
    trim(actor, draft.config, ev.simMs, draft.wallTimeMs);
  }
}
function expireTimers(actor, wallMs) {
  for (const [commandId, cmd] of Object.entries(actor.commands)) {
    if (cmd.status !== "active" || cmd.expiresAtWallMs === null) continue;
    if (wallMs + TIME_EPSILON_MS < cmd.expiresAtWallMs) continue;
    writeId(actor.commands, commandId, { ...cmd, status: "expired" });
    actor.counters.commandsExpired += 1;
    if (cmd.type === "goal.request") {
      actor.goal.expired.push({
        commandId: cmd.commandId,
        goalId: cmd.goalId,
        atWallMs: wallMs,
        reason: "TTL_EXPIRED"
      });
    }
  }
  if (actor.manual && wallMs + TIME_EPSILON_MS >= actor.manual.expiresAtWallMs) {
    actor.manual = null;
    actor.counters.manualExpired += 1;
  }
  if (actor.safety && actor.safety.expiresAtWallMs !== null && wallMs + TIME_EPSILON_MS >= actor.safety.expiresAtWallMs) {
    actor.safety = null;
  }
}
function trim(actor, config, nowSimMs, nowWallMs) {
  if (actor.goal.history.length > config.maxGoalHistory) {
    actor.goal.history = actor.goal.history.slice(-config.maxGoalHistory);
  }
  if (actor.goal.expired.length > config.maxGoalHistory) {
    actor.goal.expired = actor.goal.expired.slice(-config.maxGoalHistory);
  }
  pruneToolRecords(actor, config, nowSimMs);
  pruneRunRecords(actor, config, nowSimMs);
  pruneSpeechRecords(actor, config, nowSimMs);
  pruneCommandRecords(actor, config, nowWallMs);
  sweepTombstones(actor, config, nowSimMs);
  if (actor.actionOrder.length <= config.maxActionHistory) return;
  const overflow = actor.actionOrder.length - config.maxActionHistory;
  const keep = [];
  let dropped = 0;
  for (const actionId of actor.actionOrder) {
    const intent = readId(actor.actions, actionId);
    if (dropped < overflow && intent && intent.phase === "terminal") {
      deleteId(actor.actions, actionId);
      dropped += 1;
      continue;
    }
    keep.push(actionId);
  }
  actor.actionOrder = keep;
}

// packages/npc-core/src/domain/reduce.ts
function reduceStamped(prev, ev) {
  const draft = {
    ...prev,
    actorOrder: [...prev.actorOrder],
    actors: copyIdMap(prev.actors)
  };
  draft.simTimeMs = Math.max(prev.simTimeMs, ev.simMs);
  draft.wallTimeMs = Math.max(prev.wallTimeMs, ev.wallMs);
  const factsRevision = prev.factsRevision + (ev.kind === "tick" ? 0 : 1);
  draft.factsRevision = factsRevision;
  let outcome = { status: "applied" };
  let touchedActorId;
  switch (ev.kind) {
    case "fact": {
      if (ev.fact.worldId !== draft.worldId) {
        return { state: prev, outcome: { status: "rejected", reason: "WORLD_MISMATCH" } };
      }
      const actor = beginActor(draft, ev.fact.actorId, draft.config.maxActors);
      if (!actor) return { state: prev, outcome: { status: "rejected", reason: "ACTOR_LIMIT" } };
      touchedActorId = ev.fact.actorId;
      outcome = applyFact(draft, actor, ev, draft.config);
      break;
    }
    case "command": {
      if (ev.command.worldId !== draft.worldId) {
        return { state: prev, outcome: { status: "rejected", reason: "WORLD_MISMATCH" } };
      }
      const actor = beginActor(draft, ev.command.actorId, draft.config.maxActors);
      if (!actor) return { state: prev, outcome: { status: "rejected", reason: "ACTOR_LIMIT" } };
      touchedActorId = ev.command.actorId;
      outcome = applyCommand(draft, actor, ev, draft.config);
      break;
    }
    case "action.request":
    case "action.started":
    case "action.terminal":
    case "goal.commit":
    case "posture.changed":
    case "safety.request":
    case "safety.clear":
    case "source.epoch.adopt": {
      const actor = beginActor(draft, ev.actorId, draft.config.maxActors);
      if (!actor) return { state: prev, outcome: { status: "rejected", reason: "ACTOR_LIMIT" } };
      touchedActorId = ev.actorId;
      outcome = applyRuntime(draft, actor, ev, draft.config, prev.factsRevision);
      break;
    }
    case "tick": {
      if (!(ev.dtMs > 0)) return { state: prev, outcome: { status: "noop", reason: "NO_TIME_ADVANCE" } };
      outcome = { status: "applied" };
      break;
    }
    default: {
      return { state: prev, outcome: { status: "rejected", reason: "UNKNOWN_EVENT" } };
    }
  }
  if (outcome.status === "rejected") return { state: prev, outcome };
  if (outcome.status === "noop") {
    return { state: prev, outcome };
  }
  finalize(draft, ev, touchedActorId, factsRevision);
  draft.revision = prev.revision + 1;
  return { state: deepFreeze(draft), outcome };
}

// packages/npc-core/src/domain/store.ts
var MAX_REJECTIONS = 128;
var DomainStore = class {
  state;
  clock;
  wallClock;
  historyBuffer = [];
  rejectionBuffer = [];
  seenFacts = /* @__PURE__ */ new Map();
  listeners = /* @__PURE__ */ new Set();
  historyTruncated = false;
  constructor(options) {
    const config = resolveConfig(options.worldId, options.config);
    this.state = createInitialState(config, options.actors ?? []);
    this.clock = new SimClock({
      stepHz: options.stepHz ?? 60,
      maxCatchUpSteps: options.maxCatchUpSteps ?? 15
    });
    this.wallClock = options.wallClock ?? (() => Date.now());
  }
  get snapshot() {
    return this.state;
  }
  get revision() {
    return this.state.revision;
  }
  /** Current injected wall clock, including time since the last domain tick. */
  get wallTimeMs() {
    return this.wallClock();
  }
  get simTimeMs() {
    return this.state.simTimeMs;
  }
  /** Frozen copy; the internal buffer is never handed out. */
  get history() {
    return Object.freeze([...this.historyBuffer]);
  }
  /** Frozen copy of the bounded not-applied log (rejections and no-ops). */
  get rejections() {
    return Object.freeze([...this.rejectionBuffer]);
  }
  /**
   * A replay input that carries its own completeness expectation. A truncated
   * buffer cannot silently masquerade as a full history.
   */
  checkpoint() {
    return {
      config: this.state.config,
      actors: [...this.state.actorOrder],
      events: [...this.historyBuffer],
      revision: this.state.revision,
      truncated: this.historyTruncated
    };
  }
  dispatch(input) {
    if (input.kind === "tick") throw new Error("dispatch: use tick(deltaMs) for time");
    const wallMs = this.wallClock();
    const stamped = { ...input, wallMs, simMs: this.clock.timeMs };
    if (input.kind === "fact") {
      const key = factDedupeKey(input.fact.source, input.fact.sourceEpoch, input.fact.eventId);
      if (this.seenFacts.has(key)) {
        return this.reject("fact", "DUPLICATE_EVENT", wallMs);
      }
      const result2 = reduceStamped(this.state, stamped);
      if (result2.outcome.status === "applied") this.rememberFact(key);
      return this.commit(result2.state, result2.outcome, stamped, wallMs);
    }
    const result = reduceStamped(this.state, stamped);
    return this.commit(result.state, result.outcome, stamped, wallMs);
  }
  tick(realDeltaMs) {
    const advance = this.clock.advance(realDeltaMs);
    const wallMs = this.wallClock();
    const before = this.state;
    const steps = Math.max(advance.steps, 1);
    for (let i = 0; i < steps; i += 1) {
      const realStep = i < advance.steps;
      const simMs = realStep ? advance.simTimeMs - (advance.steps - 1 - i) * this.clock.stepMs : advance.simTimeMs;
      const event = {
        kind: "tick",
        dtMs: realStep ? this.clock.stepMs : 0,
        wallMs,
        simMs
      };
      const result = reduceStamped(this.state, event);
      if (result.outcome.status === "applied") {
        this.state = result.state;
        this.pushHistory(event);
      }
    }
    if (this.state !== before) this.notify(before);
    return {
      steps: advance.steps,
      simTimeMs: this.state.simTimeMs,
      droppedMs: advance.droppedMs,
      lagMs: advance.lagMs,
      revision: this.state.revision
    };
  }
  subscribeRaw(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  /**
   * Rebuilds state from a checkpoint. `complete` is false if the buffer had
   * evicted events or if the replay does not land on the recorded revision;
   * callers analysing behaviour must not treat an incomplete replay as truth.
   */
  static replay(checkpoint) {
    let state = createInitialState(checkpoint.config, checkpoint.actors);
    for (const event of checkpoint.events) {
      const result = reduceStamped(state, event);
      if (result.outcome.status === "applied") state = result.state;
    }
    return {
      state,
      complete: !checkpoint.truncated && state.revision === checkpoint.revision,
      replayedRevision: state.revision
    };
  }
  commit(next, outcome, event, wallMs) {
    if (outcome.status === "applied") {
      const previous = this.state;
      this.state = next;
      this.pushHistory(event);
      this.notify(previous);
      return { accepted: true, reason: outcome.reason ?? null, revision: next.revision };
    }
    if (outcome.status === "noop") {
      this.recordRejection(event.kind, outcome.reason ?? "NO_CHANGE", wallMs);
      return { accepted: false, reason: outcome.reason ?? "NO_CHANGE", revision: this.state.revision };
    }
    return this.reject(event.kind, outcome.reason ?? "REJECTED", wallMs);
  }
  reject(kind, reason, wallMs) {
    this.recordRejection(kind, reason, wallMs);
    return { accepted: false, reason, revision: this.state.revision };
  }
  recordRejection(kind, reason, wallMs) {
    if (this.rejectionBuffer.length >= MAX_REJECTIONS) this.rejectionBuffer.shift();
    this.rejectionBuffer.push(Object.freeze({ atWallMs: wallMs, kind, reason }));
  }
  rememberFact(key) {
    if (this.seenFacts.size >= this.state.config.factDedupeLimit) {
      const oldest = this.seenFacts.keys().next();
      if (!oldest.done) this.seenFacts.delete(oldest.value);
    }
    this.seenFacts.set(key, true);
  }
  pushHistory(event) {
    this.historyBuffer.push(deepFreeze(structuredClone(event)));
    const limit = this.state.config.eventHistoryLimit;
    if (this.historyBuffer.length > limit) {
      this.historyBuffer.splice(0, this.historyBuffer.length - limit);
      this.historyTruncated = true;
    }
  }
  notify(previous) {
    for (const listener of this.listeners) listener(this.state, previous);
  }
};

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

// packages/npc-core/src/planner/catalog.ts
var PLAN_FACTS = Object.freeze({
  atDesk: false,
  sitting: false,
  handsOnKeyboard: false,
  facingSpeaker: false,
  lookedAround: false,
  rested: false,
  thinking: false,
  sleeping: false,
  seatAvailable: true,
  /**
   * Desk-lamp power, mirrored from the device controller's feedback event
   * (`slice.deviceFeedback`). The action's declared effect is the prediction;
   * the device's measured state is what the next plan is computed from.
   */
  lampOn: false,
  /**
   * Fridge chain (NE2 standing grasp). `fridgeDoorOpen` means "the leaf passed
   * the resource's declared minimum opening", not "reached the -100 deg hinge
   * limit". The motor is stopped at the declared target; the fact is only
   * committed when the measured leaf angle crossed that minimum.
   */
  atFridge: false,
  facingFridge: false,
  fridgeReachReady: false,
  fridgeGrasped: false,
  fridgeDoorOpen: false
});
function def(key, description, preconditions, effects, cost, channels, durationMs, extra = {}) {
  return Object.freeze({
    key,
    description,
    preconditions: Object.freeze({ ...preconditions }),
    effects: Object.freeze({ ...effects }),
    cost,
    channels: Object.freeze([...channels]),
    durationMs,
    ...extra
  });
}
var ACTION_CATALOG = Object.freeze({
  walkToDesk: def("walkToDesk", "walk to the desk", { fridgeGrasped: false }, { atDesk: true, atFridge: false, facingFridge: false, fridgeReachReady: false, fridgeGrasped: false }, 3, ["locomotion"], 2e3),
  walkAway: def("walkAway", "walk away from the desk", { sitting: false }, { atDesk: false }, 2, ["locomotion"], 1500),
  sitOnDeskChair: def(
    "sitOnDeskChair",
    "sit on the desk chair",
    { atDesk: true, seatAvailable: true },
    { sitting: true },
    1,
    ["locomotion", "lowerBody"],
    700,
    { postureTarget: "sitting" }
  ),
  // Standing up takes the hands off the keys: leaving `handsOnKeyboard` set
  // after a stand made the next work plan believe typing was already done, so a
  // re-sit planned only `sitOnDeskChair` and then reported the goal satisfied
  // with the body seated but not typing (measured in the M4 re-sit probe).
  standUp: def("standUp", "stand up from the desk chair", { sitting: true }, { sitting: false, handsOnKeyboard: false }, 1, [
    "locomotion",
    "lowerBody"
  ], 600, { postureTarget: "standing" }),
  typeAtKeyboard: def(
    "typeAtKeyboard",
    "type at the keyboard",
    { atDesk: true, sitting: true },
    { handsOnKeyboard: true },
    2,
    ["upperBody", "hands"],
    1500,
    { reach: { kind: "hand", target: "keyboard" } }
  ),
  thinkAtDesk: def("thinkAtDesk", "sit and think at the desk", { atDesk: true, sitting: true }, { thinking: true }, 1, [
    "upperBody",
    "gaze"
  ], 4e3),
  lookAround: def("lookAround", "look around the room", {}, { lookedAround: true }, 1, ["gaze"], 1200),
  turnToSpeaker: def("turnToSpeaker", "turn toward the speaker", {}, { facingSpeaker: true }, 1, [
    "upperBody",
    "gaze"
  ], 900),
  restAtDesk: def("restAtDesk", "rest at the desk", { atDesk: true }, { rested: true }, 1, ["upperBody"], 5e3),
  /**
   * Momentary switch press on a scene appliance. The precondition is the seated
   * desk posture (the lamp is on the desk and only reachable from the chair);
   * the effect is the device state the action predicts. A press is NOT planned
   * when the lamp is already in the requested state: the goal is satisfied by
   * the synced fact instead of a second press.
   */
  pressLampSwitchOn: def(
    "pressLampSwitchOn",
    "press the desk lamp switch on",
    { atDesk: true, sitting: true, lampOn: false },
    { lampOn: true },
    2,
    ["upperBody", "hands"],
    1200,
    { reach: { kind: "hand", target: "lamp-switch" } }
  ),
  pressLampSwitchOff: def(
    "pressLampSwitchOff",
    "press the desk lamp switch off",
    { atDesk: true, sitting: true, lampOn: true },
    { lampOn: false },
    2,
    ["upperBody", "hands"],
    1200,
    { reach: { kind: "hand", target: "lamp-switch" } }
  ),
  /**
   * Standing fridge-door chain (NE2). The plan is deliberately split into the
   * physically gated steps: walk, face, reach, grasp, open, release, withdraw.
   * `openFridgeDoor` predicts `fridgeDoorOpen`, but the adapter only completes
   * it after the measured leaf crossed the resource's minimum opening; a
   * blocked/grasp-lost action fails and the fact is not committed.
   */
  walkToFridge: def("walkToFridge", "walk to the fridge operating stance", { sitting: false }, { atFridge: true, atDesk: false, handsOnKeyboard: false, facingFridge: false, fridgeReachReady: false, fridgeGrasped: false }, 3, ["locomotion"], 3e3),
  faceFridge: def("faceFridge", "turn to face the fridge handle", { atFridge: true }, { facingFridge: true }, 1, ["upperBody", "gaze"], 900),
  reachFridgeHandle: def(
    "reachFridgeHandle",
    "reach the standing hand to the fridge handle surface",
    { atFridge: true, facingFridge: true },
    { fridgeReachReady: true },
    2,
    ["upperBody", "hands"],
    1500,
    { reach: { kind: "hand", target: "fridge-handle" } }
  ),
  graspFridgeHandle: def(
    "graspFridgeHandle",
    "hold the fridge handle with the measured palm contact",
    { fridgeReachReady: true },
    { fridgeGrasped: true },
    1,
    ["hands"],
    700,
    { reach: { kind: "hand", target: "fridge-handle" } }
  ),
  openFridgeDoor: def(
    "openFridgeDoor",
    "drive the fridge door to the declared minimum opening while the hand follows the actual leaf",
    { fridgeGrasped: true },
    { fridgeDoorOpen: true },
    8,
    ["hands", "upperBody"],
    5e3,
    { reach: { kind: "hand", target: "fridge-handle" } }
  ),
  releaseFridgeHandle: def(
    "releaseFridgeHandle",
    "stop the door motor and withdraw the hand from the handle",
    { fridgeDoorOpen: true, fridgeGrasped: true },
    { fridgeGrasped: false, fridgeReachReady: false },
    1,
    ["hands"],
    1200
  ),
  withdrawFromFridge: def(
    "withdrawFromFridge",
    "step back out of the fridge operating zone",
    { atFridge: true, fridgeGrasped: false },
    { atFridge: false, facingFridge: false },
    2,
    ["locomotion"],
    1500
  )
});
var GOAL_CONDITIONS = Object.freeze({
  work: Object.freeze({ atDesk: true, sitting: true, handsOnKeyboard: true }),
  think: Object.freeze({ atDesk: true, sitting: true }),
  converse: Object.freeze({ facingSpeaker: true }),
  rest: Object.freeze({ rested: true }),
  idle: Object.freeze({ sitting: false }),
  lookAround: Object.freeze({ lookedAround: true }),
  sleep: Object.freeze({ sleeping: true }),
  // Appliance goals are satisfied by the device's own synced state, not by the
  // body posture: a lamp that is already on must not make the NPC walk over.
  lampOn: Object.freeze({ lampOn: true }),
  lampOff: Object.freeze({ lampOn: false }),
  // "Opened" is the resource's minimum opening, and the hand must be off the
  // handle when the goal is satisfied. Requiring `atFridge:false` is what makes
  // release+withdraw part of the plan instead of stopping with the arm out.
  fridgeOpen: Object.freeze({ fridgeDoorOpen: true, fridgeGrasped: false, atFridge: false })
});
function goalConditions(goalId) {
  if (!Object.prototype.hasOwnProperty.call(GOAL_CONDITIONS, goalId)) return EMPTY_CONDITIONS;
  return GOAL_CONDITIONS[goalId] ?? EMPTY_CONDITIONS;
}
function getActionDefinition(key) {
  if (!Object.prototype.hasOwnProperty.call(ACTION_CATALOG, key)) return void 0;
  return ACTION_CATALOG[key];
}
var EMPTY_CONDITIONS = Object.freeze({});
function planSpecs(keys) {
  const selected = keys ? keys.map((key) => getActionDefinition(key)).filter((d) => !!d) : Object.values(ACTION_CATALOG);
  return selected.map((definition) => ({
    key: definition.key,
    preconditions: { ...definition.preconditions },
    effects: { ...definition.effects },
    cost: definition.cost
  }));
}
function defaultFacts() {
  return { ...PLAN_FACTS };
}

// packages/npc-core/src/planner/worker-planner.ts
var DEFAULT_MAX_BUDGET_MS = 15e3;
var WorkerPlanner = class {
  name = "goap-worker";
  factory;
  defaultBudgetMs;
  maxBudgetMs;
  now;
  setTimer;
  clearTimer;
  inflight = /* @__PURE__ */ new Map();
  counters = {
    requests: 0,
    ok: 0,
    noPlan: 0,
    satisfied: 0,
    timeout: 0,
    error: 0,
    dropped: 0,
    terminated: 0
  };
  constructor(options) {
    this.factory = options.factory;
    this.defaultBudgetMs = Math.max(1, options.defaultBudgetMs ?? 4e3);
    this.maxBudgetMs = Math.max(this.defaultBudgetMs, options.maxBudgetMs ?? DEFAULT_MAX_BUDGET_MS);
    this.now = options.now ?? (() => Date.now());
    this.setTimer = options.setTimer ?? ((callback, ms) => {
      const handle = setTimeout(callback, ms);
      handle.unref?.();
      return handle;
    });
    this.clearTimer = options.clearTimer ?? ((handle) => {
      clearTimeout(handle);
    });
  }
  get stats() {
    return { ...this.counters };
  }
  get inFlight() {
    return this.inflight.size;
  }
  plan(request) {
    const budgetMs = this.clampBudget(request.budgetMs);
    this.counters.requests += 1;
    return new Promise((resolve) => {
      let worker;
      try {
        worker = this.factory();
      } catch (error) {
        this.counters.error += 1;
        resolve(this.failure(request, "error", error instanceof Error ? error.message : "worker_factory_failed"));
        return;
      }
      const entry = {
        planId: request.planId,
        request,
        worker,
        startedAt: this.now(),
        timer: null,
        settled: false,
        resolve
      };
      this.inflight.set(entry.planId, entry);
      worker.onMessage((message) => this.onMessage(entry, message));
      worker.onError((error) => {
        this.settle(entry, this.failure(request, "error", error instanceof Error ? error.message : String(error)));
      });
      entry.timer = this.setTimer(() => {
        this.settle(entry, this.failure(request, "timeout", "budget_exceeded"));
      }, budgetMs);
      try {
        worker.postMessage({ ...request, budgetMs });
      } catch (error) {
        this.settle(entry, this.failure(request, "error", error instanceof Error ? error.message : "postMessage_failed"));
      }
    });
  }
  terminate() {
    for (const entry of [...this.inflight.values()]) {
      this.settle(entry, this.failure(entry.request, "error", "planner_terminated"));
    }
  }
  clampBudget(requested) {
    if (typeof requested !== "number" || !Number.isFinite(requested)) return this.defaultBudgetMs;
    return Math.max(1, Math.min(requested, this.maxBudgetMs));
  }
  onMessage(entry, message) {
    if (entry.settled) return;
    if (!message || typeof message !== "object") {
      this.counters.dropped += 1;
      return;
    }
    const response = message;
    if (response.planId !== entry.planId) {
      this.counters.dropped += 1;
      return;
    }
    const validStatus = ["ok", "satisfied", "no-plan", "error"].includes(response.status ?? "");
    if (!validStatus || !Array.isArray(response.actions) || !response.actions.every((key) => typeof key === "string")) {
      this.settle(entry, this.failure(entry.request, "error", "invalid_worker_response"));
      return;
    }
    this.settle(entry, {
      planId: entry.planId,
      actorId: entry.request.actorId,
      goalId: entry.request.goalId,
      revision: entry.request.revision,
      status: response.status,
      actions: response.actions,
      cost: typeof response.cost === "number" && Number.isFinite(response.cost) ? response.cost : 0,
      predicted: response.predicted && typeof response.predicted === "object" ? response.predicted : {},
      core: typeof response.core === "string" ? response.core : GOAP_CORE,
      ...typeof response.error === "string" ? { error: response.error } : {},
      elapsedMs: this.now() - entry.startedAt
    });
  }
  settle(entry, response) {
    if (entry.settled) return;
    entry.settled = true;
    this.inflight.delete(entry.planId);
    this.clearTimer(entry.timer);
    const termination = entry.worker.terminate();
    if (termination && typeof termination.catch === "function") {
      termination.catch(() => void 0);
    }
    this.counters.terminated += 1;
    if (response.status === "ok") this.counters.ok += 1;
    else if (response.status === "no-plan") this.counters.noPlan += 1;
    else if (response.status === "satisfied") this.counters.satisfied += 1;
    else if (response.status === "timeout") this.counters.timeout += 1;
    else this.counters.error += 1;
    entry.resolve(response);
  }
  failure(request, status, error) {
    return {
      planId: request.planId,
      actorId: request.actorId,
      goalId: request.goalId,
      revision: request.revision,
      status,
      actions: [],
      cost: 0,
      predicted: {},
      core: GOAP_CORE,
      error
    };
  }
};

// packages/npc-core/src/resources/channels.ts
var ChannelLocks = class {
  owners = /* @__PURE__ */ new Map();
  acquire(owner, channels) {
    const requested = [...new Set(channels)].sort();
    for (const channel of requested) {
      const holder = this.owners.get(channel);
      if (holder !== void 0 && holder !== owner) {
        return { ok: false, channels: [], conflict: { channel, owner: holder } };
      }
    }
    for (const channel of requested) this.owners.set(channel, owner);
    return { ok: true, channels: requested };
  }
  release(owner) {
    const released = [];
    for (const [channel, holder] of this.owners) {
      if (holder === owner) {
        this.owners.delete(channel);
        released.push(channel);
      }
    }
    return released.sort();
  }
  ownerOf(channel) {
    return this.owners.get(channel) ?? null;
  }
  heldBy(owner) {
    const out = [];
    for (const [channel, holder] of this.owners) if (holder === owner) out.push(channel);
    return out.sort();
  }
  snapshot() {
    return [...this.owners.entries()].map(([channel, owner]) => ({ channel, owner })).sort((a, b) => a.channel.localeCompare(b.channel));
  }
};

// packages/npc-core/src/actions/executor.ts
var DEFAULT_MAX_TERMINAL_LOG = 256;
var DEFAULT_MAX_HAZARD_LOG = 32;
var ActionExecutor = class {
  motion;
  body;
  locks;
  nowSimMs;
  actionTimeoutMs;
  exitTimeoutMs;
  maxTerminalLog;
  maxHazardLog;
  active = null;
  disposed = false;
  attemptCounter = 0;
  terminalLog = [];
  hazardLog = [];
  pending = [];
  constructor(options) {
    this.motion = options.motion;
    this.body = { ...options.body };
    this.locks = options.locks ?? new ChannelLocks();
    this.nowSimMs = options.nowSimMs ?? (() => 0);
    this.actionTimeoutMs = Math.max(1, options.actionTimeoutMs ?? 6e4);
    this.exitTimeoutMs = Math.max(1, options.exitTimeoutMs ?? 5e3);
    this.maxTerminalLog = Math.max(1, options.maxTerminalLog ?? DEFAULT_MAX_TERMINAL_LOG);
    this.maxHazardLog = Math.max(1, options.maxHazardLog ?? DEFAULT_MAX_HAZARD_LOG);
  }
  get current() {
    return this.active ? viewOf(this.active) : null;
  }
  get terminals() {
    return this.terminalLog;
  }
  /** Safety events that need host/operator attention. Bounded, newest last. */
  get hazards() {
    return this.hazardLog;
  }
  get lockSnapshot() {
    return this.locks.snapshot();
  }
  start(definition, options) {
    if (this.disposed) return { ok: false, actionId: options.actionId, attemptId: null, reason: "DISPOSED", terminal: null };
    if (this.active) return { ok: false, actionId: options.actionId, attemptId: null, reason: "BUSY", terminal: null };
    const attemptId = `${options.actionId}:attempt:${++this.attemptCounter}`;
    const action = {
      definition,
      options,
      attemptId,
      phase: "created",
      startedAtSimMs: this.nowSimMs(),
      elapsedMs: 0,
      exitElapsedMs: 0,
      exitOutcome: "cancelled",
      reason: null,
      completion: null,
      unconfirmedReason: null,
      settled: false
    };
    this.active = action;
    action.phase = "preflight";
    if (!conditionsHold(options.facts, definition.preconditions)) {
      const terminal = this.settle(action, { outcome: "failed", reason: "PRECONDITION_FAILED" });
      return { ok: false, actionId: options.actionId, attemptId, reason: "PRECONDITION_FAILED", terminal };
    }
    const context = { facts: options.facts, body: this.body };
    let feasibility;
    try {
      feasibility = this.motion.preflight(definition, context, options.actionId);
    } catch (error) {
      const reason = `ADAPTER_ERROR:${messageOf(error)}`;
      const terminal = this.settle(action, { outcome: "failed", reason });
      return { ok: false, actionId: options.actionId, attemptId, reason, terminal };
    }
    if (!feasibility.ok) {
      const terminal = this.settle(action, { outcome: "failed", reason: feasibility.reason ?? "PREFLIGHT_FAILED" });
      return { ok: false, actionId: options.actionId, attemptId, reason: feasibility.reason ?? "PREFLIGHT_FAILED", terminal };
    }
    action.phase = "acquiring";
    const acquired = this.locks.acquire(options.actionId, definition.channels);
    if (!acquired.ok) {
      const reason = acquired.conflict ? "CHANNEL_CONFLICT" : "CHANNEL_CONFLICT";
      const terminal = this.settle(action, { outcome: "failed", reason });
      return { ok: false, actionId: options.actionId, attemptId, reason, terminal };
    }
    action.phase = "running";
    try {
      this.motion.begin(definition, context, options.actionId);
    } catch (error) {
      const reason = `ADAPTER_ERROR:${messageOf(error)}`;
      const terminal = this.settle(action, { outcome: "failed", reason });
      return { ok: false, actionId: options.actionId, attemptId, reason, terminal };
    }
    return { ok: true, actionId: options.actionId, attemptId, reason: null, terminal: null };
  }
  requestCancel(reason) {
    const action = this.active;
    if (!action || action.phase !== "running" && action.phase !== "awaiting-evidence") return false;
    return this.beginSafeExit(action, reason);
  }
  update(dtMs, options = {}) {
    const action = this.active;
    if (!action) return this.drain();
    const dt = Math.max(0, dtMs);
    if (action.phase === "running") {
      action.elapsedMs += dt;
      try {
        this.motion.advance(action.options.actionId, dt);
      } catch (error) {
        this.beginSafeExit(action, `ADAPTER_ERROR:${messageOf(error)}`, "failed");
        return this.drain();
      }
      let result;
      try {
        result = this.motion.result(action.options.actionId);
      } catch (error) {
        this.beginSafeExit(action, `ADAPTER_ERROR:${messageOf(error)}`, "failed");
        return this.drain();
      }
      if (result.status === "completed") {
        if (options.supersedes?.(action.options.goalId)) {
          this.settle(action, { outcome: "cancelled", reason: "cancel:goal_switch:superseded" });
        } else if (result.completion?.kind === "post-physics") {
          if (!this.motion.observe) {
            this.beginSafeExit(action, "EVIDENCE_ADAPTER_UNSUPPORTED", "failed");
          } else {
            action.completion = result.completion;
            action.phase = "awaiting-evidence";
          }
        } else if (result.completion?.kind === "logical") {
          this.settle(action, { outcome: "success", reason: null });
        } else {
          this.beginSafeExit(action, "COMPLETION_CLASSIFICATION_REQUIRED", "failed");
        }
      } else if (result.status === "failed") {
        this.beginSafeExit(action, result.reason ?? "MOTION_FAILED", "failed");
      } else if (action.elapsedMs > this.actionTimeoutMs) {
        this.beginSafeExit(action, "ACTION_TIMEOUT", "failed");
      }
    } else if (action.phase === "awaiting-evidence") {
      action.elapsedMs += dt;
      if (action.elapsedMs > this.actionTimeoutMs) this.beginSafeExit(action, "evidence_timeout");
    } else if (action.phase === "exiting" || action.phase === "exit-unconfirmed") {
      action.exitElapsedMs += dt;
      let complete;
      try {
        this.motion.advanceExit(action.options.actionId, dt);
        complete = this.motion.exitComplete(action.options.actionId);
      } catch (error) {
        this.enterUnconfirmed(action, `advance_exit:${messageOf(error)}`, "adapter-error");
        return this.drain();
      }
      if (complete) {
        const reason = action.unconfirmedReason === null ? action.reason : `${action.reason}:exit_unconfirmed:late_complete`;
        this.settle(action, { outcome: action.exitOutcome, reason });
      } else if (action.phase === "exiting" && action.exitElapsedMs > this.exitTimeoutMs) {
        if (this.requestForcedStop(action)) {
          this.settle(action, { outcome: action.exitOutcome, reason: `${action.reason ?? "cancel"}:forced_stop` });
        } else {
          this.enterUnconfirmed(action, `exit_timeout:${this.exitTimeoutMs}ms`, "exit-unconfirmed");
        }
      }
    }
    return this.drain();
  }
  /**
   * Reads one authoritative post-world-step observation from the adapter. The
   * executor supplies identity, the candidate's last visible step and declared
   * dependencies; callers cannot manufacture a solved step or contact outcome.
   */
  observe() {
    const action = this.active;
    if (!action) return { status: "rejected", reason: "EVIDENCE_NO_ACTIVE_ACTION", terminal: null };
    if (action.phase !== "awaiting-evidence" || !action.completion) {
      return { status: "rejected", reason: "EVIDENCE_NOT_AWAITED", terminal: null };
    }
    if (!this.motion.observe) {
      return this.rejectThroughSafeExit(action, "EVIDENCE_ADAPTER_UNSUPPORTED");
    }
    const request = {
      actorId: action.options.actorId ?? "",
      actionId: action.options.actionId,
      attemptId: action.attemptId,
      observationKind: action.completion.observationKind,
      afterSimStep: action.completion.afterSimStep,
      dependencies: action.completion.dependencies
    };
    let evidence;
    try {
      evidence = this.motion.observe(action.options.actionId, request);
    } catch (error) {
      return this.rejectThroughSafeExit(action, `ADAPTER_ERROR:${messageOf(error)}`);
    }
    if (evidence.observationKind !== request.observationKind) {
      return this.rejectThroughSafeExit(action, "EVIDENCE_KIND_MISMATCH");
    }
    if (evidence.simStep <= request.afterSimStep) {
      return this.rejectThroughSafeExit(action, "EVIDENCE_STEP_NOT_AFTER_CANDIDATE");
    }
    const mismatch = firstDependencyMismatch(request.dependencies, evidence.dependencies);
    if (mismatch) {
      return this.rejectThroughSafeExit(action, `EVIDENCE_VERSION_MISMATCH:${mismatch.kind}:${mismatch.id}`);
    }
    if (evidence.outcome === "rejected") {
      return this.rejectThroughSafeExit(action, evidence.reason ?? "EVIDENCE_REJECTED");
    }
    const terminal = this.settle(action, { outcome: "success", reason: null });
    return { status: "accepted", reason: null, terminal };
  }
  /**
   * Explicit operator/safety recovery from `exit-unconfirmed`. The caller takes
   * responsibility for the body (e.g. having teleported/reset it by hand); the
   * release is recorded as a hazard so it can never look like a clean exit.
   */
  releaseUnconfirmed(actionId, reason) {
    const action = this.active;
    if (!action || action.options.actionId !== actionId || action.phase !== "exit-unconfirmed") return null;
    this.recordHazard(action, "unsafe-release", reason);
    return this.settle(action, {
      outcome: "cancelled",
      reason: `${action.reason}:exit_unconfirmed:released:${reason}`
    });
  }
  /**
   * Tears the executor down: no new actions, the active action is force-stopped
   * and settled once. Disposal is host teardown, so a refused force-stop is
   * recorded as an unsafe release rather than leaving the runtime wedged.
   */
  dispose(reason = "dispose") {
    if (this.disposed) return;
    this.disposed = true;
    const action = this.active;
    if (!action) return;
    const safe = this.requestForcedStop(action);
    if (!safe) this.recordHazard(action, "unsafe-release", `${reason}:force_stop_unconfirmed`);
    this.settle(action, { outcome: "cancelled", reason: `${action.reason ?? "dispose"}:disposed:${reason}` });
  }
  drain() {
    const out = this.pending.splice(0, this.pending.length);
    return out;
  }
  rejectThroughSafeExit(action, reason) {
    this.beginSafeExit(action, `evidence_rejected:${reason}`);
    return { status: "rejected", reason, terminal: null };
  }
  beginSafeExit(action, reason, outcome = "cancelled") {
    action.completion = null;
    action.exitOutcome = outcome;
    action.reason = outcome === "failed" ? reason : `cancel:${reason}`;
    action.exitElapsedMs = 0;
    action.phase = "exiting";
    try {
      this.motion.beginExit(action.options.actionId);
    } catch (error) {
      this.enterUnconfirmed(action, `begin_exit:${messageOf(error)}`, "adapter-error");
    }
    return true;
  }
  requestForcedStop(action) {
    try {
      return this.motion.forceStop(action.options.actionId) === true;
    } catch (error) {
      this.recordHazard(action, "adapter-error", `force_stop:${messageOf(error)}`);
      return false;
    }
  }
  enterUnconfirmed(action, cause, kind) {
    if (action.phase === "exit-unconfirmed") return;
    action.phase = "exit-unconfirmed";
    action.unconfirmedReason = cause;
    this.recordHazard(action, kind, cause);
  }
  recordHazard(action, kind, reason) {
    this.hazardLog.push({
      actionId: action.options.actionId,
      actionKey: action.definition.key,
      goalId: action.options.goalId,
      planId: action.options.planId,
      kind,
      reason,
      atSimMs: this.nowSimMs()
    });
    if (this.hazardLog.length > this.maxHazardLog) {
      this.hazardLog.splice(0, this.hazardLog.length - this.maxHazardLog);
    }
  }
  settle(action, terminal) {
    if (action.settled) return null;
    action.settled = true;
    action.phase = terminal.outcome === "success" ? "succeeded" : terminal.outcome === "cancelled" ? "cancelled" : "failed";
    action.reason = terminal.reason;
    try {
      this.motion.cleanup(action.options.actionId);
    } catch (error) {
      this.recordHazard(action, "adapter-error", `cleanup:${messageOf(error)}`);
    }
    this.locks.release(action.options.actionId);
    const terminalOutcome = terminal.outcome === "cancelled" && action.reason?.startsWith("cancel:evidence_rejected:") ? "failed" : terminal.outcome;
    const terminalReason = terminalOutcome === "failed" && action.reason?.startsWith("cancel:evidence_rejected:") ? action.reason.slice("cancel:evidence_rejected:".length) : terminal.reason;
    const result = {
      actionId: action.options.actionId,
      attemptId: action.attemptId,
      actionKey: action.definition.key,
      goalId: action.options.goalId,
      planId: action.options.planId,
      planRevision: action.options.planRevision,
      outcome: terminalOutcome,
      reason: terminalReason,
      effects: terminalOutcome === "success" ? action.definition.effects : {},
      atSimMs: this.nowSimMs(),
      elapsedMs: action.elapsedMs,
      exitElapsedMs: action.exitElapsedMs
    };
    this.terminalLog.push(result);
    if (this.terminalLog.length > this.maxTerminalLog) {
      this.terminalLog.splice(0, this.terminalLog.length - this.maxTerminalLog);
    }
    this.pending.push(result);
    if (this.active === action) this.active = null;
    return result;
  }
};
function firstDependencyMismatch(expected, actual) {
  const actualByKey = new Map(actual.map((dependency) => [`${dependency.kind}:${dependency.id}`, dependency.revision]));
  for (const dependency of expected) {
    if (actualByKey.get(`${dependency.kind}:${dependency.id}`) !== dependency.revision) return dependency;
  }
  return null;
}
function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}
function viewOf(action) {
  return {
    actionId: action.options.actionId,
    actionKey: action.definition.key,
    goalId: action.options.goalId,
    planId: action.options.planId,
    planRevision: action.options.planRevision,
    attemptId: action.attemptId,
    evidenceKind: action.completion?.observationKind ?? null,
    phase: action.phase,
    channels: action.definition.channels,
    elapsedMs: action.elapsedMs,
    exitElapsedMs: action.exitElapsedMs,
    durationMs: action.definition.durationMs,
    reason: action.unconfirmedReason === null ? action.reason : `${action.reason}:exit_unconfirmed:${action.unconfirmedReason}`
  };
}
function conditionsHold(facts, conditions) {
  for (const [key, condition] of Object.entries(conditions)) {
    const value = facts[key] ?? false;
    if (typeof condition === "boolean") {
      if (value !== condition) return false;
      continue;
    }
    if (typeof condition === "number") {
      if (value !== condition) return false;
      continue;
    }
    if (typeof value !== "number") return false;
    if (condition.eq !== void 0 && value !== condition.eq) return false;
    if (condition.gte !== void 0 && !(value >= condition.gte)) return false;
    if (condition.lte !== void 0 && !(value <= condition.lte)) return false;
    if (condition.gt !== void 0 && !(value > condition.gt)) return false;
    if (condition.lt !== void 0 && !(value < condition.lt)) return false;
  }
  return true;
}

// packages/npc-core/src/runtime/single-action.ts
function isRecord(input) {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
function parseRequest(input) {
  if (!isRecord(input) || Object.keys(input).some((key) => !["requestId", "actionKey", "issuedAtWallMs", "ttlMs"].includes(key))) return null;
  if (typeof input.requestId !== "string" || input.requestId.length === 0 || input.requestId.length > 128 || typeof input.actionKey !== "string" || typeof input.issuedAtWallMs !== "number" || typeof input.ttlMs !== "number") return null;
  return { requestId: input.requestId, actionKey: input.actionKey, issuedAtWallMs: input.issuedAtWallMs, ttlMs: input.ttlMs };
}
var rejected = (requestId, reason) => Object.freeze({ requestId, accepted: false, status: "rejected", reason, actionId: null, attemptId: null, terminal: null });
var SingleActionLedger = class {
  entries = /* @__PURE__ */ new Map();
  activeId = null;
  get active() {
    return this.activeId === null ? null : this.entries.get(this.activeId) ?? null;
  }
  receipt(id) {
    return this.entries.get(id)?.receipt ?? null;
  }
  accept(input, context) {
    const request = parseRequest(input);
    if (!request) return rejected(isRecord(input) && typeof input.requestId === "string" ? input.requestId : null, "INVALID_ACTION_REQUEST");
    const fingerprint = canonicalJson(request);
    const existing = this.entries.get(request.requestId);
    if (existing) return existing.fingerprint === fingerprint ? existing.receipt : rejected(request.requestId, "COMMAND_CONFLICT");
    if (this.entries.size >= 256) return rejected(request.requestId, "COMMAND_LEDGER_FULL");
    let reason = context.refusal;
    if (request.actionKey !== "lookAround") reason = "UNSUPPORTED_ACTION";
    else if (!Number.isFinite(request.issuedAtWallMs) || !Number.isFinite(request.ttlMs) || request.ttlMs <= 0 || request.issuedAtWallMs > context.nowWallMs || !Number.isFinite(request.issuedAtWallMs + request.ttlMs)) reason = "INVALID_ACTION_TIME";
    else if (request.issuedAtWallMs + request.ttlMs <= context.nowWallMs) reason = "TTL_EXPIRED";
    const receipt = reason ? rejected(request.requestId, reason) : Object.freeze({ requestId: request.requestId, accepted: true, status: "accepted", reason: null, actionId: null, attemptId: null, terminal: null });
    this.entries.set(request.requestId, { request, fingerprint, receipt });
    if (receipt.accepted) this.activeId = request.requestId;
    return receipt;
  }
  started(action) {
    this.update({ status: "started", actionId: action.actionId, attemptId: action.attemptId });
  }
  bind(actionId, attemptId) {
    this.update({ actionId, attemptId });
  }
  cancel(reason) {
    const entry = this.active;
    if (!entry) return false;
    if (entry.receipt.status === "cancel_requested") return true;
    this.update({ status: "cancel_requested", reason });
    return true;
  }
  finish(terminal) {
    const receipt = this.active?.receipt;
    if (!receipt || receipt.actionId !== terminal.actionId || receipt.attemptId !== terminal.attemptId) return false;
    const status = terminal.outcome === "success" ? "succeeded" : terminal.outcome === "cancelled" ? "cancelled" : "failed";
    this.update({ status, reason: terminal.reason, terminal });
    this.activeId = null;
    return true;
  }
  finishBeforeStart(status, reason) {
    this.update({ status, reason });
    this.activeId = null;
  }
  update(patch) {
    const entry = this.active;
    if (entry) entry.receipt = Object.freeze({ ...entry.receipt, ...patch });
  }
};

// packages/npc-core/src/runtime/cancellation.ts
function cancellationResumeKeys(actor) {
  const keys = /* @__PURE__ */ new Set();
  if (!actor) return keys;
  for (const command of Object.values(actor.commands)) {
    if (command.type === "goal.request" && command.status === "active") keys.add(`command:${command.commandId}`);
  }
  for (const tool of Object.values(actor.tools)) {
    if (tool.phase === "active") keys.add(`tool:${tool.key}`);
  }
  for (const run of Object.values(actor.runs)) {
    if (run.phase === "active") keys.add(`run:${run.key}`);
  }
  if (actor.safety) keys.add(`safety:${actor.safety.reason}:${actor.safety.requestedAtWallMs}`);
  return keys;
}

// packages/npc-core/src/runtime/npc-runtime.ts
var runtimeInstance = 0;
var MAX_COMMIT_RETRIES = 3;
var MAX_REPORTED_HAZARDS = 1024;
var NpcRuntime = class {
  store;
  actorId;
  planner;
  fallback;
  motion;
  executor;
  singles = new SingleActionLedger();
  singleCounter = 0;
  actionKeys;
  maxReplanAttempts;
  planBudgetMs;
  maxTerminalLog;
  maxFailureLog;
  seatAvailable;
  instanceId = ++runtimeInstance;
  factState;
  /**
   * Already-applied external fact revisions (device feedback). Kept separate
   * from the domain store's facts revision: a device state lives in the device
   * controller, not in the M0 fact protocol, but a plan computed before the
   * feedback must still be recognised as stale.
   */
  externalFactsRevision = 0;
  currentPlan = null;
  steps = [];
  stepIndex = 0;
  session = null;
  attempts = 0;
  planCounter = 0;
  inFlight = null;
  lastCommitAttempt = null;
  lastInterruptKey = null;
  commitRetries = 0;
  disposedFlag = false;
  cancellationBaseline = null;
  cancelCounter = 0;
  reportedHazards = /* @__PURE__ */ new Set();
  failureLog = [];
  terminalLog = [];
  counters = {
    planRequests: 0,
    plansApplied: 0,
    plansDiscarded: 0,
    plansRejected: 0,
    actionsStarted: 0,
    actionsSucceeded: 0,
    actionsFailed: 0,
    actionsCancelled: 0,
    goalCommits: 0,
    replans: 0
  };
  constructor(options) {
    this.store = options.store;
    this.actorId = options.actorId;
    this.planner = options.planner;
    this.fallback = options.fallback ?? null;
    this.motion = options.motion;
    this.actionKeys = options.actionKeys ?? Object.keys(ACTION_CATALOG);
    this.maxReplanAttempts = Math.max(1, options.maxReplanAttempts ?? 3);
    this.planBudgetMs = Math.max(1, options.planBudgetMs ?? 4e3);
    this.maxTerminalLog = Math.max(1, options.maxTerminalLog ?? 256);
    this.maxFailureLog = Math.max(1, options.maxFailureLog ?? 512);
    this.seatAvailable = options.seatAvailable ?? (() => true);
    this.factState = defaultFacts();
    this.executor = new ActionExecutor({
      motion: this.motion,
      ...options.locks ? { locks: options.locks } : {},
      body: options.body ?? this.motionBody(),
      nowSimMs: () => this.store.snapshot.simTimeMs,
      actionTimeoutMs: options.actionTimeoutMs ?? 6e4,
      exitTimeoutMs: options.exitTimeoutMs,
      maxTerminalLog: this.maxTerminalLog
    });
  }
  /** Explicitly resource-free: gaze animation, no candidate or fabricated revision. */
  singleActionCapabilities() {
    return this.actionKeys.includes("lookAround") ? [{
      actionKey: "lookAround",
      posture: "standing",
      candidate: null,
      resourceDependencies: [],
      versionDependencies: [],
      channels: ACTION_CATALOG.lookAround?.channels ?? []
    }] : [];
  }
  requestSingleAction(input) {
    const actor = this.actorSnapshot();
    const manual = actor?.manual || actor?.goal.active?.layer === "manual" || actor?.goal.candidates.some((candidate) => candidate.layer === "manual");
    const refusal = this.disposedFlag ? "DISPOSED" : manual ? "MANUAL_PRIORITY" : this.store.snapshot.worldPaused || actor?.goal.active?.layer === "safety" ? "SAFETY_PRIORITY" : this.factState.sitting || actor?.posture === "sitting" || this.factState.fridgeGrasped ? "STANDING_REQUIRED" : !this.actionKeys.includes("lookAround") ? "UNSUPPORTED_ACTION" : this.singles.active || this.executor.current || this.inFlight || this.pendingInterrupt() || this.executionHeld || this.steps.length > 0 ? "BUSY" : null;
    return this.singles.accept(input, { nowWallMs: this.store.wallTimeMs, refusal });
  }
  singleActionReceipt(requestId) {
    return this.singles.receipt(requestId);
  }
  cancelSingleAction(requestId, reason = "operator:single-action") {
    const entry = this.singles.active;
    if (!entry || entry.request.requestId !== requestId) return false;
    this.singles.cancel(reason);
    if (entry.receipt.actionId) this.executor.requestCancel(reason);
    else this.singles.finishBeforeStart("cancelled", reason);
    return true;
  }
  /** Drive a command only through this runtime's existing executor. */
  stepSingleAction() {
    const entry = this.singles.active;
    if (!entry || entry.receipt.status !== "accepted") return;
    if (entry.request.issuedAtWallMs + entry.request.ttlMs <= this.store.wallTimeMs) {
      this.singles.finishBeforeStart("failed", "TTL_EXPIRED");
      return;
    }
    const definition = getActionDefinition(entry.request.actionKey);
    if (!definition) {
      this.singles.finishBeforeStart("failed", "UNSUPPORTED_ACTION");
      return;
    }
    this.resetPlan();
    const actionId = `single-${this.instanceId}-${++this.singleCounter}`;
    const result = this.executor.start(definition, {
      actorId: this.actorId,
      actionId,
      goalId: "single-action",
      planId: actionId,
      planRevision: this.executionRevision,
      facts: this.facts
    });
    this.singles.bind(actionId, result.attemptId);
    if (result.ok && this.executor.current) {
      this.singles.started(this.executor.current);
      this.counters.actionsStarted += 1;
    }
    this.processTerminals(this.executor.drain(), null);
  }
  refreshSingleActionPriority() {
    const entry = this.singles.active;
    if (!entry) return;
    const actor = this.actorSnapshot();
    const reason = this.store.snapshot.worldPaused || actor?.goal.active?.layer === "safety" ? "SAFETY_PRIORITY" : actor?.manual || actor?.goal.candidates.some((candidate) => candidate.layer === "manual") ? "MANUAL_PRIORITY" : entry.request.issuedAtWallMs + entry.request.ttlMs <= this.store.wallTimeMs ? "TTL_EXPIRED" : null;
    if (reason) this.cancelSingleAction(entry.request.requestId, reason);
  }
  /** Cancellation pauses execution, never invents a stand or releases a lease. */
  get executionHeld() {
    return this.cancellationBaseline !== null;
  }
  cancel(intent) {
    if (this.disposedFlag) return false;
    if (intent.scope === "action" && this.singles.active) return this.cancelSingleAction(this.singles.active.request.requestId);
    const actor = this.actorSnapshot();
    const cancelCommand = (targetCommandId) => this.store.dispatch({
      kind: "command",
      command: {
        specVersion: "1.0",
        commandId: `runtime-${this.instanceId}-cancel-${++this.cancelCounter}`,
        worldId: this.store.snapshot.worldId,
        actorId: this.actorId,
        type: "goal.cancel",
        targetCommandId,
        priorityClass: "task",
        ttlMs: 6e4,
        onConflict: "queue"
      }
    }).accepted;
    let hold = true;
    switch (intent.scope) {
      case "action":
        if (!this.executor.current) return false;
        break;
      case "goal": {
        const target = actor ? readId(actor.commands, intent.targetCommandId) : void 0;
        if (!cancelCommand(intent.targetCommandId)) return false;
        if (this.singles.active) return true;
        if (target?.goalId !== actor?.goal.active?.goalId) return true;
        const candidates = this.actorSnapshot()?.goal.candidates ?? [];
        if (candidates.some((candidate) => candidate.layer !== "autonomy" && candidate.goalId === target?.goalId)) return true;
        hold = !candidates.some((candidate) => candidate.layer !== "autonomy");
        break;
      }
      case "work":
        for (const command of Object.values(actor?.commands ?? {})) {
          if (command.type === "goal.request" && command.status === "active") cancelCommand(command.commandId);
        }
        break;
      default: {
        const exhaustive = intent;
        return exhaustive;
      }
    }
    if (hold) this.cancellationBaseline = cancellationResumeKeys(this.actorSnapshot());
    this.externalFactsRevision += 1;
    this.resetPlan();
    this.factState.handsOnKeyboard = false;
    this.executor.requestCancel(`operator:${intent.scope}`);
    return true;
  }
  refreshCancellationHold() {
    if (!this.cancellationBaseline) return;
    const keys = cancellationResumeKeys(this.actorSnapshot());
    if ([...keys].some((key) => !this.cancellationBaseline?.has(key))) this.cancellationBaseline = null;
  }
  /** Same version coordinate used by planner requests and attempt terminals. */
  get executionRevision() {
    return this.factsRevision();
  }
  get facts() {
    return { ...this.factState };
  }
  /**
   * Apply a measured EXTERNAL state (a device's feedback event) to the plan
   * facts. Only declared facts may be written; an unknown key is a programming
   * error, not a new fact. The action that predicted the same change still
   * commits its effect as a no-op, so the device remains the single authority.
   *
   * A plan in flight is invalidated by bumping the revision the planner sees.
   */
  applyExternalFacts(partial) {
    const applied = [];
    for (const [key, value] of Object.entries(partial)) {
      if (!Object.prototype.hasOwnProperty.call(this.factState, key)) {
        throw new Error(`UNKNOWN_FACT:${key}`);
      }
      if (typeof value !== "boolean") throw new TypeError(`FACT_NOT_BOOLEAN:${key}`);
      if (this.factState[key] !== value) {
        this.factState[key] = value;
        applied.push(key);
      }
    }
    if (applied.length > 0) this.externalFactsRevision += 1;
    return { applied, revision: this.factsRevision() };
  }
  factsRevision() {
    return this.store.snapshot.factsRevision + this.externalFactsRevision;
  }
  get plan() {
    return this.currentPlan;
  }
  get action() {
    return this.executor.current;
  }
  /** Reads and commits one adapter-owned post-world-step observation. */
  observeAction() {
    const receipt = this.executor.observe();
    this.processTerminals(this.executor.drain(), this.pendingInterrupt());
    this.reportHazards();
    return receipt;
  }
  get terminals() {
    return this.terminalLog;
  }
  get failures() {
    return this.failureLog;
  }
  get stats() {
    return { ...this.counters };
  }
  get busy() {
    return this.inFlight !== null;
  }
  get disposed() {
    return this.disposedFlag;
  }
  /**
   * Operator/safety recovery for an unconfirmed safe exit. The body must already
   * have been made safe by the caller; the release is recorded as a hazard and
   * the action terminates exactly once (M2-SPEC-03).
   */
  recoverUnconfirmedExit(reason) {
    const actionId = this.executor.current?.actionId;
    if (!actionId) return null;
    const terminal = this.executor.releaseUnconfirmed(actionId, reason);
    this.reportHazards();
    return terminal;
  }
  /**
   * Tears the runtime down: no further steps or plans, the active action is
   * force-stopped and settled once, and the planner (plus any fallback) is
   * terminated so no worker outlives the runtime (M2-SPEC-05).
   */
  dispose(reason = "runtime_dispose") {
    if (this.disposedFlag) return;
    this.disposedFlag = true;
    if (this.singles.active && !this.singles.active.receipt.actionId) this.singles.finishBeforeStart("cancelled", reason);
    this.executor.dispose(reason);
    this.processTerminals(this.executor.drain(), null);
    this.reportHazards();
    try {
      this.planner.terminate();
    } catch {
    }
    if (this.fallback) {
      try {
        this.fallback.terminate();
      } catch {
      }
    }
    this.inFlight = null;
    this.resetPlan();
  }
  /** Awaits every in-flight plan, including one started while settling. */
  async settle() {
    let guard = 0;
    while (this.inFlight && guard < 8) {
      guard += 1;
      const pending = this.inFlight.promise;
      await pending;
      if (this.inFlight && this.inFlight.promise === pending) break;
    }
  }
  /** Advances one frame: domain time, execution, handshake, planning. */
  step(dtMs) {
    if (this.disposedFlag) return;
    this.store.tick(dtMs);
    this.refreshCancellationHold();
    this.syncFacts();
    this.refreshSingleActionPriority();
    const interrupt = this.pendingInterrupt();
    const direct = this.singles.active !== null;
    const supersedes = direct || interrupt === null ? void 0 : (goalId) => interrupt.toGoalId !== goalId;
    this.processTerminals(this.executor.update(dtMs, { supersedes }), interrupt);
    this.reportHazards();
    this.stepSingleAction();
    if (this.singles.active) return;
    this.handleGoalState();
    this.startNextStep();
    this.refreshPlan();
  }
  /** Test/UI convenience: fixed sub-steps until `ms` elapses, awaiting plans. */
  async advance(ms, frameMs = 16) {
    let left = Math.max(0, ms);
    while (left > 1e-9) {
      const dt = Math.min(frameMs, left);
      this.step(dt);
      if (this.busy) await this.settle();
      left -= dt;
    }
  }
  /** Forces a planner round-trip (diagnostics/tests); respects `inFlight`. */
  requestPlan() {
    this.refreshPlan(true);
    return this.settle();
  }
  view() {
    const actor = this.actorSnapshot();
    return {
      actorId: this.actorId,
      facts: { ...this.factState },
      goalId: actor?.goal.active?.goalId ?? null,
      goalLayer: actor?.goal.active?.layer ?? null,
      plan: this.currentPlan,
      planIndex: this.stepIndex,
      action: this.executor.current,
      failures: this.failureLog,
      stats: { ...this.counters }
    };
  }
  motionBody() {
    const body = this.motion.body;
    return body ? { ...body } : { handReachM: 0.7, keyboardDistanceM: 0.5, seatClearanceM: 0.3 };
  }
  actorSnapshot() {
    const state = this.store.snapshot;
    return readId(state.actors, this.actorId);
  }
  syncFacts() {
    const actor = this.actorSnapshot();
    this.factState.sitting = actor?.posture === "sitting";
    this.factState.seatAvailable = this.seatAvailable();
    if (this.executionHeld || (actor?.goal.active?.goalId ?? null) !== "work") this.factState.handsOnKeyboard = false;
  }
  activeGoalId() {
    return this.actorSnapshot()?.goal.active?.goalId ?? null;
  }
  pendingInterrupt() {
    return this.actorSnapshot()?.goal.interrupt ?? null;
  }
  /**
   * Surfaces safety events from the executor once each. An unconfirmed exit or
   * an operator release is a real failure of the clean handshake, never a silent
   * success, and it is what a host/UI must show.
   */
  reportHazards() {
    for (const hazard of this.executor.hazards) {
      const key = `${hazard.actionId}:${hazard.kind}:${hazard.reason}`;
      if (this.reportedHazards.has(key)) continue;
      this.reportedHazards.add(key);
      if (this.reportedHazards.size > MAX_REPORTED_HAZARDS) {
        const oldest = this.reportedHazards.values().next();
        if (!oldest.done) this.reportedHazards.delete(oldest.value);
      }
      if (hazard.kind === "unsafe-release") {
        this.recordFailure("unsafe-release", `${hazard.actionKey}:${hazard.reason}`);
      } else {
        this.recordFailure("exit-unconfirmed", `${hazard.actionKey}:${hazard.kind}:${hazard.reason}`);
      }
    }
  }
  fingerprint() {
    const keys = Object.keys(this.factState).sort();
    return JSON.stringify(keys.map((key) => [key, this.factState[key]]));
  }
  resetPlan() {
    this.currentPlan = null;
    this.steps = [];
    this.stepIndex = 0;
    this.session = null;
  }
  handleGoalState() {
    if (this.disposedFlag) return;
    const actor = this.actorSnapshot();
    const active = actor?.goal.active ?? null;
    const interrupt = actor?.goal.interrupt ?? null;
    const action = this.executor.current;
    if (!active) {
      if (action) this.executor.requestCancel("no_active_goal");
      this.resetPlan();
      return;
    }
    if (!interrupt) {
      this.lastCommitAttempt = null;
      this.lastInterruptKey = null;
      this.commitRetries = 0;
    }
    if (interrupt) {
      const target = interrupt.toGoalId;
      if (action && action.goalId !== target) {
        if (action.phase === "running" || action.phase === "awaiting-evidence") this.executor.requestCancel("goal_switch");
        return;
      }
      const semanticKey = `${target ?? "null"}:${interrupt.reason}`;
      if (this.lastInterruptKey !== semanticKey) {
        this.lastInterruptKey = semanticKey;
        this.commitRetries = 0;
      }
      const key = `${interrupt.atRevision}:${semanticKey}`;
      if (this.lastCommitAttempt !== key) {
        this.lastCommitAttempt = key;
        const result = this.store.dispatch({
          kind: "goal.commit",
          actorId: this.actorId,
          goalId: target,
          reason: `runtime:${interrupt.reason}`,
          atRevision: interrupt.atRevision
        });
        if (result.accepted) {
          this.counters.goalCommits += 1;
          this.attempts = 0;
          this.commitRetries = 0;
          this.lastCommitAttempt = null;
          this.resetPlan();
        } else {
          this.recordFailure("commit-rejected", result.reason);
          if (result.reason === "STALE_COMMIT" && this.commitRetries < MAX_COMMIT_RETRIES) {
            this.commitRetries += 1;
            this.lastCommitAttempt = null;
          }
        }
      }
      return;
    }
    if (this.session && this.session.goalId !== active.goalId) this.resetPlan();
    if (this.currentPlan && this.currentPlan.goalId !== active.goalId) this.resetPlan();
  }
  processTerminals(terminals, interrupt) {
    for (const terminal of terminals) {
      if (this.singles.finish(terminal)) {
        this.pushTerminal(terminal);
        switch (terminal.outcome) {
          case "success":
            this.counters.actionsSucceeded += 1;
            this.commitEffects(terminal);
            break;
          case "failed":
            this.counters.actionsFailed += 1;
            break;
          case "cancelled":
            this.counters.actionsCancelled += 1;
            break;
          default: {
            const exhaustive = terminal.outcome;
            return exhaustive;
          }
        }
        this.resetPlan();
        continue;
      }
      const superseded = terminal.outcome === "success" && interrupt !== null && interrupt.toGoalId !== terminal.goalId;
      const effective = superseded ? { ...terminal, outcome: "cancelled", effects: {} } : terminal;
      this.pushTerminal(effective);
      if (effective.outcome === "success") {
        this.counters.actionsSucceeded += 1;
        this.attempts = 0;
        this.commitEffects(effective);
      } else if (effective.outcome === "failed") {
        this.counters.actionsFailed += 1;
        this.recordFailure("action-failed", effective.reason, effective);
        this.steps = [];
        this.currentPlan = null;
        this.attempts += 1;
        this.counters.replans += 1;
        if (this.attempts >= this.maxReplanAttempts) {
          this.recordFailure("replan-exhausted", effective.reason, effective);
          this.session = {
            goalId: effective.goalId,
            status: "failed",
            fingerprint: this.fingerprint()
          };
        } else {
          this.session = null;
        }
      } else {
        this.counters.actionsCancelled += 1;
        this.steps = [];
        this.currentPlan = null;
        this.session = null;
      }
    }
  }
  commitEffects(terminal) {
    const next = applyEffects(this.factState, terminal.effects);
    this.factState = { ...next };
    if (terminal.actionKey === "sitOnDeskChair") this.dispatchPosture("sitting", terminal);
    if (terminal.actionKey === "standUp") this.dispatchPosture("standing", terminal);
    this.syncFacts();
  }
  dispatchPosture(posture, terminal) {
    this.store.dispatch({
      kind: "posture.changed",
      actorId: this.actorId,
      posture,
      reason: `action:${terminal.actionKey}`
    });
  }
  startNextStep() {
    if (this.executionHeld || this.executor.current) return;
    if (!this.currentPlan || this.currentPlan.status !== "ok") return;
    if (this.steps.length === 0) {
      this.finishPlanIfSatisfied();
      return;
    }
    const definition = this.steps[0];
    if (!definition) return;
    if (!conditionsHold(this.factState, definition.preconditions)) {
      this.recordFailure("action-failed", `PRECONDITION_STALE:${definition.key}`);
      this.steps = [];
      this.currentPlan = null;
      this.session = null;
      this.attempts += 1;
      this.counters.replans += 1;
      if (this.attempts >= this.maxReplanAttempts) {
        this.recordFailure("replan-exhausted", `PRECONDITION_STALE:${definition.key}`);
        const active = this.activeGoalId();
        if (active) this.session = { goalId: active, status: "failed", fingerprint: this.fingerprint() };
      }
      return;
    }
    const actionId = `${this.currentPlan.planId}:${this.stepIndex}`;
    const result = this.executor.start(definition, {
      actorId: this.actorId,
      actionId,
      goalId: this.currentPlan.goalId,
      planId: this.currentPlan.planId,
      planRevision: this.currentPlan.revision,
      facts: { ...this.factState }
    });
    if (result.ok) {
      this.steps.shift();
      this.stepIndex += 1;
      this.counters.actionsStarted += 1;
    }
  }
  finishPlanIfSatisfied() {
    if (!this.currentPlan) return;
    const goalId = this.currentPlan.goalId;
    const conditions = goalConditions(goalId);
    if (conditionsHold(this.factState, conditions)) {
      this.session = { goalId, status: "satisfied", fingerprint: this.fingerprint() };
      this.currentPlan = { ...this.currentPlan, status: "satisfied" };
    } else {
      this.session = null;
      this.currentPlan = null;
    }
  }
  needsPlan(force) {
    if (this.disposedFlag || this.executionHeld || this.singles.active) return false;
    if (this.inFlight) return false;
    if (this.pendingInterrupt()) return false;
    const active = this.activeGoalId();
    if (!active) return false;
    const fingerprint = this.fingerprint();
    if (!force && this.session && this.session.goalId === active) {
      if (this.session.status === "satisfied" && this.session.fingerprint === fingerprint) return false;
      if (this.session.status === "failed" && this.session.fingerprint === fingerprint) return false;
      if (this.session.status === "executing" && (this.steps.length > 0 || this.executor.current !== null)) return false;
    }
    return true;
  }
  refreshPlan(force = false) {
    if (!this.needsPlan(force)) return;
    const active = this.activeGoalId();
    if (!active) return;
    const revision = this.factsRevision();
    const planId = `plan-${this.instanceId}-${this.actorId}-${++this.planCounter}`;
    const request = {
      planId,
      actorId: this.actorId,
      goalId: active,
      revision,
      facts: { ...this.factState },
      conditions: goalConditions(active),
      actions: planSpecs(this.actionKeys),
      budgetMs: this.planBudgetMs
    };
    this.counters.planRequests += 1;
    const promise = this.planner.plan(request).then((response) => this.onPlan(request, response)).catch((error) => {
      this.inFlight = null;
      if (this.disposedFlag) return;
      this.recordFailure("planner-error", error instanceof Error ? error.message : String(error));
    }).then(() => void 0);
    this.inFlight = { planId, promise };
  }
  onPlan(request, response) {
    if (this.disposedFlag) {
      this.inFlight = null;
      return;
    }
    if (this.inFlight && this.inFlight.planId === request.planId) this.inFlight = null;
    const currentRevision = this.factsRevision();
    const active = this.activeGoalId();
    if (this.executionHeld || response.revision !== currentRevision || active !== request.goalId || response.planId !== request.planId) {
      this.counters.plansDiscarded += 1;
      this.currentPlan = null;
      this.steps = [];
      this.session = null;
      return;
    }
    if (response.status === "no-plan") {
      this.currentPlan = response;
      this.steps = [];
      this.recordFailure("no-plan", response.error ?? "NO_PLAN");
      this.session = { goalId: request.goalId, status: "failed", fingerprint: this.fingerprint() };
      return;
    }
    if (response.status === "timeout" || response.status === "error") {
      this.currentPlan = response;
      this.steps = [];
      this.recordFailure(
        response.status === "timeout" ? "planner-timeout" : "planner-error",
        response.error ?? response.status
      );
      if (this.fallback) {
        void this.fallback.plan(request).then((fallbackResponse) => this.onFallback(request, fallbackResponse));
      } else {
        this.session = { goalId: request.goalId, status: "failed", fingerprint: this.fingerprint() };
      }
      return;
    }
    if (response.status === "satisfied") {
      this.currentPlan = response;
      this.steps = [];
      this.session = { goalId: request.goalId, status: "satisfied", fingerprint: this.fingerprint() };
      return;
    }
    const unknown = response.actions.filter((key) => getActionDefinition(key) === void 0);
    const disallowed = response.actions.filter((key) => !this.actionKeys.includes(key));
    if (unknown.length > 0 || disallowed.length > 0) {
      const reason = unknown.length > 0 ? `UNKNOWN_ACTION_IN_PLAN:${unknown.join(",")}` : `DISALLOWED_ACTION_IN_PLAN:${disallowed.join(",")}`;
      this.counters.plansRejected += 1;
      this.recordFailure("no-plan", reason);
      this.steps = [];
      this.currentPlan = null;
      this.attempts += 1;
      this.counters.replans += 1;
      this.session = { goalId: request.goalId, status: "failed", fingerprint: this.fingerprint() };
      if (this.attempts >= this.maxReplanAttempts) this.recordFailure("replan-exhausted", reason);
      return;
    }
    this.currentPlan = response;
    this.steps = response.actions.map((key) => getActionDefinition(key)).filter((definition) => definition !== void 0);
    this.stepIndex = 0;
    if (this.steps.length === 0) {
      this.recordFailure("no-plan", "EMPTY_PLAN");
      this.currentPlan = null;
      this.session = { goalId: request.goalId, status: "failed", fingerprint: this.fingerprint() };
      return;
    }
    this.counters.plansApplied += 1;
    if (this.steps.length !== response.actions.length) {
      this.recordFailure("no-plan", "UNKNOWN_ACTION_IN_PLAN");
      this.steps = [];
      this.currentPlan = null;
      this.session = null;
      return;
    }
    this.session = { goalId: request.goalId, status: "executing", fingerprint: this.fingerprint() };
  }
  onFallback(request, response) {
    const active = this.activeGoalId();
    if (response.revision !== this.store.snapshot.factsRevision || active !== request.goalId) {
      this.counters.plansDiscarded += 1;
      return;
    }
    if (response.status !== "ok" && response.status !== "satisfied") {
      this.session = { goalId: request.goalId, status: "failed", fingerprint: this.fingerprint() };
      return;
    }
    this.onPlan({ ...request, planId: response.planId }, { ...response, planId: request.planId });
  }
  recordFailure(kind, reason, terminal) {
    this.failureLog.push({
      revision: terminal?.planRevision ?? this.currentPlan?.revision ?? this.factsRevision(),
      atSimMs: this.store.snapshot.simTimeMs,
      goalId: terminal?.goalId ?? this.activeGoalId(),
      planId: terminal?.planId ?? this.currentPlan?.planId ?? null,
      kind,
      reason
    });
    this.trim(this.failureLog, this.maxFailureLog);
  }
  pushTerminal(terminal) {
    this.terminalLog.push(terminal);
    this.trim(this.terminalLog, this.maxTerminalLog);
  }
  trim(log, limit) {
    if (log.length > limit) log.splice(0, log.length - limit);
  }
};

// packages/npc-three/src/clips.ts
import * as THREE31 from "three";
function quatMul(a, b) {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
  };
}
function quatInv(q) {
  return { x: -q.x, y: -q.y, z: -q.z, w: q.w };
}
var FACING_FRAME = { x: 0, y: 1, z: 0, w: 0 };
function toNormalizedLocal(delta, parentRestWorld) {
  return quatMul(quatMul(quatInv(parentRestWorld), delta), parentRestWorld);
}
function buildBakedClip(vrm, data) {
  const tracks = [];
  const frameCount = data.meta.frameCount ?? 1;
  const times = new Array(frameCount);
  for (let i = 0; i < frameCount; i++) times[i] = i / data.fps;
  for (const bone of data.bones) {
    const node = vrm.humanoid.getNormalizedBoneNode(bone);
    if (!node) continue;
    const src = data.tracks[bone];
    if (!src) continue;
    const vals = new Float32Array(src.length);
    for (let i = 0; i + 3 < src.length; i += 4) {
      const local = toNormalizedLocal({ x: src[i], y: src[i + 1], z: src[i + 2], w: src[i + 3] }, FACING_FRAME);
      vals[i] = local.x;
      vals[i + 1] = local.y;
      vals[i + 2] = local.z;
      vals[i + 3] = local.w;
    }
    tracks.push(new THREE31.QuaternionKeyframeTrack(`${node.uuid}.quaternion`, times, vals));
  }
  const clip = new THREE31.AnimationClip(`npc_${data.name}`, data.duration, tracks);
  const rootAt = (t) => {
    const out = new THREE31.Vector3();
    const f = THREE31.MathUtils.clamp(t * data.fps, 0, frameCount - 1);
    const i0 = Math.floor(f);
    const i1 = Math.min(i0 + 1, frameCount - 1);
    const fr = f - i0;
    out.set(
      THREE31.MathUtils.lerp(data.root[i0 * 3] ?? 0, data.root[i1 * 3] ?? 0, fr),
      THREE31.MathUtils.lerp(data.root[i0 * 3 + 1] ?? 0, data.root[i1 * 3 + 1] ?? 0, fr),
      THREE31.MathUtils.lerp(data.root[i0 * 3 + 2] ?? 0, data.root[i1 * 3 + 2] ?? 0, fr)
    );
    return out;
  };
  const yawOf = (i) => {
    const q = data.tracks["hips"];
    if (!q) return 0;
    const b = i * 4;
    const x = q[b] ?? 0;
    const y = q[b + 1] ?? 0;
    const z = q[b + 2] ?? 0;
    const w = q[b + 3] ?? 1;
    return Math.atan2(2 * (w * y + x * z), 1 - 2 * (y * y + z * z));
  };
  return {
    name: data.name,
    data,
    clip,
    frameCount,
    durationS: data.duration,
    rootFinal: rootAt(data.duration),
    hipYawFirst: yawOf(0),
    hipYawLast: yawOf(frameCount - 1),
    rootAt
  };
}
async function loadBakedClips(vrm, baseUrl, names = ["npc_walk", "npc_sit_down", "npc_stand_up", "npc_typing", "npc_sit_fidget"]) {
  const clips = /* @__PURE__ */ new Map();
  const errors = [];
  for (const name of names) {
    try {
      const res = await fetch(`${baseUrl}/${name}.json`, { cache: "no-store" });
      if (!res.ok) {
        errors.push(`${name}: HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      clips.set(name, buildBakedClip(vrm, data));
    } catch (error) {
      errors.push(`${name}: ${error.message}`);
    }
  }
  return { clips, errors };
}

// packages/npc-three/src/slice.ts
import * as THREE38 from "three";

// packages/npc-scene/src/errors.ts
var SceneError = class extends Error {
  code;
  detail;
  constructor(code, message, detail) {
    super(`${code}: ${message}`);
    this.name = "SceneError";
    this.code = code;
    this.detail = detail;
  }
};

// packages/npc-scene/src/definitions/types.ts
function slotRef(binding) {
  return { sceneId: binding.sceneId, interactionId: binding.interactionId, slotId: binding.slotId };
}
function slotKey(ref) {
  return `${ref.sceneId}\0${ref.interactionId}\0${ref.slotId}`;
}
function sameSlot(a, b) {
  return a.sceneId === b.sceneId && a.interactionId === b.interactionId && a.slotId === b.slotId;
}
function bindingOf(slot, sceneRevision, matrixRevision) {
  return {
    sceneId: slot.sceneId,
    interactionId: slot.interactionId,
    slotId: slot.slotId,
    sceneRevision,
    matrixRevision
  };
}

// packages/npc-scene/src/definitions/build.ts
function freezeContact(contact) {
  Object.freeze(contact.point);
  Object.freeze(contact);
}
function freezeContacts(contacts) {
  if (contacts.seat) freezeContact(contacts.seat);
  if (contacts.feet) {
    for (const contact of contacts.feet) freezeContact(contact);
    Object.freeze(contacts.feet);
  }
  if (contacts.hands) {
    for (const contact of contacts.hands) freezeContact(contact);
    Object.freeze(contacts.hands);
  }
  Object.freeze(contacts);
}
function freezeSlot(definition) {
  if (definition.contacts) freezeContacts(definition.contacts);
  Object.freeze(definition.localPosition);
  Object.freeze(definition.approach.position);
  Object.freeze(definition.approach);
  if (definition.exit) {
    Object.freeze(definition.exit.position);
    Object.freeze(definition.exit);
  }
  Object.freeze(definition.capabilities);
  Object.freeze(definition.bodyProfiles);
  Object.freeze(definition.tags);
  return Object.freeze(definition);
}
function buildSlot(sceneId, interaction, slot, index) {
  return freezeSlot({
    sceneId,
    interactionId: interaction.id,
    slotId: slot.id,
    interactionKind: interaction.kind,
    index,
    pose: slot.pose,
    localPosition: [...slot.localTransform.position],
    localYawDeg: slot.localTransform.yawDeg,
    localFacingYawDeg: slot.facing.yawDeg,
    facingToleranceDeg: slot.facing.toleranceDeg ?? 0,
    approach: {
      position: [...slot.approach.position],
      radiusMeters: slot.approach.radiusMeters
    },
    ...slot.exit ? {
      exit: {
        position: [...slot.exit.position],
        radiusMeters: slot.exit.radiusMeters
      }
    } : {},
    ...slot.contacts ? { contacts: structuredClone(slot.contacts) } : {},
    capacity: 1,
    capabilities: Object.freeze([...slot.capabilities]),
    bodyProfiles: Object.freeze([...slot.compatibleBodyProfiles]),
    tags: Object.freeze([...slot.tags ?? []]),
    enabled: interaction.enabled
  });
}
function compositionSatisfied(composed, role) {
  if (composed.kind === role) return true;
  return composed.slots.some((slot) => slot.capabilities.includes(role));
}
function buildSceneDefinition(scene) {
  const interactionIds = /* @__PURE__ */ new Set();
  const byId = /* @__PURE__ */ new Map();
  const interactions = [];
  for (const interaction of scene.interactions) {
    if (interactionIds.has(interaction.id)) {
      throw new SceneError("DUPLICATE_ID", `interaction id "${interaction.id}" is declared twice`, {
        sceneId: scene.sceneId,
        interactionId: interaction.id
      });
    }
    interactionIds.add(interaction.id);
    const slotIds = /* @__PURE__ */ new Set();
    const slots = [];
    for (const [index, slot] of interaction.slots.entries()) {
      if (slotIds.has(slot.id)) {
        throw new SceneError(
          "DUPLICATE_SLOT",
          `slot id "${slot.id}" is declared twice in interaction "${interaction.id}"`,
          { sceneId: scene.sceneId, interactionId: interaction.id, slotId: slot.id }
        );
      }
      slotIds.add(slot.id);
      slots.push(buildSlot(scene.sceneId, interaction, slot, index));
    }
    const composedOf = (interaction.composedOf ?? []).map((part) => ({ ...part }));
    const definition = Object.freeze({
      sceneId: scene.sceneId,
      id: interaction.id,
      revision: interaction.revision,
      hostNode: interaction.hostNode,
      kind: interaction.kind,
      enabled: interaction.enabled,
      slots: Object.freeze(slots),
      composedOf: Object.freeze(composedOf),
      tags: Object.freeze([...interaction.tags ?? []])
    });
    interactions.push(definition);
    byId.set(definition.id, definition);
  }
  for (const definition of interactions) {
    for (const part of definition.composedOf) {
      if (part.interactionId === definition.id) {
        throw new SceneError(
          "INVALID_COMPOSITION",
          `interaction "${definition.id}" composes itself`,
          { sceneId: scene.sceneId, interactionId: definition.id }
        );
      }
      const composed = byId.get(part.interactionId);
      if (!composed) {
        throw new SceneError(
          "INVALID_COMPOSITION",
          `interaction "${definition.id}" composes missing interaction "${part.interactionId}"`,
          { sceneId: scene.sceneId, interactionId: definition.id, composedInteractionId: part.interactionId }
        );
      }
      const source = scene.interactions.find((candidate) => candidate.id === part.interactionId);
      if (!source || !compositionSatisfied(source, part.role)) {
        throw new SceneError(
          "INVALID_COMPOSITION",
          `role "${part.role}" is not offered by interaction "${part.interactionId}" (kind/capabilities must match)`,
          {
            sceneId: scene.sceneId,
            interactionId: definition.id,
            composedInteractionId: part.interactionId,
            role: part.role
          }
        );
      }
    }
  }
  const capabilityIndex = /* @__PURE__ */ new Map();
  for (const definition of interactions) {
    if (!definition.enabled) continue;
    for (const slot of definition.slots) {
      for (const capability of slot.capabilities) {
        const list = capabilityIndex.get(capability) ?? [];
        list.push(slot);
        capabilityIndex.set(capability, list);
      }
    }
  }
  const spawnPoints = [];
  const spawnIds = /* @__PURE__ */ new Set();
  for (const spawn of scene.spawnPoints) {
    if (spawnIds.has(spawn.id)) {
      throw new SceneError("DUPLICATE_ID", `spawn point id "${spawn.id}" is declared twice`, {
        sceneId: scene.sceneId,
        spawnId: spawn.id
      });
    }
    spawnIds.add(spawn.id);
    spawnPoints.push(
      Object.freeze({
        id: spawn.id,
        position: { x: spawn.position[0], y: spawn.position[1], z: spawn.position[2] },
        yawDeg: spawn.yawDeg
      })
    );
  }
  return Object.freeze({
    sceneId: scene.sceneId,
    revision: scene.revision,
    assetUri: scene.asset.uri,
    assetSha256: scene.asset.sha256 ?? null,
    interactions: Object.freeze(interactions),
    spawnPoints: Object.freeze(spawnPoints),
    autonomy: Object.freeze({ ...scene.autonomy }),
    capabilityIndex,
    byId
  });
}
function interactionOf(definition, interactionId) {
  const interaction = definition.byId.get(interactionId);
  if (!interaction) {
    throw new SceneError("UNKNOWN_INTERACTION", `scene "${definition.sceneId}" has no interaction "${interactionId}"`, {
      sceneId: definition.sceneId,
      interactionId
    });
  }
  return interaction;
}
function match(definition, interactionId, slot, query) {
  if (!slot.capabilities.includes(query.capability)) return false;
  if (query.kind && slot.interactionKind !== query.kind) return false;
  if (interactionId && slot.interactionId !== interactionId) return false;
  return true;
}
function selectSlot(definition, query) {
  if (query.interactionId) {
    const interaction = interactionOf(definition, query.interactionId);
    if (!interaction.enabled) {
      throw new SceneError(
        "INTERACTION_DISABLED",
        `interaction "${interaction.id}" is disabled in scene "${definition.sceneId}"`,
        { sceneId: definition.sceneId, interactionId: interaction.id, capability: query.capability }
      );
    }
    const found2 = interaction.slots.find((slot) => match(definition, interaction.id, slot, query));
    if (!found2) {
      throw new SceneError(
        "NO_ANNOTATION",
        `interaction "${interaction.id}" does not annotate capability "${query.capability}"`,
        { sceneId: definition.sceneId, interactionId: interaction.id, capability: query.capability }
      );
    }
    return found2;
  }
  const candidates = definition.capabilityIndex.get(query.capability) ?? [];
  const found = candidates.find((slot) => match(definition, void 0, slot, query));
  if (!found) {
    throw new SceneError(
      "NO_ANNOTATION",
      `no enabled slot in scene "${definition.sceneId}" annotates capability "${query.capability}"${query.kind ? ` (kind ${query.kind})` : ""}`,
      {
        sceneId: definition.sceneId,
        capability: query.capability,
        ...query.kind ? { kind: query.kind } : {}
      }
    );
  }
  return found;
}

// packages/npc-scene/src/resolver/math.ts
var DEG2RAD = Math.PI / 180;
function rotateY(local, yawDeg) {
  const rad = yawDeg * DEG2RAD;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [local[0] * c + local[2] * s, local[1], -local[0] * s + local[2] * c];
}
function composeTransform(parent, local) {
  const rotated = rotateY(local.position, parent.yawDeg);
  return {
    position: [parent.position[0] + rotated[0], parent.position[1] + rotated[1], parent.position[2] + rotated[2]],
    yawDeg: parent.yawDeg + local.yawDeg
  };
}
function transformPoint(transform, point2) {
  const rotated = rotateY(point2, transform.yawDeg);
  return {
    x: transform.position[0] + rotated[0],
    y: transform.position[1] + rotated[1],
    z: transform.position[2] + rotated[2]
  };
}
function facingDirection(yawDeg) {
  const rad = yawDeg * DEG2RAD;
  return { x: Math.sin(rad), z: Math.cos(rad) };
}

// packages/npc-scene/src/resolver/resolver.ts
function worldContact(transform, contact) {
  return Object.freeze({
    point: transformPoint(transform, [contact.point.x, contact.point.y, contact.point.z]),
    toleranceMeters: contact.toleranceMeters
  });
}
var SceneResolver = class {
  definition;
  transforms = /* @__PURE__ */ new Map();
  _matrixRevision = 0;
  /** interactionId -> solved host pose (authorised furniture motion only). */
  hostPoses = /* @__PURE__ */ new Map();
  /** interactionId -> monotonic solved-pose revision (0 = authored placement). */
  hostRevisions = /* @__PURE__ */ new Map();
  constructor(definition, transforms, options = {}) {
    this.definition = definition;
    this.setTransforms(transforms, options.matrixRevision ?? 1);
  }
  get sceneId() {
    return this.definition.sceneId;
  }
  get sceneRevision() {
    return this.definition.revision;
  }
  get matrixRevision() {
    return this._matrixRevision;
  }
  /**
   * Replaces the node transform table. The matrix revision must increase when
   * anything moved; re-using the old revision is a programming error, because
   * outstanding claims would be silently valid for the new placement.
   *
   * Non-finite positions/yaw are refused before anything is stored: a bad GLB
   * export must not propagate NaN into world poses, claims or (M4) IK targets
   * (M3Q-04).
   */
  setTransforms(transforms, matrixRevision = this._matrixRevision + 1) {
    if (!Number.isFinite(matrixRevision) || matrixRevision < 1) {
      throw new SceneError("SCENE_STALE", `matrix revision must be >= 1, got ${matrixRevision}`, {
        sceneId: this.definition.sceneId
      });
    }
    if (this._matrixRevision !== 0 && matrixRevision <= this._matrixRevision) {
      throw new SceneError(
        "SCENE_STALE",
        `matrix revision must increase (${this._matrixRevision} -> ${matrixRevision}); a moved node cannot keep the old revision`,
        { sceneId: this.definition.sceneId, from: this._matrixRevision, to: matrixRevision }
      );
    }
    const next = /* @__PURE__ */ new Map();
    for (const [node, transform] of Object.entries(transforms)) {
      const [x, y, z] = transform.position;
      if (![x, y, z].every((value) => Number.isFinite(value)) || !Number.isFinite(transform.yawDeg)) {
        throw new SceneError(
          "INVALID_TRANSFORM",
          `host node "${node}" has a non-finite transform (position ${String(x)},${String(y)},${String(z)} yaw ${String(transform.yawDeg)}); the asset export is invalid`,
          { sceneId: this.definition.sceneId, hostNode: node }
        );
      }
      next.set(node, { position: [x, y, z], yawDeg: transform.yawDeg });
    }
    this.transforms = next;
    this._matrixRevision = matrixRevision;
    this.hostPoses.clear();
    this.hostRevisions.clear();
  }
  /**
   * Publishes the solved world pose of ONE interaction's host. Only the
   * furniture-motion coordinator may call this (SceneWorld checks the motion
   * token and lease first). It does not bump `matrixRevision`: the authored
   * scene did not move and unrelated claims must stay valid.
   *
   * Returns the interaction's new solved-pose revision. The revision increases
   * only when the pose actually changes, so a stationary physics body does not
   * churn candidates every frame.
   */
  setHostPose(interactionId, pose) {
    interactionOf(this.definition, interactionId);
    const [x, y, z] = [pose.x, pose.y, pose.z];
    if (![x, y, z, pose.yawDeg].every((value) => Number.isFinite(value))) {
      throw new SceneError("INVALID_TRANSFORM", `solved host pose for "${interactionId}" is non-finite`, {
        sceneId: this.definition.sceneId,
        interactionId
      });
    }
    const current = this.hostPoses.get(interactionId);
    const next = { position: [x, y, z], yawDeg: pose.yawDeg };
    if (current && current.position[0] === x && current.position[1] === y && current.position[2] === z && current.yawDeg === pose.yawDeg) {
      return this.hostRevisions.get(interactionId) ?? 0;
    }
    this.hostPoses.set(interactionId, next);
    const revision = (this.hostRevisions.get(interactionId) ?? 0) + 1;
    this.hostRevisions.set(interactionId, revision);
    return revision;
  }
  /** Solved-pose revision of an interaction host (0 = authored placement). */
  hostPoseRevision(interactionId) {
    return this.hostRevisions.get(interactionId) ?? 0;
  }
  /** True when an interaction host has a solved (non-authored) pose. */
  hasHostPose(interactionId) {
    return this.hostPoses.has(interactionId);
  }
  /**
   * Drops a solved host pose: the interaction returns to its authored placement
   * (used by an explicit furniture reset). The scene matrix revision is
   * unchanged; the solved-pose revision keeps increasing so no candidate can
   * confuse the reverted pose with an older solved one.
   */
  clearHostPose(interactionId) {
    interactionOf(this.definition, interactionId);
    if (!this.hostPoses.has(interactionId)) return this.hostPoseRevision(interactionId);
    this.hostPoses.delete(interactionId);
    const revision = (this.hostRevisions.get(interactionId) ?? 0) + 1;
    this.hostRevisions.set(interactionId, revision);
    return revision;
  }
  /** Current host transform: solved pose when published, authored otherwise. */
  hostTransform(interactionId) {
    const solved = this.hostPoses.get(interactionId);
    if (solved) return solved;
    const interaction = interactionOf(this.definition, interactionId);
    return this.nodeTransform(interaction.hostNode, { interactionId });
  }
  hostNodes() {
    return [...this.transforms.keys()].sort();
  }
  /**
   * Fails with MISSING_NODE when an interaction's host node has no transform.
   * The actor's binding/action/claim path calls this before it uses a slot, so
   * an unannotated asset can never be planned, claimed or committed (M3Q-01).
   */
  assertHostNode(interactionId) {
    const interaction = interactionOf(this.definition, interactionId);
    return this.nodeTransform(interaction.hostNode, { interactionId });
  }
  nodeTransform(hostNode, context = {}) {
    const transform = this.transforms.get(hostNode);
    if (!transform) {
      throw new SceneError(
        "MISSING_NODE",
        `host node "${hostNode}" has no transform: the asset is unannotated for this scene (no fallback coordinates exist)`,
        {
          sceneId: this.definition.sceneId,
          hostNode,
          ...context.interactionId ? { interactionId: context.interactionId } : {}
        }
      );
    }
    return transform;
  }
  resolveSlot(ref) {
    const interaction = interactionOf(this.definition, ref.interactionId);
    const slot = interaction.slots.find((candidate) => candidate.slotId === ref.slotId);
    if (!slot) {
      throw new SceneError(
        "UNKNOWN_SLOT",
        `interaction "${interaction.id}" has no slot "${ref.slotId}"`,
        { sceneId: this.definition.sceneId, interactionId: interaction.id, slotId: ref.slotId }
      );
    }
    const node = this.hostTransform(interaction.id);
    const slotTransform = composeTransform(node, { position: slot.localPosition, yawDeg: slot.localYawDeg });
    const facingYawDeg = node.yawDeg + slot.localFacingYawDeg;
    const approach = composeTransform(node, {
      position: slot.approach.position,
      yawDeg: 0
    });
    const exit = slot.exit ? composeTransform(node, { position: slot.exit.position, yawDeg: 0 }) : void 0;
    const contacts = slot.contacts ? Object.freeze({
      ...slot.contacts.seat ? { seat: worldContact(node, slot.contacts.seat) } : {},
      ...slot.contacts.feet ? {
        feet: Object.freeze(
          slot.contacts.feet.map((contact) => worldContact(node, contact))
        )
      } : {},
      ...slot.contacts.hands ? {
        hands: Object.freeze(
          slot.contacts.hands.map((contact) => worldContact(node, contact))
        )
      } : {}
    }) : void 0;
    const binding = bindingOf(slot, this.definition.revision, this._matrixRevision);
    return Object.freeze({
      ref: Object.freeze(binding),
      definition: slot,
      sceneId: this.definition.sceneId,
      hostNode: interaction.hostNode,
      interactionKind: interaction.kind,
      pose: slot.pose,
      capabilities: slot.capabilities,
      worldPosition: transformPoint(node, slot.localPosition),
      worldYawDeg: slotTransform.yawDeg,
      worldFacingYawDeg: facingYawDeg,
      worldFacing: facingDirection(facingYawDeg),
      approach: Object.freeze({
        position: transformPoint(node, slot.approach.position),
        radiusMeters: slot.approach.radiusMeters
      }),
      ...exit ? {
        exit: Object.freeze({
          position: transformPoint(node, slot.exit.position),
          radiusMeters: slot.exit.radiusMeters
        })
      } : {},
      ...contacts ? { contacts } : {}
    });
  }
  resolveSpawn(spawnId) {
    const spawn = this.definition.spawnPoints.find((candidate) => candidate.id === spawnId);
    if (!spawn) {
      throw new SceneError("UNKNOWN_SPAWN", `scene "${this.definition.sceneId}" has no spawn point "${spawnId}"`, {
        sceneId: this.definition.sceneId,
        spawnId
      });
    }
    return Object.freeze({
      id: spawn.id,
      definition: spawn,
      position: Object.freeze({ ...spawn.position }),
      yawDeg: spawn.yawDeg
    });
  }
  /** A resolved slot is stale when either revision it was bound to has moved on. */
  isStale(slot) {
    return slot.ref.sceneRevision !== this.definition.revision || slot.ref.matrixRevision !== this._matrixRevision;
  }
};

// packages/npc-scene/src/leases/service.ts
var DEFAULT_TTL_MS = 5e3;
var DEFAULT_MAX_TTL_MS = 6e4;
var DEFAULT_MAX_CLAIMS = 64;
var DEFAULT_RELEASED_HISTORY = 256;
function expose(claim) {
  return Object.freeze({
    claimId: claim.claimId,
    owner: claim.owner,
    actionId: claim.actionId,
    fence: claim.fence,
    state: claim.state,
    slots: Object.freeze(claim.slots.map((slot) => Object.freeze({ ...slot }))),
    acquiredAtWallMs: claim.acquiredAtWallMs,
    leaseExpiresAtWallMs: claim.leaseExpiresAtWallMs,
    lastRenewedAtWallMs: claim.lastRenewedAtWallMs,
    note: claim.note,
    stale: claim.stale,
    engaged: claim.engaged
  });
}
function checkTtl(ttlMs, fallback, max) {
  const value = ttlMs ?? fallback;
  if (!Number.isFinite(value) || value <= 0 || value > max) return null;
  return value;
}
var InteractionService = class {
  leaseTtlMs;
  maxLeaseTtlMs;
  maxClaims;
  maxReleasedHistory;
  bySlot = createIdMap();
  byId = createIdMap();
  byOwner = createIdMap();
  releasedById = createIdMap();
  knownScenes = createIdMap();
  fenceCounter = 0;
  claimCounter = 0;
  releasedCounter = 0;
  constructor(options = {}) {
    this.leaseTtlMs = options.leaseTtlMs ?? DEFAULT_TTL_MS;
    this.maxLeaseTtlMs = options.maxLeaseTtlMs ?? Math.max(DEFAULT_MAX_TTL_MS, this.leaseTtlMs);
    this.maxClaims = options.maxClaims ?? DEFAULT_MAX_CLAIMS;
    this.maxReleasedHistory = options.maxReleasedHistory ?? DEFAULT_RELEASED_HISTORY;
    if (!Number.isFinite(this.leaseTtlMs) || this.leaseTtlMs <= 0) {
      throw new SceneError("INVALID_LAYOUT", `leaseTtlMs must be positive, got ${this.leaseTtlMs}`);
    }
  }
  // ---------------------------------------------------------------- queries
  slotState(slot) {
    const claim = readId(this.bySlot, slotKey(slot));
    return claim ? claim.state : "free";
  }
  claimFor(slot) {
    const claim = readId(this.bySlot, slotKey(slot));
    return claim ? expose(claim) : null;
  }
  claimForOwner(owner) {
    const claim = readId(this.byOwner, owner);
    return claim ? expose(claim) : null;
  }
  claimById(claimId) {
    const claim = readId(this.byId, claimId);
    return claim ? expose(claim) : null;
  }
  claims() {
    return Object.keys(this.byId).sort().map((id) => expose(this.byId[id]));
  }
  staleClaims() {
    return this.claims().filter((claim) => claim.stale);
  }
  /**
   * True when the slot is free, or already held by a live, current claim of
   * `owner`. A quarantined or stale claim is not available even to its owner:
   * it can no longer be confirmed, so availability must fail explicitly instead
   * of starting an action that cannot complete (M3-SPEC-02).
   */
  isAvailable(slot, owner) {
    const claim = readId(this.bySlot, slotKey(slot));
    if (!claim) return true;
    if (owner !== void 0 && claim.owner === owner && claim.state !== "quarantined" && !claim.stale) return true;
    return false;
  }
  stats() {
    const list = Object.keys(this.byId).map((id) => this.byId[id]);
    return {
      claims: list.length,
      fences: this.fenceCounter,
      quarantined: list.filter((claim) => claim.state === "quarantined").length,
      stale: list.filter((claim) => claim.stale).length
    };
  }
  /**
   * Side-effect-free availability check used by an action preflight. It applies
   * the same rules as `acquire` (own claim is fine, quarantined/stale is not).
   */
  check(request) {
    const normalized = this.normalize(request.slots);
    if (!normalized.ok) return normalized;
    const own = readId(this.byOwner, request.owner);
    if (own?.stale) {
      const staleSlot = normalized.slots.find((slot) => own.slots.some((held) => sameSlot(held, slot)));
      if (staleSlot) {
        return { ok: false, reason: "SCENE_STALE", conflict: { slot: slotRef(staleSlot), holder: own.owner } };
      }
    }
    for (const slot of normalized.slots) {
      if (this.revisionStale(slot)) {
        return { ok: false, reason: "SCENE_STALE", conflict: { slot: slotRef(slot), holder: own?.owner ?? "" } };
      }
      if (own && own.state !== "quarantined" && own.slots.some((candidate) => sameSlot(candidate, slot))) continue;
      const holder = readId(this.bySlot, slotKey(slot));
      if (!holder) continue;
      return {
        ok: false,
        reason: holder.state === "quarantined" ? "SLOT_QUARANTINED" : "SLOT_BUSY",
        conflict: { slot: slotRef(slot), holder: holder.owner }
      };
    }
    if (!own && Object.keys(this.byId).length >= this.maxClaims) {
      return { ok: false, reason: "WORLD_LIMIT" };
    }
    return { ok: true, claim: own ? expose(own) : null };
  }
  // --------------------------------------------------------------- mutation
  /**
   * Acquires every requested slot atomically, or nothing. A repeated call for
   * the same owner is idempotent; requesting a new slot extends the owner's
   * existing claim in stable slot order (a body holds one interaction group at
   * a time).
   */
  acquire(request) {
    const ttl = checkTtl(request.ttlMs, this.leaseTtlMs, this.maxLeaseTtlMs);
    if (ttl === null) return { ok: false, reason: "INVALID_TTL" };
    const normalized = this.normalize(request.slots);
    if (!normalized.ok) return normalized;
    const slots = normalized.slots;
    for (const slot of slots) {
      if (this.revisionStale(slot)) {
        return { ok: false, reason: "SCENE_STALE", conflict: { slot: slotRef(slot), holder: request.owner } };
      }
    }
    const existing = readId(this.byOwner, request.owner);
    if (existing) {
      if (existing.state === "quarantined") {
        return { ok: false, reason: "SLOT_QUARANTINED", claim: expose(existing) };
      }
      if (existing.stale) return { ok: false, reason: "SCENE_STALE", claim: expose(existing) };
      if (existing.state === "releasing") {
        return { ok: false, reason: "INVALID_TRANSITION", claim: expose(existing) };
      }
      const missing = slots.filter((slot) => !existing.slots.some((held) => sameSlot(held, slot)));
      if (missing.length === 0) return { ok: true, claim: expose(existing) };
      return this.extendInternal(existing, missing, request.nowWallMs, ttl);
    }
    for (const slot of slots) {
      const holder = readId(this.bySlot, slotKey(slot));
      if (holder && holder.owner !== request.owner) {
        return {
          ok: false,
          reason: holder.state === "quarantined" ? "SLOT_QUARANTINED" : "SLOT_BUSY",
          conflict: { slot: slotRef(slot), holder: holder.owner }
        };
      }
    }
    if (Object.keys(this.byId).length >= this.maxClaims) return { ok: false, reason: "WORLD_LIMIT" };
    const claim = {
      claimId: `claim-${++this.claimCounter}`,
      owner: request.owner,
      actionId: request.actionId,
      fence: ++this.fenceCounter,
      state: "reserved",
      slots,
      acquiredAtWallMs: request.nowWallMs,
      leaseExpiresAtWallMs: request.nowWallMs + ttl,
      lastRenewedAtWallMs: request.nowWallMs,
      note: null,
      stale: false,
      engaged: false
    };
    this.index(claim);
    return { ok: true, claim: expose(claim) };
  }
  /** Atomically adds slots to an existing claim (fence-guarded). */
  extend(claimId, fence, slots, nowWallMs) {
    const claim = readId(this.byId, claimId);
    if (!claim) return { ok: false, reason: "UNKNOWN_CLAIM" };
    if (claim.fence !== fence) return { ok: false, reason: "FENCE_MISMATCH" };
    if (claim.state === "quarantined") return { ok: false, reason: "INVALID_TRANSITION" };
    if (claim.stale) return { ok: false, reason: "SCENE_STALE", claim: expose(claim) };
    const normalized = this.normalize(slots);
    if (!normalized.ok) return normalized;
    return this.extendInternal(claim, normalized.slots, nowWallMs, this.leaseTtlMs);
  }
  /**
   * Marks a claim as engaged: its action's motion has begun and the body may be
   * entering the slot. From here on an expired lease quarantines instead of
   * freeing the reservation, so the slot can never be handed to another actor
   * while the first body may be in it (M3-SPEC-01).
   */
  engage(claimId, fence, nowWallMs) {
    const claim = readId(this.byId, claimId);
    if (!claim) return { ok: false, reason: "UNKNOWN_CLAIM" };
    if (claim.fence !== fence) return { ok: false, reason: "FENCE_MISMATCH" };
    if (claim.stale) return { ok: false, reason: "SCENE_STALE", claim: expose(claim) };
    if (claim.state === "quarantined" || claim.state === "releasing") {
      return { ok: false, reason: "INVALID_TRANSITION", claim: expose(claim) };
    }
    claim.engaged = true;
    claim.lastRenewedAtWallMs = Math.max(claim.lastRenewedAtWallMs, nowWallMs);
    return { ok: true, claim: expose(claim) };
  }
  occupy(claimId, fence, nowWallMs) {
    const claim = readId(this.byId, claimId);
    if (!claim) return { ok: false, reason: "UNKNOWN_CLAIM" };
    if (claim.fence !== fence) return { ok: false, reason: "FENCE_MISMATCH" };
    if (claim.stale) return { ok: false, reason: "SCENE_STALE", claim: expose(claim) };
    if (claim.state === "quarantined" || claim.state === "releasing") {
      return { ok: false, reason: "INVALID_TRANSITION", claim: expose(claim) };
    }
    claim.state = "occupied";
    claim.note = null;
    claim.lastRenewedAtWallMs = Math.max(claim.lastRenewedAtWallMs, nowWallMs);
    return { ok: true, claim: expose(claim) };
  }
  /**
   * Aborts a release: the body never left the slot (e.g. a stand-up motion was
   * cancelled), so the claim returns to `occupied` instead of being handed over.
   */
  reoccupy(claimId, fence, nowWallMs) {
    const claim = readId(this.byId, claimId);
    if (!claim) return { ok: false, reason: "UNKNOWN_CLAIM" };
    if (claim.fence !== fence) return { ok: false, reason: "FENCE_MISMATCH" };
    if (claim.state !== "releasing" && claim.state !== "reserved") {
      return { ok: false, reason: "INVALID_TRANSITION", claim: expose(claim) };
    }
    claim.state = "occupied";
    claim.note = "aborted-exit";
    claim.lastRenewedAtWallMs = Math.max(claim.lastRenewedAtWallMs, nowWallMs);
    return { ok: true, claim: expose(claim) };
  }
  beginRelease(claimId, fence, nowWallMs) {
    const claim = readId(this.byId, claimId);
    if (!claim) return { ok: false, reason: "UNKNOWN_CLAIM" };
    if (claim.fence !== fence) return { ok: false, reason: "FENCE_MISMATCH" };
    if (claim.state === "quarantined") return { ok: false, reason: "INVALID_TRANSITION", claim: expose(claim) };
    claim.state = "releasing";
    claim.lastRenewedAtWallMs = Math.max(claim.lastRenewedAtWallMs, nowWallMs);
    return { ok: true, claim: expose(claim) };
  }
  /**
   * Fence-guarded release. When `owner` is supplied it must match the claim's
   * owner as well: a caller that merely knows a claim id and fence (an old
   * adapter, a stale host) must not free somebody else's slot (M3Q-08). The M5
   * gateway is the authority that supplies the authenticated owner.
   */
  release(claimId, fence, reason, nowWallMs, owner) {
    const claim = readId(this.byId, claimId);
    if (!claim) {
      const released = readId(this.releasedById, claimId);
      if (!released) return { ok: false, reason: "UNKNOWN_CLAIM" };
      if (released.fence !== fence) return { ok: false, reason: "FENCE_MISMATCH" };
      return { ok: true, alreadyReleased: true };
    }
    if (claim.fence !== fence) return { ok: false, reason: "FENCE_MISMATCH" };
    if (owner !== void 0 && claim.owner !== owner) return { ok: false, reason: "OWNER_MISMATCH" };
    this.unindex(claim);
    this.rememberReleased(claim, nowWallMs);
    return { ok: true, claim: null };
  }
  /**
   * Slot-scoped guarded release. Used by hosts that only keep a slot address:
   * the current claim must match owner *and* fence, so a delayed release from a
   * previous owner can never free the new claim.
   */
  releaseSlot(slot, who, reason, nowWallMs) {
    const claim = readId(this.bySlot, slotKey(slot));
    if (!claim) return { ok: false, reason: "UNKNOWN_CLAIM" };
    if (claim.fence !== who.fence) return { ok: false, reason: "STALE_FENCE" };
    if (claim.owner !== who.owner) return { ok: false, reason: "OWNER_MISMATCH" };
    this.unindex(claim);
    this.rememberReleased(claim, nowWallMs);
    return { ok: true, claim: null };
  }
  renew(claimId, fence, ttlMs, nowWallMs) {
    const claim = readId(this.byId, claimId);
    if (!claim) return { ok: false, reason: "UNKNOWN_CLAIM" };
    if (claim.fence !== fence) return { ok: false, reason: "FENCE_MISMATCH" };
    if (claim.stale) return { ok: false, reason: "SCENE_STALE", claim: expose(claim) };
    if (claim.state === "quarantined") return { ok: false, reason: "INVALID_TRANSITION", claim: expose(claim) };
    const ttl = checkTtl(ttlMs, this.leaseTtlMs, this.maxLeaseTtlMs);
    if (ttl === null) return { ok: false, reason: "INVALID_TTL" };
    claim.leaseExpiresAtWallMs = nowWallMs + ttl;
    claim.lastRenewedAtWallMs = nowWallMs;
    return { ok: true, claim: expose(claim) };
  }
  /** Owner heartbeat: renews the owner's live claim without needing its fence. */
  heartbeat(owner, ttlMs, nowWallMs) {
    const claim = readId(this.byOwner, owner);
    if (!claim || claim.stale || claim.state === "quarantined") return 0;
    const result = this.renew(claim.claimId, claim.fence, ttlMs, nowWallMs);
    return result.ok ? 1 : 0;
  }
  /**
   * Expires leases at `nowWallMs`. An occupied/releasing claim, or a reservation
   * whose motion has already begun, is quarantined (the body may still be
   * there); only a reservation that never started a motion is freed, because no
   * body has confirmed entering the slot.
   */
  expire(nowWallMs) {
    const result = { quarantined: [], freed: [] };
    for (const claimId of Object.keys(this.byId)) {
      const claim = this.byId[claimId];
      if (claim.leaseExpiresAtWallMs > nowWallMs) continue;
      if (claim.state === "quarantined") continue;
      if (claim.state === "occupied" || claim.state === "releasing" || claim.engaged) {
        const wasOccupied = claim.state === "occupied" || claim.state === "releasing";
        claim.state = "quarantined";
        claim.note = wasOccupied ? "lease-expired" : "lease-expired-in-flight";
        result.quarantined.push(claim.claimId);
        continue;
      }
      this.unindex(claim);
      this.rememberReleased(claim, nowWallMs);
      result.freed.push(claim.claimId);
    }
    return result;
  }
  /**
   * Explicit recovery. Only a quarantined slot can be probed, and only a
   * positive "the slot is empty" confirmation frees it. A recovered claim is
   * *not* recorded as a clean release, so a late release from the lost owner is
   * refused instead of pretending a handshake happened.
   *
   * When `owner` is supplied the probe must come from the claim's owner: a
   * different in-process caller cannot declare somebody else's body gone
   * (M3Q-08; M5 supplies the authenticated owner).
   */
  probeEmpty(slot, options) {
    const claim = readId(this.bySlot, slotKey(slot));
    if (!claim) return { ok: false, reason: "UNKNOWN_CLAIM" };
    if (claim.state !== "quarantined") return { ok: false, reason: "INVALID_TRANSITION" };
    if (options.owner !== void 0 && claim.owner !== options.owner) return { ok: false, reason: "OWNER_MISMATCH" };
    if (!options.empty) return { ok: false, reason: "SLOT_NOT_EMPTY", claim: expose(claim) };
    this.unindex(claim);
    return { ok: true, claim: null };
  }
  /** Records the newest revision known for a scene (does not change claims). */
  noteSceneRevision(revision) {
    const current = readId(this.knownScenes, revision.sceneId);
    writeId(this.knownScenes, revision.sceneId, {
      sceneRevision: Math.max(current?.sceneRevision ?? 0, revision.sceneRevision),
      matrixRevision: Math.max(current?.matrixRevision ?? 0, revision.matrixRevision)
    });
  }
  /**
   * Declares that a scene moved. Claims bound to an older manifest/matrix
   * revision are marked stale: they keep occupying their slot (no teleport, no
   * hand-over) but cannot be confirmed or renewed until they safely release.
   */
  invalidateScene(revision) {
    this.noteSceneRevision(revision);
    const stale = [];
    for (const claimId of Object.keys(this.byId)) {
      const claim = this.byId[claimId];
      const affected = claim.slots.some(
        (slot) => slot.sceneId === revision.sceneId && (slot.sceneRevision < revision.sceneRevision || slot.matrixRevision < revision.matrixRevision)
      );
      if (!affected) continue;
      claim.stale = true;
      claim.note = "scene-invalidated";
      stale.push(expose(claim));
    }
    return stale;
  }
  /**
   * Scoped invalidation for an AUTHORISED furniture move: only claims whose
   * slots belong to the named interaction(s) of the scene are marked stale, and
   * the operator driving the motion is exempt (its lease is still the valid
   * authority for that slot). This is what keeps a moving chair from marking the
   * whole room stale on every solved pose while other actors' candidates on that
   * chair are still refused.
   *
   * It never changes the known scene/matrix revisions: the authored scene did
   * not move. A claim owned by another actor keeps its slot but can no longer be
   * confirmed or renewed — exactly the safe-denial semantics of invalidateScene.
   */
  invalidateSlots(filter, options = {}) {
    const ids = /* @__PURE__ */ new Set();
    if (filter.interactionId) ids.add(filter.interactionId);
    for (const id of filter.interactionIds ?? []) ids.add(id);
    const stale = [];
    for (const claimId of Object.keys(this.byId)) {
      const claim = this.byId[claimId];
      if (options.exceptOwner !== void 0 && claim.owner === options.exceptOwner) continue;
      const affected = claim.slots.some(
        (slot) => slot.sceneId === filter.sceneId && (ids.size === 0 || ids.has(slot.interactionId))
      );
      if (!affected) continue;
      claim.stale = true;
      claim.note = "host-motion-invalidated";
      stale.push(expose(claim));
    }
    return stale;
  }
  // --------------------------------------------------------------- internals
  normalize(slots) {
    const seen = createIdMap();
    const out = [];
    for (const slot of slots) {
      const key = slotKey(slot);
      if (hasId(seen, key)) return { ok: false, reason: "DUPLICATE_SLOT" };
      writeId(seen, key, true);
      out.push({ ...slot });
    }
    out.sort((a, b) => slotKey(a) < slotKey(b) ? -1 : slotKey(a) > slotKey(b) ? 1 : 0);
    return { ok: true, slots: out };
  }
  extendInternal(claim, slots, nowWallMs, ttlMs) {
    const missing = slots.filter((slot) => !claim.slots.some((held) => sameSlot(held, slot)));
    if (missing.length === 0) return { ok: true, claim: expose(claim) };
    for (const slot of missing) {
      if (this.revisionStale(slot)) {
        return { ok: false, reason: "SCENE_STALE", claim: expose(claim), conflict: { slot: slotRef(slot), holder: claim.owner } };
      }
      const holder = readId(this.bySlot, slotKey(slot));
      if (holder && holder.owner !== claim.owner) {
        return {
          ok: false,
          reason: holder.state === "quarantined" ? "SLOT_QUARANTINED" : "SLOT_BUSY",
          claim: expose(claim),
          conflict: { slot: slotRef(slot), holder: holder.owner }
        };
      }
    }
    for (const slot of missing) {
      claim.slots.push({ ...slot });
      writeId(this.bySlot, slotKey(slot), claim);
    }
    claim.slots.sort((a, b) => slotKey(a) < slotKey(b) ? -1 : slotKey(a) > slotKey(b) ? 1 : 0);
    claim.leaseExpiresAtWallMs = Math.max(claim.leaseExpiresAtWallMs, nowWallMs + ttlMs);
    return { ok: true, claim: expose(claim) };
  }
  revisionStale(slot) {
    const known = readId(this.knownScenes, slot.sceneId);
    if (!known) return false;
    return slot.sceneRevision < known.sceneRevision || slot.matrixRevision < known.matrixRevision;
  }
  index(claim) {
    writeId(this.byId, claim.claimId, claim);
    writeId(this.byOwner, claim.owner, claim);
    for (const slot of claim.slots) writeId(this.bySlot, slotKey(slot), claim);
  }
  unindex(claim) {
    deleteId(this.byId, claim.claimId);
    deleteId(this.byOwner, claim.owner);
    for (const slot of claim.slots) {
      const current = readId(this.bySlot, slotKey(slot));
      if (current === claim) deleteId(this.bySlot, slotKey(slot));
    }
    claim.slots = [];
  }
  rememberReleased(claim, nowWallMs) {
    writeId(this.releasedById, claim.claimId, { fence: claim.fence, atWallMs: nowWallMs });
    this.releasedCounter += 1;
    if (this.releasedCounter > this.maxReleasedHistory) {
      const oldest = Object.keys(this.releasedById)[0];
      if (oldest !== void 0) deleteId(this.releasedById, oldest);
      this.releasedCounter = Object.keys(this.releasedById).length;
    }
  }
};

// packages/npc-scene/src/nav/grid.ts
var NEIGHBORS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2]
];
function distanceToRect(x, z, rect2) {
  const dx = Math.max(rect2.minX - x, 0, x - rect2.maxX);
  const dz = Math.max(rect2.minZ - z, 0, z - rect2.maxZ);
  return Math.hypot(dx, dz);
}
var MIN_CELL_METERS = 0.01;
function validateLayout(layout) {
  if (layout.type !== "rect-grid") {
    throw new SceneError("INVALID_LAYOUT", `nav layout type must be "rect-grid", got "${String(layout.type)}"`, {
      layoutType: layout.type
    });
  }
  const cellMeters = layout.cellMeters ?? 0.05;
  if (!Number.isFinite(cellMeters) || cellMeters < MIN_CELL_METERS) {
    throw new SceneError(
      "INVALID_LAYOUT",
      `nav cellMeters must be a finite number >= ${MIN_CELL_METERS}, got ${String(cellMeters)}`,
      { cellMeters }
    );
  }
  const groups = [
    ["walkable", layout.walkable],
    ["obstacles", layout.obstacles]
  ];
  for (const [group, rects] of groups) {
    for (const rect2 of rects) {
      if (![rect2.minX, rect2.maxX, rect2.minZ, rect2.maxZ].every((value) => Number.isFinite(value))) {
        throw new SceneError("INVALID_LAYOUT", `nav ${group} rectangle has a non-finite bound`, {
          group,
          rect: rect2
        });
      }
      if (rect2.minX > rect2.maxX || rect2.minZ > rect2.maxZ) {
        throw new SceneError(
          "INVALID_LAYOUT",
          `nav ${group} rectangle is inverted (min greater than max): x ${rect2.minX}..${rect2.maxX}, z ${rect2.minZ}..${rect2.maxZ}`,
          { group, rect: rect2 }
        );
      }
    }
  }
}
var GridNavigation = class {
  algorithm = "astar-grid";
  layoutType = "rect-grid";
  radiusMeters;
  cellMeters;
  layout;
  minX;
  minZ;
  cols;
  rows;
  walk;
  block;
  stats;
  constructor(layout, radiusMeters) {
    validateLayout(layout);
    if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
      throw new SceneError("INVALID_LAYOUT", `actor radius must be positive, got ${radiusMeters}`, { radiusMeters });
    }
    this.layout = layout;
    this.radiusMeters = radiusMeters;
    this.cellMeters = layout.cellMeters ?? 0.05;
    const pad = this.cellMeters * 2 + radiusMeters;
    const xs = layout.walkable.flatMap((rect2) => [rect2.minX, rect2.maxX]);
    const zs = layout.walkable.flatMap((rect2) => [rect2.minZ, rect2.maxZ]);
    const empty = xs.length === 0;
    this.minX = (empty ? 0 : Math.min(...xs)) - pad;
    this.minZ = (empty ? 0 : Math.min(...zs)) - pad;
    const maxX = (empty ? 1 : Math.max(...xs)) + pad;
    const maxZ = (empty ? 1 : Math.max(...zs)) + pad;
    this.cols = Math.max(1, Math.ceil((maxX - this.minX) / this.cellMeters));
    this.rows = Math.max(1, Math.ceil((maxZ - this.minZ) / this.cellMeters));
    const total = this.cols * this.rows;
    this.walk = new Uint8Array(total);
    this.block = new Uint8Array(total);
    let walkableCells = 0;
    for (let j = 0; j < this.rows; j += 1) {
      for (let i = 0; i < this.cols; i += 1) {
        const x = this.centreX(i);
        const z = this.centreZ(j);
        if (layout.walkable.some((rect2) => x >= rect2.minX && x <= rect2.maxX && z >= rect2.minZ && z <= rect2.maxZ)) {
          this.walk[j * this.cols + i] = 1;
          walkableCells += 1;
        }
      }
    }
    let blockedCells = 0;
    for (const rect2 of layout.obstacles) {
      const i0 = Math.max(0, Math.floor((rect2.minX - radiusMeters - this.minX) / this.cellMeters));
      const i1 = Math.min(this.cols - 1, Math.ceil((rect2.maxX + radiusMeters - this.minX) / this.cellMeters));
      const j0 = Math.max(0, Math.floor((rect2.minZ - radiusMeters - this.minZ) / this.cellMeters));
      const j1 = Math.min(this.rows - 1, Math.ceil((rect2.maxZ + radiusMeters - this.minZ) / this.cellMeters));
      for (let j = j0; j <= j1; j += 1) {
        for (let i = i0; i <= i1; i += 1) {
          const x = this.centreX(i);
          const z = this.centreZ(j);
          if (x >= rect2.minX - radiusMeters && x <= rect2.maxX + radiusMeters && z >= rect2.minZ - radiusMeters && z <= rect2.maxZ + radiusMeters) {
            if (!this.block[j * this.cols + i]) {
              this.block[j * this.cols + i] = 1;
              blockedCells += 1;
            }
          }
        }
      }
    }
    let free = 0;
    for (let k = 0; k < total; k += 1) if (this.walk[k] && !this.block[k]) free += 1;
    this.stats = { freeCells: free, totalCells: total, walkableCells, blockedCells };
  }
  centreX(i) {
    return this.minX + (i + 0.5) * this.cellMeters;
  }
  centreZ(j) {
    return this.minZ + (j + 0.5) * this.cellMeters;
  }
  cellOf(x, z) {
    const i = Math.min(this.cols - 1, Math.max(0, Math.floor((x - this.minX) / this.cellMeters)));
    const j = Math.min(this.rows - 1, Math.max(0, Math.floor((z - this.minZ) / this.cellMeters)));
    return { i, j, k: j * this.cols + i };
  }
  isFree(x, z) {
    const { k } = this.cellOf(x, z);
    return this.walk[k] === 1 && this.block[k] === 0;
  }
  clearance(x, z) {
    let best = Number.POSITIVE_INFINITY;
    for (const rect2 of this.layout.obstacles) best = Math.min(best, distanceToRect(x, z, rect2));
    return best;
  }
  nearestFree(x, z, maxRadius) {
    if (this.isFree(x, z)) return { x, z, gap: 0 };
    const maxCells = Math.ceil(maxRadius / this.cellMeters);
    const origin = this.cellOf(x, z);
    let best = null;
    for (let r = 1; r <= maxCells; r += 1) {
      for (let di = -r; di <= r; di += 1) {
        for (let dj = -r; dj <= r; dj += 1) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          const i = origin.i + di;
          const j = origin.j + dj;
          if (i < 0 || j < 0 || i >= this.cols || j >= this.rows) continue;
          const k = j * this.cols + i;
          if (!this.walk[k] || this.block[k]) continue;
          const px = this.centreX(i);
          const pz = this.centreZ(j);
          const gap = Math.hypot(px - x, pz - z);
          if (gap <= maxRadius && (!best || gap < best.gap)) best = { x: px, z: pz, gap };
        }
      }
      if (best) return best;
    }
    return null;
  }
  /** Straight segment traversable for this actor radius? */
  lineFree(a, b) {
    const distance2 = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(1, Math.ceil(distance2 / (this.cellMeters * 0.5)));
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      if (!this.isFree(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
    }
    return true;
  }
  findPath(from, to, options = {}) {
    const goalTolerance = options.goalTolerance ?? 0.6;
    const empty = {
      ok: false,
      path: [],
      endGap: Number.POSITIVE_INFINITY,
      startGap: 0,
      stats: { expanded: 0, cells: this.cols * this.rows }
    };
    if (this.stats.freeCells === 0) {
      return {
        ...empty,
        reason: "no-walkable-area",
        detail: "no free navigation cell: check walkable/obstacle rectangles and actor radius"
      };
    }
    const start = this.nearestFree(from.x, from.z, 1);
    if (!start) {
      return {
        ...empty,
        reason: "start-blocked",
        detail: `start ${from.x.toFixed(2)},${from.z.toFixed(2)} has no free cell within 1 m`
      };
    }
    const goal = this.nearestFree(to.x, to.z, goalTolerance);
    if (!goal) {
      return {
        ...empty,
        reason: "goal-inside-obstacle",
        detail: `goal ${to.x.toFixed(2)},${to.z.toFixed(2)} needs more than ${goalTolerance} m clearance for radius ${this.radiusMeters} m`
      };
    }
    const startCell = this.cellOf(start.x, start.z);
    const goalCell = this.cellOf(goal.x, goal.z);
    const total = this.cols * this.rows;
    const gScore = new Float32Array(total).fill(Number.POSITIVE_INFINITY);
    const closed = new Uint8Array(total);
    const cameFrom = new Int32Array(total).fill(-1);
    const startK = startCell.k;
    const goalK = goalCell.k;
    const heuristic = (k) => {
      const i = k % this.cols;
      const j = Math.floor(k / this.cols);
      return Math.hypot(i - goalCell.i, j - goalCell.j);
    };
    const heap = [{ f: heuristic(startK), k: startK }];
    const push = (f, k) => {
      heap.push({ f, k });
      let child = heap.length - 1;
      while (child > 0) {
        const parent = child - 1 >> 1;
        if (heap[parent].f <= heap[child].f) break;
        [heap[parent], heap[child]] = [heap[child], heap[parent]];
        child = parent;
      }
    };
    const pop = () => {
      if (heap.length === 0) return null;
      const top = heap[0];
      const last2 = heap.pop();
      if (heap.length > 0) {
        heap[0] = last2;
        let parent = 0;
        for (; ; ) {
          const left = parent * 2 + 1;
          const right = left + 1;
          let smallest = parent;
          if (left < heap.length && heap[left].f < heap[smallest].f) smallest = left;
          if (right < heap.length && heap[right].f < heap[smallest].f) smallest = right;
          if (smallest === parent) break;
          [heap[smallest], heap[parent]] = [heap[parent], heap[smallest]];
          parent = smallest;
        }
      }
      return top;
    };
    gScore[startK] = 0;
    let bestK = startK;
    let bestH = heuristic(startK);
    let found = false;
    let expanded = 0;
    while (expanded < total * 4) {
      const current = pop();
      if (!current) break;
      const k = current.k;
      if (closed[k]) continue;
      closed[k] = 1;
      expanded += 1;
      const h = heuristic(k);
      if (h < bestH) {
        bestH = h;
        bestK = k;
      }
      if (k === goalK) {
        found = true;
        bestK = k;
        break;
      }
      const ci = k % this.cols;
      const cj = Math.floor(k / this.cols);
      for (const [di, dj, cost] of NEIGHBORS) {
        const ni = ci + di;
        const nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= this.cols || nj >= this.rows) continue;
        const nk = nj * this.cols + ni;
        if (closed[nk] || !this.walk[nk] || this.block[nk]) continue;
        if (di !== 0 && dj !== 0) {
          const a = cj * this.cols + ni;
          const b = nj * this.cols + ci;
          if (!this.walk[a] || this.block[a] || !this.walk[b] || this.block[b]) continue;
        }
        const tentative = gScore[k] + cost;
        if (tentative < gScore[nk]) {
          gScore[nk] = tentative;
          cameFrom[nk] = k;
          push(tentative + heuristic(nk), nk);
        }
      }
    }
    const cells = [];
    let cursor = bestK;
    while (cursor !== -1) {
      cells.push({ x: this.centreX(cursor % this.cols), z: this.centreZ(Math.floor(cursor / this.cols)) });
      if (cursor === startK) break;
      cursor = cameFrom[cursor];
    }
    cells.reverse();
    if (!found) {
      const last2 = cells[cells.length - 1] ?? start;
      const endGap2 = Math.hypot(to.x - last2.x, to.z - last2.z);
      return {
        ...empty,
        startGap: start.gap,
        endGap: endGap2,
        detail: `no path for radius ${this.radiusMeters} m; closest reachable cell is ${endGap2.toFixed(2)} m away`,
        reason: "unreachable",
        stats: { expanded, cells: total }
      };
    }
    const smoothed = this.smooth(cells);
    if (start.gap === 0) smoothed[0] = { x: from.x, z: from.z };
    const last = smoothed[smoothed.length - 1];
    let endGap = Math.hypot(to.x - last.x, to.z - last.z);
    if (endGap > 1e-6 && this.lineFree(last, to)) {
      smoothed.push({ x: to.x, z: to.z });
      endGap = 0;
    }
    return {
      ok: true,
      path: smoothed,
      endGap,
      startGap: start.gap,
      stats: { expanded, cells: total }
    };
  }
  smooth(cells) {
    if (cells.length <= 2) return cells.slice();
    const out = [cells[0]];
    let anchor = 0;
    for (let i = 2; i < cells.length; i += 1) {
      if (!this.lineFree(cells[anchor], cells[i])) {
        out.push(cells[i - 1]);
        anchor = i - 1;
      }
    }
    out.push(cells[cells.length - 1]);
    return out;
  }
};
var NavigationService = class _NavigationService {
  layoutType = "rect-grid";
  layout;
  obstacles;
  byRadius = /* @__PURE__ */ new Map();
  currentRevision = 0;
  obstacleRevisions = /* @__PURE__ */ new Map();
  get revision() {
    return this.currentRevision;
  }
  /** Recheck only changed geometry; old static inflation may contain a legal capsule start. */
  pathValidSince(revision, radiusMeters, points) {
    if (revision === this.currentRevision) return true;
    if (revision > this.currentRevision) return false;
    const changed = this.obstacles.filter((rect2) => (this.obstacleRevisions.get(rect2.name ?? "") ?? 0) > revision);
    if (changed.length === 0) return true;
    const grid = new GridNavigation({ ...this.layout, obstacles: changed }, radiusMeters);
    return points.every((point2, index) => grid.lineFree(points[Math.max(0, index - 1)] ?? point2, point2));
  }
  constructor(layout) {
    validateLayout(layout);
    this.layout = layout;
    this.obstacles = layout.obstacles.map((rect2) => ({ ...rect2 }));
  }
  forRadius(radiusMeters) {
    const key = radiusMeters.toFixed(3);
    const existing = this.byRadius.get(key);
    if (existing) return existing;
    const created = new GridNavigation({ ...this.layout, obstacles: this.obstacles }, radiusMeters);
    this.byRadius.set(key, created);
    return created;
  }
  /**
   * Replaces the rectangle declared under `name` (a moved piece of furniture).
   * Every cached radius grid is discarded, so a path can never be planned
   * against the previous obstacle rectangle: display, slot and navigation read
   * the same solved pose. `null` removes the obstacle.
   */
  updateObstacle(name, rect2) {
    if (!name) throw new SceneError("INVALID_LAYOUT", "nav obstacle name is required");
    const index = this.obstacles.findIndex((candidate) => candidate.name === name);
    if (rect2) {
      validateLayout({ ...this.layout, obstacles: [rect2] });
      const previous = this.obstacles[index];
      if (previous && previous.minX === rect2.minX && previous.maxX === rect2.maxX && previous.minZ === rect2.minZ && previous.maxZ === rect2.maxZ) return false;
      if (index >= 0) this.obstacles[index] = { ...rect2, name };
      else this.obstacles.push({ ...rect2, name });
    } else if (index >= 0) {
      this.obstacles.splice(index, 1);
    } else {
      return false;
    }
    this.currentRevision += 1;
    this.obstacleRevisions.set(name, this.currentRevision);
    this.byRadius.clear();
    return true;
  }
  obstacle(name) {
    const found = this.obstacles.find((candidate) => candidate.name === name);
    return found ? { ...found } : null;
  }
  /**
   * Candidate-pose view of the same layout: returns a NEW service with `name`
   * replaced by `rect`, leaving this one (and its caches) untouched. Motion
   * solving must ask "is the entry free IF the chair ends here?" without
   * publishing the candidate pose to the shared world first.
   */
  withObstacle(name, rect2) {
    if (!name) throw new SceneError("INVALID_LAYOUT", "nav obstacle name is required");
    validateLayout({ ...this.layout, obstacles: [rect2] });
    const obstacles = this.obstacles.map((candidate) => candidate.name === name ? { ...rect2, name } : candidate);
    if (!this.obstacles.some((candidate) => candidate.name === name)) obstacles.push({ ...rect2, name });
    return new _NavigationService({ ...this.layout, obstacles });
  }
  findPath(radiusMeters, from, to, options) {
    return this.forRadius(radiusMeters).findPath(from, to, options);
  }
  radii() {
    return [...this.byRadius.keys()].map(Number).sort((a, b) => a - b);
  }
};

// packages/npc-scene/src/wiring/requirements.ts
var SEAT = { capability: "sit", kind: "seat" };
var KEYBOARD = { capability: "type", kind: "keyboard" };
var APPLIANCE_SWITCH = { capability: "switch", kind: "generic" };
var FRIDGE = { capability: "operate", kind: "generic" };
var ACTION_SLOT_PLANS = Object.freeze({
  sitOnDeskChair: Object.freeze({ requirements: Object.freeze([SEAT]), onComplete: "occupy" }),
  typeAtKeyboard: Object.freeze({ requirements: Object.freeze([SEAT, KEYBOARD]), onComplete: "keep" }),
  thinkAtDesk: Object.freeze({ requirements: Object.freeze([SEAT]), onComplete: "keep" }),
  restAtDesk: Object.freeze({ requirements: Object.freeze([SEAT]), onComplete: "keep" }),
  standUp: Object.freeze({ requirements: Object.freeze([SEAT]), onComplete: "release", leave: true }),
  // The switch is a momentary hand resource: the press reserves it, engages it
  // while the palm moves, and gives it back when the hand has withdrawn.
  pressLampSwitchOn: Object.freeze({ requirements: Object.freeze([APPLIANCE_SWITCH]), onComplete: "release" }),
  pressLampSwitchOff: Object.freeze({ requirements: Object.freeze([APPLIANCE_SWITCH]), onComplete: "release" }),
  // The fridge chain is ONE hand lease that spans reach -> grasp -> open. Each
  // action reuses the hand actor's existing claim; the leaf is only given back
  // when the hand has withdrawn (releaseFridgeHandle) or the chain is
  // cancelled/failed (releaseOnExit).
  reachFridgeHandle: Object.freeze({ requirements: Object.freeze([FRIDGE]), onComplete: "keep", releaseOnExit: true }),
  graspFridgeHandle: Object.freeze({ requirements: Object.freeze([FRIDGE]), onComplete: "keep", releaseOnExit: true }),
  openFridgeDoor: Object.freeze({ requirements: Object.freeze([FRIDGE]), onComplete: "keep", releaseOnExit: true }),
  releaseFridgeHandle: Object.freeze({ requirements: Object.freeze([FRIDGE]), onComplete: "release", releaseOnExit: true })
});
function actionSlotPlan(actionKey) {
  if (!Object.prototype.hasOwnProperty.call(ACTION_SLOT_PLANS, actionKey)) return null;
  return ACTION_SLOT_PLANS[actionKey] ?? null;
}
function needsSlotPlan(definition) {
  return definition.postureTarget !== void 0 || definition.reach !== void 0 || definition.preconditions.sitting === true || definition.effects.sitting === true;
}
function assertSlotPlanCoverage(catalog = ACTION_CATALOG) {
  for (const [key, definition] of Object.entries(catalog)) {
    if (!needsSlotPlan(definition)) continue;
    if (actionSlotPlan(key)) continue;
    throw new Error(
      `NO_SLOT_PLAN: action "${key}" places the body (posture/reach/sitting) but has no entry in ACTION_SLOT_PLANS; it would execute without a world claim`
    );
  }
}
assertSlotPlanCoverage();

// packages/npc-scene/src/wiring/claiming-motion.ts
var ClaimingMotionAdapter = class {
  inner;
  port;
  renewIntervalMs;
  maxLog;
  entries = createIdMap();
  logEntries = [];
  constructor(inner, port, options = {}) {
    this.inner = inner;
    this.port = port;
    this.renewIntervalMs = Math.max(16, options.renewIntervalMs ?? 1e3);
    this.maxLog = Math.max(8, options.maxLog ?? 256);
  }
  get calls() {
    return this.inner.calls;
  }
  get exitDurationMs() {
    return this.inner.exitDurationMs;
  }
  /**
   * The wrapped adapter's body profile. NpcRuntime reads it to size the
   * executor's reach/clearance preflight; hiding it would silently fall back to
   * the default body and let a reach check pass for a body that cannot reach
   * (M3-SPEC-03).
   */
  get body() {
    return this.inner.body;
  }
  get log() {
    return this.logEntries;
  }
  /** Claims held by actions of this actor (diagnostics/UI). */
  activeClaimIds() {
    return Object.keys(this.entries).map((id) => this.entries[id].claimId);
  }
  preflight(definition, context, actionId) {
    const plan = actionSlotPlan(definition.key);
    if (!plan) return this.inner.preflight(definition, context, actionId);
    let bindings;
    try {
      bindings = plan.requirements.map((requirement) => this.port.resolve(requirement));
    } catch (error) {
      const code = error instanceof SceneError ? error.code : "NO_ANNOTATION";
      const reason = error instanceof Error ? error.message : String(error);
      this.record(actionId, definition.key, null, null, "refused", `${code}:${reason}`);
      return { ok: false, reason: `${code}:${definition.key}:${reason}` };
    }
    const availability = this.port.check(bindings);
    if (!availability.ok && plan.onComplete !== "release") {
      const reason = `${availability.reason ?? "SLOT_REFUSED"}${availability.holder ? `:${availability.holder}` : ""}`;
      this.record(actionId, definition.key, null, null, "refused", reason);
      return { ok: false, reason };
    }
    return this.inner.preflight(definition, context, actionId);
  }
  begin(definition, context, actionId) {
    const plan = actionSlotPlan(definition.key);
    if (!plan) {
      this.inner.begin(definition, context, actionId);
      return;
    }
    const existing = readId(this.entries, actionId);
    if (!existing) {
      const leaving = plan.onComplete === "release";
      const claim = this.port.ensureClaim(actionId, plan.requirements, { allowUnconfirmable: leaving });
      const entry = {
        claimId: claim.claimId,
        fence: claim.fence,
        actionKey: definition.key,
        completed: false,
        leaving,
        claimLost: false,
        lostReason: null,
        lastRenewAtWallMs: this.port.now()
      };
      writeId(this.entries, actionId, entry);
      if (!leaving && !this.port.engage(claim.claimId, claim.fence)) {
        throw new SceneError(
          "CLAIM_REFUSED",
          `actor "${this.port.owner}" could not engage its claim ${claim.claimId} before the motion began`,
          { actorId: this.port.owner, claimId: claim.claimId, fence: claim.fence, reason: "ENGAGE_REFUSED" }
        );
      }
      this.record(actionId, definition.key, claim.claimId, claim.fence, "acquired", null);
    }
    this.inner.begin(definition, context, actionId);
  }
  advance(actionId, dtMs) {
    const entry = readId(this.entries, actionId);
    if (entry && !entry.leaving && !entry.claimLost && this.port.now() - entry.lastRenewAtWallMs >= this.renewIntervalMs) {
      const ok = this.port.renew(entry.claimId, entry.fence);
      entry.lastRenewAtWallMs = this.port.now();
      if (!ok) {
        entry.claimLost = true;
        entry.lostReason = "renew-failed";
        this.record(actionId, entry.actionKey, entry.claimId, entry.fence, "renew-failed", "lease-not-renewed");
      }
    }
    this.inner.advance(actionId, dtMs);
  }
  result(actionId) {
    const result = this.inner.result(actionId);
    const entry = readId(this.entries, actionId);
    if (!entry) return result;
    if (entry.claimLost) {
      return { status: "failed", reason: `CLAIM_LOST:${entry.lostReason ?? "claim-unconfirmed"}` };
    }
    if (result.status === "completed" && !entry.completed) {
      const plan = actionSlotPlan(entry.actionKey);
      const completion = result.completion;
      if (plan?.onComplete === "occupy" && completion?.kind === "logical") {
        const ok = this.port.occupy(entry.claimId, entry.fence);
        if (!ok) {
          const state = this.port.claimState(entry.claimId);
          const stale = this.port.claimStale(entry.claimId);
          const reason = stale ? "SCENE_STALE" : state ?? "claim-gone";
          this.record(actionId, entry.actionKey, entry.claimId, entry.fence, "refused", `occupy-refused:${reason}`);
          return { status: "failed", reason: `CLAIM_LOST:occupy:${reason}` };
        }
        this.record(actionId, entry.actionKey, entry.claimId, entry.fence, "occupied", null);
      }
      if (completion?.kind === "logical") entry.completed = true;
    }
    return result;
  }
  observe(actionId, request) {
    const entry = readId(this.entries, actionId);
    if (entry) {
      const expectedLease = request.dependencies.find((dependency) => dependency.kind === "lease");
      if (expectedLease && (expectedLease.id !== entry.claimId || expectedLease.revision !== entry.fence)) {
        return {
          observationKind: request.observationKind,
          outcome: "rejected",
          reason: `EVIDENCE_VERSION_MISMATCH:lease:${expectedLease.id}`,
          simStep: request.afterSimStep,
          dependencies: request.dependencies
        };
      }
      if (entry.claimLost) {
        return {
          observationKind: request.observationKind,
          outcome: "rejected",
          reason: `CLAIM_LOST:${entry.lostReason ?? "claim-unconfirmed"}`,
          simStep: request.afterSimStep,
          dependencies: request.dependencies
        };
      }
      const state = this.port.claimState(entry.claimId);
      const stale = this.port.claimStale(entry.claimId);
      if (stale || state === null || state === "quarantined") {
        return {
          observationKind: request.observationKind,
          outcome: "rejected",
          reason: stale ? "SCENE_STALE" : `CLAIM_LOST:${state ?? "claim-gone"}`,
          simStep: request.afterSimStep,
          dependencies: request.dependencies
        };
      }
    }
    if (!this.inner.observe) {
      return { observationKind: request.observationKind, outcome: "rejected", reason: "EVIDENCE_ADAPTER_UNSUPPORTED", simStep: request.afterSimStep, dependencies: request.dependencies };
    }
    const evidence = this.inner.observe(actionId, request);
    const valid = evidence.outcome === "confirmed" && evidence.observationKind === request.observationKind && evidence.simStep > request.afterSimStep && request.dependencies.every((expected) => evidence.dependencies.some((actual) => actual.kind === expected.kind && actual.id === expected.id && actual.revision === expected.revision));
    if (valid && entry) {
      const plan = actionSlotPlan(entry.actionKey);
      if (plan?.onComplete === "occupy" && !entry.completed) {
        const ok = this.port.occupy(entry.claimId, entry.fence);
        if (!ok) {
          const state = this.port.claimState(entry.claimId);
          const stale = this.port.claimStale(entry.claimId);
          const reason = stale ? "SCENE_STALE" : state ?? "claim-gone";
          this.record(actionId, entry.actionKey, entry.claimId, entry.fence, "refused", `occupy-refused:${reason}`);
          return {
            ...evidence,
            outcome: "rejected",
            reason: `CLAIM_LOST:occupy:${reason}`
          };
        }
        this.record(actionId, entry.actionKey, entry.claimId, entry.fence, "occupied", null);
      }
      entry.completed = true;
    }
    return evidence;
  }
  beginExit(actionId) {
    const entry = readId(this.entries, actionId);
    if (entry) {
      const plan = actionSlotPlan(entry.actionKey);
      const state = this.port.claimState(entry.claimId);
      const leavesSlot = plan?.onComplete === "release" || plan?.releaseOnExit === true || state === "reserved";
      if (leavesSlot && state !== "quarantined" && state !== null) {
        const ok = this.port.beginRelease(entry.claimId, entry.fence);
        if (ok) this.record(actionId, entry.actionKey, entry.claimId, entry.fence, "releasing", null);
      }
    }
    this.inner.beginExit(actionId);
  }
  advanceExit(actionId, dtMs) {
    this.inner.advanceExit(actionId, dtMs);
  }
  exitComplete(actionId) {
    return this.inner.exitComplete(actionId);
  }
  /** Forward the inner adapter's physical occupancy (a failed sit can still hold the seat). */
  slotHeld(actionId) {
    return this.inner.slotHeld?.(actionId) === true;
  }
  forceStop(actionId) {
    return this.inner.forceStop(actionId);
  }
  cleanup(actionId) {
    const entry = readId(this.entries, actionId);
    deleteId(this.entries, actionId);
    let released = false;
    if (entry) {
      const plan = actionSlotPlan(entry.actionKey);
      const state = this.port.claimState(entry.claimId);
      if (entry.completed) {
        if (plan?.onComplete === "release") {
          released = this.port.release(entry.claimId, entry.fence, "completed");
          if (released) this.record(actionId, entry.actionKey, entry.claimId, entry.fence, "released", "completed");
        } else if (state === "occupied") {
          this.record(actionId, entry.actionKey, entry.claimId, entry.fence, "kept", "body-stays-in-slot");
        } else if (state === "reserved" || state === "releasing") {
          released = this.port.release(entry.claimId, entry.fence, "completed");
          this.record(
            actionId,
            entry.actionKey,
            entry.claimId,
            entry.fence,
            released ? "released" : "kept",
            released ? "not-occupied" : `not-occupied:${state}`
          );
        } else {
          this.record(actionId, entry.actionKey, entry.claimId, entry.fence, "kept", state === null ? "claim-gone" : "quarantined");
        }
      } else if (plan?.leave === true && state === "releasing" && this.inner.slotHeld?.(actionId) !== true) {
        released = this.port.release(entry.claimId, entry.fence, "cancelled");
        if (released) this.record(actionId, entry.actionKey, entry.claimId, entry.fence, "released", "body-left-slot");
      } else if (plan?.leave === true && state === "releasing") {
        const restored = this.port.reoccupy(entry.claimId, entry.fence);
        this.record(actionId, entry.actionKey, entry.claimId, entry.fence, "kept", restored ? "aborted-exit" : "restore-failed");
      } else if ((state === "reserved" || state === "releasing") && this.inner.slotHeld?.(actionId) === true) {
        const restored = this.port.reoccupy(entry.claimId, entry.fence);
        this.record(
          actionId,
          entry.actionKey,
          entry.claimId,
          entry.fence,
          "kept",
          restored ? "body-in-slot-after-failure" : `body-in-slot:${state}`
        );
      } else if (state === "reserved" || state === "releasing") {
        released = this.port.release(entry.claimId, entry.fence, "cancelled");
        if (released) this.record(actionId, entry.actionKey, entry.claimId, entry.fence, "released", "not-confirmed");
      } else if (plan?.releaseOnExit === true) {
        released = this.port.release(entry.claimId, entry.fence, "failed");
        if (released) this.record(actionId, entry.actionKey, entry.claimId, entry.fence, "released", "chain-exit");
      } else {
        this.record(actionId, entry.actionKey, entry.claimId, entry.fence, "kept", state === null ? "claim-gone" : "body-still-seated");
      }
    }
    this.inner.cleanup(actionId);
  }
  record(actionId, actionKey, claimId, fence, event, reason) {
    this.logEntries.push({
      actionId,
      actionKey,
      claimId,
      fence,
      event,
      reason,
      atWallMs: this.port.now()
    });
    if (this.logEntries.length > this.maxLog) this.logEntries.splice(0, this.logEntries.length - this.maxLog);
  }
};

// packages/npc-scene/src/motion/furniture-motion.ts
function checked(p) {
  if (![p.x, p.y, p.z, p.yaw].every(Number.isFinite)) throw new Error("INVALID_POSE");
  return { ...p };
}
var FurnitureMotionState = class {
  constructor(resourceId, initial) {
    this.resourceId = resourceId;
    if (!resourceId) throw new Error("INVALID_RESOURCE");
    this.pose = checked(initial);
  }
  pose;
  revision = 0;
  occupant = null;
  fence = 0;
  active = null;
  phase = "idle";
  stopped = true;
  occupy(actorId) {
    if (!actorId) throw new Error("INVALID_ACTOR");
    if (this.active) throw new Error("MOTION_ACTIVE");
    if (this.occupant && this.occupant !== actorId) throw new Error("SEAT_OCCUPIED");
    this.occupant = actorId;
  }
  vacate(actorId) {
    if (this.occupant !== actorId) throw new Error("NOT_OCCUPANT");
    if (this.active) throw new Error("MOTION_ACTIVE");
    this.occupant = null;
  }
  begin(actorId, mode) {
    if (!actorId) throw new Error("INVALID_ACTOR");
    if (this.active) throw new Error("MOTION_BUSY");
    if (mode !== "standing-manipulation" && mode !== "seated-propulsion") throw new Error("INVALID_MODE");
    if (this.occupant && this.occupant !== actorId) throw new Error("SEAT_OCCUPIED");
    if (mode === "seated-propulsion" && this.occupant !== actorId) throw new Error("NOT_OCCUPANT");
    if (mode === "standing-manipulation" && this.occupant) throw new Error("REQUIRES_EMPTY");
    this.active = Object.freeze({ resourceId: this.resourceId, actorId, fence: ++this.fence });
    this.phase = "moving";
    this.stopped = false;
    return this.active;
  }
  verify(t) {
    if (!this.active || t.resourceId !== this.resourceId || t.actorId !== this.active.actorId || t.fence !== this.active.fence) throw new Error("STALE_MOTION");
  }
  publish(t, solved, stopped) {
    this.verify(t);
    const next = checked(solved);
    if (typeof stopped !== "boolean") throw new Error("INVALID_STOP_STATE");
    if (next.x !== this.pose.x || next.y !== this.pose.y || next.z !== this.pose.z || next.yaw !== this.pose.yaw) this.revision++;
    this.pose = next;
    this.stopped = stopped;
  }
  observeIdle(solved, stopped) {
    if (this.active) throw new Error("MOTION_ACTIVE");
    const next = checked(solved);
    if (typeof stopped !== "boolean") throw new Error("INVALID_STOP_STATE");
    if (next.x !== this.pose.x || next.y !== this.pose.y || next.z !== this.pose.z || next.yaw !== this.pose.yaw) this.revision++;
    this.pose = next;
    this.stopped = stopped;
  }
  requestStop(t) {
    this.verify(t);
    this.phase = "stopping";
    this.stopped = false;
  }
  finish(t) {
    this.verify(t);
    if (this.phase !== "stopping" || !this.stopped) throw new Error("NOT_STOPPED");
    this.active = null;
    this.phase = "idle";
  }
  resolveLocal(p) {
    if (![p.x, p.y, p.z].every(Number.isFinite)) throw new Error("INVALID_LOCAL_POINT");
    const c = Math.cos(this.pose.yaw), s = Math.sin(this.pose.yaw);
    return { x: this.pose.x + c * p.x + s * p.z, y: this.pose.y + p.y, z: this.pose.z - s * p.x + c * p.z, revision: this.revision };
  }
  snapshot() {
    return { resourceId: this.resourceId, pose: { ...this.pose }, revision: this.revision, occupant: this.occupant, phase: this.phase, token: this.active ? { ...this.active } : null, stopped: this.stopped };
  }
};

// packages/npc-scene/src/motion/leased-furniture-motion.ts
var LeasedFurnitureMotion = class {
  constructor(claims, now, seat, manipulation, initial) {
    this.claims = claims;
    this.now = now;
    this.seat = seat;
    this.manipulation = manipulation;
    if (seat.sceneId !== manipulation.sceneId || seat.interactionId !== manipulation.interactionId || sameSlot(seat, manipulation)) throw new Error("INVALID_MOTION_SLOTS");
    this.motion = new FurnitureMotionState(seat.interactionId, initial);
  }
  motion;
  active = null;
  lease(id, fence, owner) {
    this.claims.expire(this.now());
    const c = this.claims.claimById(id);
    if (!c) throw new Error("UNKNOWN_CLAIM");
    if (c.fence !== fence) throw new Error("FENCE_MISMATCH");
    if (c.owner !== owner) throw new Error("OWNER_MISMATCH");
    if (c.stale || c.state === "quarantined" || c.state === "releasing") throw new Error("MOTION_AUTHORITY_LOST");
    if (!c.slots.some((s) => sameSlot(s, this.manipulation))) throw new Error("MOTION_SLOT_REQUIRED");
    return c;
  }
  begin(claimId, fence, owner, mode) {
    if (this.active) throw new Error("MOTION_BUSY");
    this.lease(claimId, fence, owner);
    const seatClaim = this.claims.claimFor(this.seat);
    if (seatClaim && (seatClaim.owner !== owner || seatClaim.stale || seatClaim.state === "quarantined" || seatClaim.state === "releasing")) throw new Error("SEAT_OCCUPIED");
    const occupant = seatClaim?.state === "occupied" ? seatClaim.owner : null;
    const prior = this.motion.snapshot().occupant;
    if (prior && prior !== occupant) this.motion.vacate(prior);
    if (occupant) this.motion.occupy(occupant);
    const token = this.motion.begin(owner, mode);
    const engaged = this.claims.engage(claimId, fence, this.now());
    if (!engaged.ok) {
      this.motion.requestStop(token);
      this.motion.publish(token, this.motion.snapshot().pose, true);
      this.motion.finish(token);
      throw new Error(engaged.reason);
    }
    this.active = { token, claimId, fence, owner };
    return token;
  }
  verify(t) {
    const a = this.active;
    if (!a || t.resourceId !== a.token.resourceId || t.actorId !== a.owner || t.fence !== a.token.fence) throw new Error("STALE_MOTION");
    return a;
  }
  canDrive(t) {
    const a = this.verify(t);
    if (this.motion.snapshot().phase === "stopping") return false;
    try {
      this.lease(a.claimId, a.fence, a.owner);
      return true;
    } catch {
      this.motion.requestStop(t);
      return false;
    }
  }
  publish(t, pose, stopped) {
    if (!this.canDrive(t)) throw new Error("MOTION_AUTHORITY_LOST");
    this.motion.publish(t, pose, stopped);
  }
  observeIdle(pose, stopped) {
    this.motion.observeIdle(pose, stopped);
  }
  requestStop(t) {
    this.verify(t);
    this.motion.requestStop(t);
  }
  observeStopping(t, pose, stopped) {
    this.verify(t);
    if (this.motion.snapshot().phase !== "stopping") throw new Error("NOT_STOPPING");
    this.motion.publish(t, pose, stopped);
  }
  finish(t) {
    this.verify(t);
    this.motion.finish(t);
    this.active = null;
  }
  resolveLocal(point2) {
    return this.motion.resolveLocal(point2);
  }
  snapshot() {
    const s = this.motion.snapshot(), c = this.claims.claimFor(this.seat);
    return { ...s, occupant: c && (c.state === "occupied" || c.state === "quarantined" || c.state === "releasing") ? c.owner : null };
  }
};

// packages/npc-scene/src/wiring/scene-world.ts
function isWithheld(error) {
  return error instanceof SceneError && (error.code === "NO_ANNOTATION" || error.code === "INTERACTION_DISABLED");
}
var SceneActor = class {
  actorId;
  sceneId;
  radiusMeters;
  ttlMs;
  world;
  constructor(world, registration) {
    this.world = world;
    this.actorId = registration.actorId;
    this.sceneId = registration.sceneId;
    this.radiusMeters = registration.radiusMeters;
    this.ttlMs = registration.ttlMs ?? world.leaseTtlMs;
  }
  get owner() {
    return this.actorId;
  }
  get resolver() {
    return this.world.scene(this.sceneId);
  }
  now() {
    return this.world.now();
  }
  /**
   * Slot address plus the revisions it was bound to. The host node must have a
   * transform: every action preview, claim and preflight goes through this
   * method, so an unannotated asset fails here with MISSING_NODE instead of
   * being planned and committed with no world pose (M3Q-01).
   */
  binding(query) {
    const resolver = this.resolver;
    const slot = selectSlot(resolver.definition, query);
    resolver.assertHostNode(slot.interactionId);
    return bindingOf(slot, resolver.sceneRevision, resolver.matrixRevision);
  }
  resolution(query) {
    const slot = selectSlot(this.resolver.definition, query);
    return this.resolver.resolveSlot({ interactionId: slot.interactionId, slotId: slot.slotId });
  }
  /**
   * The actions this scene offers this actor: every catalog action whose slot
   * requirements are annotated here. Unannotated actions are withheld from the
   * planner (M2Q-06) and refused explicitly if they still arrive.
   *
   * Only a missing annotation withholds an action. A missing host node or any
   * other error propagates: silently dropping `sitOnDeskChair` because the
   * chair has no transform would hide the defect from the host (M3Q-06).
   */
  actionKeys() {
    return Object.keys(ACTION_CATALOG).filter((key) => this.planAvailability(key).offered);
  }
  /** Why an action is not offered (capability not annotated in this scene). */
  actionDiagnostics() {
    const out = [];
    for (const key of Object.keys(ACTION_CATALOG)) {
      const availability = this.planAvailability(key);
      if (!availability.offered && availability.diagnostic) out.push(availability.diagnostic);
    }
    return out;
  }
  planAvailability(key) {
    const plan = actionSlotPlan(key);
    if (!plan) return { offered: true };
    try {
      for (const requirement of plan.requirements) this.binding(requirement);
      return { offered: true };
    } catch (error) {
      if (!isWithheld(error)) throw error;
      return {
        offered: false,
        diagnostic: {
          actionKey: key,
          code: error.code,
          reason: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
  /**
   * Fact source for the runtime: a seat is available when free or already ours.
   * A scene that annotates no seat reports false; anything else (missing host
   * node, programming error) propagates instead of reading as "no seat"
   * (M3Q-06).
   */
  seatAvailable() {
    try {
      return this.world.claims.isAvailable(this.binding({ capability: "sit", kind: "seat" }), this.actorId);
    } catch (error) {
      if (isWithheld(error)) return false;
      throw error;
    }
  }
  claim() {
    return this.world.claims.claimForOwner(this.actorId);
  }
  get nav() {
    return this.world.navigation(this.sceneId).forRadius(this.radiusMeters);
  }
  path(from, to, options) {
    return this.nav.findPath(from, to, options);
  }
  /** Wraps the M2 motion adapter so claims follow the confirmed action lifecycle. */
  motion(inner) {
    return new ClaimingMotionAdapter(inner, this);
  }
  /** Owner-wide liveness renewal (host heartbeat, no fence). */
  heartbeat() {
    return this.world.claims.heartbeat(this.actorId, this.ttlMs, this.now()) === 1;
  }
  releaseOwnClaim(reason = "teardown") {
    const claim = this.claim();
    if (!claim) return true;
    return this.world.claims.release(claim.claimId, claim.fence, reason, this.now(), this.actorId).ok;
  }
  // ------------------------------------------------------------- ClaimPort
  resolve(requirement) {
    return this.binding(requirement);
  }
  check(slots) {
    const result = this.world.claims.check({ owner: this.actorId, slots });
    return { ok: result.ok, ...result.reason ? { reason: result.reason } : {}, ...result.conflict ? { holder: result.conflict.holder } : {} };
  }
  ensureClaim(actionId, requirements, options = {}) {
    const bindings = requirements.map((requirement) => this.binding(requirement));
    const existing = this.claim();
    if (existing) {
      const unconfirmable = existing.state === "quarantined" || existing.stale || existing.state === "releasing";
      if (unconfirmable && options.allowUnconfirmable) return existing;
      const refusal = !unconfirmable ? null : existing.state === "quarantined" ? "SLOT_QUARANTINED" : existing.stale ? "SCENE_STALE" : "INVALID_TRANSITION";
      if (refusal) {
        throw new SceneError("CLAIM_REFUSED", `actor "${this.actorId}" cannot reuse its ${existing.state} claim: ${refusal}`, {
          actorId: this.actorId,
          reason: refusal,
          holder: this.actorId,
          slots: bindings.map(slotKey)
        });
      }
      const covered = bindings.every((binding) => existing.slots.some((held) => sameSlot(held, binding)));
      if (covered) {
        const renewed = this.world.claims.renew(existing.claimId, existing.fence, this.ttlMs, this.now());
        if (!renewed.ok || !renewed.claim) {
          throw new SceneError(
            "CLAIM_REFUSED",
            `actor "${this.actorId}" could not renew its claim: ${renewed.reason ?? "unknown"}`,
            { actorId: this.actorId, reason: renewed.reason ?? null, slots: bindings.map(slotKey) }
          );
        }
        return renewed.claim;
      }
      const extended = this.world.claims.extend(existing.claimId, existing.fence, bindings, this.now());
      if (!extended.ok || !extended.claim) {
        throw new SceneError(
          "CLAIM_REFUSED",
          `actor "${this.actorId}" could not extend its claim: ${extended.reason ?? "unknown"}`,
          {
            actorId: this.actorId,
            reason: extended.reason ?? null,
            holder: extended.conflict?.holder ?? null,
            slots: bindings.map(slotKey)
          }
        );
      }
      return extended.claim;
    }
    const acquired = this.world.claims.acquire({
      owner: this.actorId,
      actionId,
      slots: bindings,
      nowWallMs: this.now(),
      ttlMs: this.ttlMs
    });
    if (!acquired.ok || !acquired.claim) {
      throw new SceneError(
        "CLAIM_REFUSED",
        `actor "${this.actorId}" could not claim its slots: ${acquired.reason ?? "unknown"}`,
        {
          actorId: this.actorId,
          reason: acquired.reason ?? null,
          holder: acquired.conflict?.holder ?? null,
          slots: bindings.map(slotKey)
        }
      );
    }
    return acquired.claim;
  }
  claimState(claimId) {
    return this.world.claims.claimById(claimId)?.state ?? null;
  }
  claimStale(claimId) {
    return this.world.claims.claimById(claimId)?.stale === true;
  }
  engage(claimId, fence) {
    return this.world.claims.engage(claimId, fence, this.now()).ok;
  }
  reoccupy(claimId, fence) {
    return this.world.claims.reoccupy(claimId, fence, this.now()).ok;
  }
  occupy(claimId, fence) {
    return this.world.claims.occupy(claimId, fence, this.now()).ok;
  }
  beginRelease(claimId, fence) {
    return this.world.claims.beginRelease(claimId, fence, this.now()).ok;
  }
  releaseClaim(claimId, fence, reason) {
    return this.world.claims.release(claimId, fence, reason, this.now(), this.actorId).ok;
  }
  /** ClaimPort.release — fence-guarded release by the owning action. */
  release(claimId, fence, reason) {
    return this.releaseClaim(claimId, fence, reason);
  }
  /**
   * ClaimPort.renew — fence-guarded lease renewal for one claim. An old claim id
   * (or an old fence) must not extend the owner's current claim (M3Q-03).
   */
  renew(claimId, fence) {
    return this.world.claims.renew(claimId, fence, this.ttlMs, this.now()).ok;
  }
};
var SceneWorld = class {
  claims;
  leaseTtlMs;
  clock;
  scenes = /* @__PURE__ */ new Map();
  navs = /* @__PURE__ */ new Map();
  actorMap = /* @__PURE__ */ new Map();
  furnitureMap = /* @__PURE__ */ new Map();
  constructor(options = {}) {
    this.leaseTtlMs = options.leaseTtlMs ?? 5e3;
    this.clock = options.wallClock ?? (() => Date.now());
    this.claims = new InteractionService({
      leaseTtlMs: this.leaseTtlMs,
      ...options.maxClaims !== void 0 ? { maxClaims: options.maxClaims } : {}
    });
  }
  now() {
    return this.clock();
  }
  /**
   * Registers a scene atomically. The definition, the resolver and the
   * navigation layout are built and validated before anything is stored, so a
   * failure (invalid layout, missing host node, bad transform) leaves the world
   * exactly as it was and a corrected retry works (M3Q-11).
   */
  addScene(registration) {
    const { scene } = registration;
    if (this.scenes.has(scene.sceneId)) {
      throw new SceneError("DUPLICATE_SCENE", `scene "${scene.sceneId}" is already registered in this world`, {
        sceneId: scene.sceneId
      });
    }
    const prepared = this.prepareScene(registration, registration.matrixRevision ?? 1);
    this.scenes.set(scene.sceneId, prepared.resolver);
    if (prepared.navigation) this.navs.set(scene.sceneId, prepared.navigation);
    this.claims.noteSceneRevision({
      sceneId: scene.sceneId,
      sceneRevision: scene.revision,
      matrixRevision: prepared.resolver.matrixRevision
    });
    return prepared.resolver;
  }
  /**
   * Installs a re-exported manifest (M4's live export handshake) under the same
   * scene id. The new manifest must not go backwards and the matrix revision
   * must increase; claims bound to the old revisions are marked stale and keep
   * their slot until they release safely (no hand-over, no teleport).
   */
  replaceScene(registration) {
    const { scene } = registration;
    const current = this.scene(scene.sceneId);
    if (scene.revision < current.sceneRevision) {
      throw new SceneError(
        "SCENE_STALE",
        `scene "${scene.sceneId}" revision must not go backwards (${current.sceneRevision} -> ${scene.revision})`,
        { sceneId: scene.sceneId, from: current.sceneRevision, to: scene.revision }
      );
    }
    const matrixRevision = registration.matrixRevision ?? current.matrixRevision + 1;
    if (matrixRevision <= current.matrixRevision) {
      throw new SceneError(
        "SCENE_STALE",
        `scene "${scene.sceneId}" matrix revision must increase (${current.matrixRevision} -> ${matrixRevision})`,
        { sceneId: scene.sceneId, from: current.matrixRevision, to: matrixRevision }
      );
    }
    const prepared = this.prepareScene(registration, matrixRevision);
    this.scenes.set(scene.sceneId, prepared.resolver);
    if (prepared.navigation) this.navs.set(scene.sceneId, prepared.navigation);
    else this.navs.delete(scene.sceneId);
    return this.claims.invalidateScene({
      sceneId: scene.sceneId,
      sceneRevision: scene.revision,
      matrixRevision
    });
  }
  /**
   * Builds and validates everything a registration needs without touching the
   * world. Every enabled interaction must have its host node transform here:
   * the runtime's binding path is fail-fast, so registering an unannotated
   * asset would only move the failure to the first action (M3Q-01).
   */
  prepareScene(registration, matrixRevision) {
    const definition = buildSceneDefinition(registration.scene);
    const resolver = new SceneResolver(definition, registration.transforms, { matrixRevision });
    for (const interaction of definition.interactions) {
      if (!interaction.enabled) continue;
      resolver.assertHostNode(interaction.id);
    }
    const navigation = registration.nav ? new NavigationService(registration.nav) : void 0;
    return { resolver, ...navigation ? { navigation } : {} };
  }
  scene(sceneId) {
    const resolver = this.scenes.get(sceneId);
    if (!resolver) {
      throw new SceneError("UNKNOWN_SCENE", `world has no scene "${sceneId}"`, { sceneId });
    }
    return resolver;
  }
  navigation(sceneId) {
    this.scene(sceneId);
    const nav = this.navs.get(sceneId);
    if (!nav) {
      throw new SceneError(
        "NAV_NOT_DECLARED",
        `scene "${sceneId}" has no navigation layout: v1 manifests carry no walkable data, the host must supply rect-grid geometry`,
        { sceneId }
      );
    }
    return nav;
  }
  /**
   * Registers a movable resource. It binds the EXISTING seat and manipulation
   * slots to one transaction coordinator that reads authority from the world's
   * single InteractionService: no second lease table is created.
   *
   * The initial pose is the solved (physically measured) pose, never invented
   * here. The footprint, when declared, becomes the nav obstacle under
   * `obstacleName` and is updated with every published pose.
   */
  registerFurniture(registration) {
    const { resourceId, sceneId } = registration;
    if (!resourceId) throw new SceneError("INVALID_LAYOUT", "furniture resourceId is required");
    if (this.furnitureMap.has(resourceId)) {
      throw new SceneError("DUPLICATE_ID", `furniture resource "${resourceId}" is already registered`, { resourceId });
    }
    const resolver = this.scene(sceneId);
    for (const slot of [registration.seat, registration.manipulation]) {
      const resolved = resolver.resolveSlot({ interactionId: slot.interactionId, slotId: slot.slotId });
      if (!resolved) throw new SceneError("UNKNOWN_SLOT", `furniture slot ${slot.interactionId}/${slot.slotId} is missing`);
    }
    if (registration.seat.interactionId === registration.manipulation.interactionId && registration.seat.slotId === registration.manipulation.slotId) {
      throw new SceneError("INVALID_LAYOUT", `furniture "${resourceId}" seat and manipulation slots must differ`, { resourceId });
    }
    const seatRef = { sceneId, interactionId: registration.seat.interactionId, slotId: registration.seat.slotId };
    const manipulationRef = { sceneId, interactionId: registration.manipulation.interactionId, slotId: registration.manipulation.slotId };
    const origin = { ...registration.pose };
    const motion = new LeasedFurnitureMotion(this.claims, () => this.now(), seatRef, manipulationRef, origin);
    const entry = {
      registration,
      motion,
      origin,
      obstacleName: registration.footprint ? registration.obstacleName ?? resourceId : null
    };
    this.furnitureMap.set(resourceId, entry);
    if (registration.footprint && entry.obstacleName) {
      const nav = this.navgationOrNull(sceneId);
      nav?.updateObstacle(entry.obstacleName, { ...registration.footprint, name: entry.obstacleName });
    }
    return this.furnitureView(resourceId);
  }
  navgationOrNull(sceneId) {
    return this.navs.get(sceneId) ?? null;
  }
  furniture(resourceId) {
    return this.furnitureView(resourceId);
  }
  furnitureResources() {
    return [...this.furnitureMap.keys()].sort();
  }
  furnitureEntry(resourceId) {
    const entry = this.furnitureMap.get(resourceId);
    if (!entry) throw new SceneError("INVALID_LAYOUT", `world has no furniture resource "${resourceId}"`, { resourceId });
    return entry;
  }
  furnitureView(resourceId) {
    const entry = this.furnitureEntry(resourceId);
    const snapshot = entry.motion.snapshot();
    const resolver = this.scene(entry.registration.sceneId);
    const obstacle = entry.obstacleName ? this.navgationOrNull(entry.registration.sceneId)?.obstacle(entry.obstacleName) ?? null : null;
    return {
      resourceId,
      sceneId: entry.registration.sceneId,
      pose: { ...snapshot.pose },
      poseRevision: snapshot.revision,
      hostRevision: resolver.hostPoseRevision(entry.registration.seat.interactionId),
      occupant: snapshot.occupant,
      phase: snapshot.phase,
      moving: snapshot.phase === "moving",
      stopped: snapshot.stopped,
      obstacle
    };
  }
  /** Starts a motion transaction with the operator's EXISTING claim. */
  beginFurnitureMotion(request) {
    return this.furnitureEntry(request.resourceId).motion.begin(request.claimId, request.fence, request.owner, request.mode);
  }
  canDriveFurnitureMotion(resourceId, token) {
    return this.furnitureEntry(resourceId).motion.canDrive(token);
  }
  /**
   * Publishes the SOLVED pose of the physical body. This is the only path that
   * moves a furniture host:
   *  - the motion token and the operator's live lease are verified first;
   *  - the resolver receives a per-interaction solved pose (matrixRevision does
   *    NOT move, so unrelated claims survive);
   *  - every other actor's claim on that interaction is marked stale;
   *  - the nav obstacle is replaced and cached grids dropped.
   *
   * During `stopping` the brake pose is accepted without re-acquiring authority
   * (the lease may already be gone); a lost authority before that is reported,
   * never applied as a new movement.
   */
  publishFurniturePose(request) {
    const entry = this.furnitureEntry(request.resourceId);
    const pose = request.pose;
    if (![pose?.x, pose?.y, pose?.z, pose?.yaw].every((value) => Number.isFinite(value)) || typeof request.stopped !== "boolean") {
      const snapshot = entry.motion.snapshot();
      return {
        ok: false,
        reason: "INVALID_POSE",
        poseRevision: snapshot.revision,
        hostRevision: this.scene(entry.registration.sceneId).hostPoseRevision(entry.registration.seat.interactionId)
      };
    }
    const before = entry.motion.snapshot();
    try {
      if (before.phase === "stopping") entry.motion.observeStopping(request.token, request.pose, request.stopped);
      else entry.motion.publish(request.token, request.pose, request.stopped);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      if (before.phase === "moving") {
        try {
          entry.motion.requestStop(request.token);
        } catch {
        }
      }
      const snapshot = entry.motion.snapshot();
      return { ok: false, reason, poseRevision: snapshot.revision, hostRevision: this.scene(entry.registration.sceneId).hostPoseRevision(entry.registration.seat.interactionId) };
    }
    const after = entry.motion.snapshot();
    const scene = this.scene(entry.registration.sceneId);
    const interactionIds = [entry.registration.seat.interactionId, entry.registration.manipulation.interactionId];
    if (after.revision !== before.revision) {
      const yawDeg = request.pose.yaw * 180 / Math.PI;
      for (const interactionId of new Set(interactionIds)) {
        scene.setHostPose(interactionId, { x: request.pose.x, y: request.pose.y, z: request.pose.z, yawDeg });
      }
      this.claims.invalidateSlots(
        { sceneId: entry.registration.sceneId, interactionIds: [...new Set(interactionIds)] },
        { exceptOwner: request.token.actorId }
      );
      if (entry.obstacleName && entry.registration.footprint) {
        const nav = this.navgationOrNull(entry.registration.sceneId);
        nav?.updateObstacle(entry.obstacleName, {
          ...this.solvedFootprint(entry.origin, entry.registration.footprint, request.pose),
          name: entry.obstacleName
        });
      }
    }
    return {
      ok: true,
      poseRevision: after.revision,
      hostRevision: scene.hostPoseRevision(entry.registration.seat.interactionId)
    };
  }
  /** Bind once to the physics host. Observation grants no force authority. */
  bindFurniturePhysics(resourceId, read) {
    const entry = this.furnitureEntry(resourceId);
    if (entry.physicsSource) throw new Error("PHYSICS_ALREADY_BOUND");
    entry.physicsSource = { read, matrixRevision: this.scene(entry.registration.sceneId).matrixRevision };
  }
  sampleFurniturePhysics(resourceId) {
    const entry = this.furnitureEntry(resourceId), source = entry.physicsSource;
    if (!source) throw new Error("PHYSICS_NOT_BOUND");
    const scene = this.scene(entry.registration.sceneId);
    if (source.matrixRevision !== scene.matrixRevision) throw new Error("PHYSICS_SOURCE_STALE");
    const before = entry.motion.snapshot();
    if (before.phase !== "idle") return this.furnitureView(resourceId);
    const solved = source.read();
    entry.motion.observeIdle(solved.pose, solved.stopped);
    if (entry.motion.snapshot().revision !== before.revision) {
      const ids = [.../* @__PURE__ */ new Set([entry.registration.seat.interactionId, entry.registration.manipulation.interactionId])];
      for (const id of ids) scene.setHostPose(id, { ...solved.pose, yawDeg: solved.pose.yaw * 180 / Math.PI });
      const seatClaim = this.claims.claimFor({ sceneId: entry.registration.sceneId, ...entry.registration.seat });
      const observerOwner = seatClaim && !seatClaim.stale ? seatClaim.owner : before.occupant ?? "";
      this.claims.invalidateSlots({ sceneId: entry.registration.sceneId, interactionIds: ids }, { exceptOwner: observerOwner });
      if (entry.obstacleName && entry.registration.footprint) this.navgationOrNull(entry.registration.sceneId)?.updateObstacle(entry.obstacleName, { ...this.solvedFootprint(entry.origin, entry.registration.footprint, solved.pose), name: entry.obstacleName });
    }
    return this.furnitureView(resourceId);
  }
  requestFurnitureStop(resourceId, token) {
    this.furnitureEntry(resourceId).motion.requestStop(token);
  }
  finishFurnitureMotion(resourceId, token) {
    this.furnitureEntry(resourceId).motion.finish(token);
  }
  /** Drops a registration (scene teardown). Outstanding tokens become invalid. */
  removeFurniture(resourceId) {
    const entry = this.furnitureMap.get(resourceId);
    if (!entry) return false;
    if (entry.obstacleName) this.navgationOrNull(entry.registration.sceneId)?.updateObstacle(entry.obstacleName, null);
    const scene = this.scene(entry.registration.sceneId);
    for (const interactionId of /* @__PURE__ */ new Set([entry.registration.seat.interactionId, entry.registration.manipulation.interactionId])) {
      scene.clearHostPose(interactionId);
    }
    this.furnitureMap.delete(resourceId);
    return true;
  }
  /**
   * A rotated footprint's world AABB: the declared rect is expressed at the
   * registration pose, so its corners are taken in that frame and re-placed.
   * Conservative for a rotated chair (an AABB cannot be tighter) and identical
   * to the authored rectangle when only translation happened.
   */
  solvedFootprint(origin, rect2, pose) {
    const c0 = Math.cos(origin.yaw);
    const s0 = Math.sin(origin.yaw);
    const c = Math.cos(pose.yaw);
    const s = Math.sin(pose.yaw);
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const [x, z] of [
      [rect2.minX, rect2.minZ],
      [rect2.maxX, rect2.minZ],
      [rect2.minX, rect2.maxZ],
      [rect2.maxX, rect2.maxZ]
    ]) {
      const dx = x - origin.x;
      const dz = z - origin.z;
      const lx = dx * c0 - dz * s0;
      const lz = dx * s0 + dz * c0;
      const wx = pose.x + c * lx + s * lz;
      const wz = pose.z - s * lx + c * lz;
      minX = Math.min(minX, wx);
      maxX = Math.max(maxX, wx);
      minZ = Math.min(minZ, wz);
      maxZ = Math.max(maxZ, wz);
    }
    return {
      minX: Number(minX.toFixed(6)),
      maxX: Number(maxX.toFixed(6)),
      minZ: Number(minZ.toFixed(6)),
      maxZ: Number(maxZ.toFixed(6))
    };
  }
  /**
   * Moves a scene's node matrices. Outstanding claims on the scene are marked
   * stale (they keep their slot until they release safely); the caller drives
   * the invalidation handshake. Unlike an authorised furniture pose, this is an
   * EXTERNAL edit: every claim on the scene (including the operator's) is stale.
   */
  setTransforms(sceneId, transforms, matrixRevision) {
    const resolver = this.scene(sceneId);
    resolver.setTransforms(transforms, matrixRevision);
    return this.claims.invalidateScene({
      sceneId,
      sceneRevision: resolver.sceneRevision,
      matrixRevision
    });
  }
  bindActor(registration) {
    this.scene(registration.sceneId);
    if (!Number.isFinite(registration.radiusMeters) || registration.radiusMeters <= 0) {
      throw new SceneError(
        "INVALID_ACTOR",
        `actor "${registration.actorId}" radius must be positive, got ${registration.radiusMeters}`,
        { actorId: registration.actorId, radiusMeters: registration.radiusMeters }
      );
    }
    if (this.actorMap.has(registration.actorId)) {
      throw new SceneError("INVALID_ACTOR", `actor "${registration.actorId}" is already bound in this world`, {
        actorId: registration.actorId
      });
    }
    const actor = new SceneActor(this, registration);
    this.actorMap.set(registration.actorId, actor);
    return actor;
  }
  actor(actorId) {
    const actor = this.actorMap.get(actorId);
    if (!actor) {
      throw new SceneError("INVALID_ACTOR", `world has no actor "${actorId}"`, { actorId });
    }
    return actor;
  }
  actors() {
    return [...this.actorMap.values()];
  }
  /**
   * Host-loop heartbeat: renews the live claims of every actor bound to this
   * world. M3/M4 run one world per host page, so "the host is ticking" is the
   * liveness signal: a page that stops ticking (closed tab, crashed runtime)
   * stops renewing and its leases expire into quarantine instead of being
   * silently handed to another actor. A multi-tenant world (M5 gateway) must
   * renew per connection instead of per bound actor.
   */
  tick(nowWallMs = this.now()) {
    const renewed = [];
    const refused = [];
    for (const actor of this.actorMap.values()) {
      const claim = this.claims.claimForOwner(actor.actorId);
      if (!claim) continue;
      if (this.claims.heartbeat(actor.actorId, actor.ttlMs, nowWallMs) === 1) renewed.push(claim.claimId);
      else refused.push(claim.claimId);
    }
    return { renewed, refused };
  }
  expireLeases(nowWallMs = this.now()) {
    return this.claims.expire(nowWallMs);
  }
  probeEmpty(slot, options) {
    return this.claims.probeEmpty(slotRef(slot), { ...options, nowWallMs: this.now() });
  }
};

// packages/npc-three/src/adjustment.ts
var SEAT_ADJUSTMENT_LIMITS = Object.freeze({
  /** Never slide the chair more than 15 cm: beyond that it is a furniture redesign. */
  maxTuckM: 0.15,
  /** Minimum gap between the desk's near edge and the chair's above-desk parts. */
  minClearanceM: 0.02,
  /** The seat must stay this far in front of the desk's far edge (metres). */
  farEdgeMarginM: 0.05,
  /** Hard floor: the adjusted chair must stay inside the walkable footprint. */
  floorMarginM: 0.02
});
function round(v) {
  return Math.round(v * 1e4) / 1e4;
}
function shiftBox(box, dz) {
  return { minX: box.minX, maxX: box.maxX, minZ: round(box.minZ + dz), maxZ: round(box.maxZ + dz) };
}
function chairDeskClearance(chairUpper, desk) {
  return round(desk.minZ - chairUpper.maxZ);
}
function insideFloor(box, floor, margin) {
  return box.minX >= floor.minX + margin && box.maxX <= floor.maxX - margin && box.minZ >= floor.minZ + margin && box.maxZ <= floor.maxZ - margin;
}
function planSeatTuck(input) {
  const limits = {
    maxTuckM: input.limits?.maxTuckM ?? SEAT_ADJUSTMENT_LIMITS.maxTuckM,
    minClearanceM: input.limits?.minClearanceM ?? SEAT_ADJUSTMENT_LIMITS.minClearanceM,
    farEdgeMarginM: input.limits?.farEdgeMarginM ?? SEAT_ADJUSTMENT_LIMITS.farEdgeMarginM,
    floorMarginM: input.limits?.floorMarginM ?? SEAT_ADJUSTMENT_LIMITS.floorMarginM
  };
  const beforeClearance = chairDeskClearance(input.chairUpper, input.desk);
  const afterSeat = shiftBox(input.chairSeat, input.deltaZ);
  const afterUpper = shiftBox(input.chairUpper, input.deltaZ);
  const afterPosition = {
    x: input.beforePosition.x,
    y: input.beforePosition.y,
    z: round(input.beforePosition.z + input.deltaZ)
  };
  const afterContact = {
    x: input.seatContact.x,
    y: input.seatContact.y,
    z: round(input.seatContact.z + input.deltaZ)
  };
  const afterClearance = chairDeskClearance(afterUpper, input.desk);
  let reason = null;
  if (!Number.isFinite(input.deltaZ) || input.deltaZ < 0) reason = "SEAT_TUCK_NEGATIVE_DELTA";
  else if (input.deltaZ > limits.maxTuckM) reason = "SEAT_TUCK_EXCEEDS_LIMIT";
  else if (afterClearance < limits.minClearanceM) reason = "SEAT_TUCK_COLLIDES_WITH_DESK";
  else if (afterSeat.maxZ > input.desk.maxZ - limits.farEdgeMarginM) reason = "SEAT_TUCK_PASSES_DESK";
  else if (!insideFloor(afterSeat, input.floor, limits.floorMarginM)) reason = "SEAT_TUCK_LEAVES_FLOOR";
  else if (input.deltaZ === 0) reason = "SEAT_TUCK_NO_CHANGE";
  return {
    id: input.id ?? `seat-tuck:${input.node}`,
    node: input.node,
    kind: "seat-tuck",
    before: {
      position: { ...input.beforePosition },
      seatContact: { ...input.seatContact },
      chairSeat: { ...input.chairSeat },
      chairUpper: { ...input.chairUpper },
      clearanceM: beforeClearance
    },
    after: {
      position: afterPosition,
      seatContact: afterContact,
      chairSeat: afterSeat,
      chairUpper: afterUpper,
      clearanceM: afterClearance
    },
    delta: { x: 0, y: 0, z: round(input.deltaZ) },
    applied: reason === null,
    reason,
    targetsUnchanged: true
  };
}

// packages/npc-three/src/seatedHold.ts
function planSeatedHold(input) {
  const sustained = !input.hasAction && input.planSatisfied && input.seated && !input.transitioning;
  const posture = !sustained ? null : input.goalId === "work" ? "reach" : input.goalId === "think" ? "think" : input.goalId === "rest" ? "rest" : null;
  return { posture, advance: true };
}

// packages/npc-three/src/footSpots.ts
function symmetricFootSpots(centre, yaw, halfSpanM) {
  const lateralX = Math.cos(yaw) * halfSpanM;
  const lateralZ = -Math.sin(yaw) * halfSpanM;
  return {
    left: { x: centre.x + lateralX, z: centre.z + lateralZ },
    right: { x: centre.x - lateralX, z: centre.z - lateralZ }
  };
}

// packages/npc-three/src/seating.ts
var SEATED_HIP_OFFSET_BAND = Object.freeze({ minM: 5e-3, maxM: 0.2 });
var ROOT_SCALE_BAND = Object.freeze({ min: 0.2, max: 2 });
var EPS = 1e-9;
function normalizeSeatPlane(plane) {
  const { point: point2, normal } = plane;
  for (const v of [point2.x, point2.y, point2.z, normal.x, normal.y, normal.z]) {
    if (!Number.isFinite(v)) throw new Error("SEAT_PLANE_NON_FINITE");
  }
  const len = Math.hypot(normal.x, normal.y, normal.z);
  if (len < 1e-3) throw new Error("SEAT_PLANE_DEGENERATE");
  return {
    point: { ...point2 },
    normal: { x: normal.x / len, y: normal.y / len, z: normal.z / len }
  };
}
function hipTargetForSeat(plane, body) {
  const p = normalizeSeatPlane(plane);
  const offset = body.seatedHipOffsetM;
  if (!Number.isFinite(offset) || offset < SEATED_HIP_OFFSET_BAND.minM || offset > SEATED_HIP_OFFSET_BAND.maxM) {
    throw new Error("BODY_OFFSET_INVALID");
  }
  return {
    x: p.point.x + p.normal.x * offset,
    y: p.point.y + p.normal.y * offset,
    z: p.point.z + p.normal.z * offset
  };
}
function seatPlaneError(point2, plane) {
  const p = normalizeSeatPlane(plane);
  const d = {
    x: point2.x - p.point.x,
    y: point2.y - p.point.y,
    z: point2.z - p.point.z
  };
  const signed = d.x * p.normal.x + d.y * p.normal.y + d.z * p.normal.z;
  return {
    signed,
    perpendicular: Math.abs(signed),
    penetration: Math.max(0, -signed)
  };
}
function clipToWorldXZ(d, yaw) {
  const a = yaw + Math.PI;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: d.x * c + d.z * s, z: -d.x * s + d.z * c };
}
function planSitTransition(input) {
  const drop = input.rootEnd.y - input.rootStart.y;
  if (!Number.isFinite(drop) || Math.abs(drop) < 0.02) throw new Error("SEAT_TRANSITION_NO_ROOT_VERTICAL");
  const standingHipY = input.standingHipY + input.startSceneY;
  const scaleY = (input.seat.y - standingHipY) / drop;
  if (!Number.isFinite(scaleY) || scaleY < ROOT_SCALE_BAND.min || scaleY > ROOT_SCALE_BAND.max) {
    throw new Error("SEAT_TRANSITION_SCALE_OUT_OF_RANGE");
  }
  const deltaXZ = clipToWorldXZ(
    { x: input.rootEnd.x - input.rootStart.x, z: input.rootEnd.z - input.rootStart.z },
    input.yaw
  );
  const startCarrier = { x: input.seat.x - deltaXZ.x, z: input.seat.z - deltaXZ.z };
  return {
    startCarrier,
    endCarrier: { x: input.seat.x, z: input.seat.z },
    scaleY,
    startHipY: standingHipY,
    endHipY: standingHipY + drop * scaleY,
    deltaXZ
  };
}
function planStandTransition(input) {
  const rise = input.rootEnd.y - input.rootStart.y;
  if (!Number.isFinite(rise) || Math.abs(rise) < 0.02) throw new Error("SEAT_TRANSITION_NO_ROOT_VERTICAL");
  const startSceneHipY = input.startHipY + input.startSceneY;
  const scaleY = (input.standingHipY + input.startSceneY - startSceneHipY) / rise;
  if (!Number.isFinite(scaleY) || scaleY < ROOT_SCALE_BAND.min || scaleY > ROOT_SCALE_BAND.max) {
    throw new Error("SEAT_TRANSITION_SCALE_OUT_OF_RANGE");
  }
  const deltaXZ = clipToWorldXZ(
    { x: input.rootEnd.x - input.rootStart.x, z: input.rootEnd.z - input.rootStart.z },
    input.yaw
  );
  return {
    startCarrier: { ...input.startCarrier },
    endCarrier: { x: input.startCarrier.x + deltaXZ.x, z: input.startCarrier.z + deltaXZ.z },
    scaleY,
    startHipY: startSceneHipY,
    endHipY: startSceneHipY + rise * scaleY,
    deltaXZ
  };
}
function lowestSupportInsideFootprint(points, rect2, normal = { x: 0, y: 1, z: 0 }) {
  const len = Math.hypot(normal.x, normal.y, normal.z);
  if (!(len > 1e-6)) throw new Error("SEAT_PLANE_DEGENERATE");
  const n = { x: normal.x / len, y: normal.y / len, z: normal.z / len };
  let best = null;
  let bestD = Infinity;
  let inside = 0;
  let outside = 0;
  for (const p of points) {
    if (!insideSeatRect(p, rect2, 0)) {
      outside += 1;
      continue;
    }
    inside += 1;
    const d = p.x * n.x + p.y * n.y + p.z * n.z;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best ? { point: { ...best }, inside, outside } : null;
}
function insideSeatRect(p, rect2, growM = 0) {
  return p.x >= rect2.minX - growM - EPS && p.x <= rect2.maxX + growM + EPS && p.z >= rect2.minZ - growM - EPS && p.z <= rect2.maxZ + growM + EPS;
}
function lowestSupportAgainstPlane(points, rect2, plane) {
  const len = Math.hypot(plane.normal.x, plane.normal.y, plane.normal.z);
  if (!(len > 1e-6)) throw new Error("SEAT_PLANE_DEGENERATE");
  const n = { x: plane.normal.x / len, y: plane.normal.y / len, z: plane.normal.z / len };
  let best = null;
  let bestSigned = Infinity;
  let inside = 0;
  let outside = 0;
  for (const p of points) {
    if (!insideSeatRect(p, rect2, 0)) {
      outside += 1;
      continue;
    }
    inside += 1;
    const signed = (p.x - plane.point.x) * n.x + (p.y - plane.point.y) * n.y + (p.z - plane.point.z) * n.z;
    if (signed < bestSigned) {
      bestSigned = signed;
      best = p;
    }
  }
  if (!best) return null;
  return {
    point: { x: best.x, y: best.y, z: best.z },
    topY: plane.point.y,
    signed: bestSigned,
    inside,
    outside,
    ...best.key ? { key: best.key } : {}
  };
}
var SUPPORT_BAND_M = 0.015;
function lowestSupportOnCushion(points, cushion, options = {}) {
  const near = options.nearSurfaceM ?? 0.1;
  const bottomTol = options.bottomTolM ?? 0.02;
  const band = options.bandM ?? SUPPORT_BAND_M;
  let best = null;
  let bestKey;
  let bestTop = 0;
  let bestSigned = Infinity;
  let inside = 0;
  let outside = 0;
  let deepSigned = Infinity;
  let deepCount = 0;
  let deepPoint = null;
  let deepTop = cushion.topY;
  for (const p of points) {
    if (!insideSeatRect(p, cushion.rect, 0)) {
      outside += 1;
      continue;
    }
    const top = cushion.topAt ? cushion.topAt(p.x, p.z) : cushion.topY;
    if (top === null) {
      outside += 1;
      continue;
    }
    if (p.y > top + near) {
      outside += 1;
      continue;
    }
    if (p.y < top) {
      const solid = cushion.insideAt ? cushion.insideAt(p.x, p.y, p.z) : p.y >= cushion.bottomY - bottomTol;
      if (!solid) {
        outside += 1;
        continue;
      }
      const signed2 = p.y - top;
      if (signed2 < deepSigned) {
        deepSigned = signed2;
        deepPoint = { x: p.x, y: p.y, z: p.z };
        deepTop = top;
      }
      if (signed2 < -band) deepCount += 1;
    }
    const signed = p.y - top;
    if (signed < -band) {
      outside += 1;
      continue;
    }
    inside += 1;
    if (signed < bestSigned) {
      bestSigned = signed;
      best = p;
      bestKey = p.key;
      bestTop = top;
    }
  }
  if (!best) {
    if (!deepPoint) return null;
    return {
      point: deepPoint,
      topY: deepTop,
      signed: -band,
      inside: 0,
      outside,
      deepSigned,
      deepCount,
      inBand: false
    };
  }
  return {
    point: { x: best.x, y: best.y, z: best.z },
    topY: bestTop,
    signed: bestSigned,
    inside,
    outside,
    ...bestKey ? { key: bestKey } : {},
    ...deepSigned === Infinity ? {} : { deepSigned, deepCount }
  };
}
function planSeatPlant(sample, targetAboveTopM = 2e-3, maxCorrectionM = 0.1) {
  if (!sample) return { deltaM: 0, reason: "NO_SAMPLE" };
  if (sample.inBand === false) return { deltaM: 0, reason: "NO_SAMPLE" };
  const delta = targetAboveTopM - sample.signed;
  if (!Number.isFinite(delta)) return { deltaM: 0, reason: "NO_SAMPLE" };
  if (Math.abs(delta) <= 1e-4) return { deltaM: 0, reason: "OK" };
  if (Math.abs(delta) > maxCorrectionM) return { deltaM: 0, reason: "OUT_OF_RANGE" };
  return { deltaM: delta, reason: "OK" };
}
var SEATED_FOOT_HALF_SPAN_M = 0.12;
var SEATED_FOOT_FORWARD_M = 0.32;
function seatedFootSpots(input) {
  const declared = input.footTargets;
  if (declared) {
    return {
      left: { x: declared.left.x, z: declared.left.z },
      right: { x: declared.right.x, z: declared.right.z }
    };
  }
  const yaw = input.seatFacing;
  const fwd = { x: Math.sin(yaw), z: Math.cos(yaw) };
  return symmetricFootSpots({
    x: input.seat.x + fwd.x * SEATED_FOOT_FORWARD_M,
    z: input.seat.z + fwd.z * SEATED_FOOT_FORWARD_M
  }, yaw, SEATED_FOOT_HALF_SPAN_M);
}

// packages/npc-three/src/contact.ts
var CONTACT_TOLERANCE = Object.freeze({
  feetM: 0.02,
  seatM: 0.03,
  handsM: 0.03
});
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
function round2(v) {
  return Math.round(v * 1e4) / 1e4;
}
function insideRect(p, rect2, grow) {
  return p.x >= rect2.minX - grow && p.x <= rect2.maxX + grow && p.z >= rect2.minZ - grow && p.z <= rect2.maxZ + grow;
}
function evaluateContacts(frame, targets, tolerance = CONTACT_TOLERANCE) {
  const violations = [];
  const toeOffset = frame.toeOffsetM ?? 0.045;
  const sampledSoles = [frame.leftSoleLow, frame.rightSoleLow].filter((p) => !!p);
  const soleCandidates = sampledSoles.length > 0 ? sampledSoles.map((p) => p.y) : [
    frame.leftFoot.y - frame.soleOffsetM,
    frame.rightFoot.y - frame.soleOffsetM,
    frame.leftToes.y - toeOffset,
    frame.rightToes.y - toeOffset
  ];
  const soleY = soleCandidates.reduce((acc, y) => y < acc ? y : acc, soleCandidates[0]);
  const feetError = Math.abs(soleY - targets.floorY);
  const feetOk = feetError <= tolerance.feetM + 1e-9;
  if (!feetOk) violations.push("FEET_OFF_FLOOR");
  const footSpots = targets.seated ? targets.footTargets ?? null : null;
  let footSpotOk = true;
  let footSpotError = 0;
  let footSpotMatched = null;
  let footSpotLeft = null;
  let footSpotRight = null;
  let footSpotDetail = footSpots ? "not sampled (rig cannot measure the shoe)" : "not declared";
  if (footSpots) {
    const spotLeft = frame.leftSoleLow ?? null;
    const spotRight = frame.rightSoleLow ?? null;
    if (spotLeft && spotRight) {
      const xz = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
      footSpotLeft = xz(spotLeft, footSpots.left);
      footSpotRight = xz(spotRight, footSpots.right);
      const crossLeft = xz(spotLeft, footSpots.right);
      const crossRight = xz(spotRight, footSpots.left);
      footSpotMatched = footSpotLeft < crossLeft && footSpotRight < crossRight;
      footSpotError = Math.max(footSpotLeft, footSpotRight);
      footSpotOk = footSpotError <= footSpots.toleranceM + 1e-9;
      if (!footSpotOk) violations.push("FEET_OFF_DECLARED_SPOT");
      footSpotDetail = `sole->declared spot left=${round2(footSpotLeft)} right=${round2(footSpotRight)} tol=${footSpots.toleranceM} frame=${footSpots.frame ?? "undeclared"} matched=${footSpotMatched}`;
    }
  }
  const hipTarget = targets.hipTarget ?? targets.seatPoint;
  const hipError = targets.seated ? distance(frame.hips, hipTarget) : 0;
  const skin = targets.seated ? frame.seatSkin ?? null : null;
  const seatSurface = targets.seatNormal ? seatPlaneError(frame.pelvisLow ?? frame.hips, { point: targets.seatPoint, normal: targets.seatNormal }) : null;
  const onBody = Boolean(targets.seated && (skin || frame.pelvisLow && seatSurface));
  let seatError = 0;
  let seatOk = true;
  let penetration = 0;
  if (targets.seated) {
    if (skin) {
      seatError = Math.max(0, skin.signed);
      penetration = Math.max(0, -skin.signed);
      seatOk = seatError <= tolerance.seatM + 1e-9;
      if (!seatOk) violations.push("SEAT_OUT_OF_TOLERANCE");
      if (penetration > 1e-4) {
        seatOk = false;
        violations.push("SEAT_INTO_CUSHION");
      }
      if (targets.seatRect && !insideRect(skin.point, targets.seatRect, 0)) {
        seatOk = false;
        violations.push("SEAT_OFF_CUSHION");
      }
    } else if (onBody && seatSurface) {
      seatError = seatSurface.perpendicular;
      penetration = seatSurface.penetration;
      seatOk = seatError <= tolerance.seatM + 1e-9;
      if (!seatOk) violations.push("SEAT_OUT_OF_TOLERANCE");
      if (penetration > 1e-4) {
        seatOk = false;
        violations.push("SEAT_INTO_CUSHION");
      }
      if (targets.seatRect && frame.pelvisLow && !insideRect(frame.pelvisLow, targets.seatRect, 0)) {
        seatOk = false;
        violations.push("SEAT_OFF_CUSHION");
      }
    } else {
      seatError = hipError;
      seatOk = seatError <= tolerance.seatM + 1e-9;
      if (!seatOk) violations.push("SEAT_OUT_OF_TOLERANCE");
    }
  }
  const pelvisGapM = onBody && frame.pelvisLow ? distance(frame.pelvisLow, targets.seatPoint) : null;
  const wristLeft = targets.checkHands ? distance(frame.leftHand, targets.handTargets.left) : 0;
  const wristRight = targets.checkHands ? distance(frame.rightHand, targets.handTargets.right) : 0;
  const leftError = targets.checkHands && frame.leftPalmLow ? distance(frame.leftPalmLow, targets.handTargets.left) : wristLeft;
  const rightError = targets.checkHands && frame.rightPalmLow ? distance(frame.rightPalmLow, targets.handTargets.right) : wristRight;
  const handsError = Math.max(leftError, rightError);
  const handsOk = !targets.checkHands || handsError <= tolerance.handsM + 1e-9;
  if (!handsOk) violations.push("HANDS_OUT_OF_TOLERANCE");
  let palmVolumeOk = true;
  let palmError = 0;
  const palmDetails = [];
  for (const side of ["left", "right"]) {
    if (!targets.checkHands) break;
    const palm = side === "left" ? frame.leftPalmLow : frame.rightPalmLow;
    if (!palm) continue;
    const belowKeys = targets.keyboardTopY - palm.y;
    const onKeys = insideRect(palm, targets.keyboardRect, 0.06);
    const insideDesk = insideRect(palm, targets.deskRect, 0) && palm.y < targets.deskTopY;
    palmError = Math.max(palmError, Math.max(0, belowKeys));
    if (belowKeys > 5e-3 || !onKeys || insideDesk) {
      palmVolumeOk = false;
      palmDetails.push(
        `${side}: belowKeys=${round2(belowKeys)} onKeys=${onKeys} insideDesk=${insideDesk}`
      );
    }
  }
  if (!palmVolumeOk) violations.push("PALM_HIDDEN_IN_DESK");
  let palmFacingOk = true;
  if (targets.checkHands) {
    for (const side of ["left", "right"]) {
      const normalY = side === "left" ? frame.leftPalmNormalY : frame.rightPalmNormalY;
      if (normalY === void 0 || normalY === null) continue;
      if (normalY > -0.5) {
        palmFacingOk = false;
        palmDetails.push(`${side}: palmNormalY=${round2(normalY)} facing away from keys`);
      }
    }
  }
  if (!palmFacingOk) violations.push("PALM_NOT_FACING_KEYS");
  const palmOk = palmVolumeOk && palmFacingOk;
  const report = {
    ok: feetOk && footSpotOk && seatOk && handsOk && palmOk,
    seated: targets.seated,
    feet: {
      name: "feet",
      ok: feetOk && footSpotOk,
      errorM: round2(feetError),
      toleranceM: tolerance.feetM,
      detail: `soleY=${round2(soleY)} floorY=${targets.floorY}; ${footSpotDetail}`
    },
    seat: {
      name: "seat",
      ok: seatOk,
      errorM: round2(seatError),
      toleranceM: tolerance.seatM,
      onBody,
      detail: !targets.seated ? "standing" : skin ? `skin ${skin.key ?? "(patch)"} on local cushion top ${round2(skin.topY)}: signed ${round2(skin.signed)} m (penetration ${round2(penetration)} m) hips->target ${round2(hipError)} m` : onBody && frame.pelvisLow ? `pelvis on seat plane: ${round2(seatError)} m (penetration ${round2(penetration)} m) hips->target ${round2(hipError)} m` : `hip-joint fallback (no sampled pelvis): hips ${round2(hipError)} m from the derived target`
    },
    hands: {
      name: "hands",
      ok: handsOk,
      errorM: round2(handsError),
      toleranceM: tolerance.handsM,
      detail: `palm left=${round2(leftError)} right=${round2(rightError)} (wrist ${round2(wristLeft)}/${round2(wristRight)})`
    },
    palms: {
      name: "palm",
      ok: palmOk,
      errorM: round2(palmError),
      toleranceM: 5e-3,
      detail: !targets.checkHands ? "not required" : palmDetails.length ? palmDetails.join("; ") : "above keys inside footprint"
    },
    violations,
    numbers: {
      soleY: round2(soleY),
      seatErrorM: round2(seatError),
      hipErrorM: round2(hipError),
      penetrationM: round2(penetration),
      pelvisGapM: pelvisGapM === null ? null : round2(pelvisGapM),
      handErrorM: { left: round2(wristLeft), right: round2(wristRight) },
      palmErrorM: {
        left: frame.leftPalmLow ? round2(leftError) : null,
        right: frame.rightPalmLow ? round2(rightError) : null
      },
      footSpotM: footSpotLeft === null && footSpotRight === null ? null : { left: footSpotLeft === null ? null : round2(footSpotLeft), right: footSpotRight === null ? null : round2(footSpotRight) },
      footSpotMatched
    }
  };
  return report;
}
function contactFailureReason(report) {
  return report.ok ? null : report.violations[0] ?? "CONTACT_FAILED";
}

// packages/npc-three/src/ids.ts
function cloneIdMap(source) {
  return copyIdMap(source);
}

// packages/npc-three/src/seatSettle.ts
var SEAT_PLANT_M = 2e-3;
var SEAT_SETTLE_TOL_M = 4e-3;
var PIN_READY = 0.999;
function seatSettleBlock(state) {
  const tol = state.tolM ?? SEAT_SETTLE_TOL_M;
  const target = state.targetM ?? 0;
  if (!state.seated) return "NOT_SEATED";
  if (state.transitioning) return "TRANSITIONING";
  if (state.pinBlend < PIN_READY) return "PIN_RAMPING";
  if (state.lastSupportErrM === null) return "NO_SUPPORT_SAMPLE";
  if (Math.abs(state.plantTargetM) > tol) return "PLANT_TARGET_OUT_OF_BAND";
  if (Math.abs(state.lastSupportErrM - target) > tol) return "SUPPORT_NOT_AT_TARGET";
  return null;
}

// packages/npc-three/src/walkingPath.ts
function resolveWalkingPath(world, from, to) {
  const grid = world.scene.path(from, to);
  if (grid.ok) {
    const end = grid.points.at(-1);
    if (!end || Math.hypot(end.x - to.x, end.z - to.z) <= 1e-6 || !world.physics?.standRoute) return grid;
    const tail = world.physics.standRoute(end, to);
    if (!tail.ok || tail.points.length === 0) return { ...grid, ok: false, reason: tail.reason ?? "NO_EXACT_PATH" };
    return { ...grid, points: [...grid.points, ...tail.points] };
  }
  const continuous = world.physics?.standRoute?.(from, to);
  if (!continuous?.ok || continuous.points.length === 0) return grid;
  return {
    ok: true,
    points: [{ ...from }, ...continuous.points],
    reason: null,
    ...grid.navigation ? { navigation: grid.navigation } : {}
  };
}

// packages/npc-three/src/adapter.ts
var DEFAULT_EXIT_MS = 520;
var DEFAULT_WALK_SPEED = 1.1;
var DEFAULT_ARRIVE_EPS = 0.08;
var DEFAULT_ALIGN_EPS = 0.05;
var APPROACH_EPS = 0.35;
var MAX_STEP_RATIO = 1.5;
var ALIGN_RATE_RAD_PER_S = 4.2;
var TURN_RATE_RAD_PER_S = 4.2;
var MAX_HISTORY = 256;
var SIT_STEP_SPEED = 0.55;
var SIT_ARRIVE_EXACT_M = 1e-4;
var SIT_ALIGN_M = 0.02;
var WALK_ARRIVE_EXACT_M = 1e-4;
var DEVICE_REACH_COMPLETE = 0.995;
var SIT_CONFIRM_MS = 1400;
var WALK_BLOCK_FAIL_MS = 1500;
var WALK_STALL_FAIL_MS = 2500;
var WALK_PROGRESS_EPS = 0.02;
var SIT_ENTRY_EPS = 0.15;
var SEAT_SETTLE_LIMIT_MS = 1200;
var STAND_SETTLE_LIMIT_MS = 1500;
var TYPING_CONFIRM_MS = 700;
function observationResult(expected, evidence) {
  if (evidence.observationKind !== void 0 && evidence.observationKind !== expected.observationKind) return "EVIDENCE_KIND_MISMATCH";
  const revisions = new Map(evidence.dependencies.map((dependency) => [`${dependency.kind}:${dependency.id}`, dependency.revision]));
  for (const dependency of expected.dependencies) {
    if (revisions.get(`${dependency.kind}:${dependency.id}`) !== dependency.revision) {
      return `EVIDENCE_VERSION_MISMATCH:${dependency.kind}:${dependency.id}`;
    }
  }
  return null;
}
function round3(v) {
  return Math.round(v * 1e4) / 1e4;
}
function yawTo(from, to) {
  return Math.atan2(to.x - from.x, to.z - from.z);
}
function wrapAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}
function distanceXZ(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
function contactTargetsForSeat(target, checkHands = true, hipTarget) {
  return {
    floorY: target.floorY,
    // `seat` is the SEAT SURFACE point (furniture data); the hip target is
    // derived by the rig from it plus the measured character offset.
    seatPoint: target.seat,
    ...target.seatNormal ? { seatNormal: target.seatNormal } : {},
    ...hipTarget ? { hipTarget } : {},
    ...target.seatRect ? { seatRect: target.seatRect } : {},
    ...target.footTargets ? { footTargets: target.footTargets } : {},
    seated: true,
    checkHands,
    handTargets: target.handTargets,
    keyboardTopY: target.keyboardTopY,
    keyboardRect: target.keyboardRect,
    deskTopY: target.deskTopY,
    deskRect: target.deskRect
  };
}
var ThreeMotionAdapter = class {
  calls = [];
  exitDurationMs;
  body;
  /** Latest contact report the HUD and the capture read. */
  lastContact = null;
  scene;
  rig;
  walkSpeed;
  /** Declared step-in speed for the last metres into the seat (m/s). */
  stepSpeedMps = SIT_STEP_SPEED;
  arriveEps;
  alignEps;
  /** The appliance this slice may operate; null means the actions are refused. */
  device;
  devicePort;
  /** The standing door chain's physical authority (page-bound Ammo door). */
  fridgePort;
  /** The one shared rigid-body world, when the page provides it. */
  physics;
  /** Latest authoritative observation published after the host's world step. */
  evidenceSource;
  evidenceRequired;
  lastDevice = null;
  lastFridge = null;
  /**
   * Cross-action chain state for the fridge. It is deliberately NOT per-action:
   * the plan is reach -> grasp -> open -> release, and "grasped" must survive
   * between those actions while the door lease is held.
   */
  fridgeChain = {
    grasped: false,
    opened: false,
    motorRunning: false,
    stopAngleRad: null
  };
  states = createIdMap();
  history = createIdMap();
  historyOrder = [];
  simMs = 0;
  walkStats = { steps: 0, maxStepM: 0, distanceM: 0 };
  constructor(options) {
    this.scene = options.scene;
    this.rig = options.rig;
    this.walkSpeed = options.walkSpeedMps ?? DEFAULT_WALK_SPEED;
    this.exitDurationMs = options.exitMs ?? DEFAULT_EXIT_MS;
    this.arriveEps = options.arriveEpsilonM ?? DEFAULT_ARRIVE_EPS;
    this.alignEps = options.alignEpsilonRad ?? DEFAULT_ALIGN_EPS;
    this.device = options.device ?? null;
    this.devicePort = options.devicePort ?? null;
    this.fridgePort = options.fridgePort ?? null;
    this.physics = options.physics ?? null;
    this.evidenceSource = options.evidenceSource ?? null;
    this.evidenceRequired = options.evidenceRequired ?? null;
    this.body = { ...this.rig.body };
  }
  /**
   * Declared motion limits (m/s, rad/s). The acceptance trace bounds every
   * per-step displacement by these numbers instead of a hand-tuned distance:
   * a real teleport shows up as a displacement larger than speed*dt.
   */
  motionLimits() {
    return {
      walkSpeedMps: this.walkSpeed,
      stepSpeedMps: this.stepSpeedMps,
      turnRateRadPerS: TURN_RATE_RAD_PER_S,
      exitMs: this.exitDurationMs
    };
  }
  /** Latest appliance-press telemetry (contact/apply/withdraw order). */
  deviceTelemetry() {
    return this.lastDevice;
  }
  /** Latest standing fridge-chain telemetry (actual angle/contact/motor). */
  fridgeTelemetry() {
    return this.lastFridge;
  }
  // --- diagnostics -----------------------------------------------------------
  state(actionId) {
    return readId(this.states, actionId) ?? null;
  }
  /** Live + finished rows, keyed by action id (live wins), sorted by id. */
  telemetry() {
    const rows = [];
    const ids = /* @__PURE__ */ new Set([...Object.keys(this.history), ...Object.keys(this.states)]);
    for (const id of ids) {
      const state = readId(this.states, id);
      if (state) {
        rows.push({
          actionId: state.actionId,
          actionKey: state.actionKey,
          phase: state.phase,
          reason: state.reason,
          elapsedMs: round3(state.elapsedMs),
          atSimMs: round3(state.startedAtSimMs)
        });
        continue;
      }
      const row = readId(this.history, id);
      if (row) rows.push(row);
    }
    return rows.sort((a, b) => a.actionId < b.actionId ? -1 : a.actionId > b.actionId ? 1 : 0);
  }
  stats() {
    return {
      walkSteps: this.walkStats.steps,
      maxStepM: this.walkStats.maxStepM,
      distanceM: this.walkStats.distanceM,
      simMs: this.simMs
    };
  }
  /** Id-safe copy of the live states (used by the host HUD/capture). */
  statesSnapshot() {
    return cloneIdMap(this.states);
  }
  // --- MotionAdapter ---------------------------------------------------------
  /**
   * The ONE entry contract for `sitOnDeskChair`, used by both `preflight` and
   * `begin` so they can never disagree (they did: preflight accepted the sit
   * clip's start, begin demanded the standing approach, so a replan after a
   * failed sit dead-locked with NOT_AT_APPROACH).
   *
   * A body may start a sit when it is in the chair's declared entry zone:
   *   - at the workstation approach point (after walkToDesk),
   *   - at the sit clip's own start (a retry after a failed sit),
   *   - at the declared stand exit (a sit right after standing up, no walk),
   *   - or already seated (same-seat work/think must not re-sit).
   * Walking is still required from anywhere else: the domain precondition
   * `atDesk` is unchanged and the walk action owns the room traversal.
   */
  sitEntry(target) {
    const p = this.rig.carrier.pos;
    if (this.rig.seated) return { ok: true, reason: null, anchor: "seated" };
    const start = this.rig.sitStart ? this.rig.sitStart(target) : { x: target.seat.x, z: target.seat.z };
    const exit = this.rig.standExit ? this.rig.standExit(target) : null;
    const atApproach = distanceXZ(p, target.approach.pos) <= APPROACH_EPS;
    const atStart = distanceXZ(p, { x: start.x, y: 0, z: start.z }) <= SIT_ENTRY_EPS;
    const atExit = Boolean(exit && distanceXZ(p, { x: exit.x, y: 0, z: exit.z }) <= SIT_ENTRY_EPS);
    if (!atApproach && !atStart && !atExit) return { ok: false, reason: "NOT_AT_APPROACH", anchor: "none" };
    const probe = this.physics?.standable?.({ x: start.x, y: 0, z: start.z });
    if (probe && !probe.ok) {
      const first = probe.blockers[0];
      const id = first?.id ?? "unknown";
      const node = first?.node ? `/${first.node}` : "";
      return { ok: false, reason: `SEAT_ENTRY_UNREACHABLE:${id}${node}`, anchor: "none" };
    }
    if (atApproach) return { ok: true, reason: null, anchor: "approach" };
    if (atStart) return { ok: true, reason: null, anchor: "clip-start" };
    return { ok: true, reason: null, anchor: "stand-exit" };
  }
  preflight(definition, _context, actionId) {
    switch (definition.key) {
      case "walkToDesk": {
        const target = this.scene.workstation();
        if (!target) return { ok: false, reason: "NO_WORKSTATION" };
        const path = resolveWalkingPath({ scene: this.scene, physics: this.physics }, this.rig.carrier.pos, target.approach.pos);
        return path.ok ? { ok: true, reason: null } : { ok: false, reason: path.reason ?? "NO_PATH" };
      }
      case "arriveAtDesk":
        return { ok: true, reason: null };
      case "sitOnDeskChair": {
        const target = this.scene.workstation();
        if (!target) return { ok: false, reason: "NO_WORKSTATION" };
        const entry = this.sitEntry(target);
        return entry.ok ? { ok: true, reason: null } : { ok: false, reason: entry.reason ?? "NOT_AT_APPROACH" };
      }
      case "typeAtKeyboard": {
        const target = this.scene.workstation();
        if (!target) return { ok: false, reason: "NO_WORKSTATION" };
        if (!this.rig.seated) return { ok: false, reason: "NOT_SEATED" };
        const reach = this.rig.measureReach(target);
        if (reach.shortfallM > 0) {
          this.lastContact = null;
          return { ok: false, reason: "HAND_UNREACHABLE" };
        }
        return { ok: true, reason: null };
      }
      case "thinkAtDesk":
      case "restAtDesk": {
        const target = this.scene.workstation();
        if (!target) return { ok: false, reason: "NO_WORKSTATION" };
        if (!this.rig.seated) return { ok: false, reason: "NOT_SEATED" };
        return { ok: true, reason: null };
      }
      case "standUp": {
        const target = this.scene.workstation();
        if (!target) return { ok: false, reason: "NO_WORKSTATION" };
        if (!this.rig.seated) return { ok: false, reason: "NOT_SEATED" };
        return { ok: true, reason: null };
      }
      case "walkAway": {
        const target = this.scene.workstation();
        const home = this.scene.home();
        const goal = target?.exit.pos ?? home?.pos ?? null;
        if (!goal) return { ok: false, reason: "NO_EXIT" };
        const path = resolveWalkingPath({ scene: this.scene, physics: this.physics }, this.rig.carrier.pos, goal);
        return path.ok ? { ok: true, reason: null } : { ok: false, reason: path.reason ?? "NO_PATH" };
      }
      case "lookAround":
      case "turnToSpeaker":
        return { ok: true, reason: null };
      case "pressLampSwitchOn":
      case "pressLampSwitchOff": {
        const device = this.device;
        if (!device) return { ok: false, reason: "NO_DEVICE" };
        if (!this.devicePort) return { ok: false, reason: "DEVICE_NOT_BOUND" };
        if (!this.devicePort.ready()) return { ok: false, reason: "DEVICE_NOT_BOUND" };
        if (device.seated && !this.rig.seated) return { ok: false, reason: "NOT_SEATED" };
        const measure = this.rig.measurePointReach?.(device.contact, device.side) ?? null;
        if (measure && measure.shortfallM > 0) {
          return { ok: false, reason: `HAND_UNREACHABLE:${measure.distanceM}/${measure.reachM}` };
        }
        return { ok: true, reason: null };
      }
      case "walkToFridge": {
        const target = this.scene.fridge?.() ?? null;
        if (!target) return { ok: false, reason: "NO_FRIDGE" };
        if (!this.fridgePort?.ready()) return { ok: false, reason: "FRIDGE_NOT_BOUND" };
        const path = resolveWalkingPath({ scene: this.scene, physics: this.physics }, this.rig.carrier.pos, target.approach.pos);
        return path.ok ? { ok: true, reason: null } : { ok: false, reason: path.reason ?? "NO_PATH" };
      }
      case "faceFridge": {
        const target = this.scene.fridge?.() ?? null;
        if (!target) return { ok: false, reason: "NO_FRIDGE" };
        return { ok: true, reason: null };
      }
      case "reachFridgeHandle": {
        const target = this.scene.fridge?.() ?? null;
        if (!target) return { ok: false, reason: "NO_FRIDGE" };
        if (!this.fridgePort?.ready()) return { ok: false, reason: "FRIDGE_NOT_BOUND" };
        if (!this.rig.beginStandingReach) return { ok: false, reason: "NO_STANDING_REACH" };
        const point2 = this.fridgePort.handlePoint();
        const measure = this.rig.measurePointReach?.(point2, target.side, {
          standpoint: { x: this.rig.carrier.pos.x, z: this.rig.carrier.pos.z, yaw: this.rig.carrier.yaw }
        }) ?? null;
        if (measure && measure.shortfallM > 0) {
          return { ok: false, reason: `FRIDGE_HAND_UNREACHABLE:${measure.distanceM}/${measure.reachM}` };
        }
        return { ok: true, reason: null };
      }
      case "graspFridgeHandle": {
        if (!this.fridgePort?.ready()) return { ok: false, reason: "FRIDGE_NOT_BOUND" };
        const reach = this.rig.deviceReachDebug?.() ?? null;
        if (!this.fridgeChain.grasped && Number(reach?.weight ?? 0) < 0.5) return { ok: false, reason: "NOT_REACHED" };
        return { ok: true, reason: null };
      }
      case "openFridgeDoor": {
        if (!this.fridgePort?.ready()) return { ok: false, reason: "FRIDGE_NOT_BOUND" };
        if (!this.fridgeChain.grasped) return { ok: false, reason: "NOT_GRASPED" };
        return { ok: true, reason: null };
      }
      case "releaseFridgeHandle": {
        if (!this.fridgePort?.ready()) return { ok: false, reason: "FRIDGE_NOT_BOUND" };
        if (!this.fridgeChain.grasped && !this.fridgeChain.opened) return { ok: false, reason: "NOT_GRASPED" };
        return { ok: true, reason: null };
      }
      case "withdrawFromFridge":
        return { ok: true, reason: null };
      default:
        return { ok: false, reason: "UNSUPPORTED_ACTION" };
    }
  }
  begin(definition, _context, actionId) {
    const existing = readId(this.states, actionId);
    if (existing) {
      if (existing.actionKey !== definition.key) {
        throw new Error(`action id "${actionId}" already drives ${existing.actionKey}`);
      }
      return;
    }
    const state = {
      actionId,
      actionKey: definition.key,
      phase: "running",
      reason: null,
      elapsedMs: 0,
      exitElapsedMs: 0,
      startedAtSimMs: this.simMs,
      target: null,
      candidateValid: this.scene.candidateGuard?.(definition.key) ?? (() => true),
      path: null,
      pathIndex: 0,
      entryPath: null,
      entryPathIndex: 0,
      aligned: false,
      sat: false,
      settleElapsedMs: 0,
      contact: null,
      devicePhase: null,
      deviceContactMs: 0,
      deviceWithdrawMs: 0,
      deviceApplied: false,
      deviceApplyResult: null,
      devicePalmErrorM: null,
      deviceReachWeight: 0,
      deviceContactAtSimMs: null,
      deviceChangedAtSimMs: null,
      deviceShortfallM: null,
      blockedMs: 0,
      blockedSteps: 0,
      lastBlockedBy: null,
      bestRemainingM: null,
      stallMs: 0,
      fridgePhase: null,
      fridgeContactMs: 0,
      fridgeGraspLostMs: 0,
      fridgePalmErrorM: null,
      fridgeSignedM: null,
      fridgeLeafSignedM: null,
      fridgeStaticSignedM: null,
      fridgeStaticName: null,
      fridgeReachWeight: 0,
      fridgeShortfallM: null,
      fridgeAngleRad: null,
      fridgeAngleAtStopRad: null,
      fridgeDriftRad: null,
      fridgeContactAtSimMs: null,
      fridgeGraspedAtSimMs: null,
      fridgeMotorStartedAtSimMs: null,
      fridgeMotorStoppedAtSimMs: null,
      fridgeBlocked: false,
      fridgeBestAngleRad: null,
      fridgeStallMs: 0,
      completion: null
    };
    this.putState(state);
    this.call("begin", definition.key, actionId);
    const target = this.scene.workstation();
    switch (definition.key) {
      case "walkToDesk": {
        if (!target) return this.fail(state, "NO_WORKSTATION");
        const path = resolveWalkingPath({ scene: this.scene, physics: this.physics }, this.rig.carrier.pos, target.approach.pos);
        if (!path.ok) return this.fail(state, path.reason ?? "NO_PATH");
        state.target = target;
        state.path = path;
        this.rig.idle(0);
        return;
      }
      case "sitOnDeskChair": {
        if (!target) return this.fail(state, "NO_WORKSTATION");
        const entry = this.sitEntry(target);
        if (!entry.ok) return this.fail(state, entry.reason ?? "NOT_AT_APPROACH");
        state.target = target;
        return;
      }
      case "typeAtKeyboard": {
        if (!target) return this.fail(state, "NO_WORKSTATION");
        state.target = target;
        this.rig.reach(target, 0);
        return;
      }
      case "thinkAtDesk": {
        if (!target) return this.fail(state, "NO_WORKSTATION");
        state.target = target;
        this.rig.think(target, 0);
        return;
      }
      case "restAtDesk": {
        if (!target) return this.fail(state, "NO_WORKSTATION");
        state.target = target;
        this.rig.rest(target, 0);
        return;
      }
      case "standUp": {
        state.target = target ?? null;
        this.physics?.setPosture("transition", "stand-clip");
        this.rig.stand(0);
        return;
      }
      case "walkAway": {
        const goal = target?.exit.pos ?? this.scene.home()?.pos ?? null;
        if (!goal) return this.fail(state, "NO_EXIT");
        const path = resolveWalkingPath({ scene: this.scene, physics: this.physics }, this.rig.carrier.pos, goal);
        if (!path.ok) return this.fail(state, path.reason ?? "NO_PATH");
        state.target = target ?? null;
        state.path = path;
        this.rig.idle(0);
        return;
      }
      case "lookAround": {
        this.rig.lookAround(0);
        return;
      }
      case "turnToSpeaker": {
        this.rig.turnToSpeaker(this.scene.speaker(), 0);
        return;
      }
      case "pressLampSwitchOn":
      case "pressLampSwitchOff": {
        const device = this.device;
        if (!device) return this.fail(state, "NO_DEVICE");
        if (!this.devicePort) return this.fail(state, "DEVICE_NOT_BOUND");
        if (device.seated && !this.rig.seated) return this.fail(state, "NOT_SEATED");
        if (!this.rig.reachDevice) return this.fail(state, "NO_DEVICE_REACH");
        state.devicePhase = "reach";
        state.deviceContactMs = 0;
        state.deviceWithdrawMs = 0;
        state.deviceApplied = false;
        state.deviceApplyResult = null;
        state.devicePalmErrorM = null;
        state.deviceContactAtSimMs = null;
        state.deviceChangedAtSimMs = null;
        state.deviceShortfallM = this.rig.measurePointReach?.(device.contact, device.side)?.shortfallM ?? null;
        this.rig.reachDevice(device);
        return;
      }
      case "walkToFridge": {
        const target2 = this.scene.fridge?.() ?? null;
        if (!target2) return this.fail(state, "NO_FRIDGE");
        if (!this.fridgePort?.ready()) return this.fail(state, "FRIDGE_NOT_BOUND");
        const path = resolveWalkingPath({ scene: this.scene, physics: this.physics }, this.rig.carrier.pos, target2.approach.pos);
        if (!path.ok) return this.fail(state, path.reason ?? "NO_PATH");
        state.path = path;
        this.rig.idle(0);
        return;
      }
      case "faceFridge": {
        const target2 = this.scene.fridge?.() ?? null;
        if (!target2) return this.fail(state, "NO_FRIDGE");
        if (distanceXZ(this.rig.carrier.pos, target2.approach.pos) > 0.45) return this.fail(state, "NOT_AT_FRIDGE");
        this.rig.idle(0);
        return;
      }
      case "reachFridgeHandle": {
        const target2 = this.scene.fridge?.() ?? null;
        const port = this.fridgePort;
        if (!target2) return this.fail(state, "NO_FRIDGE");
        if (!port?.ready()) return this.fail(state, "FRIDGE_NOT_BOUND");
        if (!this.rig.beginStandingReach) return this.fail(state, "NO_STANDING_REACH");
        if (distanceXZ(this.rig.carrier.pos, target2.approach.pos) > 0.45) return this.fail(state, "NOT_AT_FRIDGE");
        const point2 = port.handlePoint();
        const measure = this.rig.measurePointReach?.(point2, target2.side, {
          standpoint: { x: this.rig.carrier.pos.x, z: this.rig.carrier.pos.z, yaw: this.rig.carrier.yaw }
        }) ?? null;
        state.fridgeShortfallM = measure ? round3(measure.shortfallM) : null;
        if (measure && measure.shortfallM > 0) {
          return this.fail(state, `FRIDGE_HAND_UNREACHABLE:${measure.distanceM}/${measure.reachM}`);
        }
        this.fridgeChain = { grasped: false, opened: false, motorRunning: false, stopAngleRad: null };
        port.stop();
        state.fridgePhase = "reach";
        state.fridgeContactMs = 0;
        state.fridgeGraspLostMs = 0;
        this.rig.beginStandingReach({ side: target2.side, point: point2, normal: port.handleNormal(), toleranceM: target2.toleranceM });
        this.publishFridgeTelemetry(state);
        return;
      }
      case "graspFridgeHandle": {
        const target2 = this.scene.fridge?.() ?? null;
        if (!target2) return this.fail(state, "NO_FRIDGE");
        if (!this.fridgePort?.ready()) return this.fail(state, "FRIDGE_NOT_BOUND");
        if (!this.fridgeChain.grasped) state.fridgePhase = "grasp";
        this.publishFridgeTelemetry(state);
        return;
      }
      case "openFridgeDoor": {
        if (!this.fridgePort?.ready()) return this.fail(state, "FRIDGE_NOT_BOUND");
        if (!this.fridgeChain.grasped) return this.fail(state, "NOT_GRASPED");
        state.fridgePhase = "open";
        state.fridgeBestAngleRad = null;
        state.fridgeStallMs = 0;
        this.publishFridgeTelemetry(state);
        return;
      }
      case "releaseFridgeHandle": {
        if (!this.fridgePort?.ready()) return this.fail(state, "FRIDGE_NOT_BOUND");
        state.fridgePhase = "release";
        this.stopFridgeMotor(state);
        this.rig.endDeviceReach?.();
        this.publishFridgeTelemetry(state);
        return;
      }
      case "withdrawFromFridge": {
        const target2 = this.scene.fridge?.() ?? null;
        if (!target2) return this.fail(state, "NO_FRIDGE");
        const backDir = { x: -Math.sin(target2.approach.yaw), z: -Math.cos(target2.approach.yaw) };
        const back = {
          x: this.rig.carrier.pos.x + backDir.x * 0.35,
          y: this.rig.carrier.pos.y,
          z: this.rig.carrier.pos.z + backDir.z * 0.35
        };
        const path = resolveWalkingPath({ scene: this.scene, physics: this.physics }, this.rig.carrier.pos, back);
        if (!path.ok) return this.fail(state, path.reason ?? "NO_WITHDRAW_PATH");
        state.path = path;
        state.fridgePhase = "withdraw";
        this.publishFridgeTelemetry(state);
        return;
      }
      default:
        return this.fail(state, "UNSUPPORTED_ACTION");
    }
  }
  advance(actionId, dtMs) {
    const state = readId(this.states, actionId);
    if (!state) return;
    this.call("advance", state.actionKey, actionId);
    if (state.phase !== "running") return;
    if (!state.candidateValid()) {
      if (state.actionKey === "walkToDesk") {
        const target = this.scene.workstation();
        if (!target) return this.fail(state, "NO_WORKSTATION");
        const path = resolveWalkingPath({ scene: this.scene, physics: this.physics }, this.rig.carrier.pos, target.approach.pos);
        if (!path.ok) return this.fail(state, "CANDIDATE_HOST_CHANGED");
        state.path = path;
        state.pathIndex = 0;
      }
      if (state.actionKey === "standUp") {
        if (!this.guardPosture(state, "CANDIDATE_HOST_CHANGED")) return;
      } else {
        const definition = ACTION_CATALOG[state.actionKey];
        if (!definition || !this.preflight(definition, { facts: {}, body: this.body }, state.actionId).ok) return this.fail(state, "CANDIDATE_HOST_CHANGED");
      }
      state.candidateValid = this.scene.candidateGuard?.(state.actionKey) ?? (() => true);
    }
    const dt = Math.max(0, dtMs);
    this.simMs += dt;
    state.elapsedMs += dt;
    const def2 = definitionDuration(state.actionKey);
    switch (state.actionKey) {
      case "walkToDesk":
      case "walkAway":
        return this.advanceWalk(state, dt);
      case "sitOnDeskChair": {
        if (!state.target) return this.fail(state, "NO_WORKSTATION");
        if (!state.sat) {
          const s = this.rig.sitStart ? this.rig.sitStart(state.target) : { x: state.target.seat.x, z: state.target.seat.z };
          const start = { x: s.x, y: 0, z: s.z };
          const remaining = distanceXZ(this.rig.carrier.pos, start);
          const yawError = Math.abs(wrapAngle(state.target.seatFacing - this.rig.carrier.yaw));
          if (remaining > SIT_ARRIVE_EXACT_M || yawError > SIT_ALIGN_M) {
            if (remaining > SIT_ARRIVE_EXACT_M) {
              if (!state.entryPath) {
                const route = this.physics?.standRoute?.(
                  { x: this.rig.carrier.pos.x, y: 0, z: this.rig.carrier.pos.z },
                  start
                ) ?? null;
                if (route && !route.ok) return this.fail(state, `SEAT_ENTRY_NO_ROUTE:${route.reason ?? "unknown"}`);
                state.entryPath = route?.ok && route.points.length ? route.points.map((p) => ({ x: p.x, y: 0, z: p.z })) : [start];
                state.entryPathIndex = 0;
              }
              const last = state.entryPath.length - 1;
              const waypoint = state.entryPath[Math.min(state.entryPathIndex, last)] ?? start;
              const legRemaining = distanceXZ(this.rig.carrier.pos, waypoint);
              if (legRemaining <= SIT_ARRIVE_EXACT_M && state.entryPathIndex < last) {
                state.entryPathIndex += 1;
                this.rig.idle(dt);
                this.rig.update(dt);
                return;
              }
              this.moveToward(state, waypoint, dt, SIT_STEP_SPEED, state.entryPathIndex === last ? state.target.seatFacing : void 0);
              if (state.phase !== "running") {
                this.rig.update(dt);
                return;
              }
              this.rig.walk(dt, SIT_STEP_SPEED);
            } else {
              this.rig.setCarrier(this.rig.carrier.pos, turnToward(this.rig.carrier.yaw, state.target.seatFacing, TURN_RATE_RAD_PER_S * (dt / 1e3)));
              this.rig.idle(dt);
            }
            this.rig.update(dt);
            return;
          }
          state.sat = true;
          this.physics?.setPosture("transition", "sit-clip");
          this.physics?.setTransition?.(0);
          this.rig.seat(state.target);
        }
        this.rig.update(dt);
        if (this.rig.transitioning) {
          state.settleElapsedMs = 0;
          if (this.rig.transitionProgress) {
            this.physics?.setTransition?.(this.rig.transitionProgress());
          }
          this.physics?.syncCarrier(this.rig.carrier.pos);
          if (!this.guardPosture(state, "SEAT_PATH_BLOCKED")) return;
          return;
        }
        if (state.sat && this.physics?.posture === "transition") {
          this.physics.setPosture("seated", "sit-done");
          this.physics.syncCarrier(this.rig.carrier.pos);
        }
        if (!this.guardPosture(state, "SEAT_PATH_BLOCKED")) return;
        state.settleElapsedMs += dt;
        if (this.rig.seatSettled && !this.rig.seatSettled(SEAT_SETTLE_TOL_M, 0)) {
          if (state.settleElapsedMs > SEAT_SETTLE_LIMIT_MS) return this.fail(state, "SEAT_NOT_SETTLED");
          return;
        }
        if (state.elapsedMs >= def2) this.finishWithContacts(state, true, false, def2, SIT_CONFIRM_MS);
        return;
      }
      case "typeAtKeyboard": {
        if (!state.target) return this.fail(state, "NO_WORKSTATION");
        this.rig.reach(state.target, dt);
        this.rig.update(dt);
        if (state.elapsedMs >= def2) this.finishWithContacts(state, true, true, def2, TYPING_CONFIRM_MS);
        return;
      }
      case "thinkAtDesk": {
        if (!state.target) return this.fail(state, "NO_WORKSTATION");
        this.rig.think(state.target, dt);
        this.rig.update(dt);
        if (state.elapsedMs >= def2) this.finishWithContacts(state, true, false);
        return;
      }
      case "restAtDesk": {
        if (!state.target) return this.fail(state, "NO_WORKSTATION");
        this.rig.rest(state.target, dt);
        this.rig.update(dt);
        if (state.elapsedMs >= def2) this.finishWithContacts(state, true, false);
        return;
      }
      case "standUp": {
        this.rig.stand(dt);
        this.rig.update(dt);
        if (this.rig.transitioning) {
          state.settleElapsedMs = 0;
          if (state.target?.descentPath && this.rig.transitionProgress) {
            this.physics?.setTransition?.(this.rig.transitionProgress());
          }
          this.physics?.syncCarrier(this.rig.carrier.pos);
          return;
        }
        if (this.physics?.posture === "transition") {
          this.physics.setPosture("standing", "stand-done");
          this.physics.syncCarrier(this.rig.carrier.pos);
          if (!this.guardPosture(state, "STAND_PATH_BLOCKED")) return;
        }
        if (state.elapsedMs >= def2) {
          const report = evaluateContacts(this.rig.frame(), this.standingTargets(), CONTACT_TOLERANCE_LOCAL);
          state.contact = report;
          this.lastContact = report;
          const reason = contactFailureReason(report);
          if (reason === "FEET_OFF_FLOOR" && state.settleElapsedMs < STAND_SETTLE_LIMIT_MS) {
            state.settleElapsedMs += dt;
            return;
          }
          if (reason) this.fail(state, reason);
          else this.completePostPhysics(state, "standing-contact", { checkHands: false });
        }
        return;
      }
      case "lookAround":
      case "turnToSpeaker": {
        if (state.actionKey === "lookAround") this.rig.lookAround(dt);
        else this.rig.turnToSpeaker(this.scene.speaker(), dt);
        this.rig.update(dt);
        if (state.elapsedMs >= def2) this.completeLogical(state);
        return;
      }
      case "pressLampSwitchOn":
      case "pressLampSwitchOff":
        return this.advanceDevicePress(state, dt);
      case "walkToFridge":
        return this.advanceWalk(state, dt);
      case "faceFridge":
        return this.advanceFridgeFace(state, dt);
      case "reachFridgeHandle":
        return this.advanceFridgeReach(state, dt);
      case "graspFridgeHandle":
        return this.advanceFridgeGrasp(state, dt);
      case "openFridgeDoor":
        return this.advanceFridgeOpen(state, dt);
      case "releaseFridgeHandle":
        return this.advanceFridgeRelease(state, dt);
      case "withdrawFromFridge":
        return this.advanceFridgeWithdraw(state, dt);
      default:
        return this.fail(state, "UNSUPPORTED_ACTION");
    }
  }
  result(actionId) {
    const state = readId(this.states, actionId);
    if (!state) return { status: "failed", reason: `NO_STATE:${actionId}` };
    if (state.phase === "completed") {
      const completion = state.completion;
      return completion ? { status: "completed", reason: null, completion } : { status: "failed", reason: "COMPLETION_CLASSIFICATION_REQUIRED" };
    }
    if (state.phase === "failed") return { status: "failed", reason: state.reason };
    return { status: "running", reason: null };
  }
  observe(actionId, request) {
    const state = readId(this.states, actionId);
    const completion = state?.completion ?? null;
    if (!state || state.phase !== "completed" || completion?.kind !== "post-physics") {
      return { observationKind: request.observationKind, outcome: "rejected", reason: "NO_COMPLETION_CANDIDATE", simStep: request.afterSimStep, dependencies: request.dependencies };
    }
    const evidence = this.evidenceSource?.() ?? null;
    if (!evidence) {
      return { observationKind: request.observationKind, outcome: "rejected", reason: "POST_PHYSICS_EVIDENCE_UNAVAILABLE", simStep: request.afterSimStep, dependencies: request.dependencies };
    }
    if (evidence.simStep <= request.afterSimStep) {
      return { observationKind: evidence.observationKind ?? request.observationKind, outcome: "rejected", reason: "POST_PHYSICS_STEP_NOT_ADVANCED", simStep: evidence.simStep, dependencies: evidence.dependencies };
    }
    const details = completion.details ?? {};
    const reason = this.observePostPhysics(state, request.observationKind, details) ?? observationResult(completion, evidence);
    return {
      observationKind: evidence.observationKind ?? request.observationKind,
      outcome: reason === null && evidence.outcome === "confirmed" ? "confirmed" : "rejected",
      reason: reason ?? evidence.reason,
      simStep: evidence.simStep,
      dependencies: evidence.dependencies
    };
  }
  observePostPhysics(state, observationKind, details) {
    switch (observationKind) {
      case "seat-contact":
      case "standing-contact": {
        const target = this.scene.workstation();
        if (!target) return "NO_WORKSTATION";
        const checkHands = details.checkHands === true;
        if (this.rig.seated !== (observationKind === "seat-contact")) return "POSTURE_MISMATCH";
        const targets = observationKind === "standing-contact" ? this.standingTargets() : contactTargetsForSeat(target, checkHands, this.rig.hipTarget ?? null);
        targets.seated = observationKind === "seat-contact" ? this.rig.seated : false;
        const report = evaluateContacts(this.rig.frame(), targets, CONTACT_TOLERANCE_LOCAL);
        state.contact = report;
        this.lastContact = report;
        return contactFailureReason(report);
      }
      case "carrier-arrival": {
        const targetX = details.targetX;
        const targetZ = details.targetZ;
        if (typeof targetX !== "number" || typeof targetZ !== "number") return "EVIDENCE_TARGET_MISSING";
        return Math.hypot(this.rig.carrier.pos.x - targetX, this.rig.carrier.pos.z - targetZ) <= WALK_ARRIVE_EXACT_M + 1e-6 ? null : "CARRIER_NOT_AT_TARGET";
      }
      case "device-applied": {
        const expected = details.deviceState;
        if (typeof expected !== "boolean" || !this.devicePort) return "DEVICE_EVIDENCE_UNAVAILABLE";
        const palm = this.device ? this.rig.palmPoint?.(this.device.side) ?? null : null;
        const handWithdrawn = !this.device || !palm ? this.rig.deviceReachDebug?.()?.weight === 0 : Math.hypot(palm.x - this.device.contact.x, palm.y - this.device.contact.y, palm.z - this.device.contact.z) > this.device.toleranceM;
        if (!handWithdrawn) return "HAND_NOT_WITHDRAWN";
        return this.devicePort.read() === expected ? null : "DEVICE_STATE_MISMATCH";
      }
      case "fridge-facing": {
        const targetYaw = details.targetYaw;
        if (typeof targetYaw !== "number") return "EVIDENCE_TARGET_MISSING";
        return Math.abs(wrapAngle(targetYaw - this.rig.carrier.yaw)) <= this.alignEps ? null : "FRIDGE_NOT_FACED";
      }
      case "fridge-handle-contact": {
        const contact = this.fridgeContact(state);
        if (!contact.ok) return "FRIDGE_HANDLE_CONTACT_LOST";
        return details.grasped === true && !this.fridgeChain.grasped ? "FRIDGE_GRASP_LOST" : null;
      }
      case "fridge-door-open": {
        const target = this.scene.fridge?.() ?? null;
        const port = this.fridgePort;
        if (!target || !port) return "FRIDGE_EVIDENCE_UNAVAILABLE";
        if (this.fridgeChain.motorRunning) return "FRIDGE_MOTOR_RUNNING";
        return port.angleRad() <= target.minOpenRad ? null : "FRIDGE_DOOR_NOT_OPEN";
      }
      case "fridge-handle-released": {
        if (this.fridgeChain.motorRunning) return "FRIDGE_MOTOR_RUNNING";
        const contact = this.fridgeContact(state);
        const weight = Number((this.rig.deviceReachDebug?.() ?? { weight: 0 }).weight ?? 0);
        return weight <= 0.02 && (!contact.dist || contact.dist.distanceM > (this.scene.fridge?.()?.toleranceM ?? 0)) ? null : "FRIDGE_HANDLE_NOT_RELEASED";
      }
      default:
        return `EVIDENCE_KIND_UNSUPPORTED:${observationKind}`;
    }
  }
  /**
   * Whether the body is PHYSICALLY in the slot this action claimed, even though
   * the action did not complete. A sit that fails its settle/contact gate leaves
   * the avatar on the chair; the claim wrapper must keep the seat for that body
   * instead of handing it to another actor just because the action failed.
   */
  slotHeld(actionId) {
    const state = readId(this.states, actionId);
    if (!state) return false;
    const seatAction = state.actionKey === "sitOnDeskChair" || state.actionKey === "typeAtKeyboard" || state.actionKey === "thinkAtDesk" || state.actionKey === "restAtDesk" || state.actionKey === "standUp";
    return seatAction && this.rig.seated;
  }
  beginExit(actionId) {
    const state = readId(this.states, actionId);
    if (!state) return;
    if (state.phase === "exiting") return;
    state.phase = "exiting";
    state.completion = null;
    state.exitElapsedMs = 0;
    this.call("exit", state.actionKey, actionId);
    if (state.actionKey === "pressLampSwitchOn" || state.actionKey === "pressLampSwitchOff") {
      this.rig.endDeviceReach?.();
    } else if (isFridgeAction(state.actionKey)) {
      this.stopFridgeMotor(state);
      this.rig.endDeviceReach?.();
      this.publishFridgeTelemetry(state);
    } else if (state.actionKey === "sitOnDeskChair") this.rig.stand(0);
    else this.rig.relax();
  }
  advanceExit(actionId, dtMs) {
    const state = readId(this.states, actionId);
    if (!state) return;
    this.call("advance", state.actionKey, actionId);
    if (state.phase !== "exiting") return;
    const dt = Math.max(0, dtMs);
    this.simMs += dt;
    state.exitElapsedMs += dt;
    this.rig.update(dt);
  }
  exitComplete(actionId) {
    const state = readId(this.states, actionId);
    if (!state) return true;
    if (state.phase !== "exiting") return state.phase !== "running";
    if (state.exitElapsedMs < this.exitDurationMs) return false;
    if (state.actionKey === "standUp" && this.evidenceSource?.()?.outcome === "rejected") return false;
    if (state.actionKey === "pressLampSwitchOn" || state.actionKey === "pressLampSwitchOff") {
      const dbg = this.rig.deviceReachDebug?.() ?? null;
      if (dbg && Number(dbg.weight) > 0.02) return false;
    }
    if (isFridgeAction(state.actionKey)) {
      const dbg = this.rig.deviceReachDebug?.() ?? null;
      if (dbg && Number(dbg.weight) > 0.02) return false;
      if (this.fridgeChain.motorRunning) return false;
    }
    const frame = this.rig.frame();
    const leftSole = frame.leftSoleLow ? frame.leftSoleLow.y : frame.leftFoot.y - (frame.leftSoleOffsetM ?? frame.soleOffsetM);
    const rightSole = frame.rightSoleLow ? frame.rightSoleLow.y : frame.rightFoot.y - (frame.rightSoleOffsetM ?? frame.soleOffsetM);
    const feet = Math.abs(leftSole - this.floorY());
    const feet2 = Math.abs(rightSole - this.floorY());
    return Math.max(feet, feet2) <= 0.02 + 1e-9;
  }
  forceStop(actionId) {
    const state = readId(this.states, actionId);
    this.call("force-stop", state?.actionKey ?? "unknown", actionId);
    this.fridgePort?.stop();
    this.fridgeChain.motorRunning = false;
    this.rig.endDeviceReach?.();
    if (state?.actionKey === "standUp" && this.evidenceSource?.()?.outcome === "rejected") return false;
    return this.rig.forceNeutral() === true;
  }
  cleanup(actionId) {
    const state = readId(this.states, actionId);
    this.call("cleanup", state?.actionKey ?? "unknown", actionId);
    if (!state) return;
    if (state.actionKey === "pressLampSwitchOn" || state.actionKey === "pressLampSwitchOff") {
      this.rig.endDeviceReach?.();
    }
    if (isFridgeAction(state.actionKey)) {
      if (state.phase !== "completed") {
        this.stopFridgeMotor(state);
        this.fridgeChain.grasped = false;
      }
      if (state.actionKey === "withdrawFromFridge" && state.phase === "completed") {
        this.fridgeChain = { grasped: false, opened: false, motorRunning: false, stopAngleRad: null };
      }
      if (state.phase !== "completed" || state.actionKey === "withdrawFromFridge") this.rig.endDeviceReach?.();
      if (state.phase !== "completed" && !this.fridgeChain.motorRunning && Number(this.rig.deviceReachDebug?.()?.weight ?? 0) <= 0.02) {
        this.publishFridgeTelemetry(state);
        this.fridgePort?.onSafeRelease?.();
      }
    }
    this.stampHistory(state);
    delete this.states[actionId];
  }
  // --- internals -------------------------------------------------------------
  floorY() {
    return this.scene.workstation()?.floorY ?? 0;
  }
  standingTargets() {
    const target = this.scene.workstation();
    const floorY = target?.floorY ?? 0;
    const zero = { x: 0, y: 0, z: 0 };
    return {
      floorY,
      seatPoint: { x: 0, y: 0, z: 0 },
      seated: false,
      checkHands: false,
      handTargets: { left: zero, right: zero },
      keyboardTopY: 0,
      keyboardRect: { minX: 0, maxX: 0, minZ: 0, maxZ: 0 },
      deskTopY: 0,
      deskRect: { minX: 1, maxX: -1, minZ: 1, maxZ: -1 }
    };
  }
  advanceWalk(state, dt) {
    if (!state.path) return this.fail(state, "NO_PATH");
    if (state.path.navigation && !state.path.navigation.valid([this.rig.carrier.pos, ...state.path.points.slice(state.pathIndex)])) {
      this.rig.idle(dt);
      this.rig.update(dt);
      return this.fail(state, "PATH_INVALIDATED");
    }
    const step = this.walkSpeed * (dt / 1e3);
    const maxStep = step * MAX_STEP_RATIO;
    let budget = step;
    const before = { ...this.rig.carrier.pos };
    let blockedNow = false;
    let hitId = null;
    let iterations = 0;
    while (budget > 1e-6 && state.pathIndex < state.path.points.length && iterations < 32) {
      iterations += 1;
      const point2 = state.path.points[state.pathIndex];
      const remaining2 = distanceXZ(this.rig.carrier.pos, point2);
      if (remaining2 <= this.arriveEps && state.pathIndex < state.path.points.length - 1) {
        state.pathIndex += 1;
        continue;
      }
      const move = Math.min(budget, remaining2, maxStep * 1);
      const dirYaw = yawTo(this.rig.carrier.pos, point2);
      const yaw2 = turnToward(this.rig.carrier.yaw, dirYaw, TURN_RATE_RAD_PER_S * (dt / 1e3));
      const desired = {
        x: this.rig.carrier.pos.x + Math.sin(dirYaw) * move,
        y: this.rig.carrier.pos.y,
        z: this.rig.carrier.pos.z + Math.cos(dirYaw) * move
      };
      const callFrom = { ...this.rig.carrier.pos };
      const resolved = this.resolveMove(desired, dt);
      this.rig.setCarrier(resolved.position, yaw2);
      const advanced = distanceXZ(callFrom, resolved.position);
      budget -= advanced;
      if (resolved.blocked && advanced < move - 1e-4) {
        blockedNow = true;
        hitId = resolved.hits[0]?.id ?? null;
        break;
      }
      if (advanced <= 1e-9) break;
      if (advanced >= move - 1e-4) {
        if (remaining2 <= move + WALK_ARRIVE_EXACT_M) state.pathIndex += 1;
      } else {
        break;
      }
    }
    const moved = distanceXZ(before, this.rig.carrier.pos);
    this.walkStats.steps += 1;
    this.walkStats.distanceM = round3(this.walkStats.distanceM + moved);
    this.walkStats.maxStepM = Math.max(this.walkStats.maxStepM, round3(moved));
    if (blockedNow) {
      state.blockedSteps += 1;
      state.blockedMs += dt;
      state.lastBlockedBy = hitId;
      this.rig.walk(dt, 0);
      this.rig.update(dt);
      if (state.blockedMs >= WALK_BLOCK_FAIL_MS) {
        return this.fail(state, `WALK_BLOCKED:${hitId ?? "unknown"}`);
      }
      return;
    }
    state.blockedSteps = 0;
    state.blockedMs = 0;
    const end = state.path.points[state.path.points.length - 1];
    const remaining = distanceXZ(this.rig.carrier.pos, end);
    if (state.bestRemainingM == null || remaining < state.bestRemainingM - WALK_PROGRESS_EPS) {
      state.bestRemainingM = remaining;
      state.stallMs = 0;
    } else {
      state.stallMs += dt;
      if (state.stallMs >= WALK_STALL_FAIL_MS && remaining > this.arriveEps) {
        return this.fail(state, `WALK_STALLED:${state.lastBlockedBy ?? "no-hit"}`);
      }
    }
    if (remaining > WALK_ARRIVE_EXACT_M) {
      this.rig.walk(dt, moved / Math.max(dt / 1e3, 1e-6));
      this.rig.update(dt);
      return;
    }
    const wantYaw = state.actionKey === "walkToDesk" ? state.target?.approach.yaw ?? this.rig.carrier.yaw : state.actionKey === "walkToFridge" ? this.scene.fridge?.()?.approach.yaw ?? this.rig.carrier.yaw : state.target?.exit.yaw ?? this.rig.carrier.yaw;
    const yaw = turnToward(this.rig.carrier.yaw, wantYaw, ALIGN_RATE_RAD_PER_S * (dt / 1e3));
    this.physics?.syncCarrier({ ...end });
    this.rig.setCarrier({ ...end }, yaw);
    this.rig.update(dt);
    if (Math.abs(wrapAngle(wantYaw - yaw)) <= this.alignEps) {
      this.rig.setCarrier({ ...end }, wantYaw);
      this.rig.idle(0);
      this.completePostPhysics(state, "carrier-arrival", { targetX: round3(end.x), targetZ: round3(end.z) });
    }
  }
  /**
   * Resolve a proposed displacement. With a physics port this is the capsule
   * sweep in the shared world; without one it is the old kinematic write (the
   * M4 bundles keep working unchanged).
   */
  resolveMove(desired, dt) {
    const from = this.rig.carrier.pos;
    if (!this.physics) {
      return { position: desired, movedM: distanceXZ(from, desired), blocked: false, hits: [] };
    }
    const result = this.physics.moveCarrier(from, desired, dt);
    return { position: result.position, movedM: result.movedM, blocked: result.blocked, hits: result.hits };
  }
  /**
   * The posture guard: a clip-driven transition/seated pose must not be inside
   * the desk, a wall or a cabinet. Only the seat being used is excluded, so this
   * is the check that "sit down" did not become "sit through the table".
   */
  guardPosture(state, reason) {
    if (!this.physics) return true;
    const pen = this.physics.penetrations();
    if (!pen.length) return true;
    const worst = pen.map((p) => `${p.id}@${p.depthM.toFixed(3)}m`).join(",");
    this.fail(state, `${reason}:${worst}`);
    return false;
  }
  /**
   * Move the carrier toward a point for the sit step-in. The same world resolves
   * it: a blocked seat entry fails the sit with the collider id instead of the
   * body continuing kinematically through the chair.
   */
  moveToward(state, to, dt, speed, faceYaw) {
    const step = speed * (dt / 1e3);
    const remaining = distanceXZ(this.rig.carrier.pos, to);
    if (remaining <= 1e-4) return;
    const move = Math.min(step, remaining);
    const dirYaw = yawTo(this.rig.carrier.pos, to);
    const wantYaw = faceYaw ?? state.target?.seatFacing ?? dirYaw;
    const yaw = turnToward(this.rig.carrier.yaw, wantYaw, TURN_RATE_RAD_PER_S * (dt / 1e3));
    const desired = {
      x: this.rig.carrier.pos.x + Math.sin(dirYaw) * move,
      y: this.rig.carrier.pos.y,
      z: this.rig.carrier.pos.z + Math.cos(dirYaw) * move
    };
    const resolved = this.resolveMove(desired, dt);
    this.rig.setCarrier(resolved.position, yaw);
    if (resolved.blocked && resolved.movedM < move - 1e-4) {
      this.fail(state, `SEAT_ENTRY_BLOCKED:${resolved.hits[0]?.id ?? "unknown"}`);
    }
  }
  /**
   * Publish the appliance-press telemetry row the HUD and tests read.
   *
   * `releasedAtSimMs` defaults to NULL, never to the previous press's release
   * time: the old default carried the last release into the next press's reach
   * phase (measured: the off press reported releasedAt = the on press's 5.5 s
   * while its own contact was at 6.15 s), which made "contact < change <
   * withdraw" look satisfied before the press had even touched the pad.
   */
  publishDeviceTelemetry(state, releasedAtSimMs = null) {
    if (!this.device) return;
    this.lastDevice = {
      deviceId: this.device.id,
      phase: state.devicePhase,
      palmErrorM: state.devicePalmErrorM,
      contactMs: round3(state.deviceContactMs),
      contactAtSimMs: state.deviceContactAtSimMs,
      changedAtSimMs: state.deviceChangedAtSimMs,
      releasedAtSimMs,
      appliedOnce: state.deviceApplied,
      applyReason: state.deviceApplyResult?.reason ?? null,
      shortfallM: state.deviceShortfallM,
      reachWeight: Number((state.deviceReachWeight || 0).toFixed(3))
    };
  }
  /**
   * Appliance press: reach → contact (dwell) → apply once → withdraw → done.
   *
   * The DEVICE only changes after the measured visible palm has stayed inside
   * the resource's tolerance for its declared dwell. A cancel or timeout before
   * that point leaves the device untouched; the apply happens exactly once; the
   * hand then withdraws and only then does the action report completion, which
   * is what lets the executor commit the predicted effect and release the
   * switch claim.
   */
  advanceDevicePress(state, dt) {
    const device = this.device;
    const port = this.devicePort;
    if (!device || !port) return this.fail(state, device ? "DEVICE_NOT_BOUND" : "NO_DEVICE");
    const palmError = () => {
      const palm = this.rig.palmPoint?.(device.side) ?? null;
      if (!palm) return Number.POSITIVE_INFINITY;
      return Math.hypot(palm.x - device.contact.x, palm.y - device.contact.y, palm.z - device.contact.z);
    };
    if (state.devicePhase === "reach" || state.devicePhase === null) {
      state.devicePhase = "reach";
      this.rig.update(dt);
      const error = palmError();
      state.devicePalmErrorM = Number.isFinite(error) ? round3(error) : null;
      const reach = this.rig.deviceReachDebug?.() ?? null;
      const weight = reach ? Number(reach.weight) : 1;
      state.deviceReachWeight = weight;
      if (weight >= DEVICE_REACH_COMPLETE && error <= device.toleranceM) {
        state.deviceContactMs += dt;
        if (state.deviceContactAtSimMs === null) state.deviceContactAtSimMs = this.simMs;
      } else {
        state.deviceContactMs = 0;
        state.deviceContactAtSimMs = null;
      }
      if (state.deviceContactMs >= device.holdMs) {
        let result;
        try {
          result = port.apply(state.actionKey === "pressLampSwitchOn");
        } catch (err) {
          return this.fail(state, `DEVICE_APPLY_ERROR:${err?.message ?? String(err)}`);
        }
        state.deviceApplied = true;
        state.deviceApplyResult = result;
        if (result.changed) state.deviceChangedAtSimMs = this.simMs;
        if (result.state !== (state.actionKey === "pressLampSwitchOn")) {
          return this.fail(state, `DEVICE_APPLY_FAILED:${result.reason ?? "state-unchanged"}`);
        }
        state.devicePhase = "withdraw";
        state.deviceWithdrawMs = 0;
        this.rig.endDeviceReach?.();
      } else if (state.elapsedMs >= device.reachTimeoutMs) {
        const detail = state.devicePalmErrorM === null ? "palm-unavailable" : `${state.devicePalmErrorM}m/${device.toleranceM}m`;
        return this.fail(state, `HAND_NOT_CONTACTED:${detail}`);
      }
      this.publishDeviceTelemetry(state);
      return;
    }
    if (state.devicePhase === "withdraw") {
      state.deviceWithdrawMs += dt;
      this.rig.update(dt);
      const error = palmError();
      state.devicePalmErrorM = Number.isFinite(error) ? round3(error) : null;
      if (state.deviceWithdrawMs >= device.withdrawMs && error > device.toleranceM) {
        state.devicePhase = "done";
        this.publishDeviceTelemetry(state, this.simMs);
        return this.completePostPhysics(state, "device-applied", {
          deviceState: port.read(),
          handWithdrawn: true
        });
      }
      if (state.deviceWithdrawMs >= Math.max(device.withdrawMs * 3, device.withdrawMs + 800)) {
        return this.fail(state, "HAND_NOT_WITHDRAWN");
      }
      this.publishDeviceTelemetry(state);
      return;
    }
    this.publishDeviceTelemetry(state);
  }
  // --- standing fridge chain -------------------------------------------------
  /**
   * The measured contact row against the ACTUAL handle pose this step.
   *
   * "Contact" means all of: the reach blend is complete (the solved target IS
   * the contact), the visible palm's surface distance is inside the resource
   * tolerance, the palm is not inside the handle, not inside the leaf and not
   * inside any static carcass box. A point tolerance alone is not contact.
   */
  fridgeContact(state) {
    const target = this.scene.fridge?.() ?? null;
    const port = this.fridgePort;
    if (!target || !port) return { ok: false, weight: 0, dist: null };
    const reach = this.rig.deviceReachDebug?.() ?? null;
    const weight = Number(reach?.weight ?? 0);
    state.fridgeReachWeight = weight;
    if (reach?.shortfallM != null) state.fridgeShortfallM = round3(Number(reach.shortfallM));
    const palm = this.rig.palmPoint?.(target.side) ?? null;
    if (!palm) {
      state.fridgePalmErrorM = null;
      return { ok: false, weight, dist: null };
    }
    const d = port.palmDistance(palm);
    state.fridgePalmErrorM = round3(d.distanceM);
    state.fridgeSignedM = round3(d.signedM);
    state.fridgeLeafSignedM = round3(d.leafSignedM);
    state.fridgeStaticSignedM = round3(d.staticSignedM);
    state.fridgeStaticName = d.staticName;
    const ok = weight >= 0.995 && d.distanceM <= target.toleranceM && d.signedM >= -2e-3 && d.leafSignedM >= 0 && d.staticSignedM > 0;
    return { ok, weight, dist: d };
  }
  stopFridgeMotor(state) {
    const port = this.fridgePort;
    if (port) {
      port.stop();
      try {
        state.fridgeAngleAtStopRad = round3(port.angleRad());
        state.fridgeAngleRad = state.fridgeAngleAtStopRad;
      } catch {
        state.fridgeAngleAtStopRad = state.fridgeAngleRad;
      }
    }
    this.fridgeChain.motorRunning = false;
    if (state.fridgeMotorStoppedAtSimMs === null) state.fridgeMotorStoppedAtSimMs = this.simMs;
  }
  publishFridgeTelemetry(state, releasedAtSimMs = null) {
    const target = this.scene.fridge?.() ?? null;
    if (!target) return;
    const toDeg = (rad) => rad == null ? null : Math.round(rad * 180 / Math.PI * 100) / 100;
    this.lastFridge = {
      targetId: target.id,
      phase: state.fridgePhase,
      palmErrorM: state.fridgePalmErrorM,
      signedM: state.fridgeSignedM,
      leafSignedM: state.fridgeLeafSignedM,
      staticSignedM: state.fridgeStaticSignedM,
      staticName: state.fridgeStaticName,
      angleDeg: toDeg(state.fridgeAngleRad),
      angleAtStopDeg: toDeg(state.fridgeAngleAtStopRad),
      driftDeg: toDeg(state.fridgeDriftRad),
      motorRunning: this.fridgeChain.motorRunning,
      grasped: this.fridgeChain.grasped,
      blocked: state.fridgeBlocked,
      contactAtSimMs: state.fridgeContactAtSimMs,
      graspedAtSimMs: state.fridgeGraspedAtSimMs,
      motorStartedAtSimMs: state.fridgeMotorStartedAtSimMs,
      motorStoppedAtSimMs: state.fridgeMotorStoppedAtSimMs,
      releasedAtSimMs,
      minOpenDeg: Math.round(-target.minOpenRad * 180 / Math.PI * 10) / 10,
      targetOpenDeg: Math.round(-target.targetOpenRad * 180 / Math.PI * 10) / 10,
      reachWeight: Number(state.fridgeReachWeight.toFixed(3)),
      shortfallM: state.fridgeShortfallM
    };
  }
  advanceFridgeFace(state, dt) {
    const target = this.scene.fridge?.() ?? null;
    if (!target) return this.fail(state, "NO_FRIDGE");
    if (distanceXZ(this.rig.carrier.pos, target.approach.pos) > 0.45) return this.fail(state, "NOT_AT_FRIDGE");
    const yaw = turnToward(this.rig.carrier.yaw, target.approach.yaw, TURN_RATE_RAD_PER_S * (dt / 1e3));
    this.rig.setCarrier(this.rig.carrier.pos, yaw);
    this.rig.idle(dt);
    this.rig.update(dt);
    const aligned = Math.abs(wrapAngle(target.approach.yaw - yaw)) <= this.alignEps;
    if (aligned && state.elapsedMs >= 300) this.completePostPhysics(state, "fridge-facing", {
      targetYaw: round3(target.approach.yaw)
    });
  }
  advanceFridgeReach(state, dt) {
    const target = this.scene.fridge?.() ?? null;
    const port = this.fridgePort;
    if (!target || !port) return this.fail(state, target ? "FRIDGE_NOT_BOUND" : "NO_FRIDGE");
    const point2 = port.handlePoint();
    this.rig.updateReachTarget?.(point2, port.handleNormal());
    this.rig.update(dt);
    const c = this.fridgeContact(state);
    if (c.dist && c.dist.leafSignedM < -2e-3) return this.fail(state, `HAND_INTO_LEAF:${c.dist.leafSignedM}`);
    if (c.dist && c.dist.staticSignedM < 0) return this.fail(state, `HAND_INTO_BODY:${c.dist.staticName}`);
    if (c.ok) {
      state.fridgeContactMs += dt;
      if (state.fridgeContactAtSimMs === null) state.fridgeContactAtSimMs = this.simMs;
    } else {
      state.fridgeContactMs = 0;
      state.fridgeContactAtSimMs = null;
    }
    if (state.fridgeContactMs >= target.contactHoldMs) {
      this.publishFridgeTelemetry(state);
      return this.completePostPhysics(state, "fridge-handle-contact", { grasped: false });
    }
    if (state.elapsedMs >= target.reachTimeoutMs) {
      const detail = state.fridgePalmErrorM == null ? "palm-unavailable" : `${state.fridgePalmErrorM}m/${target.toleranceM}m`;
      return this.fail(state, `HAND_NOT_CONTACTED:${detail}`);
    }
    this.publishFridgeTelemetry(state);
  }
  advanceFridgeGrasp(state, dt) {
    const target = this.scene.fridge?.() ?? null;
    const port = this.fridgePort;
    if (!target || !port) return this.fail(state, target ? "FRIDGE_NOT_BOUND" : "NO_FRIDGE");
    this.rig.updateReachTarget?.(port.handlePoint(), port.handleNormal());
    this.rig.update(dt);
    const c = this.fridgeContact(state);
    if (!c.ok) {
      state.fridgeGraspLostMs += dt;
      if (state.fridgeGraspLostMs > 200) return this.fail(state, "GRASP_LOST");
    } else {
      state.fridgeGraspLostMs = 0;
      state.fridgeContactMs += dt;
      if (state.fridgeContactAtSimMs === null) state.fridgeContactAtSimMs = this.simMs;
    }
    if (state.fridgeContactMs >= target.graspHoldMs) {
      port.stop();
      this.fridgeChain.grasped = true;
      state.fridgeGraspedAtSimMs = this.simMs;
      this.publishFridgeTelemetry(state);
      return this.completePostPhysics(state, "fridge-handle-contact", { grasped: true });
    }
    if (state.elapsedMs >= Math.max(target.reachTimeoutMs, target.graspHoldMs + 1500)) {
      return this.fail(state, `GRASP_NOT_HELD:${state.fridgePalmErrorM ?? "palm-unavailable"}`);
    }
    this.publishFridgeTelemetry(state);
  }
  advanceFridgeOpen(state, dt) {
    const target = this.scene.fridge?.() ?? null;
    const port = this.fridgePort;
    if (!target || !port) return this.fail(state, target ? "FRIDGE_NOT_BOUND" : "NO_FRIDGE");
    if (!this.fridgeChain.grasped) return this.fail(state, "NOT_GRASPED");
    if (!this.fridgeChain.motorRunning) {
      port.driveOpen();
      this.fridgeChain.motorRunning = true;
      state.fridgeMotorStartedAtSimMs = this.simMs;
    }
    this.rig.updateReachTarget?.(port.handlePoint(), port.handleNormal());
    this.rig.update(dt);
    const c = this.fridgeContact(state);
    if (c.dist && c.dist.leafSignedM < -2e-3) {
      this.stopFridgeMotor(state);
      return this.fail(state, `HAND_INTO_LEAF:${c.dist.leafSignedM}`);
    }
    if (c.dist && c.dist.staticSignedM < 0) {
      this.stopFridgeMotor(state);
      return this.fail(state, `HAND_INTO_BODY:${c.dist.staticName}`);
    }
    if (!c.ok) {
      state.fridgeGraspLostMs += dt;
      if (state.fridgeGraspLostMs > 150) {
        this.stopFridgeMotor(state);
        this.publishFridgeTelemetry(state);
        return this.fail(state, `GRASP_LOST:${state.fridgePalmErrorM ?? "palm-unavailable"}`);
      }
    } else {
      state.fridgeGraspLostMs = 0;
    }
    const angle = port.angleRad();
    state.fridgeAngleRad = round3(angle);
    state.fridgeBlocked = port.blocked();
    if (angle <= target.targetOpenRad) {
      this.stopFridgeMotor(state);
      this.fridgeChain.opened = true;
      this.publishFridgeTelemetry(state);
      return this.completePostPhysics(state, "fridge-door-open", { angleRad: round3(angle), motorStopped: true });
    }
    if (state.fridgeBlocked) {
      this.stopFridgeMotor(state);
      this.publishFridgeTelemetry(state);
      return this.fail(state, `DOOR_BLOCKED:${Math.round(angle * 180 / Math.PI * 100) / 100}deg`);
    }
    if (state.fridgeBestAngleRad === null || angle < state.fridgeBestAngleRad - 5e-3) {
      state.fridgeBestAngleRad = angle;
      state.fridgeStallMs = 0;
    } else {
      state.fridgeStallMs += dt;
      if (state.fridgeStallMs >= 600) {
        this.stopFridgeMotor(state);
        this.publishFridgeTelemetry(state);
        if (angle <= target.minOpenRad) {
          this.fridgeChain.opened = true;
          return this.completePostPhysics(state, "fridge-door-open", { angleRad: round3(angle), motorStopped: true });
        }
        return this.fail(state, `DOOR_STALLED:${Math.round(angle * 180 / Math.PI * 100) / 100}deg`);
      }
    }
    this.publishFridgeTelemetry(state);
  }
  advanceFridgeRelease(state, dt) {
    const target = this.scene.fridge?.() ?? null;
    const port = this.fridgePort;
    if (!target || !port) return this.fail(state, target ? "FRIDGE_NOT_BOUND" : "NO_FRIDGE");
    const angle = port.angleRad();
    state.fridgeAngleRad = round3(angle);
    this.rig.update(dt);
    const c = this.fridgeContact(state);
    const weight = Number((this.rig.deviceReachDebug?.() ?? { weight: 0 }).weight ?? 0);
    const palmAway = !c.dist || c.dist.distanceM > target.toleranceM;
    if (weight <= 0.02 && palmAway) {
      const stopped = state.fridgeAngleAtStopRad;
      state.fridgeDriftRad = stopped == null ? 0 : round3(angle - stopped);
      this.fridgeChain.grasped = false;
      if (Math.abs(state.fridgeDriftRad) > target.releaseDriftTolRad) {
        this.publishFridgeTelemetry(state);
        return this.fail(state, `DOOR_DRIFT_AFTER_RELEASE:${Math.round(state.fridgeDriftRad * 180 / Math.PI * 100) / 100}deg`);
      }
      this.publishFridgeTelemetry(state, this.simMs);
      return this.completePostPhysics(state, "fridge-handle-released", {
        angleRad: round3(angle),
        handWithdrawn: true,
        motorStopped: true
      });
    }
    if (state.elapsedMs >= target.releaseTimeoutMs) {
      return this.fail(state, `HAND_NOT_WITHDRAWN:weight=${weight.toFixed(2)}/${state.fridgePalmErrorM ?? "palm-unavailable"}m`);
    }
    this.publishFridgeTelemetry(state);
  }
  advanceFridgeWithdraw(state, dt) {
    if (!state.path) return this.fail(state, "NO_WITHDRAW_PATH");
    this.advanceWalk(state, dt);
  }
  /**
   * Evaluate the declared contacts and finish the action.
   *
   * running while the body settles (sit blend, forward lean). Past that window
   * the action fails with the violated contact — the gate is never relaxed, the
   * body is simply allowed to finish its motion.
   */
  finishWithContacts(state, seated, checkHands = true, defMs = 0, settleMs = 0) {
    const target = state.target;
    if (!target) return this.fail(state, "NO_WORKSTATION");
    const targets = contactTargetsForSeat(target, checkHands, this.rig.hipTarget ?? null);
    targets.seated = seated;
    const report = evaluateContacts(this.rig.frame(), targets, CONTACT_TOLERANCE_LOCAL);
    state.contact = report;
    this.lastContact = report;
    const reason = contactFailureReason(report);
    if (reason) {
      if (defMs > 0 && settleMs > 0 && state.elapsedMs < defMs + settleMs) return;
      return this.fail(state, reason);
    }
    if (seated) {
      return this.completePostPhysics(state, "seat-contact", { checkHands });
    }
    return this.completePostPhysics(state, "standing-contact", { checkHands: false });
  }
  completeLogical(state) {
    this.complete(state, { kind: "logical" });
  }
  completePostPhysics(state, observationKind, details) {
    const evidence = this.evidenceSource?.() ?? null;
    const dependencies = this.evidenceRequired?.() ?? evidence?.dependencies ?? [];
    const sourceStep = evidence?.simStep ?? -1;
    const afterSimStep = sourceStep;
    this.complete(state, {
      kind: "post-physics",
      observationKind,
      afterSimStep,
      dependencies,
      details
    });
  }
  complete(state, completion) {
    if (state.phase === "completed" || state.phase === "failed") return;
    state.completion = completion;
    state.phase = "completed";
    state.reason = null;
  }
  fail(state, reason) {
    if (state.phase === "completed" || state.phase === "failed") return;
    if (state.actionKey === "typeAtKeyboard" || state.actionKey === "thinkAtDesk" || state.actionKey === "restAtDesk") {
      this.rig.relax();
    }
    if (state.actionKey === "pressLampSwitchOn" || state.actionKey === "pressLampSwitchOff") {
      state.devicePhase = "failed";
      this.rig.endDeviceReach?.();
      this.publishDeviceTelemetry(state);
    }
    if (isFridgeAction(state.actionKey)) {
      state.fridgePhase = "failed";
      this.stopFridgeMotor(state);
      this.rig.endDeviceReach?.();
      if (state.actionKey === "openFridgeDoor") this.fridgeChain.grasped = false;
      this.publishFridgeTelemetry(state);
    }
    state.completion = null;
    state.phase = "failed";
    state.reason = reason;
  }
  putState(state) {
    writeId(this.states, state.actionId, state);
  }
  stampHistory(state) {
    const row = {
      actionId: state.actionId,
      actionKey: state.actionKey,
      phase: state.phase,
      reason: state.reason,
      elapsedMs: round3(state.elapsedMs),
      atSimMs: round3(state.startedAtSimMs)
    };
    writeId(this.history, state.actionId, row);
    this.historyOrder = this.historyOrder.filter((id) => id !== state.actionId);
    this.historyOrder.push(state.actionId);
    while (this.historyOrder.length > MAX_HISTORY) {
      const oldest = this.historyOrder.shift();
      if (oldest !== void 0) delete this.history[oldest];
    }
  }
  call(kind, actionKey, actionId) {
    this.calls.push({ kind, actionId, actionKey, atSimMs: Math.round(this.simMs) });
  }
};
var CONTACT_TOLERANCE_LOCAL = { feetM: 0.02, seatM: 0.03, handsM: 0.03 };
var FRIDGE_ACTIONS = /* @__PURE__ */ new Set([
  "walkToFridge",
  "faceFridge",
  "reachFridgeHandle",
  "graspFridgeHandle",
  "openFridgeDoor",
  "releaseFridgeHandle",
  "withdrawFromFridge"
]);
function isFridgeAction(key) {
  return FRIDGE_ACTIONS.has(key);
}
function definitionDuration(key) {
  if (!Object.prototype.hasOwnProperty.call(ACTION_CATALOG, key)) return 1e3;
  return ACTION_CATALOG[key].durationMs;
}
function turnToward(from, to, maxDelta) {
  const delta = wrapAngle(to - from);
  if (Math.abs(delta) <= maxDelta) return to;
  return wrapAngle(from + Math.sign(delta) * maxDelta);
}

// packages/npc-three/src/seatFrames.ts
import { Box3, Matrix4 as Matrix410, Quaternion as Quaternion18, Vector3 as Vector334 } from "three";
function matrix(host) {
  return new Matrix410().compose(
    new Vector334(...host.position),
    new Quaternion18().setFromAxisAngle(new Vector334(0, 1, 0), host.yawDeg * Math.PI / 180),
    new Vector334(1, 1, 1)
  );
}
function point(value, delta) {
  const moved = new Vector334(value.x, value.y, value.z).applyMatrix4(delta);
  return { x: moved.x, y: moved.y, z: moved.z };
}
function rect(value, delta) {
  const box = new Box3(new Vector334(value.minX, 0, value.minZ), new Vector334(value.maxX, 0, value.maxZ)).applyMatrix4(delta);
  return { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z };
}
var SeatTargetFrames = class {
  source;
  resolver;
  origins;
  constructor(input) {
    const {
      transitionMode: _transitionMode,
      entryForwardM: _entryForwardM,
      descentPath: _descentPath,
      hipAnchor: _hipAnchor,
      ...furniture
    } = structuredClone(input.target);
    this.source = furniture;
    this.resolver = input.resolver;
    this.origins = new Map([input.target.interactionId, "desk-workstation", "keyboard-main"].map((id) => [id, structuredClone(input.resolver.hostTransform(id))]));
  }
  /** Capture only hosts actually consumed by this action, never the room-wide nav version. */
  guard(actionKey) {
    const support = [this.source.interactionId, "desk-workstation"];
    const ids = actionKey === "typeAtKeyboard" ? [...support, "keyboard-main"] : ["walkToDesk", "sitOnDeskChair", "standUp", "thinkAtDesk", "restAtDesk", "pressLampSwitchOn", "pressLampSwitchOff"].includes(actionKey) ? support : [];
    const owners = ids.map((id) => this.owner(id));
    return () => owners.every((owner) => {
      const current = this.owner(owner.interactionId);
      return current.sceneRevision === owner.sceneRevision && current.matrixRevision === owner.matrixRevision && current.hostPoseRevision === owner.hostPoseRevision;
    });
  }
  resolve(calibration) {
    return this.candidate(this.resolver.hostTransform(this.source.interactionId), calibration);
  }
  preview(pose, calibration) {
    return this.candidate({ position: [pose.x, pose.y, pose.z], yawDeg: pose.yaw * 180 / Math.PI }, calibration).target;
  }
  owner(id) {
    const slotId = id === this.source.interactionId ? "seat" : id === "keyboard-main" ? "keys" : "desk-stand";
    return {
      interactionId: id,
      hostNode: this.resolver.resolveSlot({ interactionId: id, slotId }).hostNode,
      frame: "world",
      sceneRevision: this.resolver.sceneRevision,
      matrixRevision: this.resolver.matrixRevision,
      hostPoseRevision: this.resolver.hostPoseRevision(id)
    };
  }
  delta(id, host) {
    const origin = this.origins.get(id);
    if (!origin) throw new RangeError(`TARGET_HOST_NOT_CAPTURED:${id}`);
    if (origin.yawDeg === host.yawDeg && origin.position.every((v, i) => v === host.position[i])) return new Matrix410();
    return matrix(host).multiply(matrix(origin).invert());
  }
  candidate(chair, calibration) {
    const source = this.source;
    const supportOwner = this.owner(source.interactionId);
    const delta = this.delta(source.interactionId, chair);
    const origin = this.origins.get(source.interactionId);
    if (!origin) throw new RangeError(`TARGET_HOST_NOT_CAPTURED:${source.interactionId}`);
    const yaw = (chair.yawDeg - origin.yawDeg) * Math.PI / 180;
    const seat = point(source.seat, delta);
    const normal = new Vector334(source.seatNormal?.x ?? 0, source.seatNormal?.y ?? 1, source.seatNormal?.z ?? 0).transformDirection(delta);
    const feet = source.footTargets;
    const cushion = source.seatCushion;
    const geometry = {
      interactionId: source.interactionId,
      seat,
      seatY: seat.y,
      seatNormal: { x: normal.x, y: normal.y, z: normal.z },
      ...source.seatRect ? { seatRect: rect(source.seatRect, delta) } : {},
      ...feet ? { footTargets: {
        ...feet,
        // These are seated floor spots, not planted-foot physics (H3 remains deferred).
        left: { ...point(feet.left, delta), y: feet.left.y },
        right: { ...point(feet.right, delta), y: feet.right.y }
      } } : {},
      ...cushion ? { seatCushion: {
        ...structuredClone(cushion),
        rect: rect(cushion.rect, delta),
        topY: point({ x: 0, y: cushion.topY, z: 0 }, delta).y,
        bottomY: point({ x: 0, y: cushion.bottomY, z: 0 }, delta).y,
        rigidPose: {
          origin: { x: origin.position[0], y: origin.position[1], z: origin.position[2] },
          pose: { x: chair.position[0], y: chair.position[1], z: chair.position[2] },
          yaw
        }
      } } : {},
      seatFacing: source.seatFacing + yaw,
      floorY: source.floorY,
      approach: { pos: point(source.approach.pos, delta), yaw: source.approach.yaw + yaw },
      exit: { pos: point(source.exit.pos, delta), yaw: source.exit.yaw + yaw }
    };
    const keyboardDelta = this.delta("keyboard-main", this.resolver.hostTransform("keyboard-main"));
    const deskDelta = this.delta("desk-workstation", this.resolver.hostTransform("desk-workstation"));
    const workstation = {
      keyboard: {
        owner: this.owner("keyboard-main"),
        handTargets: { left: point(source.handTargets.left, keyboardDelta), right: point(source.handTargets.right, keyboardDelta) },
        topY: point({ x: 0, y: source.keyboardTopY, z: 0 }, keyboardDelta).y,
        rect: rect(source.keyboardRect, keyboardDelta)
      },
      desk: {
        owner: this.owner("desk-workstation"),
        topY: point({ x: 0, y: source.deskTopY, z: 0 }, deskDelta).y,
        rect: rect(source.deskRect, deskDelta)
      }
    };
    const target = {
      ...geometry,
      ...calibration.transitionMode ? { transitionMode: calibration.transitionMode } : {},
      ...calibration.entryForwardM !== void 0 ? { entryForwardM: calibration.entryForwardM } : {},
      ...calibration.descentPath ? { descentPath: structuredClone(calibration.descentPath) } : {},
      ...calibration.hipAnchor ? { hipAnchor: point(calibration.hipAnchor, delta) } : {},
      handTargets: workstation.keyboard.handTargets,
      keyboardTopY: workstation.keyboard.topY,
      keyboardRect: workstation.keyboard.rect,
      deskTopY: workstation.desk.topY,
      deskRect: workstation.desk.rect
    };
    return { support: { owner: supportOwner, geometry }, workstation, target };
  }
};

// packages/npc-three/src/rig.ts
import * as THREE37 from "three";

// packages/npc-three/src/frameSchedule.ts
function poseOwnerForFrame(input) {
  if (input.transitioning) return "transition";
  if (input.advancedTransition) {
    if (input.finishedTransitionKind === "sit" && input.seated) return "seated-handover";
    return "none";
  }
  if (input.seatBlend > 1e-3 && input.hasTarget) return "seated";
  return "standing";
}

// packages/npc-three/src/handover.ts
function planHipsHandoff(outgoingHipsLocalY, incomingHipsTrackY) {
  if (!Number.isFinite(outgoingHipsLocalY) || !Number.isFinite(incomingHipsTrackY)) {
    throw new Error("HANDOVER_NON_FINITE");
  }
  const offsetY = outgoingHipsLocalY - incomingHipsTrackY;
  return {
    outgoingHipsLocalY,
    incomingHipsTrackY,
    offsetY,
    targetHipsLocalY: incomingHipsTrackY + offsetY,
    rootOwner: "seat-contact"
  };
}
function rebaseHipsTrackY(values, offsetY) {
  if (!Number.isFinite(offsetY) || offsetY === 0) return 0;
  let changed = 0;
  for (let i = 1; i < values.length; i += 3) {
    values[i] = values[i] + offsetY;
    changed += 1;
  }
  return changed;
}

// packages/npc-three/src/seatEntry.ts
function finite(value, name) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`SEAT_ENTRY_INVALID:${name}`);
  return n;
}
var ENTRY_MARGIN_M = 5e-3;
function clipSitEntryPoint(target, options) {
  const facing = target.seatFacing ?? 0;
  const fwd = { x: Math.sin(facing), z: Math.cos(facing) };
  const rect2 = target.seatRect;
  const halfExtent = rect2 ? Math.abs(fwd.x) * (rect2.maxX - rect2.minX) / 2 + Math.abs(fwd.z) * (rect2.maxZ - rect2.minZ) / 2 : 0.24;
  const radiusM = finite(options.radiusM, "radiusM");
  const clipRootM = Math.max(0, finite(options.clipRootM, "clipRootM"));
  const marginM = Math.max(0, Number(options.marginM ?? ENTRY_MARGIN_M));
  const d = Math.max(clipRootM, halfExtent + radiusM + marginM, target.entryForwardM ?? 0);
  return { x: target.seat.x + fwd.x * d, z: target.seat.z + fwd.z * d };
}

// packages/npc-three/src/hand.ts
var EPS2 = 1e-6;
function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}
function length(a) {
  return Math.hypot(a.x, a.y, a.z);
}
function normalize(a) {
  const len = length(a);
  if (len < EPS2) throw new Error("DEGENERATE_VECTOR");
  return { x: a.x / len, y: a.y / len, z: a.z / len };
}
function palmNormalSign(side) {
  return side === "right" ? 1 : -1;
}
function handFrame(fingerWorld, thumbWorld, side) {
  const finger = normalize(fingerWorld);
  let thumbRaw;
  try {
    thumbRaw = normalize(thumbWorld);
  } catch {
    throw new Error("DEGENERATE_HAND_FRAME");
  }
  let thumb;
  try {
    thumb = normalize(sub(thumbRaw, { x: finger.x * dot(thumbRaw, finger), y: finger.y * dot(thumbRaw, finger), z: finger.z * dot(thumbRaw, finger) }));
  } catch {
    throw new Error("DEGENERATE_HAND_FRAME");
  }
  const palmRaw = cross(finger, thumb);
  if (length(palmRaw) < 1e-4) throw new Error("DEGENERATE_HAND_FRAME");
  const sign = palmNormalSign(side);
  const palm = normalize({ x: palmRaw.x * sign, y: palmRaw.y * sign, z: palmRaw.z * sign });
  return { finger, palm };
}
function orthonormalize(frame) {
  const finger = normalize(frame.finger);
  const n = frame.palm;
  const k = dot(n, finger);
  const palm = normalize({ x: n.x - finger.x * k, y: n.y - finger.y * k, z: n.z - finger.z * k });
  return { finger, palm };
}
function desiredTypingFrame(yaw, pitchRad) {
  const cp = Math.cos(pitchRad);
  const sp = Math.sin(pitchRad);
  const sy = Math.sin(yaw);
  const cy = Math.cos(yaw);
  const finger = { x: cp * sy, y: -sp, z: cp * cy };
  const palm = { x: -sp * sy, y: -cp, z: -sp * cy };
  return { finger, palm };
}
function desiredGraspFrame(palmNormal) {
  const palm = normalize(palmNormal);
  const down = { x: 0, y: -1, z: 0 };
  const k = dot(down, palm);
  let finger;
  try {
    finger = normalize({ x: down.x - palm.x * k, y: down.y - palm.y * k, z: down.z - palm.z * k });
  } catch {
    const forward = { x: 0, y: 0, z: 1 };
    const kk = dot(forward, palm);
    finger = normalize({ x: forward.x - palm.x * kk, y: forward.y - palm.y * kk, z: forward.z - palm.z * kk });
  }
  return { finger, palm };
}
function frameRotation(current, desired) {
  const u = orthonormalize(current);
  const d = orthonormalize(desired);
  const u3 = cross(u.finger, u.palm);
  const d3 = cross(d.finger, d.palm);
  const tuple = (v) => [v.x, v.y, v.z];
  const uc = [tuple(u.finger), tuple(u.palm), tuple(u3)];
  const dc = [tuple(d.finger), tuple(d.palm), tuple(d3)];
  const m = new Array(9).fill(0);
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      let sum = 0;
      for (let k = 0; k < 3; k += 1) sum += dc[k][i] * uc[k][j];
      m[i * 3 + j] = sum;
    }
  }
  return m;
}
function matrixToQuaternion(m) {
  const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = m;
  const trace = m00 + m11 + m22;
  if (trace > 0) {
    const s2 = Math.sqrt(trace + 1) * 2;
    return { w: 0.25 * s2, x: (m21 - m12) / s2, y: (m02 - m20) / s2, z: (m10 - m01) / s2 };
  }
  if (m00 > m11 && m00 > m22) {
    const s2 = Math.sqrt(1 + m00 - m11 - m22) * 2;
    return { w: (m21 - m12) / s2, x: 0.25 * s2, y: (m01 + m10) / s2, z: (m02 + m20) / s2 };
  }
  if (m11 > m22) {
    const s2 = Math.sqrt(1 + m11 - m00 - m22) * 2;
    return { w: (m02 - m20) / s2, x: (m01 + m10) / s2, y: 0.25 * s2, z: (m12 + m21) / s2 };
  }
  const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
  return { w: (m10 - m01) / s, x: (m02 + m20) / s, y: (m12 + m21) / s, z: 0.25 * s };
}
var FINGER_TOKENS = ["thumb", "index", "middle", "ring", "little"];
function handRegion(boneName, side) {
  const flat = boneName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const sideTags = side === "left" ? ["jbipl", "leftl", "left"] : ["jbipr", "rightr", "right"];
  const matchesSide = sideTags.some((tag) => flat.startsWith(tag) || flat.includes(tag));
  if (!matchesSide) return null;
  if (flat.includes("hand")) return "palm";
  if (FINGER_TOKENS.some((token) => flat.includes(token))) return "finger";
  return null;
}

// packages/npc-three/src/garment.ts
import * as THREE36 from "three";
var REGION_ID = /^[a-z0-9][a-z0-9_-]*(?:[/:][a-z0-9][a-z0-9_-]*)+$/;
function parseGarmentRegionId(id) {
  return typeof id === "string" && REGION_ID.test(id);
}
var _a = new THREE36.Matrix4();
var _b = new THREE36.Matrix4();
var _acc = new THREE36.Matrix4();
var _inv = new THREE36.Matrix4();
var _m3 = new THREE36.Matrix3();
var _v = new THREE36.Vector3();
var _d = new THREE36.Vector3();
function vertexWorldFrame(mesh, index, out) {
  const geometry = mesh.geometry;
  const skinIndex = geometry.getAttribute("skinIndex");
  const skinWeight = geometry.getAttribute("skinWeight");
  const skeleton = mesh.skeleton;
  if (!skinIndex || !skinWeight || !skeleton) {
    out.copy(mesh.matrixWorld);
    return out;
  }
  out.elements.fill(0);
  for (let k = 0; k < 4; k += 1) {
    const w = skinWeight.getComponent?.(index, k) ?? skinWeight.array[index * skinWeight.itemSize + k];
    if (!w) continue;
    const bi = skinIndex.getComponent?.(index, k) ?? skinIndex.array[index * skinIndex.itemSize + k];
    const bone = skeleton.bones[bi];
    if (!bone) continue;
    _a.multiplyMatrices(bone.matrixWorld, skeleton.boneInverses[bi]);
    _a.multiply(mesh.bindMatrix);
    const e = _a.elements;
    const o = out.elements;
    for (let j = 0; j < 16; j += 1) o[j] += w * e[j];
  }
  _b.multiplyMatrices(mesh.matrixWorld, mesh.bindMatrixInverse);
  out.premultiply(_b);
  return out;
}
function fillMaterialName(mesh) {
  const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const names = list.map((m) => m?.name ?? "");
  return names.find((n) => n && !/outline/i.test(n)) ?? names[0] ?? "";
}
function component(attr, index, k) {
  return attr.getComponent?.(index, k) ?? attr.array[index * attr.itemSize + k];
}
function dominantBone(mesh, index) {
  const geo = mesh.geometry;
  const skinIndex = geo.getAttribute("skinIndex");
  const skinWeight = geo.getAttribute("skinWeight");
  if (!skinIndex || !skinWeight) return -1;
  let best = -1;
  let bestW = -1;
  for (let k = 0; k < 4; k += 1) {
    const w = component(skinWeight, index, k);
    if (w > bestW) {
      bestW = w;
      best = component(skinIndex, index, k);
    }
  }
  return bestW > 0 ? best : -1;
}
function regionStats(mesh, region) {
  const geo = mesh.geometry;
  const index = geo.getIndex();
  const pos = geo.getAttribute("position");
  if (!pos) return { vertices: 0, bones: [] };
  const bones = mesh.skeleton?.bones ?? [];
  const allow = new Set(region.bones);
  const deny = new Set(region.excludeBones ?? []);
  const used = new Uint8Array(pos.count);
  if (index) for (let k = 0; k < index.count; k += 1) used[index.getX(k)] = 1;
  else used.fill(1);
  let n = 0;
  const hitBones = /* @__PURE__ */ new Set();
  for (let i = 0; i < pos.count; i += 1) {
    if (!used[i]) continue;
    const b = dominantBone(mesh, i);
    if (b < 0) continue;
    const name = bones[b]?.name ?? "";
    if (!allow.has(name) || deny.has(name)) continue;
    n += 1;
    hitBones.add(name);
  }
  return { vertices: n, bones: [...hitBones].sort() };
}
function resolveGarmentRegions(meshes, config) {
  const errors = [];
  const regions = [];
  const seen = /* @__PURE__ */ new Set();
  for (const region of config.regions) {
    if (!parseGarmentRegionId(region.id)) {
      errors.push({ code: "GARMENT_REGION_ID_INVALID", detail: String(region.id) });
      continue;
    }
    if (seen.has(region.id)) {
      errors.push({ code: "GARMENT_REGION_ID_DUPLICATE", detail: region.id });
      continue;
    }
    seen.add(region.id);
    if (!region.material || !region.source) {
      errors.push({ code: "GARMENT_REGION_DECLARATION_INCOMPLETE", detail: region.id });
      continue;
    }
    if (!region.bones?.length) {
      errors.push({ code: "GARMENT_REGION_BONES_MISSING", detail: region.id });
      continue;
    }
    const resolved = [];
    for (const mesh of meshes) {
      const material = fillMaterialName(mesh);
      if (material !== region.material) continue;
      const stats = regionStats(mesh, region);
      if (stats.vertices === 0) {
        errors.push({ code: "GARMENT_REGION_EMPTY", detail: `${region.id}@${mesh.name || mesh.uuid}` });
        continue;
      }
      resolved.push({ mesh: mesh.name || mesh.uuid, material, vertices: stats.vertices, bones: stats.bones });
    }
    if (resolved.length === 0) {
      errors.push({ code: "GARMENT_MATERIAL_NOT_FOUND", detail: `${region.id}:${region.material}` });
      continue;
    }
    regions.push({ id: region.id, source: region.source, meshes: resolved });
  }
  return { characterId: config.characterId, asset: config.asset, regions, errors };
}
function buildSeatCushionField(options) {
  const cell = options.cellM ?? 5e-3;
  const rect2 = options.rect;
  const nx = Math.max(2, Math.ceil((rect2.maxX - rect2.minX) / cell));
  const nz = Math.max(2, Math.ceil((rect2.maxZ - rect2.minZ) / cell));
  const top = new Float32Array(nx * nz).fill(Number.NEGATIVE_INFINITY);
  const bottom = new Float32Array(nx * nz).fill(Number.POSITIVE_INFINITY);
  const tri = [];
  const a = new THREE36.Vector3();
  const b = new THREE36.Vector3();
  const c = new THREE36.Vector3();
  for (const mesh of options.meshes) {
    mesh.updateWorldMatrix(true, false);
    const geo = mesh.geometry;
    const pos = geo.getAttribute("position");
    const index = geo.getIndex();
    if (!pos) continue;
    const count = index ? index.count : pos.count;
    for (let k = 0; k < count; k += 3) {
      const ia = index ? index.getX(k) : k;
      const ib = index ? index.getX(k + 1) : k + 1;
      const ic = index ? index.getX(k + 2) : k + 2;
      a.fromBufferAttribute(pos, ia).applyMatrix4(mesh.matrixWorld);
      b.fromBufferAttribute(pos, ib).applyMatrix4(mesh.matrixWorld);
      c.fromBufferAttribute(pos, ic).applyMatrix4(mesh.matrixWorld);
      tri.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    }
  }
  const triangles = tri.length / 9;
  for (let iz = 0; iz < nz; iz += 1) {
    const z = rect2.minZ + (iz + 0.5) * cell;
    for (let ix = 0; ix < nx; ix += 1) {
      const x = rect2.minX + (ix + 0.5) * cell;
      let lo = Number.POSITIVE_INFINITY;
      let hi = Number.NEGATIVE_INFINITY;
      for (let t = 0; t < triangles; t += 1) {
        const o = t * 9;
        const px = tri[o];
        const pz = tri[o + 2];
        const qx = tri[o + 3];
        const qz = tri[o + 5];
        const rx = tri[o + 6];
        const rz = tri[o + 8];
        const den = (qz - rz) * (px - rx) + (rx - qx) * (pz - rz);
        if (Math.abs(den) < 1e-14) continue;
        const u = ((qz - rz) * (x - rx) + (rx - qx) * (z - rz)) / den;
        const w = ((rz - pz) * (x - rx) + (px - rx) * (z - rz)) / den;
        const v = 1 - u - w;
        if (u < -1e-9 || w < -1e-9 || v < -1e-9) continue;
        const y = u * tri[o + 1] + w * tri[o + 4] + v * tri[o + 7];
        if (y < lo) lo = y;
        if (y > hi) hi = y;
      }
      if (hi > lo) {
        top[iz * nx + ix] = hi;
        bottom[iz * nx + ix] = lo;
      }
    }
  }
  const weights = (x, z) => {
    const fx = (x - rect2.minX) / cell - 0.5;
    const fz = (z - rect2.minZ) / cell - 0.5;
    if (fx < -0.5 || fz < -0.5 || fx > nx - 0.5 || fz > nz - 0.5) return null;
    const x0 = Math.max(0, Math.min(nx - 1, Math.floor(fx)));
    const z0 = Math.max(0, Math.min(nz - 1, Math.floor(fz)));
    const x1 = Math.min(nx - 1, x0 + 1);
    const z1 = Math.min(nz - 1, z0 + 1);
    const tx = Math.max(0, Math.min(1, fx - x0));
    const tz = Math.max(0, Math.min(1, fz - z0));
    return [
      { i: z0 * nx + x0, w: (1 - tx) * (1 - tz) },
      { i: z0 * nx + x1, w: tx * (1 - tz) },
      { i: z1 * nx + x0, w: (1 - tx) * tz },
      { i: z1 * nx + x1, w: tx * tz }
    ];
  };
  const sample = (grid, x, z, pick) => {
    const cellWeights = weights(x, z);
    if (!cellWeights) return null;
    let all = true;
    for (const cw of cellWeights) if (!Number.isFinite(grid[cw.i])) all = false;
    if (all) return cellWeights.reduce((acc, cw) => acc + cw.w * grid[cw.i], 0);
    let best = null;
    for (const cw of cellWeights) {
      const v = grid[cw.i];
      if (!Number.isFinite(v)) continue;
      best = best === null ? v : pick === "max" ? Math.max(best, v) : Math.min(best, v);
    }
    return best;
  };
  const topAt = (x, z) => sample(top, x, z, "max");
  const bottomAt = (x, z) => sample(bottom, x, z, "min");
  return {
    rect: rect2,
    topY: options.topY,
    bottomY: options.bottomY,
    normal: { x: 0, y: 1, z: 0 },
    topAt,
    insideAt: (x, y, z) => {
      const t = topAt(x, z);
      if (t === null) return false;
      if (y > t + 1e-6) return false;
      const bt = bottomAt(x, z);
      return y >= (bt ?? options.bottomY) - 1e-6;
    },
    source: options.source
  };
}
var FIELD_EPS = 5e-4;
var GarmentContactModifier = class {
  resolution;
  plans = [];
  marginM;
  maxLiftM;
  smoothIterations;
  retractS;
  cushion = null;
  blend = 1;
  frame = 0;
  reportValue;
  errors = [];
  disposed = false;
  constructor(options) {
    this.marginM = options.config.marginM ?? 2e-3;
    this.maxLiftM = options.config.maxLiftM ?? 0.12;
    this.smoothIterations = Math.max(0, options.config.smoothIterations ?? 3);
    this.retractS = Math.max(1e-3, options.config.retractS ?? 0.3);
    const meshes = options.meshes ? [...options.meshes] : (() => {
      const found = [];
      options.scene?.traverse((o) => {
        if (o.isSkinnedMesh) found.push(o);
      });
      return found;
    })();
    this.resolution = resolveGarmentRegions(meshes, options.config);
    for (const error of this.resolution.errors) this.errors.push(`${error.code}:${error.detail}`);
    for (const resolved of this.resolution.regions) {
      const config = options.config.regions.find((r) => r.id === resolved.id);
      const plan = { config, meshes: [], regionVertices: 0 };
      for (const entry of resolved.meshes) {
        const mesh = meshes.find((m) => (m.name || m.uuid) === entry.mesh);
        if (!mesh) continue;
        const prepared = prepareRegionMesh(mesh, config);
        if (!prepared) continue;
        plan.meshes.push(prepared);
        plan.regionVertices += prepared.region.length;
      }
      if (plan.meshes.length) this.plans.push(plan);
    }
    this.reportValue = this.emptyReport();
  }
  get regionVertices() {
    return this.plans.reduce((n, p) => n + p.regionVertices, 0);
  }
  get active() {
    return this.plans.length > 0 && this.cushion !== null;
  }
  setCushion(cushion) {
    if (cushion && (!cushion.source || !Number.isFinite(cushion.topY))) {
      this.errors.push("GARMENT_CUSHION_DECLARATION_INCOMPLETE");
      this.cushion = null;
      return;
    }
    this.cushion = cushion;
  }
  /** Solve one frame and write the deformed bind-space positions. */
  update(dtS) {
    this.frame += 1;
    if (this.disposed) return this.reportValue;
    const dt = Math.max(0, Math.min(1, dtS));
    const cushion = this.cushion;
    const normal = new THREE36.Vector3(cushion?.normal?.x ?? 0, cushion?.normal?.y ?? 1, cushion?.normal?.z ?? 0);
    if (normal.lengthSq() < 1e-9) normal.set(0, 1, 0);
    normal.normalize();
    const nY = Math.max(0.05, normal.y);
    const required = /* @__PURE__ */ new Map();
    const insideMesh = /* @__PURE__ */ new Map();
    let inside = 0;
    for (const plan of this.plans) {
      for (const rm of plan.meshes) {
        const n = rm.base.length / 3;
        const field = new Float32Array(n);
        let count = 0;
        if (cushion) {
          for (const i of rm.region) {
            _v.fromArray(rm.base, i * 3).applyMatrix4(vertexWorldFrame(rm.mesh, i, _acc));
            if (_v.x < cushion.rect.minX || _v.x > cushion.rect.maxX || _v.z < cushion.rect.minZ || _v.z > cushion.rect.maxZ) continue;
            const top = cushion.topAt ? cushion.topAt(_v.x, _v.z) : cushion.topY;
            if (top === null) continue;
            const depth = (top - _v.y) * nY;
            if (depth <= 0) continue;
            if (cushion.insideAt && !cushion.insideAt(_v.x, _v.y, _v.z)) continue;
            const req = Math.min(this.maxLiftM, depth + this.marginM);
            if (req <= FIELD_EPS) continue;
            field[i] = req;
            count += 1;
          }
        }
        if (count > 0) smoothField(field, rm, this.smoothIterations);
        required.set(rm, field);
        insideMesh.set(rm, count);
        inside += count;
      }
    }
    if (inside > 0) this.blend = 1;
    else if (this.blend > 0) this.blend = Math.max(0, this.blend - dt / this.retractS);
    let lifted = 0;
    let maxLift = 0;
    let sumLift = 0;
    for (const plan of this.plans) {
      for (const rm of plan.meshes) {
        const fresh = required.get(rm);
        const freshCount = insideMesh.get(rm) ?? 0;
        let field = fresh;
        let blend = 1;
        if (freshCount > 0) {
          rm.last = fresh.slice();
        } else {
          if (!rm.last) {
            if (inside === 0) continue;
            field = fresh;
            blend = 0;
          } else {
            field = rm.last;
            blend = this.blend;
          }
        }
        const attr = rm.clone.getAttribute("position");
        const base = rm.base;
        let frameMax = 0;
        for (const i of rm.region) {
          const lift = field[i] * blend;
          _v.fromArray(base, i * 3);
          if (Math.abs(lift) > 1e-9) {
            _d.copy(normal).multiplyScalar(lift);
            vertexWorldFrame(rm.mesh, i, _acc).invert();
            _m3.setFromMatrix4(_acc);
            _d.applyMatrix3(_m3);
            _v.add(_d);
          }
          const cur = attr.getX(i);
          const curY = attr.getY(i);
          const curZ = attr.getZ(i);
          if (Math.abs(cur - _v.x) > 1e-9 || Math.abs(curY - _v.y) > 1e-9 || Math.abs(curZ - _v.z) > 1e-9) {
            attr.setXYZ(i, _v.x, _v.y, _v.z);
          }
          if (Math.abs(lift) > FIELD_EPS) {
            lifted += 1;
            sumLift += lift;
            if (lift > frameMax) frameMax = lift;
          }
        }
        attr.needsUpdate = true;
        if (frameMax > maxLift) maxLift = frameMax;
        if (inside === 0 && this.blend === 0) rm.last = null;
      }
    }
    if (inside === 0 && this.blend === 0) this.restoreAll();
    const shape = this.measureShape(normal);
    this.reportValue = {
      frame: this.frame,
      collision: cushion?.source ?? null,
      regionVertices: this.regionVertices,
      inside,
      lifted,
      maxLiftM: maxLift,
      meanLiftM: lifted ? sumLift / lifted : 0,
      maxWorldDelta: { x: normal.x * maxLift, y: normal.y * maxLift, z: normal.z * maxLift },
      maxEdgeStretch: shape.maxEdgeStretch,
      minAreaRatio: shape.minAreaRatio,
      applied: lifted > 0,
      retract: this.blend,
      errors: [...this.errors]
    };
    return this.reportValue;
  }
  report() {
    return this.reportValue;
  }
  /** Explain the resolution (meshes/materials/vertex counts) for the HUD. */
  describe() {
    return {
      characterId: this.resolution.characterId,
      asset: this.resolution.asset,
      regions: this.resolution.regions,
      errors: this.resolution.errors
    };
  }
  /** Immediate revert to the bind pose (diagnostics, teardown). */
  clear() {
    this.restoreAll();
    for (const plan of this.plans) for (const rm of plan.meshes) rm.last = null;
    this.blend = 1;
    this.reportValue = {
      ...this.reportValue,
      applied: false,
      inside: 0,
      lifted: 0,
      maxLiftM: 0,
      meanLiftM: 0,
      maxWorldDelta: { x: 0, y: 0, z: 0 },
      maxEdgeStretch: 1,
      minAreaRatio: 1,
      retract: 0
    };
  }
  /** Restore the original geometry and free the clones (scene switch). */
  dispose() {
    for (const plan of this.plans) {
      for (const rm of plan.meshes) {
        if (rm.mesh.geometry === rm.clone) {
          if (rm.original) rm.mesh.geometry = rm.original;
        }
        rm.clone.dispose();
        rm.last = null;
      }
    }
    this.plans.length = 0;
    this.disposed = true;
  }
  restoreAll() {
    for (const plan of this.plans) {
      for (const rm of plan.meshes) {
        const attr = rm.clone.getAttribute("position");
        attr.array.set(rm.base);
        attr.needsUpdate = true;
      }
    }
  }
  measureShape(normal) {
    let maxStretch = 1;
    let minArea = 1;
    const moved = new Float32Array(0);
    for (const plan of this.plans) {
      for (const rm of plan.meshes) {
        const field = rm.last;
        if (!field) continue;
        const n = rm.base.length / 3;
        const world = new Float32Array(n * 3);
        const after = new Float32Array(n * 3);
        const any = [];
        for (const i of rm.region) {
          const lift = field[i] * this.blend;
          _v.fromArray(rm.base, i * 3).applyMatrix4(vertexWorldFrame(rm.mesh, i, _acc));
          world[i * 3] = _v.x;
          world[i * 3 + 1] = _v.y;
          world[i * 3 + 2] = _v.z;
          after[i * 3] = _v.x + normal.x * lift;
          after[i * 3 + 1] = _v.y + normal.y * lift;
          after[i * 3 + 2] = _v.z + normal.z * lift;
          if (Math.abs(lift) > FIELD_EPS) any.push(i);
        }
        if (!any.length) continue;
        for (const i of any) {
          const s = rm.adjStart[i];
          const e = rm.adjStart[i + 1];
          for (let k = s; k < e; k += 1) {
            const j = rm.adj[k];
            const d0 = Math.hypot(world[i * 3] - world[j * 3], world[i * 3 + 1] - world[j * 3 + 1], world[i * 3 + 2] - world[j * 3 + 2]);
            if (d0 < 1e-6) continue;
            const d1 = Math.hypot(after[i * 3] - after[j * 3], after[i * 3 + 1] - after[j * 3 + 1], after[i * 3 + 2] - after[j * 3 + 2]);
            const ratio = d1 / d0;
            if (ratio > maxStretch) maxStretch = ratio;
          }
        }
        const idx = rm.clone.getIndex();
        if (idx) {
          for (let k = 0; k + 2 < idx.count; k += 3) {
            const a = idx.getX(k);
            const b = idx.getX(k + 1);
            const c = idx.getX(k + 2);
            if (rm.localOf[a] < 0 || rm.localOf[b] < 0 || rm.localOf[c] < 0) continue;
            if (Math.abs(field[a]) < FIELD_EPS && Math.abs(field[b]) < FIELD_EPS && Math.abs(field[c]) < FIELD_EPS) continue;
            const area0 = triArea(world, a, b, c);
            const area1 = triArea(after, a, b, c);
            if (area0 > 1e-9) minArea = Math.min(minArea, area1 / area0);
          }
        }
      }
    }
    return { maxEdgeStretch: maxStretch, minAreaRatio: minArea };
  }
  emptyReport() {
    return {
      frame: 0,
      collision: null,
      regionVertices: this.regionVertices,
      inside: 0,
      lifted: 0,
      maxLiftM: 0,
      meanLiftM: 0,
      maxWorldDelta: { x: 0, y: 0, z: 0 },
      maxEdgeStretch: 1,
      minAreaRatio: 1,
      applied: false,
      retract: 1,
      errors: [...this.errors]
    };
  }
};
function triArea(coords, a, b, c) {
  const ax = coords[a * 3];
  const ay = coords[a * 3 + 1];
  const az = coords[a * 3 + 2];
  const ux = coords[b * 3] - ax;
  const uy = coords[b * 3 + 1] - ay;
  const uz = coords[b * 3 + 2] - az;
  const vx = coords[c * 3] - ax;
  const vy = coords[c * 3 + 1] - ay;
  const vz = coords[c * 3 + 2] - az;
  const cx = uy * vz - uz * vy;
  const cy = uz * vx - ux * vz;
  const cz = ux * vy - uy * vx;
  return 0.5 * Math.hypot(cx, cy, cz);
}
function smoothField(field, rm, iterations) {
  if (iterations <= 0) return;
  const next = new Float32Array(field.length);
  for (let it = 0; it < iterations; it += 1) {
    for (const i of rm.region) {
      const s = rm.adjStart[i];
      const e = rm.adjStart[i + 1];
      let acc = 0;
      let count = 0;
      for (let k = s; k < e; k += 1) {
        acc += field[rm.adj[k]];
        count += 1;
      }
      const avg = count ? acc / count : 0;
      const blended = 0.5 * field[i] + 0.5 * avg;
      next[i] = Math.max(field[i], blended);
    }
    for (const i of rm.region) field[i] = next[i];
  }
}
function prepareRegionMesh(mesh, config) {
  const geo = mesh.geometry;
  const pos = geo.getAttribute("position");
  const skinIndex = geo.getAttribute("skinIndex");
  const skinWeight = geo.getAttribute("skinWeight");
  const index = geo.getIndex();
  if (!pos || !skinIndex || !skinWeight || !index) return null;
  const n = pos.count;
  const used = new Uint8Array(n);
  for (let k = 0; k < index.count; k += 1) used[index.getX(k)] = 1;
  const bones = mesh.skeleton?.bones ?? [];
  const allow = new Set(config.bones);
  const deny = new Set(config.excludeBones ?? []);
  const hitBones = /* @__PURE__ */ new Set();
  const region = [];
  const localOf = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i += 1) {
    if (!used[i]) continue;
    const b = dominantBone(mesh, i);
    if (b < 0) continue;
    const name = bones[b]?.name ?? "";
    if (!allow.has(name) || deny.has(name)) continue;
    localOf[i] = region.length;
    region.push(i);
    hitBones.add(name);
  }
  if (region.length === 0) return null;
  const seen = /* @__PURE__ */ new Set();
  const adjStart = new Int32Array(n + 1);
  const adjList = Array.from({ length: n }, () => []);
  for (let k = 0; k + 2 < index.count; k += 3) {
    const a = index.getX(k);
    const b = index.getX(k + 1);
    const c = index.getX(k + 2);
    for (const [u, v] of [
      [a, b],
      [b, c],
      [c, a]
    ]) {
      if (localOf[u] < 0) continue;
      const key = u * n + v;
      if (!seen.has(key)) {
        seen.add(key);
        adjList[u].push(v);
      }
      if (localOf[v] >= 0) {
        const key2 = v * n + u;
        if (!seen.has(key2)) {
          seen.add(key2);
          adjList[v].push(u);
        }
      }
    }
  }
  let cursor = 0;
  const adj = [];
  for (let i = 0; i < n; i += 1) {
    adjStart[i] = cursor;
    for (const j of adjList[i]) {
      adj.push(j);
      cursor += 1;
    }
  }
  adjStart[n] = cursor;
  const clone = geo.clone();
  const base = Float32Array.from(clone.getAttribute("position").array);
  mesh.geometry = clone;
  return {
    mesh,
    original: geo,
    clone,
    base,
    region: Int32Array.from(region),
    localOf,
    adjStart,
    adj: Int32Array.from(adj),
    material: fillMaterialName(mesh),
    bones: [...hitBones].sort(),
    last: null
  };
}

// packages/npc-three/src/rig.ts
var BONE_NAMES = [
  "hips",
  "spine",
  "chest",
  "upperChest",
  "neck",
  "head",
  "leftUpperArm",
  "leftLowerArm",
  "leftHand",
  "rightUpperArm",
  "rightLowerArm",
  "rightHand",
  "leftUpperLeg",
  "leftLowerLeg",
  "leftFoot",
  "leftToes",
  "rightUpperLeg",
  "rightLowerLeg",
  "rightFoot",
  "rightToes"
];
var SEATED_CLIP = "149_Sitting Idle";
var IDLE_CLIP = "119_Idle";
var THINK_CLIP = "88_Thinking";
var WALK_SPEED_REF = 1.12;
var SIT_BLEND_S = 0.6;
var LEAN_RAD = 0.36;
var TYPING_FINGER_PITCH = 0.1;
var DEVICE_REACH_S = 0.65;
var DEVICE_WITHDRAW_S = 0.45;
var MAX_PALM_VERTICES = 96;
var SIT_CLIP = "npc_sit_v2";
var STAND_CLIP = "npc_stand_v2";
var STAND_EXIT_M = 0.45;
var SEAT_PLANT_MAX_M = 0.1;
var SEATED_KNEE_POLE_DOWN_M = 0.02;
var SEAT_TRACE_MAX = 1200;
var STEP_LIFT_M = 0.05;
var VrmRig = class {
  body;
  /** Measured standing capsule radius (set by the page from its body profile). */
  standingRadiusM = null;
  carrier = { pos: { x: 0, y: 0, z: 0 }, yaw: 0 };
  seated = false;
  vrm;
  mixer;
  actions;
  bakedActions = /* @__PURE__ */ new Map();
  bakedClips;
  restPosition = /* @__PURE__ */ new Map();
  floorY;
  leanRad;
  samplePalms;
  /** Corrective garment deformation (procedural anti-penetration, not cloth). */
  garment;
  cushionFor;
  /** Per-transition-frame seat contact trace (descent constraint). */
  descentTrace = [];
  metrics;
  debugCounters = { armIk: 0, legIk: 0, overlays: 0 };
  /** Diagnostics for the bounded pelvis support loop (see applySeatedPose). */
  supportLoop = { calls: 0, corrections: 0, lastErr: 0, lastCorr: 0, skipped: "" };
  soleOffset = 0.083;
  toeOffset = 0.045;
  /**
   * Per-side ankle -> visible shoe sole distance measured with the foot
   * FLATTENED (what `legIK` produces). The rest-pose whole-scene bbox measured
   * the toe tip while the foot was plantarflexed (0.1469 m); the seated,
   * flattened sole is ~0.09 m below the ankle, so the old constant told the IK
   * to hold the ankle 5.5 cm too high and the avatar visibly floated.
   */
  flatSoleOffset = { left: 0.09, right: 0.09 };
  /** Visible shoe vertices per side (the sole that must touch the floor). */
  soleSamples = { left: [], right: [] };
  soleVertexCount = { left: 0, right: 0 };
  /** Wrist -> visible palm drop, measured (initial guess for the palm solve). */
  palmLift = { left: 0.03, right: 0.03 };
  target = null;
  /**
   * Character-side seated profile, MEASURED from this avatar (never a furniture
   * constant): how far the hip joint sits above the body point that touches a
   * seat. Calibrated from the seated clip, and re-validated each frame by the
   * bounded support closed loop in `applySeatedPose`.
   */
  profile = {
    bodyProfileId: "body-avatar",
    standingHipY: 0.9,
    seatedHipOffsetM: 0.055,
    supportSource: "rest-pose-default",
    supportVertices: 0
  };
  /** Audit of the pelvis support patch (evidence for the measured offset). */
  pelvisAudit = { meshes: [], minRelY: 0, medianRelY: 0, minRelZ: 0, maxRelZ: 0, insideCount: 0, outsideCount: 0 };
  /** Hip joint target derived from the declared seat surface + the profile. */
  hipTarget = null;
  /**
   * Slow trim of the hip target that keeps the VISIBLE pelvis resting on the
   * cushion. The seated idle clip sways the pelvis ~±1.5 cm, so a fixed target
   * either penetrates the cushion at the low phase or floats at the high one.
   * The trim is driven by the PREVIOUS frame's measured contact (buildFrame
   * samples after vrm.update, so it is a delayed low-gain loop, not the
   * one-frame-stale full-gain loop that oscillated) and it is bounded.
   */
  lastSupportErr = null;
  seatPlane = null;
  /**
   * Seat-support trace (diagnostics only, off by default): one row per frame
   * while seated, with the value the loop ACTED on and the value the renderer
   * actually shows. `pre` is sampled inside applySeatedPose from the skeleton
   * before vrm.update() copies the normalized pose onto the raw bones; `post`
   * is sampled after that sync (i.e. the skin the camera sees). The difference
   * between the two is the feedback delay, and the trace is what makes a sign /
   * scale / timing error visible instead of guessed.
   */
  seatTrace = [];
  traceSeat = false;
  lastPreSeat = null;
  /** Declared transition failure (missing clip, refused plan); never swallowed. */
  transitionError = null;
  transition = null;
  mode = "idle";
  /**
   * Declared appliance reach: the palm is solved onto a contact point, starting
   * from the hand's current (clip) position and easing back the same way.
   *
   * Seated (`reachDevice`) keeps a FIXED device contact. Standing
   * (`beginStandingReach`, the fridge chain) carries a movable contact + palm
   * normal, updated every fixed step from the actual door body. The target
   * point itself is never written by the animation; it comes from physics.
   */
  deviceReach = null;
  seatBlend = 0;
  /** Ramp for the seated hip pin after the sit clip hands the body over. */
  pinBlend = 0;
  leanBlend = 0;
  t = 0;
  base = null;
  overlay = null;
  sitDownPlayed = false;
  /** Palm-dominant skinned vertices (the visible palm, not the forearm). */
  palmSamples = { left: [], right: [] };
  palmVertexCount = { left: 0, right: 0 };
  /** Pelvis skin vertices (the visible buttocks that must rest ON the seat). */
  pelvisSamples = [];
  pelvisVertexCount = 0;
  /**
   * The ACTUAL skin support patch (r12): every skin vertex dominated by the
   * hips or an upper leg. Wider than the hips-only buttock patch on purpose:
   * the seat contact is the whole skin surface that can rest on the cushion,
   * not one pre-selected point.
   */
  seatSkinSamples = [];
  seatSkinVertexCount = 0;
  /** Exact cushion surface bound by `prepareGarment` (same resource as cloth). */
  seatCushion = null;
  /** Root-channel hand-over records (sit clip -> seated idle). */
  handoverTrace = [];
  /** World Y of the measured palm normal per side (null until sampled). */
  palmNormalY = { left: null, right: null };
  /** Last typing-arm solve, for the HUD and the contact report. */
  armDiagnostics = {
    left: { wristTarget: null, wristAchieved: null, palmOffsetLocal: null, shortfallM: 0, palmErrorM: null },
    right: { wristTarget: null, wristAchieved: null, palmOffsetLocal: null, shortfallM: 0, palmErrorM: null }
  };
  sceneOffsetY = 0;
  /** Scene height that puts the seated hips on the derived hip target. */
  seatedSceneY = 0;
  /** Declared seated-scoot distance/foot-slide telemetry (procedural). */
  seatedMotionDistanceM = 0;
  seatedFootSlideM = 0;
  /**
   * Per-frame procedural corrections, removed before the next pose is applied.
   * The animation mixer only re-keys the bones a clip actually animates; a
   * premultiplied IK/lean delta on any other bone would ACCUMULATE frame after
   * frame (measured: the chest rotated a full 180 deg in 0.4 s and the body
   * folded onto the desk). Every procedural write goes through this ledger.
   */
  corrections = /* @__PURE__ */ new Map();
  tmp = new THREE37.Vector3();
  tmp2 = new THREE37.Vector3();
  tmpQ = new THREE37.Quaternion();
  lastFrame = null;
  constructor(options) {
    this.vrm = options.vrm;
    this.mixer = options.mixer;
    this.actions = options.actions;
    this.floorY = options.floorY ?? 0;
    this.leanRad = options.seatedLeanRad ?? LEAN_RAD;
    this.samplePalms = options.samplePalms ?? true;
    for (const name of BONE_NAMES) {
      const node = this.bone(name);
      if (node) this.restPosition.set(name, node.position.clone());
    }
    this.bakedClips = options.baked;
    for (const [name, clip] of options.baked) {
      this.bakedActions.set(name, { name, action: this.mixer.clipAction(clip.clip) });
    }
    this.metrics = this.measureMetrics();
    this.prepareFootSamples();
    this.measureGroundOffsets();
    if (this.samplePalms) {
      this.preparePalmSamples();
      this.measurePalmLift();
    }
    this.measureStandingHip();
    this.calibrateSeatedProfile();
    this.body = {
      handReachM: Math.round((this.metrics.upperArmLen + this.metrics.foreArmLen) * 0.995 * 1e3) / 1e3,
      keyboardDistanceM: 0.5,
      seatClearanceM: 0.3
    };
    this.garment = options.garment ? new GarmentContactModifier({ scene: this.vrm.scene, config: options.garment }) : null;
    this.cushionFor = options.cushion ?? null;
    this.playBase(IDLE_CLIP, 1);
  }
  // --- ports -----------------------------------------------------------------
  setCarrier(pos, yaw) {
    this.carrier.pos = { x: pos.x, y: pos.y, z: pos.z };
    this.carrier.yaw = yaw;
    this.vrm.scene.position.set(pos.x, this.sceneOffsetY, pos.z);
    this.vrm.scene.rotation.set(0, yaw + Math.PI, 0);
  }
  idle(_dtMs) {
    if (this.mode === "walk" || this.mode === "sit" || this.mode === "typing" || this.mode === "think" || this.mode === "rest") {
      if (!this.seated) {
        this.mode = "idle";
        this.playBase(IDLE_CLIP, 0.35);
      }
      return;
    }
    this.mode = "idle";
    this.playBase(IDLE_CLIP, 0.35);
  }
  walk(_dtMs, speedMps, direction = 1) {
    this.mode = "walk";
    const walking = this.bakedActions.get("npc_walk");
    if (!walking) {
      this.playBase(IDLE_CLIP, 0.2);
      return;
    }
    if (this.base !== walking.action) {
      walking.action.reset();
      walking.action.setLoop(THREE37.LoopRepeat, Infinity);
      walking.action.setEffectiveWeight(1);
      this.crossFadeTo(walking.action, 0.25);
      this.base = walking.action;
    }
    const scale = Math.max(0.35, speedMps / WALK_SPEED_REF);
    walking.action.setEffectiveTimeScale(direction < 0 ? -scale : scale);
  }
  seat(target) {
    this.target = target;
    this.seated = true;
    this.mode = "sit";
    if (this.sitDownPlayed) return;
    this.sitDownPlayed = true;
    this.startSitTransition(target);
  }
  /**
   * Move the SEATED body with its furniture, from the chair's solved pose.
   *
   * The physics body is the pose authority; this method only keeps the rig's
   * local seated frame consistent with it (root offset preserved, hip target
   * re-derived from the new seat plane). It is not a parent transform: the
   * carrier moves by the measured chair delta, and the seat support/plant loop
   * below still measures the visible pelvis every frame.
   *
   * Feet: the declared seated foot spots ride the chair, so the rendered feet
   * slide on the floor while the chair moves. That is a declared procedural
   * scoot (`procedural-foot-slide`, NOT mocap); the page reports it and this
   * layer does not claim a footstep sequence it does not have.
   */
  followSeat(target, _dtMs) {
    if (!this.seated || this.transition) throw new Error("NOT_SEATED");
    const prev = this.target;
    if (!prev) throw new Error("NO_SEAT_TARGET");
    const dyaw = Math.atan2(Math.sin(target.seatFacing - prev.seatFacing), Math.cos(target.seatFacing - prev.seatFacing));
    const dx = this.carrier.pos.x - prev.seat.x;
    const dz = this.carrier.pos.z - prev.seat.z;
    const c = Math.cos(dyaw);
    const s = Math.sin(dyaw);
    this.carrier.pos = {
      x: target.seat.x + c * dx + s * dz,
      y: 0,
      z: target.seat.z - s * dx + c * dz
    };
    this.carrier.yaw = target.seatFacing;
    const before = this.footSpotsFor(prev, false);
    const after = this.footSpotsFor(target, false);
    const slide = Math.max(
      Math.hypot(after.left.x - before.left.x, after.left.z - before.left.z),
      Math.hypot(after.right.x - before.right.x, after.right.z - before.right.z)
    );
    this.target = target;
    this.prepareGarment(target);
    this.seatPlane = normalizeSeatPlane({ point: target.seat, normal: target.seatNormal ?? { x: 0, y: 1, z: 0 } });
    this.hipTarget = hipTargetForSeat(this.seatPlane, this.profile);
    this.seatedMotionDistanceM += Math.hypot(target.seat.x - prev.seat.x, target.seat.z - prev.seat.z);
    this.seatedFootSlideM += slide;
  }
  /** Declared seated-scoot telemetry (procedural, never mocap). */
  seatedMotionTelemetry() {
    return {
      distanceM: Math.round(this.seatedMotionDistanceM * 1e3) / 1e3,
      footSlideM: Math.round(this.seatedFootSlideM * 1e3) / 1e3,
      mode: "procedural-foot-slide",
      source: "not mocap; feet follow the declared chair-local spots"
    };
  }
  /**
   * Bind the seat's collision surface (built by the slice from the seat
   * resource) to the garment solver AND to the seat-contact solve. Never
   * guessed: a target without a resource surface leaves both off, and the
   * contact gate then reports the fallback instead of inventing a plane.
   */
  prepareGarment(target) {
    this.seatCushion = this.cushionFor ? this.cushionFor(target) : null;
    if (this.garment) this.garment.setCushion(this.seatCushion);
  }
  /** Current garment report (procedural anti-penetration telemetry). */
  garmentReport() {
    return this.garment?.report() ?? null;
  }
  /** Garment region resolution (character data provenance, for the HUD). */
  garmentDescribe() {
    return this.garment?.describe() ?? null;
  }
  /** Release runtime resources (the cloned garment geometry) at scene teardown. */
  dispose() {
    this.garment?.dispose();
  }
  /**
   * DIAGNOSTIC (capture only, no behaviour change): drop the corrective garment
   * and restore the base mesh so a probe can compare the drawn vertices with
   * and without it on the SAME pose.
   */
  debugGarmentOff() {
    if (!this.garment) return false;
    this.garment.setCushion(null);
    this.garment.clear();
    return true;
  }
  /** DIAGNOSTIC: re-bind the seat resource and re-solve on the current pose. */
  debugGarmentOn() {
    if (!this.garment || !this.target) return false;
    this.prepareGarment(this.target);
    this.refreshWorld();
    this.garment.update(0);
    return true;
  }
  /** Declared chair-side point a stand transition ends on (metres, world XZ). */
  standExit(target) {
    if (target.descentPath) return { x: target.seat.x + Math.sin(target.seatFacing) * (target.entryForwardM ?? 0), z: target.seat.z + Math.cos(target.seatFacing) * (target.entryForwardM ?? 0) };
    const lat = { x: Math.cos(target.seatFacing), z: -Math.sin(target.seatFacing) };
    return { x: target.seat.x + lat.x * STAND_EXIT_M, z: target.seat.z + lat.z * STAND_EXIT_M };
  }
  /** Declared horizontal entry point for the sit clip (metres, world XZ). */
  sitStart(target) {
    return clipSitEntryPoint(target, {
      radiusM: this.standingRadiusM ?? this.metrics.shoulderHalfWidth + 0.05,
      clipRootM: this.sitClipRootM()
    });
  }
  /**
   * The measured standing capsule radius, supplied by the page after it derives
   * the collider profile from this avatar. Until then the same shoulder+armPad
   * construction is used (armPad 0.05), so the entry point is never a constant.
   */
  setStandingRadiusM(radiusM) {
    const r = Number(radiusM);
    if (!(Number.isFinite(r) && r > 0.02)) throw new Error(`STANDING_RADIUS_INVALID:${radiusM}`);
    this.standingRadiusM = r;
  }
  /** Horizontal travel of the baked sit clip's own root motion (metres). */
  sitClipRootM() {
    const clip = this.bakedClips.get(SIT_CLIP);
    if (!clip) return 0;
    const a = clip.rootAt(0, new THREE37.Vector3());
    const b = clip.rootAt(clip.durationS, new THREE37.Vector3());
    return Math.hypot(b.x - a.x, b.z - a.z);
  }
  /**
   * Real-clip sit: the trimmed CMU descent drives the body (its rotations plus
   * its vertical root track, retargeted to this chair). The horizontal path is
   * re-based to a declared entry point — the clip's own 0.285 m straight-back
   * step would start the body inside the desk top — and the feet step to the
   * interaction's declared foot contacts. No pose blend is used for the
   * transition itself.
   */
  startSitTransition(target) {
    const inheritedFeet = this.standingFootTargets;
    this.transitionError = null;
    this.descentTrace.length = 0;
    this.extendedPlantLatched = false;
    this.prepareGarment(target);
    const clip = this.bakedClips.get(SIT_CLIP);
    const action = this.bakedActions.get(SIT_CLIP)?.action;
    if (!clip || !action) {
      this.transitionError = "SIT_CLIP_MISSING";
      this.seated = false;
      return;
    }
    const plane = normalizeSeatPlane({ point: target.seat, normal: target.seatNormal ?? { x: 0, y: 1, z: 0 } });
    this.seatPlane = plane;
    this.lastSupportErr = null;
    this.seatCorrectionM = 0;
    const hipTarget = hipTargetForSeat(plane, this.profile);
    this.hipTarget = hipTarget;
    const root0 = clip.rootAt(0, new THREE37.Vector3());
    const root1 = clip.rootAt(clip.durationS, new THREE37.Vector3());
    let plan;
    try {
      plan = planSitTransition({
        seat: { x: target.seat.x, y: hipTarget.y, z: target.seat.z },
        yaw: target.seatFacing,
        standingHipY: this.profile.standingHipY,
        startSceneY: this.vrm.scene.position.y,
        rootStart: toPlain(root0),
        rootEnd: toPlain(root1)
      });
    } catch (error) {
      this.transitionError = error.message;
      this.seated = false;
      return;
    }
    const startCarrier = { x: this.carrier.pos.x, z: this.carrier.pos.z };
    const fwd = { x: Math.sin(target.seatFacing), z: Math.cos(target.seatFacing) };
    const lat = { x: Math.cos(target.seatFacing), z: -Math.sin(target.seatFacing) };
    const d = { x: plan.deltaXZ.x, z: plan.deltaXZ.z };
    const clipFwd = d.x * fwd.x + d.z * fwd.z;
    const clipLat = d.x * lat.x + d.z * lat.z;
    const wantFwd = -((startCarrier.x - target.seat.x) * fwd.x + (startCarrier.z - target.seat.z) * fwd.z);
    const rebase = {
      lateralGain: Math.abs(clipLat) < 1e-3 ? 0 : 0,
      forwardGain: Math.abs(clipFwd) < 1e-3 ? 0 : wantFwd / clipFwd,
      lateralExtraM: 0
    };
    const footSeat = this.footSpotsFor(target, false);
    const feetNow = {
      left: inheritedFeet?.left ?? this.footXZ("left"),
      right: inheritedFeet?.right ?? this.footXZ("right")
    };
    action.reset();
    action.setLoop(THREE37.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.setEffectiveWeight(1);
    action.setEffectiveTimeScale(target.descentPath ? 0.5 : 1);
    action.play();
    if (this.base && this.base !== action) this.base.crossFadeTo(action, 0.2, false);
    this.base = action;
    this.stopOverlay();
    this.transition = {
      kind: "sit",
      t: 0,
      duration: clip.durationS,
      action,
      clip,
      plan,
      rebase,
      root0,
      startCarrier,
      startSceneY: this.vrm.scene.position.y,
      yaw: target.seatFacing,
      feet: {
        left: { from: feetNow.left, to: footSeat.left, t0: 0.18, t1: 0.62, ...inheritedFeet?.left.contact ? { contact: inheritedFeet.left.contact } : {} },
        right: { from: feetNow.right, to: footSeat.right, t0: 0.45, t1: 0.9, ...inheritedFeet?.right.contact ? { contact: inheritedFeet.right.contact } : {} }
      },
      queuedCancel: false
    };
    this.standingFootTargets = null;
    this.mode = "sit";
    this.carrier.pos = { x: startCarrier.x, y: 0, z: startCarrier.z };
    this.carrier.yaw = target.seatFacing;
    this.seatBlend = 1;
  }
  reach(target, _dtMs) {
    this.target = target;
    this.seated = true;
    this.mode = "typing";
    this.playOverlay("npc_typing", 0.85);
  }
  think(target, _dtMs) {
    this.target = target;
    this.seated = true;
    this.mode = "think";
    this.playOverlay(THINK_CLIP, 0.55);
  }
  rest(target, _dtMs) {
    this.target = target;
    this.seated = true;
    this.mode = "rest";
    this.playOverlay("npc_sit_fidget", 0.45);
  }
  stand(_dtMs) {
    if (!this.seated && !this.transition) {
      if (this.mode !== "idle") {
        this.mode = "idle";
        this.transitionError = null;
        this.playBase(IDLE_CLIP, 0.25);
      }
      return;
    }
    if (this.transition) {
      this.transition.queuedCancel = true;
      return;
    }
    this.sitDownPlayed = false;
    this.stopOverlay();
    this.startStandTransition();
  }
  /**
   * Real-clip stand: the trimmed CMU ascent drives the body. Its own lateral
   * root component (the direction the actor steps out) is kept and extended to
   * the declared exit distance; its forward component is suppressed because at
   * this desk it would put the pelvis through the desk top (measured: +0.257 m
   * ends inside the desk top slab).
   */
  startStandTransition() {
    const target = this.target;
    this.transitionError = null;
    this.seatCushion = null;
    this.garment?.setCushion(null);
    const clip = this.bakedClips.get(STAND_CLIP);
    const action = this.bakedActions.get(STAND_CLIP)?.action;
    if (!clip || !action || !target || !this.hipTarget) {
      this.transitionError = clip ? "STAND_NO_SEAT_TARGET" : "STAND_CLIP_MISSING";
      this.mode = "stand";
      this.seated = false;
      this.playBase(IDLE_CLIP, SIT_BLEND_S);
      return;
    }
    const root0 = clip.rootAt(0, new THREE37.Vector3());
    const root1 = clip.rootAt(clip.durationS, new THREE37.Vector3());
    let plan;
    try {
      plan = planStandTransition({
        yaw: target.seatFacing,
        startCarrier: { x: this.carrier.pos.x, z: this.carrier.pos.z },
        startHipY: this.hipTarget.y,
        standingHipY: this.profile.standingHipY,
        startSceneY: 0,
        rootStart: toPlain(root0),
        rootEnd: toPlain(root1)
      });
    } catch (error) {
      this.transitionError = error.message;
      this.mode = "stand";
      this.seated = false;
      this.playBase(IDLE_CLIP, SIT_BLEND_S);
      return;
    }
    const fwd = { x: Math.sin(target.seatFacing), z: Math.cos(target.seatFacing) };
    const lat = { x: Math.cos(target.seatFacing), z: -Math.sin(target.seatFacing) };
    const d = plan.deltaXZ;
    const clipFwd = d.x * fwd.x + d.z * fwd.z;
    const clipLat = d.x * lat.x + d.z * lat.z;
    const sign = clipLat >= 0 ? 1 : -1;
    const rebase = {
      lateralGain: Math.abs(clipLat) < 1e-3 ? 0 : sign * STAND_EXIT_M / clipLat,
      forwardGain: 0,
      lateralExtraM: 0
    };
    action.reset();
    action.setLoop(THREE37.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.setEffectiveWeight(1);
    action.setEffectiveTimeScale(1);
    action.play();
    if (this.base && this.base !== action) this.base.crossFadeTo(action, 0.2, false);
    this.base = action;
    const inheritedFeet = this.seatedFootTargets;
    const feetNow = { left: inheritedFeet?.left ?? this.footXZ("left"), right: inheritedFeet?.right ?? this.footXZ("right") };
    const standSpots = this.footSpotsFor(target, true);
    this.transition = {
      kind: "stand",
      t: 0,
      duration: clip.durationS,
      action,
      clip,
      plan,
      rebase,
      root0,
      startCarrier: { x: this.carrier.pos.x, z: this.carrier.pos.z },
      startSceneY: this.vrm.scene.position.y,
      yaw: target.seatFacing,
      feet: {
        left: { from: feetNow.left, to: standSpots.left, t0: 0.12, t1: 0.6, ...inheritedFeet?.left.contact ? { contact: inheritedFeet.left.contact } : {} },
        right: { from: feetNow.right, to: standSpots.right, t0: 0.5, t1: 0.95, ...inheritedFeet?.right.contact ? { contact: inheritedFeet.right.contact } : {} }
      },
      queuedCancel: false
    };
    this.seatedFootTargets = null;
    this.mode = "stand";
    this.seated = false;
  }
  relax() {
    this.stopOverlay();
    if (!this.seated) {
      this.garment?.setCushion(null);
      this.seatCushion = null;
    }
    if (this.seated) {
      this.mode = "sit";
      this.playBase(SEATED_CLIP, 0.3);
    } else if (this.mode !== "stand") {
      this.mode = "idle";
      this.playBase(IDLE_CLIP, 0.3);
    }
  }
  lookAround(dtMs) {
    this.t += dtMs / 1e3;
    const neck = this.bone("neck");
    const head = this.bone("head");
    if (neck) neck.rotation.y = Math.sin(this.t * 0.9) * 0.5;
    if (head) head.rotation.y = Math.sin(this.t * 0.9 + 0.4) * 0.35;
  }
  turnToSpeaker(target, _dtMs) {
    if (!target) return;
    const dx = target.x - this.carrier.pos.x;
    const dz = target.z - this.carrier.pos.z;
    const want = Math.atan2(dx, dz);
    const delta = Math.atan2(Math.sin(want - this.carrier.yaw), Math.cos(want - this.carrier.yaw));
    const spine = this.bone("spine");
    const chest = this.bone("chest");
    const neck = this.bone("neck");
    if (spine) spine.rotation.y += delta * 0.25;
    if (chest) chest.rotation.y += delta * 0.25;
    if (neck) neck.rotation.y += delta * 0.3;
  }
  update(dtMs) {
    const h = Math.max(0, dtMs) / 1e3;
    this.t += h;
    if (!this.seated && !this.transition) this.seatBlend = Math.max(0, this.seatBlend - h / SIT_BLEND_S);
    if (this.seated && !this.transition) this.pinBlend = Math.min(1, this.pinBlend + h / 0.35);
    if (this.transition) this.pinBlend = 0;
    const wantLean = (this.mode === "typing" || this.mode === "device") && !this.transition ? 1 : 0;
    this.leanBlend += (wantLean - this.leanBlend) * Math.min(1, h * 6);
    if (this.deviceReach) {
      if (this.deviceReach.withdrawing) {
        this.deviceReach.weight = Math.max(0, this.deviceReach.weight - h / DEVICE_WITHDRAW_S);
        if (this.deviceReach.weight <= 0) {
          const standing = this.deviceReach.standing;
          this.deviceReach = null;
          if (this.seated) {
            this.mode = "sit";
            this.playBase(SEATED_CLIP, 0.3);
          } else if (standing) {
            this.mode = "idle";
          }
        }
      } else {
        this.deviceReach.weight = Math.min(1, this.deviceReach.weight + h / DEVICE_REACH_S);
      }
    }
    this.beginCorrections();
    if (this.transition && this.target?.descentPath) {
      const tr = this.transition;
      const path = this.target.descentPath;
      const drop = tr.clip.rootAt(tr.duration, new THREE37.Vector3()).y - tr.root0.y;
      const at = (t) => {
        const y = tr.clip.rootAt(t, new THREE37.Vector3()).y;
        const p = Math.max(0, Math.min(1, (y - tr.root0.y) / drop));
        const slot = (tr.kind === "stand" ? 1 - p : p) * (path.length - 1);
        const lo = path[Math.floor(slot)];
        const hi = path[Math.min(Math.ceil(slot), path.length - 1)];
        return lo && hi ? lo.forwardM + (hi.forwardM - lo.forwardM) * (slot - Math.floor(slot)) : 0;
      };
      let scale = 0.5;
      const from = at(tr.t);
      while (Math.abs(at(Math.min(tr.duration, tr.t + h * scale)) - from) > 0.35 * h && scale > 1e-3) scale *= 0.5;
      tr.action.setEffectiveTimeScale(scale);
    }
    this.mixer.update(h);
    const wasTransition = this.transition;
    if (wasTransition) this.advanceTransition(h);
    const owner = poseOwnerForFrame({
      advancedTransition: !!wasTransition,
      finishedTransitionKind: wasTransition && !this.transition ? wasTransition.kind : null,
      transitioning: this.transition !== null,
      seated: this.seated,
      seatBlend: this.seatBlend,
      hasTarget: !!this.target
    });
    if (owner === "seated" || owner === "seated-handover") this.applySeatedPose();
    else if (owner === "standing") this.applyStandingGround(h);
    if (this.mode === "deviceStanding" && this.deviceReach) this.solveDeviceReach();
    this.vrm.update(h);
    this.refreshWorld();
    this.lastFrame = this.buildFrame();
    if (this.traceSeat && this.seated && !this.transition && this.seatPlane && this.hipTarget) {
      const post = this.lastFrame.pelvisLow;
      const planeY = this.seatPlane.point.y;
      if (this.seatTrace.length >= SEAT_TRACE_MAX) this.seatTrace.splice(0, this.seatTrace.length - SEAT_TRACE_MAX + 1);
      this.seatTrace.push({
        t: round4(this.t),
        trim: this.seatCorrectionM,
        pinBlend: round4(this.pinBlend),
        hipTargetY: round4(this.hipTarget.y),
        hipsPre: round4(this.lastPreSeat?.hipsY ?? NaN),
        supportPre: this.lastPreSeat?.supportY == null ? null : round4(this.lastPreSeat.supportY),
        errPre: this.lastPreSeat?.err == null ? null : round4(this.lastPreSeat.err),
        hipsPost: round4(this.lastFrame.hips.y),
        supportPost: post ? round4(post.y) : null,
        errPost: post ? round4(post.y - planeY) : null,
        inside: this.pelvisAudit.insideCount,
        outside: this.pelvisAudit.outsideCount,
        sceneY: round4(this.vrm.scene.position.y),
        seatBlend: round4(this.seatBlend),
        clip: this.base?.getClip()?.name ?? ""
      });
    }
    if (this.garment && this.garment.regionVertices > 0) {
      this.refreshWorld();
      this.garment.update(h);
    }
  }
  /** True while a real clip's root motion is driving a sit/stand transition. */
  get transitioning() {
    return this.transition !== null;
  }
  /** Turn the seat-support trace on/off (diagnostics; it samples once more per frame). */
  setSeatTrace(on) {
    this.traceSeat = !!on;
    if (!this.traceSeat) this.seatTrace.length = 0;
  }
  /**
   * Enable/disable the exact seat planting (diagnostics: it isolates whether a
   * residual seat error comes from the pose or from the placement step). With
   * it off the hip target stays at the calibrated character offset.
   */
  seatTrimEnabled = true;
  setSeatTrimEnabled(on) {
    this.seatTrimEnabled = !!on;
  }
  /** Diagnostic A/B: enable/disable the seated hips-track rebase at hand-over. */
  seatedRebaseEnabled = true;
  setSeatedRebaseEnabled(on) {
    this.seatedRebaseEnabled = !!on;
  }
  /** Use the whole skin patch (true) or the buttock landing patch (false) in the plant. */
  skinPlantEnabled = false;
  setSkinPlantEnabled(on) {
    this.skinPlantEnabled = !!on;
  }
  /** Last placement correction applied to put the visible pelvis on the cushion (m). */
  seatCorrectionM = 0;
  /** Per-frame placement budget for the seated plant (m); mm-level, continuous. */
  plantStepBudgetM = Number.POSITIVE_INFINITY;
  /** Latched once the stable landing plant has converged: the extended patch takes over. */
  extendedPlantLatched = false;
  /** Diagnostic log of the planting step (last entries only). */
  plantLog = [];
  /** Distribution of the visible pelvis over the cushion (diagnostics). */
  debugPelvisStats() {
    const ys = [];
    let worst = null;
    let inside = 0;
    let outside = 0;
    const rect2 = this.target?.seatRect;
    const planeY = this.seatPlane?.point.y ?? null;
    for (const entry of this.pelvisSamples) {
      entry.mesh.skeleton.update();
      for (const index of entry.indices) {
        entry.mesh.getVertexPosition(index, this.tmp);
        this.tmp.applyMatrix4(entry.mesh.matrixWorld);
        if (rect2 && !insideSeatRect(this.tmp, rect2, 0)) {
          outside += 1;
          continue;
        }
        inside += 1;
        ys.push(this.tmp.y);
        if (!worst || this.tmp.y < worst.y) worst = this.tmp.clone();
      }
    }
    ys.sort((a, b) => a - b);
    const at = (q) => ys.length ? ys[Math.min(ys.length - 1, Math.floor(q * (ys.length - 1)))] : NaN;
    return {
      count: ys.length,
      minY: round4(at(0)),
      p1Y: round4(at(0.01)),
      p5Y: round4(at(0.05)),
      medianY: round4(at(0.5)),
      belowPlane: planeY === null ? -1 : ys.filter((y) => y < planeY).length,
      worst: worst ? toPlain(worst) : null,
      inside,
      outside
    };
  }
  /**
   * Whether the seated pose has actually SETTLED on the cushion: the pin is
   * fully applied and the measured support sits within `tol` of `target` above
   * the declared seat plane. The adapter waits for this before it evaluates the
   * seat contact — a contact check taken while the pin is still ramping reports
   * the ramp, not the pose (this is what failed the sit with SEAT_INTO_CUSHION
   * at 7.3 mm and then dead-locked the replan).
   */
  seatSettled(tol = SEAT_SETTLE_TOL_M, target = 0) {
    return this.seatSettleBlock(tol, target) === null;
  }
  /**
   * Why the seated pose is not settled yet (null = settled), through the shared
   * contract in `seatSettle.ts`. Exposed for the HUD/diagnostics and used by
   * `seatSettled`, so the page and the tests ask the exact same question.
   */
  seatSettleBlock(tol = SEAT_SETTLE_TOL_M, target = 0) {
    return seatSettleBlock({
      seated: this.seated,
      transitioning: this.transition !== null,
      pinBlend: this.pinBlend,
      lastSupportErrM: this.lastSupportErr,
      plantTargetM: SEAT_PLANT_M,
      tolM: tol,
      targetM: target
    });
  }
  /** Clearance this rig plants the visible pelvis at (m above the seat plane). */
  get seatSettleTargetM() {
    return SEAT_PLANT_M;
  }
  /** Signed support error the loop last measured (metres above the plane). */
  get seatSupportError() {
    return this.lastSupportErr;
  }
  /**
   * SINGLE-FRAME PERTURBATION TEST (diagnostics, no state change on exit).
   *
   * Moves the hips bone by `dyM` exactly the way the seat pin does, syncs the
   * raw skeleton through `vrm.update(0)` and measures the visible support before
   * and after. A correct rig must move the skin by the same amount in the same
   * direction; a sign flip, a wrong scale (skin moves half as much) or a stale
   * sample (skin does not move at all) is a broken feedback path, and no
   * parameter tuning can fix it.
   */
  debugNudgeHip(dyM) {
    const before = this.samplePelvis();
    const hipsBefore = this.worldPos("hips", new THREE37.Vector3()).y;
    const hipsBone = this.bone("hips");
    if (!hipsBone) {
      return { dyM, supportBefore: before?.y ?? null, supportAfter: null, skinDeltaY: null, hipsBefore, hipsAfter: hipsBefore, hipDeltaY: 0 };
    }
    this.addPos("hips", new THREE37.Vector3(0, dyM, 0).applyQuaternion(parentWorldQuat(hipsBone).invert()));
    this.vrm.update(0);
    this.refreshWorld();
    const after = this.samplePelvis();
    const hipsAfter = this.worldPos("hips", new THREE37.Vector3()).y;
    this.addPos("hips", new THREE37.Vector3(0, -dyM, 0).applyQuaternion(parentWorldQuat(hipsBone).invert()));
    this.vrm.update(0);
    this.refreshWorld();
    return {
      dyM,
      supportBefore: before ? round4(before.y) : null,
      supportAfter: after ? round4(after.y) : null,
      skinDeltaY: before && after ? round4(after.y - before.y) : null,
      hipsBefore: round4(hipsBefore),
      hipsAfter: round4(hipsAfter),
      hipDeltaY: round4(hipsAfter - hipsBefore)
    };
  }
  /**
   * Drive the body from the clip's own root track.
   *
   * The baked `root` array is the pelvis translation in the VRM model frame
   * (model faces -Z). It is applied to the carrier (XZ, re-based) and to the
   * scene height (scaled by the retarget ratio), while the feet are kept on the
   * floor by IK with a declared step arc. Nothing here is a pose blend: the
   * pose is the mixer's clip, the translation is the clip's, and the only
   * procedural writes are the foot contacts.
   */
  transitionFootTarget(step, u) {
    const foot = footStepAt(step, u);
    const contact = step.contact;
    return contact ? { ...foot, contact: { ...contact, centroid: {
      ...contact.centroid,
      x: contact.centroid.x + foot.x - step.from.x,
      z: contact.centroid.z + foot.z - step.from.z
    } } } : foot;
  }
  // Current stand only: preserve the inherited sole frames while the clip rises.
  // Reuse the existing leg IK and the same bounded support/IK fixed point.
  solveStandingContacts(targets) {
    for (let pass = 0; pass < 3; pass += 1) {
      this.vrm.update(0);
      this.refreshWorld();
      let gap = 0;
      for (const side of ["left", "right"]) {
        if (targets[side].contact && targets[side].lift === 0) {
          const sole = this.sampleSole(side);
          if (sole) gap = Math.max(gap, sole.y - this.floorY);
        }
      }
      if (gap <= 5e-4) break;
      this.vrm.scene.position.y -= gap;
      this.refreshWorld();
      for (const side of ["left", "right"]) this.legIK(side, targets[side]);
    }
  }
  advanceTransition(h) {
    const tr = this.transition;
    if (!tr) return;
    tr.t = Math.min(tr.duration, tr.t + h * (this.target?.descentPath ? tr.action.getEffectiveTimeScale() : 1));
    const u = tr.duration > 0 ? tr.t / tr.duration : 1;
    const root = tr.clip.rootAt(tr.t, new THREE37.Vector3());
    const fwd = { x: Math.sin(tr.yaw), z: Math.cos(tr.yaw) };
    const lat = { x: Math.cos(tr.yaw), z: -Math.sin(tr.yaw) };
    const a = tr.yaw + Math.PI;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const dx = root.x - tr.root0.x;
    const dz = root.z - tr.root0.z;
    const wx = dx * c + dz * s;
    const wz = -dx * s + dz * c;
    const cf = wx * fwd.x + wz * fwd.z;
    const cl = wx * lat.x + wz * lat.z;
    const drop = tr.clip.rootAt(tr.duration, new THREE37.Vector3()).y - tr.root0.y;
    const descend = Math.abs(drop) > 1e-6 ? Math.min(1, Math.max(0, (root.y - tr.root0.y) / drop)) : u;
    const corridor = this.target?.descentPath;
    const slot = (tr.kind === "stand" ? 1 - descend : descend) * ((corridor?.length ?? 1) - 1);
    const lo = corridor?.[Math.floor(slot)];
    const hi = corridor?.[Math.min(Math.ceil(slot), (corridor?.length ?? 1) - 1)];
    const forward = lo && hi ? lo.forwardM + (hi.forwardM - lo.forwardM) * (slot - Math.floor(slot)) : null;
    const alongF = forward !== null && this.target ? (this.target.seat.x - tr.startCarrier.x) * fwd.x + (this.target.seat.z - tr.startCarrier.z) * fwd.z + forward : cf * tr.rebase.forwardGain;
    const alongL = corridor ? 0 : cl * tr.rebase.lateralGain + tr.rebase.lateralExtraM;
    this.carrier.pos = {
      x: tr.startCarrier.x + alongL * lat.x + alongF * fwd.x,
      y: 0,
      z: tr.startCarrier.z + alongL * lat.z + alongF * fwd.z
    };
    this.carrier.yaw = tr.yaw;
    const sceneY = tr.startSceneY + (root.y - tr.root0.y) * tr.plan.scaleY;
    this.vrm.scene.position.set(this.carrier.pos.x, sceneY, this.carrier.pos.z);
    this.vrm.scene.rotation.set(0, tr.yaw + Math.PI, 0);
    this.refreshWorld();
    for (const side of ["left", "right"]) {
      const step = tr.feet[side];
      this.legIK(side, this.transitionFootTarget(step, u));
    }
    this.refreshWorld();
    this.applyDescentContact(tr);
    if (tr.kind === "stand" && tr.feet.left.contact && tr.feet.right.contact) {
      this.solveStandingContacts({ left: this.transitionFootTarget(tr.feet.left, u), right: this.transitionFootTarget(tr.feet.right, u) });
    }
    if (tr.t >= tr.duration - 1e-6) this.finishTransition();
  }
  /**
   * Continuous seat contact over the DESCENT (r10 defect).
   *
   * r10 measured the last transition frame at -20.35 mm inside the seat plane
   * and excused it as "inside the 30 mm seat contact tolerance". The seat
   * tolerance is a CONTACT-DISTANCE tolerance, not a licence for the rendered
   * pelvis to pass through the cushion. The clip still owns the motion; this
   * step only refuses to let the measured visible pelvis go below the declared
   * plant height on ANY frame where it would. It runs inside the same frame the
   * pose is built from, applies the same measured placement as the seated pose,
   * re-solves the feet after the height change, and re-measures. Nothing is
   * teleported: while the clip continues to descend, the constraint simply holds
   * the body at the contact height, so the rendered root has no upward jump.
   */
  applyDescentContact(tr) {
    const plane = this.seatPlane;
    if (!plane || !this.seatTrimEnabled) return;
    const u = tr.duration > 0 ? tr.t / tr.duration : 1;
    const clipSceneY = this.vrm.scene.position.y;
    let errBefore = NaN;
    let applied = 0;
    let passes = 0;
    for (let pass = 0; pass < 3; pass += 1) {
      this.vrm.update(0);
      this.refreshWorld();
      const support = this.samplePelvisSupportOnCushion();
      if (!support) break;
      const err = support.signed;
      if (pass === 0) errBefore = err;
      const plan = planSeatPlant(support, SEAT_PLANT_M, SEAT_PLANT_MAX_M);
      if (plan.reason === "OUT_OF_RANGE") {
        this.transitionError = "SEAT_DESCENT_CONTACT_OUT_OF_RANGE";
        break;
      }
      const delta = plan.deltaM;
      if (delta <= 1e-4) break;
      passes += 1;
      if (Math.abs(plane.normal.y) >= 0.9) {
        this.vrm.scene.position.y += delta / plane.normal.y;
      } else {
        const hips = this.bone("hips");
        if (!hips) break;
        const n = new THREE37.Vector3(plane.normal.x, plane.normal.y, plane.normal.z).multiplyScalar(delta);
        this.addPos("hips", n.applyQuaternion(parentWorldQuat(hips).invert()));
      }
      applied += delta;
      this.vrm.update(0);
      this.refreshWorld();
      for (const side of ["left", "right"]) {
        const step = tr.feet[side];
        this.legIK(side, this.transitionFootTarget(step, u));
      }
      this.refreshWorld();
    }
    this.vrm.update(0);
    this.refreshWorld();
    const final = this.samplePelvisSupportOnCushion();
    const errAfter = final ? final.signed : NaN;
    this.descentTrace.push({
      t: round4(tr.t),
      u: round4(u),
      clipSceneY: round4(clipSceneY),
      sceneY: round4(this.vrm.scene.position.y),
      errBefore: Number.isFinite(errBefore) ? round4(errBefore) : NaN,
      errAfter: Number.isFinite(errAfter) ? round4(errAfter) : NaN,
      correction: round4(applied),
      passes
    });
  }
  finishTransition() {
    const tr = this.transition;
    if (!tr) return;
    this.transition = null;
    if (tr.kind === "sit") {
      if (tr.feet.left.contact && tr.feet.right.contact) {
        this.seatedFootTargets = {
          left: this.transitionFootTarget(tr.feet.left, 1),
          right: this.transitionFootTarget(tr.feet.right, 1)
        };
      }
      this.mode = "sit";
      this.seated = true;
      this.seatBlend = 1;
      this.seatedSceneY = this.vrm.scene.position.y;
      const support = this.samplePelvis();
      if (support && this.seatPlane) {
        const hips2 = this.worldPos("hips", new THREE37.Vector3());
        const offset = hips2.y - support.y;
        if (Number.isFinite(offset) && offset > 0.02 && offset < 0.2) {
          this.profile.seatedHipOffsetM = round4(offset);
          this.profile.supportSource = "calibrated-seated-clip";
          this.hipTarget = hipTargetForSeat(this.seatPlane, this.profile);
          this.supportLoop.lastCorr = round4(offset);
        }
      }
      const normHips = this.vrm.humanoid.getNormalizedBoneNode("hips");
      const seatedAction = this.actions.get(SEATED_CLIP);
      const seatedTrack = seatedAction?.getClip().tracks.find((track) => track.name.endsWith(".position") && /hips/i.test(track.name));
      if (normHips && seatedTrack && seatedTrack.values.length >= 3) {
        const plan = planHipsHandoff(normHips.position.y, seatedTrack.values[1]);
        const offsetY = this.seatedRebaseEnabled ? plan.offsetY : 0;
        const changed = rebaseHipsTrackY(seatedTrack.values, offsetY);
        this.handoverTrace.push({
          t: round4(this.t),
          outgoingHipsLocalY: round4(plan.outgoingHipsLocalY),
          incomingHipsTrackY: round4(plan.incomingHipsTrackY),
          offsetY: round4(offsetY),
          samplesChanged: changed,
          sceneY: round4(this.vrm.scene.position.y),
          hipsWorldY: round4(this.worldPos("hips", new THREE37.Vector3()).y)
        });
      }
      this.pinBlend = 1;
      this.playBase(SEATED_CLIP, 0.18);
      if (tr.queuedCancel) this.startStandTransition();
      return;
    }
    this.standingFootTargets = { left: this.transitionFootTarget(tr.feet.left, 1), right: this.transitionFootTarget(tr.feet.right, 1) };
    this.mode = "idle";
    this.seated = false;
    this.seatBlend = 0;
    this.pinBlend = 0;
    this.seatPlane = null;
    this.hipTarget = null;
    this.seatCushion = null;
    this.sceneOffsetY = this.vrm.scene.position.y;
    const hips = this.vrm.humanoid.getNormalizedBoneNode("hips");
    const idleTrack = this.actions.get(IDLE_CLIP)?.getClip().tracks.find(
      (track) => track instanceof THREE37.VectorKeyframeTrack && /hips.*\.position$/i.test(track.name)
    );
    const firstY = idleTrack?.values[1];
    if (hips && idleTrack && firstY !== void 0) {
      rebaseHipsTrackY(idleTrack.values, planHipsHandoff(hips.position.y, firstY).offsetY);
    }
    this.playBase(IDLE_CLIP, 0.25);
    this.target = this.target;
  }
  // allow: SIZE_OK — legacy rig remains intact; H3a scheduling lives outside it.
  seatedFootTargets = null;
  standingFootTargets = null;
  setSeatedFootTargets(targets) {
    this.seatedFootTargets = targets;
  }
  footContactTargets() {
    const tr = this.transition;
    return tr ? {
      left: this.transitionFootTarget(tr.feet.left, tr.t / tr.duration),
      right: this.transitionFootTarget(tr.feet.right, tr.t / tr.duration)
    } : this.seatedFootTargets ?? this.standingFootTargets;
  }
  /** Read rendered raw joints and the SAME fixed shoe-vertex set each step. */
  footContactMeasurement() {
    const sample = (side) => {
      const raw = (name) => this.vrm.humanoid.getRawBoneNode(name)?.getWorldPosition(new THREE37.Vector3()) ?? new THREE37.Vector3();
      const hip = raw(`${side}UpperLeg`), knee = raw(`${side}LowerLeg`), ankle = raw(`${side}Foot`);
      const sum = new THREE37.Vector3();
      let count = 0;
      let minY = Infinity;
      const min = new THREE37.Vector3(Infinity, Infinity, Infinity), max = new THREE37.Vector3(-Infinity, -Infinity, -Infinity);
      for (const entry of this.soleSamples[side]) {
        entry.mesh.skeleton.update();
        for (const index of entry.indices) {
          const point2 = entry.mesh.getVertexPosition(index, new THREE37.Vector3()).applyMatrix4(entry.mesh.matrixWorld);
          sum.add(point2);
          count++;
          minY = Math.min(minY, point2.y);
          min.min(point2);
          max.max(point2);
        }
      }
      const centroid = count ? sum.divideScalar(count) : null;
      const rawQ = this.vrm.humanoid.getRawBoneNode(`${side}Foot`)?.getWorldQuaternion(new THREE37.Quaternion()) ?? new THREE37.Quaternion();
      const normalizedQ = this.vrm.humanoid.getNormalizedBoneNode(`${side}Foot`)?.getWorldQuaternion(new THREE37.Quaternion()) ?? new THREE37.Quaternion();
      const quaternion = (q) => ({ x: q.x, y: q.y, z: q.z, w: q.w });
      const contact = centroid ? {
        centroid: toPlain(centroid),
        localOffset: toPlain(centroid.clone().sub(ankle).applyQuaternion(rawQ.clone().invert())),
        rawWorldQuaternion: quaternion(rawQ),
        normalizedWorldQuaternion: quaternion(normalizedQ)
      } : null;
      return {
        hip: toPlain(hip),
        knee: toPlain(knee),
        ankle: toPlain(ankle),
        thighM: hip.distanceTo(knee),
        shinM: knee.distanceTo(ankle),
        contact,
        sole: centroid ? { centroid: toPlain(centroid), minY, min: toPlain(min), max: toPlain(max), count } : null
      };
    };
    return { left: sample("left"), right: sample("right") };
  }
  frame() {
    if (!this.lastFrame) {
      this.refreshWorld();
      this.lastFrame = this.buildFrame();
    }
    return this.lastFrame;
  }
  /**
   * Analytic reach: each predicted seated shoulder (the rig's measured
   * hip→shoulder height and half-width, torso pivoted by the DECLARED forward
   * lean) against its own hand target, compared with the arm's real length.
   * This is what makes the runtime's preflight honest: a seat that is too far
   * fails before any arm IK is stretched, and the numbers are the rig's, not a
   * configuration constant.
   */
  measureReach(target) {
    const reachM = (this.metrics.upperArmLen + this.metrics.foreArmLen) * 0.995;
    const forward = Math.sin(this.leanRad) * this.metrics.shoulderUp;
    const yaw = target.seatFacing;
    const right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
    const shoulder = (side) => {
      const lateral = (side === "left" ? -1 : 1) * this.metrics.shoulderHalfWidth;
      return {
        x: target.seat.x + Math.sin(yaw) * forward + right.x * lateral,
        y: target.seatY + this.metrics.shoulderUp,
        z: target.seat.z + Math.cos(yaw) * forward + right.z * lateral
      };
    };
    const dl = distance3(shoulder("left"), target.handTargets.left);
    const dr = distance3(shoulder("right"), target.handTargets.right);
    const distanceM = Math.max(dl, dr);
    this.body.keyboardDistanceM = Math.round(distanceM * 1e3) / 1e3;
    return {
      distanceM: Math.round(distanceM * 1e3) / 1e3,
      reachM: Math.round(reachM * 1e3) / 1e3,
      shortfallM: Math.round(Math.max(0, distanceM - reachM) * 1e3) / 1e3
    };
  }
  /**
   * Analytic reach for ONE world point (an appliance contact), using the same
   * predicted seated shoulder as `measureReach` and the MEASURED palm extension
   * beyond the wrist. This is the preflight budget: the arm is never stretched
   * and the contact point is never moved.
   */
  measurePointReach(point2, side, options = {}) {
    const palmExt = Math.max(0.015, this.palmLift[side] ?? 0.03);
    const reachM = (this.metrics.upperArmLen + this.metrics.foreArmLen) * 0.995 + palmExt;
    const forward = Math.sin(this.leanRad) * this.metrics.shoulderUp;
    const seat = options.seat !== void 0 ? options.seat : this.target;
    const yaw = options.standpoint ? options.standpoint.yaw : seat ? seat.seatFacing : this.carrier.yaw;
    const leanForward = options.standpoint ? 0 : forward;
    const right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
    const lateral = (side === "left" ? 1 : -1) * this.metrics.shoulderHalfWidth;
    const base = options.standpoint ? { x: options.standpoint.x, y: this.floorY + this.profile.standingHipY, z: options.standpoint.z } : seat ? { x: seat.seat.x, y: seat.seatY, z: seat.seat.z } : { x: this.carrier.pos.x, y: this.floorY, z: this.carrier.pos.z };
    const shoulder = {
      x: base.x + Math.sin(yaw) * leanForward + right.x * lateral,
      y: base.y + this.metrics.shoulderUp,
      z: base.z + Math.cos(yaw) * leanForward + right.z * lateral
    };
    const distanceM = distance3(shoulder, point2);
    return {
      distanceM: Math.round(distanceM * 1e3) / 1e3,
      reachM: Math.round(reachM * 1e3) / 1e3,
      shortfallM: Math.round(Math.max(0, distanceM - reachM) * 1e3) / 1e3
    };
  }
  /**
   * Begin a declared SEATED appliance reach. Only the seated posture is
   * accepted here: a standing request through this entry point is refused
   * instead of animating a fake one. The standing chain has its own entry
   * (`beginStandingReach`) so this refusal is not weakened.
   */
  reachDevice(device) {
    if (!device.seated) throw new Error("DEVICE_REACH_UNSUPPORTED_POSTURE:standing");
    this.deviceReach = {
      device,
      side: device.side,
      contact: new THREE37.Vector3(device.contact.x, device.contact.y, device.contact.z),
      normal: new THREE37.Vector3(device.normal.x, device.normal.y, device.normal.z),
      standing: false,
      start: null,
      weight: 0,
      withdrawing: false,
      palmError: null
    };
    this.mode = "device";
  }
  /**
   * Begin a STANDING reach. The target is the ACTUAL surface point and palm
   * normal; the adapter re-aims it every fixed step while the door moves.
   */
  beginStandingReach(target) {
    if (this.seated) throw new Error("STANDING_REACH_REQUIRES_STANDING");
    this.deviceReach = {
      device: null,
      side: target.side,
      contact: new THREE37.Vector3(target.point.x, target.point.y, target.point.z),
      normal: new THREE37.Vector3(target.normal.x, target.normal.y, target.normal.z),
      standing: true,
      start: null,
      weight: 0,
      withdrawing: false,
      palmError: null
    };
    this.mode = "deviceStanding";
  }
  /** Re-aim the standing reach at the actual handle surface (this step). */
  updateReachTarget(point2, normal) {
    const dr = this.deviceReach;
    if (!dr || !dr.standing) return;
    dr.contact = new THREE37.Vector3(point2.x, point2.y, point2.z);
    dr.normal = new THREE37.Vector3(normal.x, normal.y, normal.z);
  }
  /** Ask the reach to ease back to the seated clip (withdrawal / cancel). */
  endDeviceReach() {
    if (!this.deviceReach) return;
    this.deviceReach.withdrawing = true;
  }
  /** Measured visible-palm point (the contact evidence, not the wrist). */
  palmPoint(side) {
    const p = this.samplePalm(side);
    return p ? { x: p.x, y: p.y, z: p.z } : null;
  }
  /** World-space hips joint: the continuous root/hips trajectory evidence. */
  /**
   * Measured posture progress of the current sit/stand transition, 0 = the
   * standing hip height, 1 = the declared seated hip target. The collision proxy
   * deforms from this number, never from a timer: a stalled or cancelled clip
   * must not shrink the body. Falls back to clip time only if the hip bone is
   * unavailable (a missing rig bone is a real failure, not a silent 0).
   */
  transitionProgress() {
    if (!this.transition) return this.seated ? 1 : 0;
    if (this.target?.descentPath) {
      const tr = this.transition;
      const root = tr.clip.rootAt(tr.t, new THREE37.Vector3());
      const end = tr.clip.rootAt(tr.duration, new THREE37.Vector3());
      const drop = end.y - tr.root0.y;
      const p = Math.abs(drop) > 1e-6 ? Math.max(0, Math.min(1, (root.y - tr.root0.y) / drop)) : 0;
      return tr.kind === "sit" ? p : 1 - p;
    }
    const hip = this.hipsWorld();
    const startY = this.floorY + this.profile.standingHipY;
    const endY = this.hipTarget ? this.hipTarget.y : startY - 0.35;
    if (hip && Math.abs(startY - endY) > 0.05 && Number.isFinite(hip.y)) {
      return Math.min(1, Math.max(0, (startY - hip.y) / (startY - endY)));
    }
    return Math.min(1, Math.max(0, this.transition.t / Math.max(1e-6, this.transition.duration)));
  }
  hipsWorld() {
    const p = this.worldPos("hips", new THREE37.Vector3());
    return { x: p.x, y: p.y, z: p.z };
  }
  /** Current base clip time (s). A sustained pose must advance by dt each step. */
  baseTimeS() {
    return this.base ? this.base.time : -1;
  }
  /**
   * Measured arm pose in degrees, from the bones themselves (not from the IK
   * request): shoulder elevation from the world down axis and elbow flexion
   * (0 = straight). `null` when the chain is not available.
   */
  armPose(side) {
    const upper = this.bone(side === "left" ? "leftUpperArm" : "rightUpperArm");
    const lower = this.bone(side === "left" ? "leftLowerArm" : "rightLowerArm");
    const hand = this.bone(side === "left" ? "leftHand" : "rightHand");
    if (!upper || !lower || !hand) return null;
    const shoulder = upper.getWorldPosition(new THREE37.Vector3());
    const elbow = lower.getWorldPosition(new THREE37.Vector3());
    const wrist = hand.getWorldPosition(new THREE37.Vector3());
    const upperArm = elbow.clone().sub(shoulder);
    const foreArm = wrist.clone().sub(elbow);
    const down = new THREE37.Vector3(0, -1, 0);
    const interior = upperArm.angleTo(foreArm) * (180 / Math.PI);
    return {
      shoulderDeg: Math.round(upperArm.angleTo(down) * (180 / Math.PI) * 10) / 10,
      elbowFlexionDeg: Math.round((180 - interior) * 10) / 10,
      hand: { x: wrist.x, y: wrist.y, z: wrist.z }
    };
  }
  deviceReachDebug() {
    const dr = this.deviceReach;
    if (!dr) return null;
    return {
      deviceId: dr.device?.id ?? "standing-reach",
      side: dr.side,
      standing: dr.standing,
      weight: round4(dr.weight),
      withdrawing: dr.withdrawing,
      palmErrorM: dr.palmError,
      target: dr.contact ? [dr.contact.x, dr.contact.y, dr.contact.z] : null,
      normal: dr.normal ? [dr.normal.x, dr.normal.y, dr.normal.z] : null,
      toleranceM: dr.device?.toleranceM ?? null
    };
  }
  forceNeutral() {
    this.transition = null;
    this.deviceReach = null;
    this.pinBlend = 0;
    this.hipTarget = null;
    this.seatPlane = null;
    this.seatedSceneY = 0;
    this.seatCushion = null;
    this.mixer.stopAllAction();
    this.base = null;
    this.overlay = null;
    this.mode = "idle";
    this.seated = false;
    this.seatBlend = 0;
    this.leanBlend = 0;
    this.sitDownPlayed = false;
    this.palmNormalY.left = null;
    this.palmNormalY.right = null;
    this.corrections.clear();
    this.resetHumanoidPose();
    this.sceneOffsetY = 0;
    this.vrm.scene.position.set(this.carrier.pos.x, 0, this.carrier.pos.z);
    this.vrm.scene.rotation.set(0, this.carrier.yaw + Math.PI, 0);
    this.vrm.update(0);
    this.refreshWorld();
    const frame = this.buildFrame();
    const lSole = frame.leftSoleLow ? frame.leftSoleLow.y : frame.leftFoot.y - (frame.leftSoleOffsetM ?? frame.soleOffsetM);
    const rSole = frame.rightSoleLow ? frame.rightSoleLow.y : frame.rightFoot.y - (frame.rightSoleOffsetM ?? frame.soleOffsetM);
    const feet = Math.min(Math.abs(lSole - this.floorY), Math.abs(rSole - this.floorY));
    return feet <= 0.03;
  }
  /**
   * The measured body metrics the collision proxies are derived from. Public and
   * narrow on purpose: the page must not parse `debug()` to size a collider.
   */
  debugMetrics() {
    return { ...this.metrics };
  }
  debug() {
    const hand = this.bone("leftHand");
    return {
      mode: this.mode,
      seated: this.seated,
      seatBlend: Number(this.seatBlend.toFixed(3)),
      leanBlend: Number(this.leanBlend.toFixed(3)),
      counters: { ...this.debugCounters },
      handL: hand ? hand.getWorldPosition(new THREE37.Vector3()).toArray().map((v) => Number(v.toFixed(4))) : null,
      handR: this.bone("rightHand") ? this.bone("rightHand").getWorldPosition(new THREE37.Vector3()).toArray().map((v) => Number(v.toFixed(4))) : null,
      chain: ["rightUpperArm", "rightLowerArm", "rightHand"].map((b) => [b, !!this.bone(b)]),
      palmLift: this.palmLift,
      palmVertices: { ...this.palmVertexCount },
      palmNormalY: { ...this.palmNormalY },
      arm: JSON.parse(JSON.stringify(this.armDiagnostics)),
      palmLow: { left: this.samplePalm("left")?.toArray().map((v) => Number(v.toFixed(4))) ?? null, right: this.samplePalm("right")?.toArray().map((v) => Number(v.toFixed(4))) ?? null },
      targetL: this.target ? this.target.handTargets.left : null,
      metrics: this.metrics,
      baked: [...this.bakedActions.keys()],
      overlaid: this.overlay ? true : false,
      pinBlend: Number(this.pinBlend.toFixed(3)),
      seatCorrectionM: this.seatCorrectionM,
      seatSettled: this.seatSettled(),
      seatSettleBlock: this.seatSettleBlock(),
      seatSettleTargetM: SEAT_PLANT_M,
      seatSupportError: this.lastSupportErr,
      handover: this.handoverTrace.slice(-4),
      seatSkinPatch: {
        meshes: this.seatSkinSamples.length,
        vertices: this.seatSkinVertexCount
      },
      supportLoop: { ...this.supportLoop },
      profile: { ...this.profile },
      hipTarget: this.hipTarget,
      seatPlane: this.seatPlane,
      pelvisVertexCount: this.pelvisVertexCount,
      pelvisAudit: JSON.parse(JSON.stringify(this.pelvisAudit)),
      pelvisLow: this.samplePelvis()?.toArray().map((v) => Number(v.toFixed(4))) ?? null,
      footLow: {
        left: this.sampleSole("left")?.toArray().map((v) => Number(v.toFixed(4))) ?? null,
        right: this.sampleSole("right")?.toArray().map((v) => Number(v.toFixed(4))) ?? null
      },
      soleOffsetFlat: { ...this.flatSoleOffset },
      soleVertices: { ...this.soleVertexCount },
      transition: this.transition ? {
        kind: this.transition.kind,
        t: Number(this.transition.t.toFixed(3)),
        duration: Number(this.transition.duration.toFixed(3)),
        scaleY: Number(this.transition.plan.scaleY.toFixed(4)),
        startCarrier: this.transition.startCarrier,
        endCarrier: this.transition.plan.endCarrier,
        rebase: this.transition.rebase
      } : null,
      transitionError: this.transitionError,
      seatedSceneY: Number(this.seatedSceneY.toFixed(4))
    };
  }
  // --- metrics / setup -------------------------------------------------------
  bone(name) {
    return this.vrm.humanoid.getNormalizedBoneNode(name) ?? null;
  }
  measureMetrics() {
    const len = (name) => {
      const node = this.bone(name);
      return node ? node.position.length() : 0.2;
    };
    this.resetHumanoidPose();
    this.vrm.scene.position.set(0, 0, 0);
    this.vrm.scene.rotation.set(0, 0, 0);
    this.vrm.update(0);
    this.refreshWorld();
    const hips = this.worldPos("hips", new THREE37.Vector3());
    const shoulder = this.worldPos("leftUpperArm", new THREE37.Vector3());
    const box = new THREE37.Box3().setFromObject(this.vrm.scene);
    return {
      upperArmLen: len("leftLowerArm"),
      foreArmLen: len("leftHand"),
      thighLen: len("leftLowerLeg"),
      shinLen: len("leftFoot"),
      shoulderUp: Math.max(0.25, shoulder.y - hips.y),
      shoulderHalfWidth: Math.max(0.05, Math.abs(shoulder.x - hips.x)),
      hipsY: Math.max(0.3, hips.y),
      statureM: Number.isFinite(box.max.y) ? Math.max(0.5, box.max.y) : 1.6
    };
  }
  /**
   * Ankle -> visible sole distance per side, measured with the foot FLATTENED.
   *
   * The previous version subtracted the whole-scene bbox minimum in the rest
   * pose. That bbox is not the sole: the rest pose is plantarflexed (the toe tip
   * is the lowest point) and this avatar even has a vertex 5.5 cm below the
   * shoes in the binding pose. The result (0.1469 m) told `legIK` to hold the
   * ankle 14.7 cm above the floor; with the visible sole only ~0.09 m below the
   * ankle, the avatar floated 5.3 cm with the gate reporting 2.9 mm.
   *
   * After `flattenFoot` the sole is horizontal, so the measured ankle->sole
   * distance is the value the IK must hold. `legIK` still re-measures the sole
   * every frame and corrects the ankle by the residual (orientation drift).
   */
  measureGroundOffsets() {
    this.resetHumanoidPose();
    this.vrm.scene.position.set(0, 0, 0);
    this.vrm.scene.rotation.set(0, 0, 0);
    this.vrm.update(0);
    this.refreshWorld();
    for (const side of ["left", "right"]) {
      const foot = this.bone(`${side}Foot`);
      if (foot) this.flattenFoot(side, foot);
    }
    this.vrm.update(0);
    this.refreshWorld();
    for (const side of ["left", "right"]) {
      const foot = this.bone(`${side}Foot`);
      const toes = this.bone(`${side}Toes`);
      const sole = this.sampleSole(side);
      const ankleY = foot ? foot.getWorldPosition(this.tmp).y : null;
      const toeY = toes ? toes.getWorldPosition(new THREE37.Vector3()).y : null;
      if (sole && ankleY !== null) {
        const offset = ankleY - sole.y;
        if (Number.isFinite(offset) && offset > 0.02 && offset < 0.25) this.flatSoleOffset[side] = round4(offset);
      }
      if (sole && toeY !== null) {
        const offset = toeY - sole.y;
        if (Number.isFinite(offset) && offset > 5e-3 && offset < 0.2) this.toeOffset = round4(offset);
      }
    }
    this.soleOffset = Math.max(this.flatSoleOffset.left, this.flatSoleOffset.right);
    this.corrections.clear();
  }
  /**
   * Collect the visible shoe vertices per side. The body's seven glTF primitives
   * share one position buffer, so only the vertices the Shoes primitive actually
   * DRAWS (its index buffer) are collected.
   */
  prepareFootSamples() {
    const meshes = [];
    this.vrm.scene.traverse((o) => {
      if (o.isSkinnedMesh) meshes.push(o);
    });
    if (meshes.length === 0) return;
    this.resetHumanoidPose();
    this.vrm.scene.position.set(0, 0, 0);
    this.vrm.scene.rotation.set(0, 0, 0);
    this.vrm.update(0);
    this.vrm.scene.updateMatrixWorld(true);
    const MAX_SOLE_VERTICES = 96;
    for (const mesh of meshes) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const material = mats.map((m) => m?.name ?? "").join("|");
      if (!/Shoes_01_CLOTH/i.test(material)) continue;
      const geo = mesh.geometry;
      const pos = geo.getAttribute("position");
      const si = geo.getAttribute("skinIndex");
      const sw = geo.getAttribute("skinWeight");
      if (!pos || !si || !sw) continue;
      const index = geo.getIndex();
      const referenced = new Uint8Array(pos.count);
      if (index) {
        for (let k = 0; k < index.count; k += 1) referenced[index.getX(k)] = 1;
      } else {
        referenced.fill(1);
      }
      const bones = mesh.skeleton?.bones ?? [];
      const bySide = { left: [], right: [] };
      for (let i = 0; i < pos.count; i += 1) {
        if (!referenced[i]) continue;
        let best = -1;
        let bestW = -1;
        for (let k = 0; k < 4; k += 1) {
          const w = sw.getComponent(i, k);
          if (w > bestW) {
            bestW = w;
            best = si.getComponent(i, k);
          }
        }
        const name = (bones[best]?.name ?? "").toLowerCase();
        if (name.includes("l_foot") || name.includes("l_toe")) bySide.left.push(i);
        else if (name.includes("r_foot") || name.includes("r_toe")) bySide.right.push(i);
      }
      for (const side of ["left", "right"]) {
        const indices = bySide[side];
        if (indices.length === 0) continue;
        const stride = Math.max(1, Math.ceil(indices.length / MAX_SOLE_VERTICES));
        const capped = indices.filter((_, i) => i % stride === 0);
        this.soleSamples[side].push({ mesh, indices: capped });
        this.soleVertexCount[side] += capped.length;
      }
    }
  }
  /** Lowest visible shoe vertex of one foot (the sole that touches the floor). */
  sampleSole(side) {
    let lowest = null;
    for (const entry of this.soleSamples[side]) {
      if (entry.indices.length === 0) continue;
      entry.mesh.skeleton.update();
      for (const index of entry.indices) {
        entry.mesh.getVertexPosition(index, this.tmp);
        this.tmp.applyMatrix4(entry.mesh.matrixWorld);
        if (!lowest || this.tmp.y < lowest.y) lowest = this.tmp.clone();
      }
    }
    return lowest;
  }
  /** Standing hip height with the scene at the origin (metres). */
  measureStandingHip() {
    this.resetHumanoidPose();
    this.vrm.scene.position.set(0, 0, 0);
    this.vrm.scene.rotation.set(0, 0, 0);
    this.vrm.update(0);
    this.refreshWorld();
    this.profile.standingHipY = this.worldPos("hips", new THREE37.Vector3()).y;
  }
  /**
   * Calibrate the CHARACTER side of the seat contract: how far the hip joint
   * sits above the buttock support point when this avatar is in its seated pose.
   *
   * Measured, not configured: the seated clip is evaluated once (weight 1, mid
   * loop), the fixed pelvis patch is sampled, and the offset along the up axis
   * is recorded with its source and vertex count. The earlier passes treated
   * the *furniture's* authored point as if it were this offset, which is why a
   * body that "held" the seat contact sat 7.5 cm inside the cushion.
   */
  calibrateSeatedProfile() {
    const seated = this.actions.get(SEATED_CLIP);
    if (!seated || this.pelvisSamples.length === 0) {
      this.profile.supportSource = "rest-pose-default";
      this.profile.seatedHipOffsetM = 0.055;
      return;
    }
    this.mixer.stopAllAction();
    seated.reset();
    seated.setLoop(THREE37.LoopRepeat, Infinity);
    seated.setEffectiveWeight(1);
    seated.setEffectiveTimeScale(0);
    seated.play();
    this.mixer.update(0.7);
    this.vrm.scene.position.set(0, 0, 0);
    this.vrm.scene.rotation.set(0, 0, 0);
    this.vrm.update(0);
    this.refreshWorld();
    const support = this.samplePelvis();
    const hips = this.worldPos("hips", new THREE37.Vector3());
    if (support) {
      const offset = hips.y - support.y;
      if (Number.isFinite(offset) && offset > 5e-3 && offset < 0.2) {
        this.profile.seatedHipOffsetM = Math.round(offset * 1e4) / 1e4;
        this.profile.supportSource = "calibrated-seated-clip";
      }
    }
    this.profile.supportVertices = this.pelvisVertexCount;
    seated.stop();
    this.mixer.stopAllAction();
    this.resetHumanoidPose();
    this.vrm.update(0);
  }
  /** Foot XZ in world space right now (for transition step starts). */
  footXZ(side) {
    const p = this.worldPos(`${side}Foot`, new THREE37.Vector3());
    return { x: p.x, z: p.z };
  }
  /**
   * Declared foot spots for a seated / standing pose. The interaction declares
   * the seated ones; the standing ones are the declared stand position (seat +
   * lateral exit) with the stance width taken from the avatar's own foot
   * spread, which is why they are measured from the current pose instead of
   * invented.
   */
  footSpotsFor(target, standing) {
    if (standing && target.descentPath) return symmetricFootSpots(this.standExit(target), target.seatFacing, 0.12);
    if (!standing) return seatedFootSpots({ seat: target.seat, seatFacing: target.seatFacing, footTargets: target.footTargets });
    const lat = { x: Math.cos(target.seatFacing), z: -Math.sin(target.seatFacing) };
    const likeLeft = this.footXZ("left");
    const likeRight = this.footXZ("right");
    const stanceL = Math.abs((likeLeft.x - likeRight.x) * lat.x + (likeLeft.z - likeRight.z) * lat.z);
    const half = Math.max(0.08, stanceL / 2);
    return symmetricFootSpots(this.standExit(target), target.seatFacing, half);
  }
  /**
   * Collect the skinned vertices whose DOMINANT joint is the hand bone, per
   * side: that is the visible palm. The previous sampler took every vertex
   * within 13 cm of the wrist joint, which in the rest pose is mostly FOREARM
   * (audited: 95/256 forearm, 4/256 hand) — so "the palm" was measured on the
   * forearm and the reported drop changed from 2.3 cm to 8 cm between poses.
   */
  preparePalmSamples() {
    const meshes = [];
    this.vrm.scene.traverse((o) => {
      if (o.isSkinnedMesh) meshes.push(o);
    });
    if (meshes.length === 0) return;
    this.resetHumanoidPose();
    this.vrm.scene.updateMatrixWorld(true);
    for (const mesh of meshes) mesh.skeleton?.update();
    for (const side of ["left", "right"]) {
      const hand = this.bone(`${side}Hand`);
      if (!hand) continue;
      const handWorld = hand.getWorldPosition(new THREE37.Vector3());
      const samples = [];
      let count = 0;
      for (const mesh of meshes) {
        const geo = mesh.geometry;
        const pos = geo.getAttribute("position");
        const skinIndex = geo.getAttribute("skinIndex");
        const skinWeight = geo.getAttribute("skinWeight");
        if (!pos || !skinIndex || !skinWeight) continue;
        const bones = mesh.skeleton?.bones ?? [];
        const indices = [];
        const stride = Math.max(1, Math.floor(pos.count / 2e4));
        for (let i = 0; i < pos.count; i += stride) {
          let best = -1;
          let bestW = -1;
          for (let k = 0; k < 4; k += 1) {
            const w = skinWeight.getComponent(i, k);
            if (w > bestW) {
              bestW = w;
              best = skinIndex.getComponent(i, k);
            }
          }
          if (best < 0) continue;
          if (handRegion(bones[best]?.name ?? "", side) !== "palm") continue;
          mesh.getVertexPosition(i, this.tmp);
          this.tmp.applyMatrix4(mesh.matrixWorld);
          if (this.tmp.distanceTo(handWorld) > 0.17) continue;
          indices.push(i);
        }
        if (indices.length === 0) continue;
        const stride2 = Math.max(1, Math.ceil(indices.length / MAX_PALM_VERTICES));
        const capped = indices.filter((_, i) => i % stride2 === 0);
        samples.push({ mesh, indices: capped });
        count += capped.length;
      }
      this.palmSamples[side] = samples;
      this.palmVertexCount[side] = count;
    }
    const hipWorld = this.worldPos("hips", new THREE37.Vector3());
    const relYs = [];
    const relZs = [];
    for (const mesh of meshes) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const fill = mats.find((m) => m && m.name && !/outline/i.test(m.name)) ?? mats[0];
      if (!/SKIN/.test(fill?.name ?? "")) continue;
      const geo = mesh.geometry;
      const pos = geo.getAttribute("position");
      const skinIndex = geo.getAttribute("skinIndex");
      const skinWeight = geo.getAttribute("skinWeight");
      if (!pos || !skinIndex || !skinWeight) continue;
      const bones = mesh.skeleton?.bones ?? [];
      const indices = [];
      const stride = Math.max(1, Math.floor(pos.count / 2e4));
      for (let i = 0; i < pos.count; i += stride) {
        let best = -1;
        let bestW = -1;
        for (let k = 0; k < 4; k += 1) {
          const w = skinWeight.getComponent(i, k);
          if (w > bestW) {
            bestW = w;
            best = skinIndex.getComponent(i, k);
          }
        }
        if (best < 0) continue;
        const name = (bones[best]?.name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!name.includes("hips")) continue;
        mesh.getVertexPosition(i, this.tmp);
        this.tmp.applyMatrix4(mesh.matrixWorld);
        const relX = this.tmp.x - hipWorld.x;
        const relY = this.tmp.y - hipWorld.y;
        const relZ = this.tmp.z - hipWorld.z;
        if (relY > -0.02 || relY < -0.16) continue;
        if (relZ < 0) continue;
        if (Math.abs(relX) > 0.13) continue;
        relYs.push(relY);
        relZs.push(relZ);
        indices.push(i);
      }
      if (indices.length === 0) continue;
      const stride2 = Math.max(1, Math.ceil(indices.length / MAX_PALM_VERTICES));
      const capped = indices.filter((_, i) => i % stride2 === 0);
      this.pelvisSamples.push({ mesh, indices: capped });
      this.pelvisAudit.meshes.push({ mesh: mesh.name, vertices: capped.length });
    }
    this.pelvisVertexCount = this.pelvisSamples.reduce((n, entry) => n + entry.indices.length, 0);
    for (const mesh of meshes) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const fill = mats.find((m) => m && m.name && !/outline/i.test(m.name)) ?? mats[0];
      if (!/SKIN/.test(fill?.name ?? "")) continue;
      const geo = mesh.geometry;
      const pos = geo.getAttribute("position");
      const skinIndex = geo.getAttribute("skinIndex");
      const skinWeight = geo.getAttribute("skinWeight");
      if (!pos || !skinIndex || !skinWeight) continue;
      const bones = mesh.skeleton?.bones ?? [];
      const indices = [];
      for (let i = 0; i < pos.count; i += 1) {
        let best = -1;
        let bestW = -1;
        for (let k = 0; k < 4; k += 1) {
          const w = skinWeight.getComponent(i, k);
          if (w > bestW) {
            bestW = w;
            best = skinIndex.getComponent(i, k);
          }
        }
        if (best < 0) continue;
        const name = (bones[best]?.name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!name.includes("hips") && !name.includes("upperleg")) continue;
        mesh.getVertexPosition(i, this.tmp);
        this.tmp.applyMatrix4(mesh.matrixWorld);
        const relY = this.tmp.y - hipWorld.y;
        if (relY > -0.02 || relY < -0.32) continue;
        const radialXZ = Math.hypot(this.tmp.x - hipWorld.x, this.tmp.z - hipWorld.z);
        if (radialXZ > 0.15) continue;
        indices.push(i);
      }
      if (indices.length > 0) this.seatSkinSamples.push({ mesh, indices });
    }
    this.seatSkinVertexCount = this.seatSkinSamples.reduce((n, entry) => n + entry.indices.length, 0);
    if (relYs.length > 0) {
      const sorted = [...relYs].sort((a, b) => a - b);
      const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)))];
      this.pelvisAudit.minRelY = round4(at(0) ?? 0);
      this.pelvisAudit.medianRelY = round4(at(0.5) ?? 0);
      this.pelvisAudit.minRelZ = round4(Math.min(...relZs));
      this.pelvisAudit.maxRelZ = round4(Math.max(...relZs));
    }
  }
  /** Lowest visible pelvis vertex (the part that touches the seat). */
  samplePelvis() {
    return this.samplePelvisSupport()?.point ?? null;
  }
  /**
   * The seat support sample: the lowest visible pelvis vertex that ACTUALLY
   * projects onto the cushion.
   *
   * Measuring the lowest vertex of the patch regardless of where it projects
   * was the deep defect of the previous pass: with the body seated the lowest
   * hips-dominant vertex can be a crotch/thigh vertex hanging 5-10 cm below the
   * buttocks, and if it is outside the pad rectangle the "penetration" number is
   * measured at a point that is beside the chair, not on it. The feedback loop
   * then pushed the real buttocks into the cushion to satisfy a phantom contact.
   * Vertices outside the footprint are rejected and counted, never used.
   */
  samplePelvisSupport() {
    const points = [];
    const keys = [];
    for (const entry of this.pelvisSamples) {
      if (entry.indices.length === 0) continue;
      entry.mesh.skeleton.update();
      for (const index of entry.indices) {
        entry.mesh.getVertexPosition(index, this.tmp);
        this.tmp.applyMatrix4(entry.mesh.matrixWorld);
        points.push({ x: this.tmp.x, y: this.tmp.y, z: this.tmp.z });
        if (this.traceSeat) keys.push(`${entry.mesh.name}#${index}`);
      }
    }
    if (points.length === 0) return null;
    const rect2 = this.target?.seatRect;
    const normal = this.seatPlane?.normal ?? { x: 0, y: 1, z: 0 };
    if (!rect2) {
      let lowest = null;
      for (const p of points) if (!lowest || p.y < lowest.y) lowest = p;
      return lowest ? { point: new THREE37.Vector3(lowest.x, lowest.y, lowest.z), inside: points.length, outside: 0 } : null;
    }
    const sample = lowestSupportInsideFootprint(points, rect2, normal);
    this.pelvisAudit.insideCount = sample?.inside ?? 0;
    this.pelvisAudit.outsideCount = sample?.outside ?? points.length;
    if (!sample) return null;
    return { point: new THREE37.Vector3(sample.point.x, sample.point.y, sample.point.z), inside: sample.inside, outside: sample.outside };
  }
  /**
   * Whether the settled whole-skin patch owns the plant. During the clip→seated
   * cross-fade the seated action still has a partial weight and the pose is in
   * flight; the landing (buttock) patch owns the plant until the seated clip is
   * fully in. After that the actual skin patch owns it, so the r11 5.9 mm
   * upper-leg compression is measured and lifted.
   */
  seatedSkinPlantActive() {
    if (this.transition) return false;
    const weight = this.base?.getEffectiveWeight?.() ?? 1;
    return weight > 0.995;
  }
  /**
   * Landing contact for the DESCENT: the lowest skin vertex of the buttock
   * patch against the exact local cushion top.
   *
   * The descent clip holds the body above the seat and its legs are in flight;
   * enforcing the whole thigh skin there would hold the body 20 cm above the
   * chair (measured: the mid-thigh passes through the seat while the clip is
   * still standing over it). The landing constraint therefore asks the landing
   * question — the buttocks — on the same exact surface, while the settled
   * contact below uses the full skin patch. The independent whole-body audit
   * still reports the flight geometry; nothing is hidden from it.
   */
  samplePelvisSupportOnCushion() {
    const cushion = this.seatCushion;
    if (!cushion || this.pelvisSamples.length === 0) return null;
    const rect2 = cushion.rect;
    const points = [];
    for (const entry of this.pelvisSamples) {
      if (entry.indices.length === 0) continue;
      entry.mesh.skeleton?.update();
      for (const index of entry.indices) {
        entry.mesh.getVertexPosition(index, this.tmp);
        this.tmp.applyMatrix4(entry.mesh.matrixWorld);
        if (this.tmp.x < rect2.minX - 0.02 || this.tmp.x > rect2.maxX + 0.02) continue;
        if (this.tmp.z < rect2.minZ - 0.02 || this.tmp.z > rect2.maxZ + 0.02) continue;
        if (this.tmp.y > cushion.topY + 0.06 || this.tmp.y < cushion.bottomY - 0.02) continue;
        points.push({ x: this.tmp.x, y: this.tmp.y, z: this.tmp.z, key: `${entry.mesh.name}#${index}` });
      }
    }
    return lowestSupportOnCushion(points, cushion);
  }
  /**
   * Unified seat-contact sample (r12): the deepest SKIN point of the support
   * patch relative to the seat's EXACT local cushion top.
   *
   * This replaces the single lowest hips-only vertex measured against a plane.
   * The patch is every skin vertex dominated by the hips or an upper leg; the
   * surface is the same `buildSeatCushionField` the cloth solver uses. The
   * returned point is what the plant lifts, what the descent constraint holds,
   * and what the contact gate reads, so all three cannot disagree again.
   */
  sampleSeatSkinSupport() {
    const cushion = this.seatCushion;
    if (this.seatSkinSamples.length === 0) return null;
    if (!cushion) {
      const plane = this.seatPlane;
      const rect3 = this.target?.seatRect;
      if (!plane || !rect3) return null;
      const flat = [];
      for (const entry of this.seatSkinSamples) {
        if (entry.indices.length === 0) continue;
        entry.mesh.skeleton?.update();
        for (const index of entry.indices) {
          entry.mesh.getVertexPosition(index, this.tmp);
          this.tmp.applyMatrix4(entry.mesh.matrixWorld);
          flat.push({ x: this.tmp.x, y: this.tmp.y, z: this.tmp.z, key: `${entry.mesh.name}#${index}` });
        }
      }
      return lowestSupportAgainstPlane(flat, rect3, plane);
    }
    const rect2 = cushion.rect;
    const points = [];
    for (const entry of this.seatSkinSamples) {
      if (entry.indices.length === 0) continue;
      entry.mesh.skeleton?.update();
      for (const index of entry.indices) {
        entry.mesh.getVertexPosition(index, this.tmp);
        this.tmp.applyMatrix4(entry.mesh.matrixWorld);
        if (this.tmp.x < rect2.minX - 0.02 || this.tmp.x > rect2.maxX + 0.02) continue;
        if (this.tmp.z < rect2.minZ - 0.02 || this.tmp.z > rect2.maxZ + 0.02) continue;
        if (this.tmp.y > cushion.topY + 0.06 || this.tmp.y < cushion.bottomY - 0.02) continue;
        points.push({ x: this.tmp.x, y: this.tmp.y, z: this.tmp.z, key: `${entry.mesh.name}#${index}` });
      }
    }
    return lowestSupportOnCushion(points, cushion);
  }
  /** Wrist joint → lowest visible palm vertex in the rest pose (metres). */
  measurePalmLift() {
    this.resetHumanoidPose();
    this.vrm.scene.position.set(0, 0, 0);
    this.vrm.scene.rotation.set(0, 0, 0);
    this.vrm.update(0);
    this.refreshWorld();
    for (const side of ["left", "right"]) {
      const hand = this.bone(`${side}Hand`);
      const palm = this.samplePalm(side);
      if (!hand || !palm) continue;
      const wristY = hand.getWorldPosition(new THREE37.Vector3()).y;
      this.palmLift[side] = Math.max(0.015, Math.min(0.1, wristY - palm.y));
    }
  }
  samplePalm(side) {
    let lowest = null;
    for (const entry of this.palmSamples[side]) {
      if (entry.indices.length === 0) continue;
      entry.mesh.skeleton.update();
      for (const index of entry.indices) {
        entry.mesh.getVertexPosition(index, this.tmp);
        this.tmp.applyMatrix4(entry.mesh.matrixWorld);
        if (!lowest || this.tmp.y < lowest.y) {
          lowest = new THREE37.Vector3(this.tmp.x, this.tmp.y, this.tmp.z);
        }
      }
    }
    return lowest;
  }
  // --- pose -------------------------------------------------------------------
  playBase(name, fade) {
    const action = this.actions.get(name) ?? this.bakedActions.get(name)?.action ?? null;
    if (!action) return;
    if (this.base === action) return;
    action.reset();
    action.setLoop(THREE37.LoopRepeat, Infinity);
    action.setEffectiveWeight(1);
    action.setEffectiveTimeScale(1);
    action.play();
    if (this.base && fade > 0) this.base.crossFadeTo(action, fade, false);
    this.base = action;
  }
  playOverlay(name, weight) {
    const action = this.actions.get(name) ?? this.bakedActions.get(name)?.action ?? null;
    if (!action) return;
    if (this.overlay === action) return;
    this.stopOverlay();
    action.reset();
    action.setLoop(THREE37.LoopRepeat, Infinity);
    action.setEffectiveWeight(weight);
    action.play();
    this.overlay = action;
    this.debugCounters.overlays += 1;
  }
  stopOverlay() {
    if (this.overlay) {
      this.overlay.fadeOut(0.25);
      this.overlay = null;
    }
  }
  crossFadeTo(action, fade) {
    if (this.base && this.base !== action) this.base.crossFadeTo(action, fade, false);
    action.play();
  }
  resetHumanoidPose() {
    for (const name of BONE_NAMES) {
      const node = this.bone(name);
      if (!node) continue;
      node.rotation.set(0, 0, 0);
      const rest = this.restPosition.get(name);
      if (rest) node.position.copy(rest);
    }
  }
  /**
   * Unwind last frame's procedural corrections. MUST run BEFORE mixer.update:
   *
   *   - a bone no clip animates keeps our write, so the exact inverse puts it
   *     back on the base pose;
   *   - a bone the clip animates is overwritten by the mixer immediately after,
   *     so the inverse is a harmless no-op that the clip then replaces.
   *
   * Running it after the mixer (what the previous pass did) subtracted the delta
   * from the CLIP value for every animated bone, i.e. it drove the rig by −delta
   * per frame: a silent drift that surfaced as a 39 cm collapse once a
   * measurement-based vertical correction was added to the chain.
   */
  beginCorrections() {
    for (const [name, entry] of this.corrections) {
      const bone = this.bone(name);
      if (!bone) continue;
      if (entry.q) bone.quaternion.premultiply(entry.q.clone().invert());
      if (entry.p) bone.position.sub(entry.p);
    }
    this.corrections.clear();
  }
  /** Premultiply a world-frame rotation delta on a bone and remember it. */
  addQuat(name, delta) {
    const bone = this.bone(name);
    if (!bone) return;
    bone.quaternion.premultiply(delta);
    const entry = this.corrections.get(name) ?? { q: null, p: null };
    entry.q = entry.q ? delta.clone().multiply(entry.q) : delta.clone();
    this.corrections.set(name, entry);
  }
  /** Add a parent-frame position delta on a bone and remember it. */
  addPos(name, delta) {
    const bone = this.bone(name);
    if (!bone) return;
    bone.position.add(delta);
    const entry = this.corrections.get(name) ?? { q: null, p: null };
    entry.p = entry.p ? entry.p.add(delta) : delta.clone();
    this.corrections.set(name, entry);
  }
  refreshWorld() {
    const root = this.vrm.humanoid.normalizedHumanBonesRoot;
    root.updateWorldMatrix(true, true);
    this.vrm.scene.updateMatrixWorld(true);
  }
  worldPos(name, out = this.tmp) {
    const node = this.bone(name);
    if (!node) return out.set(0, 0, 0);
    return node.getWorldPosition(out);
  }
  applyStandingGround(_h) {
    if (this.standingFootTargets) {
      for (const side of ["left", "right"]) this.legIK(side, this.standingFootTargets[side]);
      this.solveStandingContacts(this.standingFootTargets);
      this.sceneOffsetY = this.vrm.scene.position.y;
      return;
    }
    this.refreshWorld();
    this.vrm.update(0);
    this.refreshWorld();
    const lSole = this.sampleSole("left");
    const rSole = this.sampleSole("right");
    const lf = lSole ? lSole.y : this.worldPos("leftFoot", this.tmp).y - this.flatSoleOffset.left;
    const rf = rSole ? rSole.y : this.worldPos("rightFoot", this.tmp2).y - this.flatSoleOffset.right;
    const minSole = Math.min(lf, rf);
    const target = THREE37.MathUtils.clamp(this.floorY - minSole, -0.12, 0.06);
    this.sceneOffsetY += (target - this.sceneOffsetY) * Math.min(1, Math.max(0.05, _h * 12));
    this.vrm.scene.position.set(this.carrier.pos.x, this.sceneOffsetY, this.carrier.pos.z);
  }
  /**
   * Plant the VISIBLE pelvis support on the cushion, exactly, on the CURRENT
   * synced pose.
   *
   * This replaces the delayed feedback loop of the previous pass. That loop
   * measured the skinned pelvis BEFORE vrm.update() copied the normalized pose
   * onto the raw bones (so it acted on the previous frame), chased the seated
   * clip's own ±1.5 cm pelvis sway with a 0.25 gain and a ±3 cm clamp, and ended
   * up injecting a 3 cm body bob of its own while still reporting a 7.3 mm
   * penetration. The perturbation test (lift the hips 1 cm -> the skin moves
   * 1 cm the same way) proves the actuator is exact and 1:1, so the correct
   * structure is not a gain but a measurement: sync the raw skeleton, measure the
   * support, move the body by exactly the residual, sync again.
   *
   * Returns the correction applied along the seat normal (metres, + = up).
   */
  plantSupport(targetAbovePlane = SEAT_PLANT_M) {
    const plane = this.seatPlane;
    const hips = this.bone("hips");
    if (!plane || !hips || !this.seatTrimEnabled) return 0;
    this.vrm.update(0);
    this.refreshWorld();
    const stable = this.samplePelvisSupportOnCushion();
    let support = stable;
    if (stable && this.skinPlantEnabled && this.seatedSkinPlantActive()) {
      if (!this.extendedPlantLatched && Math.abs(stable.signed - targetAbovePlane) <= 3e-3) {
        this.extendedPlantLatched = true;
      }
      if (this.extendedPlantLatched) {
        const extended = this.sampleSeatSkinSupport();
        if (extended && extended.inBand !== false) support = extended;
      }
    }
    if (!support) return 0;
    this.lastPreSeat = {
      hipsY: this.worldPos("hips", new THREE37.Vector3()).y,
      supportY: support.point.y,
      err: support.signed,
      ...support.key ? { key: support.key } : {},
      point: { x: support.point.x, y: support.point.y, z: support.point.z }
    };
    const plan = planSeatPlant(support, targetAbovePlane, SEAT_PLANT_MAX_M);
    this.supportLoop.calls += 1;
    this.supportLoop.lastErr = round4(support.signed);
    if (plan.reason === "OUT_OF_RANGE") {
      this.transitionError = "SEAT_PLANT_OUT_OF_RANGE";
      return 0;
    }
    if (plan.reason === "NO_SAMPLE") return 0;
    let delta = plan.deltaM;
    if (Number.isFinite(this.plantStepBudgetM)) {
      const cap = this.plantStepBudgetM;
      delta = Math.max(-cap, Math.min(cap, delta));
      this.plantStepBudgetM = Math.max(0, cap - Math.abs(delta));
      if (Math.abs(delta) < 1e-6) return 0;
    }
    if (Math.abs(delta) <= 1e-4) {
      this.lastSupportErr = round4(support.signed);
      return 0;
    }
    if (Math.abs(plane.normal.y) >= 0.9) {
      this.seatedSceneY += delta / plane.normal.y;
      this.vrm.scene.position.y = this.seatedSceneY;
    } else {
      const n = new THREE37.Vector3(plane.normal.x, plane.normal.y, plane.normal.z).multiplyScalar(delta);
      this.addPos("hips", n.applyQuaternion(parentWorldQuat(hips).invert()));
    }
    this.vrm.update(0);
    this.refreshWorld();
    if (this.plantLog.length < 120) {
      this.plantLog.push({
        err: round4(support.signed),
        delta: round4(delta),
        hipsY: round4(this.lastPreSeat.hipsY),
        hipsYAfter: round4(this.worldPos("hips", new THREE37.Vector3()).y),
        supportY: round4(support.point.y),
        sceneY: round4(this.seatedSceneY),
        ...support.key ? { key: support.key } : {},
        x: round4(support.point.x),
        z: round4(support.point.z)
      });
    }
    this.lastSupportErr = round4(support.signed + delta);
    this.seatCorrectionM = round4(delta);
    this.supportLoop.corrections += 1;
    this.supportLoop.lastCorr = round4(delta);
    return delta;
  }
  applySeatedPose() {
    const target = this.target;
    if (!target) return;
    this.vrm.scene.position.set(this.carrier.pos.x, this.seatedSceneY, this.carrier.pos.z);
    this.vrm.scene.rotation.set(0, this.carrier.yaw + Math.PI, 0);
    this.refreshWorld();
    const hipsBone = this.bone("hips");
    const hipTarget = this.hipTarget;
    if (hipsBone && hipTarget) {
      const now = this.worldPos("hips", new THREE37.Vector3());
      const d = new THREE37.Vector3(hipTarget.x - now.x, 0, hipTarget.z - now.z).multiplyScalar(this.pinBlend);
      if (d.lengthSq() > 1e-12) {
        this.addPos("hips", d.applyQuaternion(parentWorldQuat(hipsBone).invert()));
        this.refreshWorld();
      }
    }
    const spots = this.footSpotsFor(target, false);
    const solveLegs = () => {
      this.legIK("left", this.seatedFootTargets?.left ?? { x: spots.left.x, z: spots.left.z, lift: 0 }, SEATED_KNEE_POLE_DOWN_M);
      this.legIK("right", this.seatedFootTargets?.right ?? { x: spots.right.x, z: spots.right.z, lift: 0 }, SEATED_KNEE_POLE_DOWN_M);
    };
    solveLegs();
    this.plantStepBudgetM = 15e-4;
    if (this.seatPlane && this.pinBlend > 0.99) {
      for (let pass = 0; pass < 3; pass += 1) {
        const delta = this.plantSupport();
        solveLegs();
        if (Math.abs(delta) < 2e-4) break;
      }
      this.plantSupport();
    }
    if (this.mode === "typing" && this.leanBlend > 0.01) {
      this.leanTorso(target.seatFacing);
      for (const side of ["left", "right"]) this.armToDeclaredPalm(side, target);
      this.fingerTap(target.seatFacing);
    } else if (this.mode === "device" && this.deviceReach) {
      this.leanTorso(target.seatFacing);
      this.solveDeviceReach();
    } else {
      this.palmNormalY.left = null;
      this.palmNormalY.right = null;
    }
  }
  /**
   * Declared forward lean as a WORLD-axis delta on the spine/chest, not
   * `rotation.x += ...`: the seated clip leaves the chest's Euler decomposition
   * near a wrap boundary (measured rotation.x ~35 rad), where adding a small
   * angle rotated the torso backwards by ~90 deg instead of leaning it forward.
   */
  leanTorso(yaw) {
    const lateral = new THREE37.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    for (const [name, share] of [["spine", 0.65], ["chest", 0.35]]) {
      const bone = this.bone(name);
      if (!bone) continue;
      const q = new THREE37.Quaternion().setFromAxisAngle(lateral, this.leanRad * share * this.leanBlend);
      this.addQuat(name, worldToLocalRotation(q, parentWorldQuat(bone)));
      this.refreshWorld();
    }
  }
  /**
   * Solve the declared hand onto the appliance contact, easing from the hand's
   * position at reach start to the FIXED contact point and back. The palm point
   * (visible skin) is what the adapter's contact gate measures.
   */
  solveDeviceReach() {
    const dr = this.deviceReach;
    if (!dr) return;
    const side = dr.side;
    const hand = this.bone(`${side}Hand`);
    if (!hand) return;
    if (!dr.contact) return;
    const contact = dr.contact.clone();
    const palmNow = this.samplePalm(side);
    if (!dr.start && palmNow) dr.start = palmNow.clone();
    const start = dr.start ?? contact.clone();
    const w = dr.weight * dr.weight * (3 - 2 * dr.weight);
    const declared = start.clone().lerp(contact, w);
    const desired = dr.standing && dr.normal ? desiredGraspFrame({ x: dr.normal.x, y: dr.normal.y, z: dr.normal.z }) : desiredTypingFrame(dr.device?.facingYawRad ?? 0, dr.device?.pitchRad ?? 0);
    this.armToPalm(side, declared, desired, dr.weight);
    const palm = this.samplePalm(side);
    dr.palmError = palm ? round4(palm.distanceTo(contact)) : null;
  }
  /**
   * Put the VISIBLE PALM on the declared key point.
   *
   * The contact is a palm point, so the hand has to be oriented first (fingers
   * along the seat facing, palm down — derived from the measured finger and
   * thumb bone axes, not a tuned Euler angle) and the wrist then solved from
   * the rigid wrist->palm offset under that rotation. Two passes: the first
   * places the wrist and measures, the second corrects by the measured palm
   * error. The declared target never moves; if the arm is too short the IK
   * clamps at the real reach and the palm error stays visible in the gate.
   */
  armToDeclaredPalm(side, target) {
    const declared = toVec(target.handTargets[side]);
    const desired = desiredTypingFrame(target.seatFacing, TYPING_FINGER_PITCH);
    this.armToPalm(side, declared, desired);
  }
  /**
   * Put the VISIBLE PALM on a declared world point under a declared hand frame.
   * `weight` scales ONLY the hand orientation (used by the device reach ramp);
   * the wrist is solved from the measured palm error either way, so the point
   * that is reached is always the declared one.
   */
  armToPalm(side, declared, desired, weight = 1) {
    const hand = this.bone(`${side}Hand`);
    if (!hand) return;
    const diag = this.armDiagnostics[side];
    let wristTarget = new THREE37.Vector3(declared.x, declared.y + Math.max(0.02, this.palmLift[side]), declared.z);
    for (let pass = 0; pass < 3; pass += 1) {
      this.armIK(side, wristTarget);
      this.orientHand(side, desired, weight);
      this.vrm.update(0);
      this.refreshWorld();
      const palm = this.samplePalm(side);
      const wrist = hand.getWorldPosition(new THREE37.Vector3());
      const normalY = this.measurePalmNormalY(side);
      this.palmNormalY[side] = normalY;
      diag.wristTarget = toPlain(wristTarget);
      diag.wristAchieved = toPlain(wrist);
      if (!palm) break;
      diag.palmOffsetLocal = toPlain(palm.clone().sub(wrist));
      const err = new THREE37.Vector3(declared.x - palm.x, declared.y - palm.y, declared.z - palm.z);
      diag.palmErrorM = round4(err.length());
      if (err.length() < 2e-3) break;
      wristTarget = wristTarget.clone().add(err);
    }
    const upper = this.bone(`${side}UpperArm`);
    if (upper) {
      const shoulder = upper.getWorldPosition(new THREE37.Vector3());
      const reach = (this.metrics.upperArmLen + this.metrics.foreArmLen) * 0.995;
      diag.shortfallM = round4(Math.max(0, shoulder.distanceTo(wristTarget) - reach));
    }
  }
  /**
   * Declared procedural typing motion: a small phased curl on the finger
   * segments. The project's baked typing clip carries no finger tracks (its 10
   * tracks are shoulders/neck/head/arms/hands, all overridden by the contact
   * solve), so without this the "typing" state is a static contact. Labelled as
   * procedural micro-motion, not a mocap typing performance.
   */
  fingerTap(yaw) {
    const lateral = new THREE37.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const fingers = ["Index", "Middle", "Ring", "Little"];
    for (const side of ["left", "right"]) {
      for (let i = 0; i < fingers.length; i += 1) {
        for (const [seg, amp] of [["Proximal", 0.09], ["Intermediate", 0.14]]) {
          const name = `${side}${fingers[i]}${seg}`;
          const bone = this.bone(name);
          if (!bone) continue;
          const phase = Math.sin(this.t * 7.2 + i * 1.25 + (side === "right" ? 0.7 : 0));
          const angle = Math.max(0, phase) * amp;
          if (angle < 1e-4) continue;
          const q = new THREE37.Quaternion().setFromAxisAngle(lateral, angle);
          this.addQuat(name, worldToLocalRotation(q, parentWorldQuat(bone)));
        }
      }
    }
    this.refreshWorld();
  }
  /** Rotate the hand so its measured frame matches the declared frame (weighted). */
  orientHand(side, desired, weight = 1) {
    const hand = this.bone(`${side}Hand`);
    const mid = this.bone(`${side}MiddleProximal`) ?? this.bone(`${side}MiddleIntermediate`);
    const thumb = this.bone(`${side}ThumbProximal`) ?? this.bone(`${side}ThumbMetacarpal`);
    if (!hand || !mid || !thumb) return;
    const wrist = hand.getWorldPosition(new THREE37.Vector3());
    const finger = mid.getWorldPosition(new THREE37.Vector3()).sub(wrist);
    const thumbDir = thumb.getWorldPosition(new THREE37.Vector3()).sub(wrist);
    let current;
    try {
      current = handFrame(toPlain(finger), toPlain(thumbDir), side);
    } catch {
      return;
    }
    const rot = frameRotation(current, desired);
    const q = matrixToQuaternion(rot);
    let delta = new THREE37.Quaternion(q.x, q.y, q.z, q.w);
    if (weight < 1) delta = delta.slerp(new THREE37.Quaternion(), 1 - Math.max(0, weight));
    this.addQuat(`${side}Hand`, worldToLocalRotation(delta, parentWorldQuat(hand)));
    this.refreshWorld();
  }
  /** World Y of the palm-facing normal measured from the posed bones. */
  measurePalmNormalY(side) {
    const hand = this.bone(`${side}Hand`);
    const mid = this.bone(`${side}MiddleProximal`) ?? this.bone(`${side}MiddleIntermediate`);
    const thumb = this.bone(`${side}ThumbProximal`) ?? this.bone(`${side}ThumbMetacarpal`);
    if (!hand || !mid || !thumb) return null;
    const wrist = hand.getWorldPosition(new THREE37.Vector3());
    try {
      const frame = handFrame(
        toPlain(mid.getWorldPosition(new THREE37.Vector3()).sub(wrist)),
        toPlain(thumb.getWorldPosition(new THREE37.Vector3()).sub(wrist)),
        side
      );
      return round4(frame.palm.y);
    } catch {
      return null;
    }
  }
  /**
   * Plant one foot. `override` moves the sole target in XZ and lifts it during a
   * declared step arc; without it the foot keeps the XZ the pose put it at and
   * only its HEIGHT is corrected (that is what keeps a seated clip's feet on
   * the floor without sliding them around).
   */
  legIK(side, override, poleDownM = 0.5) {
    const upper = this.bone(`${side}UpperLeg`);
    const lower = this.bone(`${side}LowerLeg`);
    const foot = this.bone(`${side}Foot`);
    if (!upper || !lower || !foot) return;
    const yaw = this.target?.seatFacing ?? 0;
    const fwd = new THREE37.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const lift = override?.lift ?? 0;
    const footNow = foot.getWorldPosition(new THREE37.Vector3());
    const contact = override?.contact;
    const offset = contact ? new THREE37.Vector3(contact.localOffset.x, contact.localOffset.y, contact.localOffset.z).applyQuaternion(new THREE37.Quaternion(contact.rawWorldQuaternion.x, contact.rawWorldQuaternion.y, contact.rawWorldQuaternion.z, contact.rawWorldQuaternion.w)) : null;
    const goalX = contact && offset ? contact.centroid.x - offset.x : override ? override.x : footNow.x;
    const goalZ = contact && offset ? contact.centroid.z - offset.z : override ? override.z : footNow.z;
    let targetY = contact && offset ? contact.centroid.y - offset.y + lift : this.floorY + Math.max(0.02, this.flatSoleOffset[side] * 0.98) + lift;
    for (let pass = 0; pass < 2; pass += 1) {
      const hip = upper.getWorldPosition(new THREE37.Vector3());
      const target = new THREE37.Vector3(goalX, targetY, goalZ);
      const pole = new THREE37.Vector3(hip.x + fwd.x * 0.6, hip.y - poleDownM, hip.z + fwd.z * 0.6);
      const sol = solveTwoBoneIK(hip, this.metrics.thighLen, this.metrics.shinLen, target, pole);
      if (!sol) return;
      this.debugCounters.legIk += 1;
      const kneeNow = lower.getWorldPosition(new THREE37.Vector3());
      const rot = rotationBetween(kneeNow.sub(hip).normalize(), sol.dir1);
      this.addQuat(`${side}UpperLeg`, worldToLocalRotation(rot, parentWorldQuat(upper)));
      this.refreshWorld();
      const ankleNow = foot.getWorldPosition(new THREE37.Vector3());
      const rot2 = rotationBetween(ankleNow.sub(sol.mid).normalize(), sol.dir2);
      this.addQuat(`${side}LowerLeg`, worldToLocalRotation(rot2, parentWorldQuat(lower)));
      this.refreshWorld();
      if (contact) {
        const q = contact.normalizedWorldQuaternion;
        const delta = new THREE37.Quaternion(q.x, q.y, q.z, q.w).multiply(foot.getWorldQuaternion(new THREE37.Quaternion()).invert());
        this.addQuat(`${side}Foot`, worldToLocalRotation(delta, parentWorldQuat(foot)));
      } else this.flattenFoot(side, foot);
      this.vrm.update(0);
      this.refreshWorld();
      const sole = this.sampleSole(side);
      if (!sole) break;
      const err = sole.y - (this.floorY + lift);
      if (Math.abs(err) <= 5e-4) break;
      targetY -= err;
    }
    this.vrm.update(0);
    this.refreshWorld();
  }
  flattenFoot(side, foot) {
    const toes = this.bone(`${side}Toes`);
    if (!toes) return;
    const footP = foot.getWorldPosition(new THREE37.Vector3());
    const toesP = toes.getWorldPosition(new THREE37.Vector3());
    const cur = toesP.sub(footP);
    if (cur.lengthSq() < 1e-8) return;
    cur.normalize();
    const want = new THREE37.Vector3(cur.x, 0, cur.z);
    if (want.lengthSq() < 1e-6) return;
    want.normalize();
    this.addQuat(`${side}Foot`, worldToLocalRotation(rotationBetween(cur, want), parentWorldQuat(foot)));
  }
  armIK(side, targetIn) {
    const upper = this.bone(`${side}UpperArm`);
    const lower = this.bone(`${side}LowerArm`);
    const hand = this.bone(`${side}Hand`);
    if (!upper || !lower || !hand) return;
    const sign = side === "left" ? -1 : 1;
    const shoulder = upper.getWorldPosition(new THREE37.Vector3());
    const target = targetIn.clone();
    const reach = (this.metrics.upperArmLen + this.metrics.foreArmLen) * 0.995;
    const d = shoulder.distanceTo(target);
    if (d > reach) target.sub(shoulder).multiplyScalar(reach / d).add(shoulder);
    const pole = new THREE37.Vector3(shoulder.x + sign * 0.22, shoulder.y - 0.45, shoulder.z - 0.06);
    const sol = solveTwoBoneIK(shoulder, this.metrics.upperArmLen, this.metrics.foreArmLen, target, pole);
    if (!sol) return;
    this.debugCounters.armIk += 1;
    const elbowNow = lower.getWorldPosition(new THREE37.Vector3());
    this.addQuat(`${side}UpperArm`, worldToLocalRotation(rotationBetween(elbowNow.sub(shoulder).normalize(), sol.dir1), parentWorldQuat(upper)));
    this.refreshWorld();
    const wristNow = hand.getWorldPosition(new THREE37.Vector3());
    this.addQuat(`${side}LowerArm`, worldToLocalRotation(rotationBetween(wristNow.sub(sol.mid).normalize(), sol.dir2), parentWorldQuat(lower)));
    this.refreshWorld();
  }
  buildFrame() {
    const v = (p) => ({ x: p.x, y: p.y, z: p.z });
    const leftPalm = this.samplePalms ? this.samplePalm("left") : null;
    const rightPalm = this.samplePalms ? this.samplePalm("right") : null;
    const leftSole = this.sampleSole("left");
    const rightSole = this.sampleSole("right");
    return {
      hips: v(this.worldPos("hips", new THREE37.Vector3())),
      leftFoot: v(this.worldPos("leftFoot", new THREE37.Vector3())),
      rightFoot: v(this.worldPos("rightFoot", new THREE37.Vector3())),
      leftToes: v(this.worldPos("leftToes", new THREE37.Vector3())),
      rightToes: v(this.worldPos("rightToes", new THREE37.Vector3())),
      leftHand: v(this.worldPos("leftHand", new THREE37.Vector3())),
      rightHand: v(this.worldPos("rightHand", new THREE37.Vector3())),
      leftShoulder: v(this.worldPos("leftUpperArm", new THREE37.Vector3())),
      rightShoulder: v(this.worldPos("rightUpperArm", new THREE37.Vector3())),
      soleOffsetM: this.soleOffset,
      toeOffsetM: this.toeOffset,
      leftSoleOffsetM: this.flatSoleOffset.left,
      rightSoleOffsetM: this.flatSoleOffset.right,
      leftSoleLow: leftSole ? v(leftSole) : null,
      rightSoleLow: rightSole ? v(rightSole) : null,
      leftPalmLow: leftPalm ? v(leftPalm) : null,
      rightPalmLow: rightPalm ? v(rightPalm) : null,
      leftPalmNormalY: this.palmNormalY.left,
      rightPalmNormalY: this.palmNormalY.right,
      pelvisLow: (() => {
        const p = this.samplePalms ? this.samplePelvis() : null;
        return p ? v(p) : null;
      })(),
      seatSkin: (() => {
        if (!this.seatCushion || !this.seated && !this.transition) return null;
        const s = this.samplePelvisSupportOnCushion();
        if (!s) return null;
        if (this.seated && !this.transition) this.lastSupportErr = round4(s.signed);
        return {
          point: { x: s.point.x, y: s.point.y, z: s.point.z },
          topY: s.topY,
          signed: s.signed,
          inside: s.inside,
          outside: s.outside,
          ...s.key ? { key: s.key } : {},
          ...s.deepSigned === void 0 ? {} : { deepSigned: s.deepSigned, deepCount: s.deepCount ?? 0 },
          ...s.inBand === false ? { inBand: false } : {}
        };
      })()
    };
  }
};
function toPlain(p) {
  return { x: p.x, y: p.y, z: p.z };
}
function footStepAt(step, u) {
  const span = Math.max(1e-6, step.t1 - step.t0);
  const k = Math.min(1, Math.max(0, (u - step.t0) / span));
  if (k <= 0) return { x: step.from.x, z: step.from.z, lift: 0 };
  if (k >= 1) return { x: step.to.x, z: step.to.z, lift: 0 };
  return {
    x: step.from.x + (step.to.x - step.from.x) * k,
    z: step.from.z + (step.to.z - step.from.z) * k,
    lift: Math.sin(Math.PI * k) * STEP_LIFT_M
  };
}
function round4(v) {
  return Math.round(v * 1e4) / 1e4;
}
function distance3(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
function toVec(v) {
  return new THREE37.Vector3(v.x, v.y, v.z);
}
function parentWorldQuat(node) {
  return node.parent ? node.parent.getWorldQuaternion(new THREE37.Quaternion()) : new THREE37.Quaternion();
}
function rotationBetween(a, b) {
  return new THREE37.Quaternion().setFromUnitVectors(a.clone().normalize(), b.clone().normalize());
}
function worldToLocalRotation(worldRot, parentWorld) {
  return parentWorld.clone().invert().multiply(worldRot).multiply(parentWorld).normalize();
}
function solveTwoBoneIK(origin, l1, l2, target, pole) {
  const d = target.clone().sub(origin);
  const dist = d.length();
  if (dist < 1e-5) return null;
  const D = Math.min(Math.max(dist, Math.abs(l1 - l2) + 1e-3), l1 + l2 - 1e-3);
  d.normalize();
  const a = (l1 * l1 - l2 * l2 + D * D) / (2 * D);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const midBase = origin.clone().addScaledVector(d, a);
  const side = pole.clone().sub(origin);
  side.addScaledVector(d, -side.dot(d));
  if (side.lengthSq() < 1e-5) {
    side.set(0, 1, 0).addScaledVector(d, -d.y);
    if (side.lengthSq() < 1e-5) side.set(1, 0, 0).addScaledVector(d, -d.x);
  }
  side.normalize();
  const hSigned = pole.clone().sub(origin).dot(side) >= 0 ? h : -h;
  const mid = midBase.addScaledVector(side, hSigned);
  return {
    mid: mid.clone(),
    dir1: mid.clone().sub(origin).normalize(),
    dir2: target.clone().sub(mid).normalize()
  };
}

// packages/npc-three/src/garmentProfile.ts
var AVATAR_GARMENT_PROFILE = {
  characterId: "avatar-vrm0x-sampleA",
  asset: "assets/models/avatar.vrm",
  regions: [
    {
      id: "avatar/bottoms/skirt",
      material: "F00_008_01_Bottoms_01_CLOTH",
      meshName: "Bodybaked_5",
      bones: ["J_Bip_C_Hips", "J_Bip_L_UpperLeg", "J_Bip_R_UpperLeg"],
      excludeBones: ["J_Bip_L_Foot", "J_Bip_R_Foot", "J_Bip_L_Toes", "J_Bip_R_Toes"],
      source: "VRM 0.x avatar.vrm, material F00_008_01_Bottoms_01_CLOTH (Body.baked primitive 5, 1624 tris / 971 used verts); dominant-bone survey 2026-10-25: hips 264, upper legs 149+149, lower legs 157+157, spine 33, feet 31+31; no skirt joint exists in the asset (secondary groups: bust, hood, hood strings, hair only)"
    }
  ],
  marginM: 2e-3,
  // Cap the corrective displacement at 5 cm. The deepest DRAWN penetration
  // measured on this avatar is 3.6 cm, so every opaque vertex is fully cleared
  // with margin; the alpha-clipped under-skirt (8.4 cm deep) is NOT drawn and is
  // deliberately not dragged 8 cm through the legs. Measured with 12 cm: visible
  // edge stretch 1.09 but a 1.92 stretch on the invisible lining; with 5 cm the
  // invisible distortion is bounded too.
  maxLiftM: 0.05,
  smoothIterations: 4,
  retractS: 0.3
};

// packages/npc-three/src/slice.ts
var seq = 0;
var nextId = (prefix) => `${prefix}-${++seq}`;
function vec3(p) {
  if (Array.isArray(p)) return { x: p[0], y: p[1], z: p[2] };
  return { x: p.x, y: p.y, z: p.z };
}
function hostLocal(point2, host, shiftZ = 0) {
  const px = Array.isArray(point2) ? point2[0] : point2.x;
  const py = Array.isArray(point2) ? point2[1] : point2.y;
  const pz = Array.isArray(point2) ? point2[2] : point2.z;
  const dx = px - host.position[0];
  const dz = pz - host.position[2] + shiftZ;
  const rad = host.yawDeg * Math.PI / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [Number((dx * c - dz * s).toFixed(4)), Number(py.toFixed(4)), Number((dx * s + dz * c).toFixed(4))];
}
function hostLocal3(point2, host) {
  const px = Array.isArray(point2) ? point2[0] : point2.x;
  const py = Array.isArray(point2) ? point2[1] : point2.y;
  const pz = Array.isArray(point2) ? point2[2] : point2.z;
  const dx = px - host.position[0];
  const dy = py - host.position[1];
  const dz = pz - host.position[2];
  const rad = host.yawDeg * Math.PI / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [Number((dx * c - dz * s).toFixed(4)), Number(dy.toFixed(4)), Number((dx * s + dz * c).toFixed(4))];
}
function nearestFreeStandpoint(fit, point2, radiusM, stepM = 0.05) {
  let best = null;
  const blocked = (x, z) => fit.nav.obstacles.some(
    (o) => x >= o.minX - radiusM && x <= o.maxX + radiusM && z >= o.minZ - radiusM && z <= o.maxZ + radiusM
  );
  for (const w of fit.nav.walkable) {
    const minX = w.minX + radiusM;
    const maxX = w.maxX - radiusM;
    const minZ = w.minZ + radiusM;
    const maxZ = w.maxZ - radiusM;
    for (let x = minX; x <= maxX + 1e-9; x += stepM) {
      for (let z = minZ; z <= maxZ + 1e-9; z += stepM) {
        if (blocked(x, z)) continue;
        const d = Math.hypot(x - point2.x, z - point2.z);
        if (!best || d < best.distanceXZ) best = { x: Number(x.toFixed(3)), z: Number(z.toFixed(3)), distanceXZ: Number(d.toFixed(3)) };
      }
    }
  }
  return best;
}
function buildManifest(fit, adjustment, device, fridge) {
  const chair = fit.hostNodes["furniture_chair"];
  const keyboard = fit.hostNodes["prop_keyboard"];
  const desk = fit.hostNodes["furniture_desk"];
  if (!chair || !keyboard || !desk) throw new Error("FIT_MISSING_HOST_NODE");
  const dz = adjustment.applied ? adjustment.delta.z : 0;
  const seatWorld = fit.authored.seatSurfaceWorld.point;
  const seatLocal = hostLocal(seatWorld, chair, dz);
  const approachLocal = hostLocal([fit.authored.deskApproachWorld[0], 0, fit.authored.deskApproachWorld[2]], chair, dz);
  const exitLocal = hostLocal([fit.authored.deskExitWorld[0], 0, fit.authored.deskExitWorld[2]], chair, dz);
  const hand = (p) => hostLocal(p, keyboard);
  const footWorld = fit.authored.seatedFootTargetsWorld;
  if (!footWorld?.left || !footWorld?.right) throw new Error("FOOT_TARGETS_NOT_DECLARED");
  const footSides = fit.authored.seatedFootTargets?.sides;
  const footLocal = (side, p) => {
    const declared = footSides?.[side];
    if (!declared?.frame || !declared.host) throw new Error(`FOOT_FRAME_NOT_DECLARED:${side}`);
    const toleranceMeters = Number(declared.toleranceMeters);
    if (!Number.isFinite(toleranceMeters) || toleranceMeters <= 0) throw new Error(`FOOT_TOLERANCE_NOT_DECLARED:${side}`);
    const shiftZ = declared.host === adjustment.node ? dz : 0;
    const local = hostLocal(p, chair, shiftZ);
    return { point: { x: local[0], y: local[1], z: local[2] }, toleranceMeters };
  };
  const feet = [
    // The avatar faces +Z, so its LEFT is +X (same convention as the hand-side
    // correction). The first pass had these swapped: the legs crossed under the
    // chair and the outer thighs were driven into the cushion sides.
    footLocal("left", footWorld.left),
    footLocal("right", footWorld.right)
  ];
  const left = hand(fit.authored.handTargetsWorld.leftHand);
  const right = hand(fit.authored.handTargetsWorld.rightHand);
  const deviceInteraction = device ? (() => {
    const host = device.hostTransform;
    const contactLocal = hostLocal3(device.contactWorld, host);
    const approachLocal2 = hostLocal([fit.authored.deskApproachWorld[0], 0, fit.authored.deskApproachWorld[2]], host);
    const exitLocal2 = hostLocal([fit.authored.deskExitWorld[0], 0, fit.authored.deskExitWorld[2]], host);
    return {
      id: device.interactionId ?? `${device.id}-switch`,
      revision: 1,
      hostNode: device.hostNode,
      kind: "generic",
      enabled: true,
      slots: [
        {
          id: device.slotId ?? "switch",
          pose: device.posture === "seated" ? "sitting" : "standing",
          localTransform: { position: contactLocal, yawDeg: device.facingYawDeg },
          facing: { yawDeg: device.facingYawDeg, toleranceDeg: 25 },
          approach: { position: approachLocal2, radiusMeters: 0.6 },
          exit: { position: exitLocal2, radiusMeters: 0.6 },
          contacts: {
            hands: [
              { point: { x: contactLocal[0], y: contactLocal[1], z: contactLocal[2] }, toleranceMeters: device.toleranceM }
            ]
          },
          capacity: 1,
          capabilities: ["switch"],
          compatibleBodyProfiles: ["body-avatar"],
          tags: ["appliance"]
        }
      ]
    };
  })() : null;
  const fridgeInteraction = fridge ? (() => {
    const host = fridge.hostTransform;
    const contactLocal = hostLocal3(fridge.contactWorldClosed, host);
    const approachLocal2 = hostLocal([fridge.contactWorldClosed[0], 0, fridge.contactWorldClosed[2] - 0.4], host);
    return {
      id: fridge.interactionId ?? `${fridge.id}-handle`,
      revision: 1,
      hostNode: fridge.hostNode,
      kind: "generic",
      enabled: true,
      slots: [
        {
          id: fridge.slotId ?? "fridge-operate",
          pose: "standing",
          localTransform: { position: contactLocal, yawDeg: fridge.facingYawDeg },
          facing: { yawDeg: fridge.facingYawDeg, toleranceDeg: 30 },
          approach: { position: approachLocal2, radiusMeters: 0.45 },
          contacts: {
            hands: [
              { point: { x: contactLocal[0], y: contactLocal[1], z: contactLocal[2] }, toleranceMeters: 0.05 }
            ]
          },
          capacity: 1,
          capabilities: ["operate"],
          compatibleBodyProfiles: ["body-avatar"],
          tags: ["appliance", "door", "hand"]
        }
      ]
    };
  })() : null;
  return {
    specVersion: "1.0",
    sceneId: fit.sceneId,
    revision: 1,
    units: "meters",
    upAxis: "Y",
    asset: { uri: fit.asset },
    interactions: [
      {
        id: "chair-main",
        revision: 1,
        hostNode: "furniture_chair",
        kind: "seat",
        enabled: true,
        slots: [
          {
            id: "seat",
            pose: "sitting",
            localTransform: { position: seatLocal, yawDeg: 0 },
            facing: { yawDeg: 0, toleranceDeg: 10 },
            approach: { position: approachLocal, radiusMeters: 0.55 },
            exit: { position: exitLocal, radiusMeters: 0.6 },
            contacts: {
              seat: { point: { x: seatLocal[0], y: seatLocal[1], z: seatLocal[2] }, toleranceMeters: 0.03 },
              feet
            },
            capacity: 1,
            capabilities: ["sit", "work", "think", "rest"],
            compatibleBodyProfiles: ["body-avatar"],
            tags: ["chair", "desk"]
          },
          {
            // The OPERATION slot: a real graspable surface on the backrest, in
            // the chair node's local frame. It is data on the resource, not a
            // page constant; a second movable resource gets its own values.
            id: "manipulate",
            pose: "standing",
            // Measured rear face of chair_back at its upper graspable band
            // (mesh z min -0.275, y 0.95). The old [0, 0.7, -0.21] sat 6.5 cm
            // INSIDE the backrest volume, so no palm could ever touch a surface.
            localTransform: { position: [0, 0.95, -0.275], yawDeg: 180 },
            facing: { yawDeg: 0, toleranceDeg: 35 },
            approach: { position: [0, 0, -0.62], radiusMeters: 0.5 },
            exit: { position: [0, 0, -0.62], radiusMeters: 0.5 },
            contacts: {
              hands: [
                { point: { x: 0, y: 0.95, z: -0.275 }, toleranceMeters: 0.04 }
              ]
            },
            capacity: 1,
            capabilities: ["move"],
            compatibleBodyProfiles: ["body-avatar"],
            tags: ["chair", "movable", "handle"]
          }
        ]
      },
      {
        id: "keyboard-main",
        revision: 1,
        hostNode: "prop_keyboard",
        kind: "keyboard",
        enabled: true,
        slots: [
          {
            id: "keys",
            pose: "sitting",
            localTransform: { position: [0, 0.7625, 0], yawDeg: 0 },
            facing: { yawDeg: 0, toleranceDeg: 10 },
            approach: { position: approachLocal, radiusMeters: 0.55 },
            contacts: {
              hands: [
                { point: { x: left[0], y: left[1], z: left[2] }, toleranceMeters: 0.03 },
                { point: { x: right[0], y: right[1], z: right[2] }, toleranceMeters: 0.03 }
              ]
            },
            capacity: 1,
            capabilities: ["type"],
            compatibleBodyProfiles: ["body-avatar"],
            tags: ["keyboard"]
          }
        ]
      },
      {
        id: "desk-workstation",
        revision: 1,
        hostNode: "furniture_desk",
        kind: "workstation",
        enabled: true,
        composedOf: [
          { interactionId: "chair-main", role: "seat" },
          { interactionId: "keyboard-main", role: "keyboard" }
        ],
        slots: [
          {
            id: "desk-stand",
            pose: "standing",
            localTransform: { position: [0, 0, -0.35], yawDeg: 180 },
            facing: { yawDeg: 180, toleranceDeg: 10 },
            approach: { position: [0, 0, -0.85], radiusMeters: 0.55 },
            capacity: 1,
            capabilities: ["work", "think", "type"],
            compatibleBodyProfiles: ["body-avatar"],
            tags: ["desk"]
          }
        ]
      },
      ...deviceInteraction ? [deviceInteraction] : [],
      ...fridgeInteraction ? [fridgeInteraction] : []
    ],
    spawnPoints: [{ id: "spawn-home", position: fit.home.pos, yawDeg: 180 }],
    autonomy: { enabledGoals: ["idle", "lookAround"], allowSleep: false, idleCooldownMs: 3e4 }
  };
}
function parseManifest(manifest) {
  const m = manifest;
  if (m?.specVersion !== "1.0") throw new Error(`MANIFEST_BAD_SPEC_VERSION:${String(m?.specVersion)}`);
  if (m.units !== "meters" || m.upAxis !== "Y") throw new Error("MANIFEST_BAD_UNITS");
  if (!Array.isArray(m.interactions) || m.interactions.length === 0) throw new Error("MANIFEST_NO_INTERACTIONS");
  const ids = /* @__PURE__ */ new Set();
  for (const interaction of m.interactions) {
    if (typeof interaction.id !== "string" || interaction.id.length === 0) throw new Error("MANIFEST_INTERACTION_ID");
    if (ids.has(interaction.id)) throw new Error(`MANIFEST_DUPLICATE_ID:${interaction.id}`);
    ids.add(interaction.id);
    if (typeof interaction.hostNode !== "string" || interaction.hostNode.length === 0) {
      throw new Error(`MANIFEST_HOST_NODE:${interaction.id}`);
    }
    for (const slot of interaction.slots ?? []) {
      if (!slot.facing) throw new Error(`MANIFEST_MISSING_FACING:${interaction.id}/${String(slot.id)}`);
    }
  }
  return manifest;
}
function planAdjustment(fit, tuckM) {
  const g = fit.geometry;
  return planSeatTuck({
    node: "furniture_chair",
    chairSeat: { minX: g.chairSeat.min[0], maxX: g.chairSeat.max[0], minZ: g.chairSeat.min[2], maxZ: g.chairSeat.max[2] },
    chairUpper: { minX: g.chairUpper.min[0], maxX: g.chairUpper.max[0], minZ: g.chairUpper.min[2], maxZ: g.chairUpper.max[2] },
    desk: { minX: g.desk.min[0], maxX: g.desk.max[0], minZ: g.desk.min[2], maxZ: g.desk.max[2] },
    floor: {
      minX: Math.min(...fit.nav.walkable.map((w) => w.minX)),
      maxX: Math.max(...fit.nav.walkable.map((w) => w.maxX)),
      minZ: Math.min(...fit.nav.walkable.map((w) => w.minZ)),
      maxZ: Math.max(...fit.nav.walkable.map((w) => w.maxZ))
    },
    beforePosition: vec3(fit.hostNodes["furniture_chair"].position),
    deltaZ: tuckM,
    seatContact: vec3(fit.authored.seatContactWorld)
  });
}
function applyAdjustmentToScene(root, fit, adjustment) {
  if (!adjustment.applied) return;
  const chair = root.getObjectByName("furniture_chair");
  if (!chair) throw new Error("MISSING_NODE:furniture_chair");
  const parent = new THREE38.Matrix4().copy(chair.parent ? chair.parent.matrixWorld : new THREE38.Matrix4());
  const local = new THREE38.Vector3(0, 0, adjustment.delta.z).applyMatrix4(new THREE38.Matrix4().extractRotation(parent).invert());
  chair.position.add(local);
  chair.updateMatrixWorld(true);
  const fitNode = fit.hostNodes["furniture_chair"];
  fitNode.position = [fitNode.position[0] + local.x, fitNode.position[1] + local.y, fitNode.position[2] + local.z];
  for (const obstacle of fit.nav.obstacles) {
    if (obstacle.name !== "furniture_chair") continue;
    obstacle.minZ = Number((obstacle.minZ + adjustment.delta.z).toFixed(4));
    obstacle.maxZ = Number((obstacle.maxZ + adjustment.delta.z).toFixed(4));
  }
}
function sceneTransforms(fit, device, fridge) {
  const table = {
    ...Object.fromEntries(Object.entries(fit.hostNodes).map(([name, t]) => [name, { position: t.position, yawDeg: t.yawDeg }]))
  };
  if (device) table[device.hostNode] = device.hostTransform;
  if (fridge) table[fridge.hostNode] = fridge.hostTransform;
  return table;
}
function createSlice(options) {
  const fit = options.fit;
  const actorId = options.actorId ?? "npc-a";
  const tuckM = options.tuckM ?? 0.15;
  const adjustment = planAdjustment(fit, tuckM);
  if (!adjustment.applied) throw new Error(`SEAT_ADJUSTMENT_REFUSED:${adjustment.reason}`);
  applyAdjustmentToScene(options.root, fit, adjustment);
  const manifest = buildManifest(fit, adjustment, options.device, options.fridge);
  const parsed = parseManifest(manifest);
  const definition = buildSceneDefinition(parsed);
  const world = new SceneWorld({ leaseTtlMs: 5e3, wallClock: options.wallClock ?? (() => Date.now()) });
  const transforms = sceneTransforms(fit, options.device, options.fridge);
  world.addScene({
    scene: parsed,
    transforms,
    nav: { type: "rect-grid", cellMeters: fit.nav.cell, walkable: fit.nav.walkable, obstacles: fit.nav.obstacles },
    matrixRevision: 1
  });
  const actor = world.bindActor({ actorId, sceneId: fit.sceneId, radiusMeters: 0.24 });
  const handActorId = `${actorId}:hand`;
  const handActor = world.bindActor({ actorId: handActorId, sceneId: fit.sceneId, radiusMeters: 0.16 });
  const fridgeBystander = options.fridge ? world.bindActor({ actorId: `${actorId}:bystander`, sceneId: fit.sceneId, radiusMeters: 0.24 }) : null;
  const resolver = world.scene(fit.sceneId);
  const nav = world.navigation(fit.sceneId);
  const seatSlot = resolver.resolveSlot({ interactionId: "chair-main", slotId: "seat" });
  const keysSlot = resolver.resolveSlot({ interactionId: "keyboard-main", slotId: "keys" });
  const contacts = seatSlot.contacts;
  const handContacts = keysSlot.contacts?.hands ?? [];
  if (!contacts?.seat || handContacts.length < 2) throw new Error("MISSING_SLOT_CONTACTS");
  const deviceInteractionId = options.device ? options.device.interactionId ?? `${options.device.id}-switch` : null;
  const deviceSlotId = options.device?.slotId ?? "switch";
  const fridgeInteractionId = options.fridge ? options.fridge.interactionId ?? `${options.fridge.id}-handle` : null;
  const fridgeSlotId = options.fridge?.slotId ?? "fridge-operate";
  let deviceTarget = null;
  if (options.device && deviceInteractionId) {
    const slot = resolver.resolveSlot({ interactionId: deviceInteractionId, slotId: deviceSlotId });
    const contact = slot.contacts?.hands?.[0];
    if (!contact) throw new Error("DEVICE_SLOT_CONTACT_MISSING");
    const declared = vec3(options.device.contactWorld);
    const resolved = vec3(contact.point);
    const mismatch = Math.hypot(resolved.x - declared.x, resolved.y - declared.y, resolved.z - declared.z);
    if (mismatch > 0.02) throw new Error(`DEVICE_CONTACT_HOST_MISMATCH:${mismatch.toFixed(4)}m`);
    deviceTarget = {
      id: options.device.id,
      name: options.device.name,
      contact: resolved,
      normal: vec3(options.device.normalWorld),
      facingYawRad: options.device.facingYawDeg * Math.PI / 180,
      side: options.device.side,
      pitchRad: options.device.pitchRad,
      toleranceM: options.device.toleranceM,
      holdMs: options.device.holdMs,
      reachTimeoutMs: options.device.reachTimeoutMs,
      withdrawMs: options.device.withdrawMs,
      seated: options.device.posture === "seated"
    };
  }
  const g = fit.geometry;
  const seatCushion = g.chairSeat.meshes?.length && g.chairSeat.host ? {
    rect: {
      minX: g.chairSeat.min[0],
      maxX: g.chairSeat.max[0],
      minZ: g.chairSeat.min[2] + (adjustment.applied ? adjustment.delta.z : 0),
      maxZ: g.chairSeat.max[2] + (adjustment.applied ? adjustment.delta.z : 0)
    },
    topY: g.chairSeat.max[1],
    bottomY: g.chairSeat.min[1],
    meshes: [...g.chairSeat.meshes],
    hostNode: g.chairSeat.host,
    source: `fit.geometry.chairSeat ${g.chairSeat.host}[${g.chairSeat.meshes.join(",")}] (${fit.asset})`
  } : null;
  const seat = {
    interactionId: "chair-main",
    seat: vec3(contacts.seat.point),
    seatY: contacts.seat.point.y,
    seatNormal: vec3(fit.authored.seatSurfaceWorld.normal),
    seatRect: {
      minX: g.chairSeat.min[0],
      maxX: g.chairSeat.max[0],
      minZ: g.chairSeat.min[2] + (adjustment.applied ? adjustment.delta.z : 0),
      maxZ: g.chairSeat.max[2] + (adjustment.applied ? adjustment.delta.z : 0)
    },
    footTargets: (() => {
      const declared = contacts.feet;
      if (!declared || declared.length < 2) throw new Error("FOOT_TARGETS_NOT_DECLARED");
      const toleranceM = Math.min(declared[0].toleranceMeters, declared[1].toleranceMeters);
      if (!Number.isFinite(toleranceM) || toleranceM <= 0) throw new Error("FOOT_TOLERANCE_NOT_DECLARED");
      const frames = [fit.authored.seatedFootTargets?.sides?.left?.frame, fit.authored.seatedFootTargets?.sides?.right?.frame];
      const frame = frames[0] && frames[0] === frames[1] ? frames[0] : frames[0] || frames[1] ? "mixed" : void 0;
      return {
        left: vec3(declared[0].point),
        right: vec3(declared[1].point),
        toleranceM,
        ...frame ? { frame } : {}
      };
    })(),
    hipAnchor: vec3(fit.authored.seatContactWorld),
    seatFacing: seatSlot.worldYawDeg * Math.PI / 180,
    ...seatCushion ? { seatCushion } : {},
    handTargets: {
      left: vec3(handContacts[0].point),
      right: vec3(handContacts[1].point)
    },
    keyboardTopY: g.keyboard.max[1],
    keyboardRect: { minX: g.keyboard.min[0], maxX: g.keyboard.max[0], minZ: g.keyboard.min[2], maxZ: g.keyboard.max[2] },
    deskTopY: g.desk.max[1],
    deskRect: { minX: g.desk.min[0], maxX: g.desk.max[0], minZ: g.desk.min[2], maxZ: g.desk.max[2] },
    floorY: fit.floorY,
    approach: { pos: vec3(seatSlot.approach.position), yaw: seatSlot.worldFacingYawDeg * Math.PI / 180 },
    exit: { pos: vec3(seatSlot.exit?.position ?? seatSlot.approach.position), yaw: seatSlot.worldFacingYawDeg * Math.PI / 180 }
  };
  const authoredSeat = structuredClone(seat);
  let seatPoseRevision = 0;
  const targetFrames = new SeatTargetFrames({ target: authoredSeat, resolver });
  const chairPoseSeat = (pose) => {
    if (![pose.x, pose.y, pose.z, pose.yaw].every(Number.isFinite)) throw new Error("SEAT_POSE_INVALID");
    return targetFrames.preview(pose, { ...seat, hipAnchor: authoredSeat.hipAnchor });
  };
  const cushionCache = /* @__PURE__ */ new Map();
  const cushionFor = (target) => {
    const resource = target.seatCushion;
    if (!resource || !resource.meshes.length) return null;
    if (resource.rigidPose) {
      const base = cushionFor(authoredSeat);
      if (!base) return null;
      const frame = resource.rigidPose;
      const c = Math.cos(frame.yaw), s = Math.sin(frame.yaw);
      const local = (x, z) => ({
        x: frame.origin.x + c * (x - frame.pose.x) - s * (z - frame.pose.z),
        z: frame.origin.z + s * (x - frame.pose.x) + c * (z - frame.pose.z)
      });
      const dy = frame.pose.y - frame.origin.y;
      return {
        ...base,
        rect: resource.rect,
        topY: base.topY + dy,
        bottomY: base.bottomY + dy,
        topAt: (x, z) => {
          const p = local(x, z);
          const y = base.topAt?.(p.x, p.z);
          return y == null ? null : y + dy;
        },
        insideAt: (x, y, z) => {
          const p = local(x, z);
          return base.insideAt?.(p.x, y - dy, p.z) ?? false;
        },
        source: `${base.source}; rigid transformed support (not soft-body)`
      };
    }
    const key = `${resource.rect.minX}/${resource.rect.maxX}/${resource.rect.minZ}/${resource.rect.maxZ}/${resource.topY}/${resource.bottomY}`;
    const cached = cushionCache.get(key);
    if (cached) return cached;
    const host = options.root.getObjectByName(resource.hostNode);
    if (!host) return null;
    const meshes = [];
    for (const name of resource.meshes) {
      const node = host.getObjectByName(name);
      node?.traverse((o) => {
        if (o.isMesh) meshes.push(o);
      });
    }
    if (!meshes.length) return null;
    const field = buildSeatCushionField({
      meshes,
      rect: resource.rect,
      topY: resource.topY,
      bottomY: resource.bottomY,
      cellM: 5e-3,
      source: `${resource.source}; field ${resource.meshes.join("+")} @5mm`
    });
    cushionCache.set(key, field);
    return field;
  };
  cushionFor(authoredSeat);
  const rig = new VrmRig({
    vrm: options.vrm,
    mixer: options.mixer,
    actions: options.actions,
    baked: options.baked,
    floorY: fit.floorY,
    garment: AVATAR_GARMENT_PROFILE,
    cushion: cushionFor
  });
  rig.setCarrier(seat.approach.pos, seat.approach.yaw);
  let fridgeTarget = null;
  let fridgeBinding = null;
  const fridgePort = {
    ready: () => fridgeBinding !== null && fridgeTarget !== null,
    handlePoint: () => {
      if (!fridgeBinding) throw new Error("FRIDGE_NOT_BOUND");
      return fridgeBinding.handlePoint();
    },
    handleNormal: () => {
      if (!fridgeBinding) throw new Error("FRIDGE_NOT_BOUND");
      return fridgeBinding.handleNormal();
    },
    palmDistance: (palm) => {
      if (!fridgeBinding) throw new Error("FRIDGE_NOT_BOUND");
      return fridgeBinding.palmDistance(palm);
    },
    angleRad: () => {
      if (!fridgeBinding) throw new Error("FRIDGE_NOT_BOUND");
      return fridgeBinding.angleRad();
    },
    driveOpen: () => {
      if (!fridgeBinding) throw new Error("FRIDGE_NOT_BOUND");
      fridgeBinding.driveOpen();
    },
    stop: () => {
      if (fridgeBinding) fridgeBinding.stop();
    },
    // Cleanup runs after the executor confirms safe withdrawal, before replanning.
    // Only these two transient fridge facts are observed; door success is untouched.
    onSafeRelease: () => {
      runtime.applyExternalFacts({ fridgeGrasped: false, fridgeReachReady: false });
    },
    blocked: () => fridgeBinding ? fridgeBinding.blocked() : false,
    telemetry: () => fridgeBinding ? fridgeBinding.telemetry() : { bound: false }
  };
  const scenePort = {
    workstation: () => seat,
    candidateGuard: (actionKey) => targetFrames.guard(actionKey),
    home: () => ({ pos: vec3(fit.home.pos), yaw: 180 * Math.PI / 180 }),
    speaker: () => ({ x: fit.home.pos[0], y: 1.45, z: fit.home.pos[2] }),
    path: (from, to) => {
      const result = nav.findPath(0.24, { x: from.x, z: from.z }, { x: to.x, z: to.z }, { goalTolerance: 0.6 });
      let checkedRevision = nav.revision;
      return {
        navigation: { revision: checkedRevision, valid: (remaining) => {
          const valid = nav.pathValidSince(checkedRevision, 0.24, remaining);
          if (valid) checkedRevision = nav.revision;
          return valid;
        } },
        ok: result.ok,
        points: result.path.map((p) => ({ x: p.x, y: fit.floorY, z: p.z })),
        reason: result.ok ? null : result.reason ?? "NO_PATH"
      };
    },
    fridge: () => fridgeTarget
  };
  let deviceBinding = null;
  const deviceFeedbackLog = [];
  const devicePort = {
    ready: () => deviceBinding !== null,
    read: () => deviceBinding ? deviceBinding.read() : false,
    apply: (on) => deviceBinding ? deviceBinding.apply(on) : { changed: false, state: false, reason: "DEVICE_NOT_BOUND" }
  };
  const physicsPort = options.physicsFactory ? options.physicsFactory({
    rig,
    metrics: { ...rig.debugMetrics() },
    // The chair tuck moves the visual node and the nav obstacle. The
    // physics collider must follow the SAME declared delta, or the body
    // collides with the authored chair 0.15 m away from the visible one.
    adjustment: { applied: adjustment.applied, node: adjustment.node, delta: { ...adjustment.delta } }
  }) : options.physics ?? null;
  const adapter = new ThreeMotionAdapter({
    scene: scenePort,
    rig,
    walkSpeedMps: 1.1,
    exitMs: 520,
    evidenceSource: options.evidenceSource,
    evidenceRequired: options.evidenceRequired,
    ...deviceTarget ? { device: deviceTarget, devicePort } : {},
    ...options.fridge ? { fridgePort } : {},
    ...physicsPort ? { physics: physicsPort } : {}
  });
  const isHandRequirement = (requirement) => requirement.capability === "switch" || requirement.capability === "operate" || requirement.kind === "generic";
  const actorForRequirement = (requirement) => isHandRequirement(requirement) ? handActor : actor;
  const actorForSlots = (slots) => deviceInteractionId && slots.some((slot) => slot.interactionId === deviceInteractionId) || fridgeInteractionId && slots.some((slot) => slot.interactionId === fridgeInteractionId) ? handActor : actor;
  const claimPort = {
    owner: actorId,
    ttlMs: actor.ttlMs,
    now: () => world.now(),
    resolve: (requirement) => actorForRequirement(requirement).resolve(requirement),
    check: (slots) => actorForSlots(slots).check(slots),
    ensureClaim: (actionId, requirements, opts) => {
      if (requirements.length === 0) throw new Error("CLAIM_NO_REQUIREMENTS");
      const groups = new Set(requirements.map((requirement) => isHandRequirement(requirement) ? "hand" : "body"));
      if (groups.size > 1) throw new Error("MIXED_RESOURCE_GROUPS");
      return actorForRequirement(requirements[0]).ensureClaim(actionId, requirements, opts);
    },
    claimState: (claimId) => world.claims.claimById(claimId)?.state ?? null,
    claimStale: (claimId) => world.claims.claimById(claimId)?.stale === true,
    engage: (claimId, fence) => world.claims.engage(claimId, fence, world.now()).ok,
    reoccupy: (claimId, fence) => world.claims.reoccupy(claimId, fence, world.now()).ok,
    occupy: (claimId, fence) => world.claims.occupy(claimId, fence, world.now()).ok,
    beginRelease: (claimId, fence) => world.claims.beginRelease(claimId, fence, world.now()).ok,
    release: (claimId, fence, reason) => world.claims.release(claimId, fence, reason, world.now()).ok,
    renew: (claimId, fence) => world.claims.renew(claimId, fence, actor.ttlMs, world.now()).ok
  };
  const claiming = new ClaimingMotionAdapter(adapter, claimPort, { renewIntervalMs: 1e3 });
  let wallMs = 0;
  const store = new DomainStore({
    worldId: fit.sceneId,
    actors: [actorId],
    wallClock: () => wallMs
  });
  const planner = options.plannerFactory ? new (requirePlanner())({ factory: options.plannerFactory, defaultBudgetMs: 4e3 }) : unavailablePlanner();
  const runtime = new NpcRuntime({
    store,
    actorId,
    planner,
    motion: claiming,
    maxReplanAttempts: 3,
    planBudgetMs: 4e3,
    seatAvailable: () => actor.check([actor.resolve({ capability: "sit", kind: "seat" })]).ok,
    actionKeys: Object.keys(ACTION_CATALOG)
  });
  const pageTools = /* @__PURE__ */ new Set();
  const retireGoalCommands = () => {
    const actorState = store.snapshot.actors[actorId];
    if (!actorState) return;
    for (const cmd of Object.values(actorState.commands)) {
      if (cmd.type !== "goal.request" || cmd.status !== "active") continue;
      store.dispatch({
        kind: "command",
        command: {
          specVersion: "1.0",
          commandId: nextId("retire"),
          worldId: fit.sceneId,
          actorId,
          type: "goal.cancel",
          targetCommandId: cmd.commandId,
          priorityClass: "task"
        }
      });
    }
  };
  const events = {
    heartbeat() {
      store.dispatch({
        kind: "fact",
        fact: {
          specVersion: "1.0",
          eventId: nextId("hb"),
          source: "hermes:npc-v2-page",
          sourceEpoch: "epoch-page-1",
          sequence: ++seq,
          worldId: fit.sceneId,
          actorId,
          occurredAt: new Date(wallMs).toISOString(),
          type: "presence.heartbeat",
          data: { status: "alive" }
        }
      });
    },
    toolStarted(toolCallId, activityClass = "coding") {
      retireGoalCommands();
      pageTools.add(toolCallId);
      store.dispatch({
        kind: "fact",
        fact: {
          specVersion: "1.0",
          eventId: nextId("ts"),
          source: "hermes:npc-v2-page",
          sourceEpoch: "epoch-page-1",
          sequence: ++seq,
          worldId: fit.sceneId,
          actorId,
          occurredAt: new Date(wallMs).toISOString(),
          type: "tool.started",
          data: { toolCallId, activityClass }
        }
      });
    },
    toolCompleted(toolCallId, outcome = "success") {
      pageTools.delete(toolCallId);
      store.dispatch({
        kind: "fact",
        fact: {
          specVersion: "1.0",
          eventId: nextId("tc"),
          source: "hermes:npc-v2-page",
          sourceEpoch: "epoch-page-1",
          sequence: ++seq,
          worldId: fit.sceneId,
          actorId,
          occurredAt: new Date(wallMs).toISOString(),
          type: "tool.completed",
          data: { toolCallId, outcome }
        }
      });
    },
    goalRequest(goal, commandId) {
      retireGoalCommands();
      lastGoalCommandId = commandId ?? nextId("cmd");
      const command = {
        specVersion: "1.0",
        commandId: lastGoalCommandId,
        worldId: fit.sceneId,
        actorId,
        type: "goal.request",
        goal,
        ttlMs: 6e5,
        priorityClass: "task",
        onConflict: "replace"
      };
      store.dispatch({ kind: "command", command });
    },
    goalCancel(targetCommandId) {
      const target = targetCommandId ?? lastGoalCommandId;
      if (target) runtime.cancel({ scope: "goal", targetCommandId: target });
    }
  };
  let lastHeartbeat = -Infinity;
  let lastGoalCommandId = null;
  const slice = {
    sceneId: fit.sceneId,
    actorId,
    world,
    actor,
    store,
    runtime,
    observeAction: () => runtime.observeAction(),
    adapter,
    claiming,
    rig,
    seat,
    adjustment,
    fit,
    setFurnitureSeatPose(pose, dtMs = 0) {
      const next = chairPoseSeat(pose);
      if (rig.seated && !rig.transitioning && rig.followSeat) rig.followSeat(next, dtMs);
      Object.assign(seat, next);
      if (!next.seatCushion) delete seat.seatCushion;
      seatPoseRevision += 1;
      return seatPoseRevision;
    },
    interactionCandidate: () => targetFrames.resolve({ ...seat, hipAnchor: authoredSeat.hipAnchor }),
    seatPoseRevision: () => seatPoseRevision,
    previewFurnitureSeatPose: (pose) => chairPoseSeat(pose),
    seatedMotionTelemetry: () => rig.seatedMotionTelemetry?.() ?? null,
    update(dtMs) {
      wallMs += dtMs;
      if (wallMs - lastHeartbeat >= 500) {
        lastHeartbeat = wallMs;
        events.heartbeat();
      }
      runtime.step(dtMs);
      if (runtime.busy) void runtime.settle();
      actor.heartbeat();
      handActor.heartbeat();
      const view = runtime.view();
      if (!view.action) {
        if (runtime.executionHeld) {
          rig.relax();
          rig.update(dtMs);
          return;
        }
        const hold = planSeatedHold({
          hasAction: false,
          planSatisfied: view.plan?.status === "satisfied",
          seated: rig.seated,
          transitioning: rig.transitioning === true,
          goalId: view.goalId
        });
        if (hold.posture === "reach") rig.reach(seat, dtMs);
        else if (hold.posture === "think") rig.think(seat, dtMs);
        else if (hold.posture === "rest") rig.rest(seat, dtMs);
        if (hold.advance) rig.update(dtMs);
      }
    },
    async settle() {
      await runtime.settle();
    },
    view() {
      const view = runtime.view();
      const claim = actor.claim();
      const claimState = claim ? actor.claimState(claim.claimId) : null;
      const handClaim = handActor.claim();
      const handClaimState = handClaim ? handActor.claimState(handClaim.claimId) : null;
      return {
        ready: true,
        sceneId: fit.sceneId,
        actorId,
        facts: view.facts,
        goalId: view.goalId,
        goalLayer: view.goalLayer,
        plan: view.plan ? { status: view.plan.status, actions: view.plan.actions } : null,
        action: view.action ? {
          actionId: view.action.actionId,
          actionKey: view.action.actionKey,
          attemptId: view.action.attemptId,
          evidenceKind: view.action.evidenceKind,
          phase: view.action.phase,
          reason: view.action.reason ?? null
        } : null,
        claim: claim?.claimId ?? null,
        claimState,
        failures: view.failures.map((f) => ({ kind: f.kind, reason: f.reason })),
        contact: adapter.lastContact,
        adjustment,
        seat,
        navStats: nav.forRadius(0.24).stats,
        stats: { ...view.stats },
        device: deviceTarget ? {
          id: deviceTarget.id,
          name: deviceTarget.name,
          contact: deviceTarget.contact,
          normal: deviceTarget.normal,
          toleranceM: deviceTarget.toleranceM,
          posture: deviceTarget.seated ? "seated" : "standing",
          bound: deviceBinding !== null,
          state: deviceBinding ? deviceBinding.read() : null,
          claim: handClaim?.claimId ?? null,
          claimState: handClaimState,
          telemetry: adapter.deviceTelemetry(),
          reach: rig.deviceReachDebug?.() ?? null,
          feedback: deviceFeedbackLog.slice(-8)
        } : null,
        fridge: options.fridge ? {
          id: options.fridge.id,
          bound: fridgeBinding !== null && fridgeTarget !== null,
          target: fridgeTarget ? {
            approach: { x: fridgeTarget.approach.pos.x, z: fridgeTarget.approach.pos.z, yaw: fridgeTarget.approach.yaw },
            side: fridgeTarget.side,
            minOpenDeg: Math.round(-fridgeTarget.minOpenRad * 180 / Math.PI * 10) / 10,
            targetOpenDeg: Math.round(-fridgeTarget.targetOpenRad * 180 / Math.PI * 10) / 10,
            toleranceM: fridgeTarget.toleranceM
          } : null,
          angleDeg: fridgeBinding ? Math.round(fridgeBinding.angleRad() * 180 / Math.PI * 100) / 100 : null,
          claim: handClaim?.claimId ?? null,
          claimState: handClaimState,
          telemetry: fridgePort.telemetry(),
          action: adapter.fridgeTelemetry()
        } : null
      };
    },
    heartbeat: () => events.heartbeat(),
    toolStarted: (toolCallId, activityClass) => events.toolStarted(toolCallId, activityClass),
    toolCompleted: (toolCallId, outcome) => events.toolCompleted(toolCallId, outcome),
    activeToolIds: () => [...pageTools],
    cancel(intent) {
      if (intent.scope === "work") {
        for (const toolCallId of [...pageTools]) events.toolCompleted(toolCallId, "cancelled");
      }
      const accepted = runtime.cancel(intent);
      if (accepted && runtime.executionHeld && !runtime.action) rig.relax();
      return accepted;
    },
    cancelAll() {
      slice.cancel({ scope: "work" });
    },
    finishAll() {
      for (const toolCallId of [...pageTools]) events.toolCompleted(toolCallId, "success");
    },
    dispose() {
      rig.dispose();
    },
    goalRequest: (goal, commandId) => events.goalRequest(goal, commandId),
    goalCancel: (targetCommandId) => events.goalCancel(targetCommandId),
    bindDevice(binding) {
      if (!deviceTarget) throw new Error("NO_DEVICE_IN_SLICE");
      deviceBinding = binding;
      const state = binding.read();
      runtime.applyExternalFacts({ [options.device.factKey]: state });
      deviceFeedbackLog.push({ on: state, atWallMs: wallMs, source: "bind" });
      return { state };
    },
    bindFridge(binding) {
      if (!options.fridge) throw new Error("NO_FRIDGE_IN_SLICE");
      if (!binding?.target?.approach || !binding.target.id) throw new Error("FRIDGE_TARGET_INVALID");
      if (!Number.isFinite(binding.target.minOpenRad) || !Number.isFinite(binding.target.targetOpenRad)) {
        throw new Error("FRIDGE_ANGLES_INVALID");
      }
      if (!(binding.target.minOpenRad < 0) || !(binding.target.targetOpenRad <= binding.target.minOpenRad)) {
        throw new Error("FRIDGE_ANGLE_ORDER");
      }
      fridgeBinding = binding;
      fridgeTarget = binding.target;
      return { bound: true };
    },
    occupyFridge() {
      if (!fridgeBystander || !options.fridge) return { ok: false, reason: "NO_FRIDGE_IN_SLICE" };
      const requirement = { capability: "operate", kind: "generic" };
      try {
        const binding = fridgeBystander.resolve(requirement);
        const check = fridgeBystander.check([binding]);
        if (!check.ok) return { ok: false, reason: check.reason ?? "SLOT_REFUSED", holder: check.holder };
        const existing = fridgeBystander.claim();
        if (existing) return { ok: true, claimId: existing.claimId, reason: "ALREADY_HELD" };
        const claim = fridgeBystander.ensureClaim("fridge-occupier", [requirement]);
        fridgeBystander.engage(claim.claimId, claim.fence);
        return { ok: true, claimId: claim.claimId };
      } catch (error) {
        return { ok: false, reason: String(error?.message ?? error) };
      }
    },
    releaseFridgeOccupier() {
      const claim = fridgeBystander?.claim() ?? null;
      if (!fridgeBystander || !claim) return true;
      return fridgeBystander.release(claim.claimId, claim.fence, "cancelled");
    },
    fridgeTarget: () => fridgeTarget,
    deviceFeedback(on, source = "device") {
      if (!deviceTarget) throw new Error("NO_DEVICE_IN_SLICE");
      const result = runtime.applyExternalFacts({ [options.device.factKey]: on });
      deviceFeedbackLog.push({ on, atWallMs: wallMs, source });
      if (deviceFeedbackLog.length > 64) deviceFeedbackLog.splice(0, deviceFeedbackLog.length - 64);
      return result;
    },
    deviceAudit() {
      if (!deviceTarget) return null;
      const nearest = nearestFreeStandpoint(fit, deviceTarget.contact, actor.radiusMeters);
      const contact = deviceTarget.contact;
      const yaw = nearest ? Math.atan2(contact.x - nearest.x, contact.z - nearest.z) : 0;
      const standing = nearest ? rig.measurePointReach?.(contact, deviceTarget.side, { standpoint: { x: nearest.x, z: nearest.z, yaw } }) ?? null : null;
      const seated = deviceTarget.seated ? rig.measurePointReach?.(contact, deviceTarget.side, { seat }) ?? null : null;
      const verdict = (m) => m ? { distanceM: m.distanceM, reachM: m.reachM, shortfallM: m.shortfallM, reachable: m.distanceM <= m.reachM, reason: m.distanceM <= m.reachM ? "IN_REACH" : "OUT_OF_REACH" } : null;
      return {
        deviceId: deviceTarget.id,
        contact,
        radiusM: actor.radiusMeters,
        nearest,
        standing: verdict(standing),
        seated: verdict(seated),
        // A standing reach is not implemented for an appliance: the rig refuses
        // it and this field is what the page/test assert against.
        standingPostureSupported: false
      };
    },
    motionLimits() {
      return adapter.motionLimits();
    },
    snapshotState() {
      return {
        carrier: { pos: { ...rig.carrier.pos }, yaw: rig.carrier.yaw },
        frame: adapter.lastContact,
        seat,
        adjustment,
        telemetry: adapter.telemetry(),
        claimEvents: claiming.log.slice(-24),
        calls: adapter.calls.slice(-24),
        device: {
          target: deviceTarget,
          bound: deviceBinding !== null,
          state: deviceBinding ? deviceBinding.read() : null,
          telemetry: adapter.deviceTelemetry(),
          reach: rig.deviceReachDebug?.() ?? null,
          feedback: deviceFeedbackLog.slice(-16),
          handClaim: handActor.claim(),
          bodyClaim: actor.claim()
        },
        fridge: {
          target: fridgeTarget,
          bound: fridgeBinding !== null,
          angleRad: fridgeBinding ? fridgeBinding.angleRad() : null,
          telemetry: fridgePort.telemetry(),
          handClaim: handActor.claim()
        }
      };
    }
  };
  return slice;
}
var plannerCtor = null;
function setPlannerCtor(ctor) {
  plannerCtor = ctor;
}
function requirePlanner() {
  if (!plannerCtor) throw new Error("PLANNER_NOT_REGISTERED");
  return plannerCtor;
}
function unavailablePlanner() {
  return {
    name: "unavailable",
    plan: async () => ({ status: "error", planId: "", revision: 0, actions: [], reason: "PLANNER_NOT_REGISTERED" })
  };
}

// packages/npc-three/src/postPhysicsContact.ts
function samplePostPhysicsContact(geometry) {
  const targets = contactTargetsForSeat(geometry.seat, false, geometry.hipTarget);
  return {
    simStep: geometry.simStep,
    poseRevision: geometry.poseRevision,
    report: evaluateContacts(geometry.frame, { ...targets, seated: geometry.seated })
  };
}

// packages/npc-three/src/browser.ts
var BrowserPlannerWorker = class {
  worker;
  messageListener = null;
  errorListener = null;
  constructor(url) {
    this.worker = new Worker(url, { type: "module" });
    this.worker.onmessage = (event) => this.messageListener?.(event.data);
    this.worker.onerror = (event) => this.errorListener?.(event);
  }
  postMessage(message) {
    this.worker.postMessage(message);
  }
  terminate() {
    this.worker.terminate();
  }
  onMessage(listener) {
    this.messageListener = listener;
  }
  onError(listener) {
    this.errorListener = listener;
  }
};
function slicePassthrough(options, device = options.device) {
  return {
    ...options.tuckM !== void 0 ? { tuckM: options.tuckM } : {},
    ...options.workerFactory ? { plannerFactory: options.workerFactory } : {},
    ...device ? { device } : {},
    ...options.fridge ? { fridge: options.fridge } : {},
    ...options.physics ? { physics: options.physics } : {},
    ...options.evidenceSource ? { evidenceSource: options.evidenceSource } : {},
    ...options.evidenceRequired ? { evidenceRequired: options.evidenceRequired } : {},
    ...options.physicsFactory ? { physicsFactory: options.physicsFactory } : {}
  };
}
var ANIM_NAMES = ["119_Idle", "149_Sitting Idle", "88_Thinking", "86_Talking"];
async function loadNpcSlice(options) {
  const started = performance.now();
  const errors = [];
  const fitRes = await fetch(options.fitUrl, { cache: "no-store" });
  if (!fitRes.ok) throw new Error(`fit ${options.fitUrl} -> HTTP ${fitRes.status}`);
  const fit = await fitRes.json();
  const loader = new GLTFLoader();
  const roomGltf = await loader.loadAsync(options.glbUrl);
  const root = roomGltf.scene;
  root.name = root.name || "apartment_v3";
  root.traverse((o) => {
    const mesh = o;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mesh.castShadow = !mats.some((m) => m && (m.transparent || m.opacity < 0.999));
    mesh.receiveShadow = true;
  });
  options.threeScene.add(root);
  const vrmLoader = new GLTFLoader();
  vrmLoader.register((parser) => new VRMLoaderPlugin(parser));
  const vrmGltf = await vrmLoader.loadAsync(`${options.assetBase}/models/avatar.vrm`);
  const vrm = vrmGltf.userData.vrm;
  if (!vrm) throw new Error("NO_VRM_IN_AVATAR");
  vrm.scene.traverse((o) => {
    const mesh = o;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    if (mesh.name === "Facebaked") mesh.visible = false;
  });
  vrm.scene.name = "avatar";
  options.threeScene.add(vrm.scene);
  const mixer = new THREE39.AnimationMixer(vrm.scene);
  const actions = /* @__PURE__ */ new Map();
  const vrmAnimLoader = new GLTFLoader();
  vrmAnimLoader.register((parser) => new VRMAnimationLoaderPlugin(parser));
  for (const name of ANIM_NAMES) {
    try {
      const gltf = await vrmAnimLoader.loadAsync(`${options.assetBase}/animations/${encodeURIComponent(name)}.vrma`);
      const vrma = gltf.userData.vrmAnimations?.[0];
      if (!vrma) {
        errors.push(`animation ${name}: no VRMAnimation`);
        continue;
      }
      actions.set(name, mixer.clipAction(createVRMAnimationClip(vrma, vrm)));
    } catch (error) {
      errors.push(`animation ${name}: ${error.message}`);
    }
  }
  const baked = await loadBakedClips(vrm, `${options.assetBase}/animations/npc`, [
    "npc_walk",
    "npc_sit_down",
    "npc_stand_up",
    "npc_typing",
    "npc_sit_fidget",
    "npc_sit_v2",
    "npc_stand_v2"
  ]);
  errors.push(...baked.errors);
  const device = options.deviceFactory ? options.deviceFactory(root) : options.device;
  setPlannerCtor(WorkerPlanner);
  const slice = createSlice({
    threeScene: options.threeScene,
    root,
    vrm,
    mixer,
    actions,
    baked: baked.clips,
    fit,
    ...slicePassthrough(options, device)
  });
  return {
    slice,
    root,
    vrm,
    mixer,
    actions,
    clips: [...baked.clips.keys()],
    errors,
    loadMs: Math.round(performance.now() - started)
  };
}
export {
  BrowserPlannerWorker,
  contactFailureReason,
  loadNpcSlice,
  planWithGoap,
  samplePostPhysicsContact
};
/*! Bundled license information:

@pixiv/three-vrm/lib/three-vrm.module.js:
  (*!
   * @pixiv/three-vrm v3.5.5
   * VRM file loader for three.js.
   *
   * Copyright (c) 2019-2026 pixiv Inc.
   * @pixiv/three-vrm is distributed under MIT License
   * https://github.com/pixiv/three-vrm/blob/release/LICENSE
   *)

@pixiv/three-vrm/lib/three-vrm.module.js:
  (*!
   * @pixiv/three-vrm-core v3.5.5
   * The implementation of core features of VRM, for @pixiv/three-vrm
   *
   * Copyright (c) 2019-2026 pixiv Inc.
   * @pixiv/three-vrm-core is distributed under MIT License
   * https://github.com/pixiv/three-vrm/blob/release/LICENSE
   *)
  (*!
   * @pixiv/three-vrm-materials-mtoon v3.5.5
   * MToon (toon material) module for @pixiv/three-vrm
   *
   * Copyright (c) 2019-2026 pixiv Inc.
   * @pixiv/three-vrm-materials-mtoon is distributed under MIT License
   * https://github.com/pixiv/three-vrm/blob/release/LICENSE
   *)
  (*!
   * @pixiv/three-vrm-materials-hdr-emissive-multiplier v3.5.5
   * Support VRMC_hdr_emissiveMultiplier for @pixiv/three-vrm
   *
   * Copyright (c) 2019-2026 pixiv Inc.
   * @pixiv/three-vrm-materials-hdr-emissive-multiplier is distributed under MIT License
   * https://github.com/pixiv/three-vrm/blob/release/LICENSE
   *)
  (*!
   * @pixiv/three-vrm-materials-v0compat v3.5.5
   * VRM0.0 materials compatibility layer plugin for @pixiv/three-vrm
   *
   * Copyright (c) 2019-2026 pixiv Inc.
   * @pixiv/three-vrm-materials-v0compat is distributed under MIT License
   * https://github.com/pixiv/three-vrm/blob/release/LICENSE
   *)
  (*!
   * @pixiv/three-vrm-node-constraint v3.5.5
   * Node constraint module for @pixiv/three-vrm
   *
   * Copyright (c) 2019-2026 pixiv Inc.
   * @pixiv/three-vrm-node-constraint is distributed under MIT License
   * https://github.com/pixiv/three-vrm/blob/release/LICENSE
   *)
  (*!
   * @pixiv/three-vrm-springbone v3.5.5
   * Spring bone module for @pixiv/three-vrm
   *
   * Copyright (c) 2019-2026 pixiv Inc.
   * @pixiv/three-vrm-springbone is distributed under MIT License
   * https://github.com/pixiv/three-vrm/blob/release/LICENSE
   *)

@pixiv/three-vrm-animation/lib/three-vrm-animation.module.js:
  (*!
   * @pixiv/three-vrm-animation v3.5.5
   * The implementation of VRM Animation
   *
   * Copyright (c) 2019-2026 pixiv Inc.
   * @pixiv/three-vrm-animation is distributed under MIT License
   * https://github.com/pixiv/three-vrm/blob/release/LICENSE
   *)

@pixiv/three-vrm-animation/lib/three-vrm-animation.module.js:
  (*!
   * @pixiv/three-vrm-core v3.5.5
   * The implementation of core features of VRM, for @pixiv/three-vrm
   *
   * Copyright (c) 2019-2026 pixiv Inc.
   * @pixiv/three-vrm-core is distributed under MIT License
   * https://github.com/pixiv/three-vrm/blob/release/LICENSE
   *)
*/
