const { cookieHeader, storeCookies } = require('./cookies');

function extractSetCookiesFromFetchHeaders(headers) {
  if (!headers) return [];
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }
  if (typeof headers.raw === 'function') {
    const raw = headers.raw()['set-cookie'];
    if (Array.isArray(raw)) return raw;
  }
  const single = headers.get && headers.get('set-cookie');
  return single ? [single] : [];
}

function extractSetCookiesFromAxiosHeaders(headers) {
  if (!headers) return [];
  const setCookie = headers['set-cookie'];
  if (!setCookie) return [];
  return Array.isArray(setCookie) ? setCookie : [setCookie];
}

async function fetchCsrfToken(apiBase, jar) {
  const headers = {};
  const cookie = cookieHeader(jar);
  if (cookie) {
    headers.Cookie = cookie;
  }

  const response = await fetch(`${apiBase}/csrf-token`, { headers });
  const data = await response.json().catch(() => ({}));
  storeCookies(jar, extractSetCookiesFromFetchHeaders(response.headers));

  const token = data?.csrfToken;
  if (!token) {
    throw new Error('CSRF token indisponível');
  }

  return token;
}

module.exports = {
  fetchCsrfToken,
  extractSetCookiesFromAxiosHeaders,
  extractSetCookiesFromFetchHeaders,
};
