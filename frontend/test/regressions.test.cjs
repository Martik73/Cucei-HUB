/* eslint @typescript-eslint/no-require-imports: "off" */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');

// Load the app's TypeScript components without starting Next or changing its config.
function load(relative, overrides = {}, cache = new Map()) {
  const file = path.join(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const loadedModule = { exports: {} };
  cache.set(file, loadedModule);
  const originalRequire = createRequire(file);
  const requireModule = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.startsWith('@/') || name.startsWith('.')) {
      const base = name.startsWith('@/') ? name.slice(2) : path.relative(root, path.resolve(path.dirname(file), name));
      const target = ['.ts', '.tsx'].map(ext => base + ext).find(p => fs.existsSync(path.join(root, p)));
      if (target) return load(target, overrides, cache);
    }
    return originalRequire(name);
  };
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  new Function('require', 'module', 'exports', outputText)(requireModule, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

test('read-only stars contain no interactive controls, even inside a card button', () => {
  const Stars = load('components/professors/StarRating.tsx').default;
  const html = renderToStaticMarkup(React.createElement('button', null, React.createElement(Stars, { value: 3.5 })));
  assert.equal((html.match(/<button\b/g) || []).length, 1);
  assert.match(html, /aria-label="3.5 de 5 estrellas"/);
});

test('editable stars retain five selectable, non-submit buttons', () => {
  const Stars = load('components/professors/StarRating.tsx').default;
  const html = renderToStaticMarkup(React.createElement(Stars, { value: 3, onChange() {} }));
  assert.equal((html.match(/<button\b/g) || []).length, 5);
  assert.equal((html.match(/type="button"/g) || []).length, 5);
  assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
});

test('the user menu renders its real Base UI group label without a missing-context error', () => {
  const menu = load('components/ui/dropdown-menu.tsx');
  const passthrough = ({ children }) => React.createElement('div', null, children);
  const Header = load('components/layout/Header.tsx', {
    '@/context/AuthContext': { useAuth: () => ({ user: { id: '507f1f77bcf86cd799439011', nombre: 'Alumno Prueba', email: 'prueba@alumnos.udg.mx' }, logout() {} }) },
    'next/navigation': { useRouter: () => ({ push() {} }) },
    'next/link': ({ children, href, ...props }) => React.createElement('a', { href, ...props }, children),
    '@/components/ui/dropdown-menu': { ...menu,
      DropdownMenu: passthrough, DropdownMenuContent: passthrough,
      DropdownMenuTrigger: ({ children, ...props }) => React.createElement('button', props, children),
      DropdownMenuItem: ({ children, ...props }) => {
        delete props.variant;
        return React.createElement('button', props, children);
      },
    },
  }).default;
  const html = renderToStaticMarkup(React.createElement(Header));
  assert.match(html, /Alumno Prueba/);
  assert.match(html, /Cerrar sesión/);
  assert.match(html, /data-slot="dropdown-menu-group"/);
});

test('API URLs keep /api for both the default and an origin-only environment variable', () => {
  const { resolveApiUrl } = load('lib/api-url.ts');
  for (const value of [undefined, '', 'http://localhost:5000', 'http://localhost:5000/', 'http://localhost:5000/api/']) {
    assert.equal(resolveApiUrl(value), 'http://localhost:5000/api');
  }
  assert.equal(resolveApiUrl('https://example.com/service/api/'), 'https://example.com/service/api');
  assert.equal(resolveApiUrl('/api/'), '/api');
});

test('the actual registration client posts to /api/auth/register when configured with only the host', async () => {
  const previous = process.env.NEXT_PUBLIC_API_URL;
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:5000';
  try {
    const cache = new Map();
    const auth = load('lib/auth.ts', {}, cache);
    const api = load('lib/api.ts', {}, cache).default;
    let requestedUrl;
    api.defaults.adapter = async config => {
      requestedUrl = api.getUri(config);
      return { data: { token: 'test-token', user: { id: 'test' } }, status: 201, statusText: 'Created', headers: {}, config };
    };
    await auth.register({ email: 'prueba@alumnos.udg.mx', password: 'password-test', nombre: 'Prueba', carrera: 'Otra', semestre: 1 });
    assert.equal(requestedUrl, 'http://localhost:5000/api/auth/register');
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_URL; else process.env.NEXT_PUBLIC_API_URL = previous;
  }
});

test('material file requests use the protected API and send the JWT as a header', async () => {
  const previousWindow = global.window;
  const previousStorage = global.localStorage;
  global.window = {};
  global.localStorage = { getItem: () => 'test-session-token' };
  try {
    const cache = new Map();
    const communities = load('lib/communities.ts', {}, cache);
    const api = load('lib/api.ts', {}, cache).default;
    const pdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    api.defaults.adapter = async config => {
      assert.equal(config.url, '/materials/material-id/file');
      assert.equal(config.headers.Authorization, 'Bearer test-session-token');
      assert.equal(config.responseType, 'blob');
      assert.doesNotMatch(api.getUri(config), /test-session-token/);
      return { data: pdf, status: 200, statusText: 'OK', headers: {}, config };
    };
    assert.equal(await communities.getMaterialFile('material-id'), pdf);
  } finally {
    if (previousWindow === undefined) delete global.window; else global.window = previousWindow;
    if (previousStorage === undefined) delete global.localStorage; else global.localStorage = previousStorage;
  }
});

test('PDF cards expose authenticated actions instead of public upload links', () => {
  const MaterialCard = load('components/communities/MaterialCard.tsx').default;
  const html = renderToStaticMarkup(React.createElement(MaterialCard, {
    material: { id: 'material-id', tipo: 'pdf', titulo: 'Apuntes', fileUrl: '/uploads/materials/test.pdf',
      uploaderId: 'another-user', uploaderNombre: 'Alumno Prueba', createdAt: '2026-11-03T12:00:00.000Z' },
    currentUserId: 'user', onDeleted() {},
  }));
  assert.doesNotMatch(html, /\/uploads\//);
  assert.equal((html.match(/<button\b/g) || []).length, 2);
  assert.match(html, /Descargar/);
});


test('profile editing sends the photo as multipart instead of serializing it as JSON', async () => {
  const cache = new Map();
  const users = load('lib/users.ts', {}, cache);
  const api = load('lib/api.ts', {}, cache).default;
  const photo = new File(['photo-content'], 'photo.png', { type: 'image/png' });
  api.defaults.adapter = async config => {
    assert.equal(config.url, '/auth/profile');
    assert.ok(config.data instanceof FormData);
    assert.equal(config.data.get('nombre'), 'Alumno');
    assert.equal(config.data.get('photo').name, 'photo.png');
    assert.notEqual(config.headers['Content-Type'], 'application/json');
    return { data: { user: { id: 'user', nombre: 'Alumno' } }, status: 200, statusText: 'OK', headers: {}, config };
  };
  assert.equal((await users.updateProfile({ nombre: 'Alumno' }, photo)).id, 'user');
});
