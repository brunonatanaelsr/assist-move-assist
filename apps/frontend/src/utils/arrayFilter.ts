export function arrayFilter<T>(arr: T[], fn: (item: T) => boolean): T[] {
  return arr.filter(fn);
}
