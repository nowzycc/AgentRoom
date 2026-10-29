/**
 * Id-keyed maps.
 *
 * The domain's dictionaries are keyed by wire ids (actorId, commandId,
 * actionId, source, record keys). Object.prototype property names such as
 * `toString`, `constructor`, `valueOf` and `hasOwnProperty` are legal ids under
 * the M0 contract pattern, so a plain `{}` is not a dictionary: an absent key
 * reads back an inherited function (and a `__proto__` assignment would replace
 * the prototype).
 *
 * Every id-keyed map in `DomainState` is therefore created with a null
 * prototype, every read goes through an own-property check, and every write
 * uses a data-property definition (so an unparsed `__proto__` stays a plain
 * key). `rehydrateDomainState` is the only supported entry for a parsed or
 * cloned snapshot: both JSON.parse and structuredClone return ordinary objects
 * with a live prototype.
 */
export type IdMap<T> = Record<string, T>;

export function createIdMap<T>(): IdMap<T> {
  return Object.create(null) as IdMap<T>;
}

export function copyIdMap<T>(source: Readonly<Record<string, T>>): IdMap<T> {
  const out = createIdMap<T>();
  for (const key of Object.keys(source)) writeId(out, key, source[key] as T);
  return out;
}

export function hasId<T>(map: Readonly<Record<string, T>>, key: string): boolean {
  return Object.hasOwn(map, key);
}

export function readId<T>(map: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.hasOwn(map, key) ? (map[key] as T) : undefined;
}

export function writeId<T>(map: IdMap<T>, key: string, value: NoInfer<T>): void {
  // defineProperty, not `map[key] = value`: on a map that somehow still carries
  // Object.prototype (e.g. a caller-built snapshot), `__proto__` would run the
  // inherited setter and replace the prototype instead of storing a key.
  Object.defineProperty(map, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

export function deleteId<T>(map: IdMap<T>, key: string): void {
  if (Object.hasOwn(map, key)) delete map[key];
}
