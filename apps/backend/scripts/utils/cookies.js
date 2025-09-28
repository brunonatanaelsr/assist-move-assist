function createCookieJar() {
  return new Map();
}

function normalizeSetCookie(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  return [input];
}

function storeCookies(jar, setCookieHeader) {
  for (const raw of normalizeSetCookie(setCookieHeader)) {
    if (!raw) continue;
    const [pair] = raw.split(';');
    if (!pair) continue;
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) continue;
    const name = pair.slice(0, eqIndex).trim();
    const value = pair.slice(eqIndex + 1).trim();
    if (!name) continue;
    jar.set(name, value);
  }
}

function cookieHeader(jar) {
  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

function getCookie(jar, name) {
  return jar.get(name);
}

module.exports = {
  createCookieJar,
  storeCookies,
  cookieHeader,
  getCookie,
};
