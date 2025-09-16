export function saveToStorage(key: string, value: string) {
  window.localStorage.setItem(key, value);
}
export function getFromStorage(key: string): string | null {
  return window.localStorage.getItem(key);
}
