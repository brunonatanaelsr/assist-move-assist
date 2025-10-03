export function isKeyOf<T extends object>(obj: T, key: PropertyKey): key is keyof T {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function hasDefinedProperty<T extends object, K extends keyof T>(
  obj: T,
  key: K
): obj is T & Record<K, Exclude<T[K], undefined>> {
  return obj[key] !== undefined;
}
