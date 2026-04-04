# Copilot Instructions

## Stack

- **Monorepo**: Nx with pnpm
- **Frontend** (`apps/web`): Vue 3 + TypeScript, Pinia, Vue Router, PrimeVue, vue-i18n
- **Backend** (`apps/api`): Hono on Cloudflare Workers, Drizzle ORM + D1 (SQLite) + R2 storage
- **Tests**: Vitest (unit), Playwright (e2e in `apps/web-e2e`)

## TypeScript Rules

**Never use the non-null assertion operator `!`.**
The rule `@typescript-eslint/no-non-null-assertion` is enforced in all non-test files.
Use optional chaining (`?.`), nullish coalescing (`??`), or proper type guards instead.

```ts
// ❌ Wrong
const name = user!.name;

// ✅ Correct
const name = user?.name ?? '';
if (!user) return;
const name = user.name;
```

**Never use `any` type.**
The rule `@typescript-eslint/no-explicit-any` is enforced in all non-test files.
Use `unknown`, proper interfaces, generics, or type guards.

```ts
// ❌ Wrong
function process(data: any) { ... }

// ✅ Correct
function process(data: unknown) { ... }
function process<T extends Record<string, string>>(data: T) { ... }
```

**Other active compiler flags:** `noUnusedLocals` — remove every unused import/variable; `noImplicitReturns` — every code path must return a value; `noImplicitOverride` — use `override` keyword when overriding.

## Vue Rules

**Always use `<script setup lang="ts">`** for Vue SFCs. Never use Options API.

**`v-for` always needs `:key`. Never put `v-if` and `v-for` on the same element** — use a wrapping `<template v-for>` instead.

```vue
<!-- ❌ Wrong -->
<li v-for="item in items" v-if="item.active">

<!-- ✅ Correct -->
<template v-for="item in items" :key="item.id">
  <li v-if="item.active">{{ item.name }}</li>
</template>
```

**Use shorthand syntax** — `:prop`, `@event` not `v-bind:prop`, `v-on:event`. **Self-close empty elements** — `<MyComponent />` not `<MyComponent></MyComponent>`.

## Vue Component Conventions

- Pinia stores use the **setup store** pattern only — never the options store pattern.
- Props: `defineProps<{ ... }>()` | Emits: `defineEmits<{ ... }>()` — generic syntax, no runtime validation object.
- Component file names and usage: PascalCase (`AppHeader.vue`, `<AppHeader />`).
- **All user-visible strings use `useI18n()` and `t()`** — never hardcode display strings in templates or script. Add new keys to both `locales/en.ts` and `locales/vi.ts`.

## Pinia Store Pattern

Async actions hold `loading` and `error` state. Views display errors via `useToast()`. Use `useConfirm()` for destructive confirmations — never `window.confirm`.

```ts
export const useMyStore = defineStore('my', () => {
  const items = ref<Item[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchItems() {
    loading.value = true;
    error.value = null;
    try {
      items.value = await api.getItems();
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  }

  return { items, loading, error, fetchItems };
});
```

## Hono API Conventions (Backend)

- Route files export a `new Hono<AppType>()` instance; they are mounted in `src/index.ts`.
- Validate inputs with early returns — `c.json({ error: 'Message' }, 400)`.
- Status codes: `201` for POST create, `204` for DELETE (no body), `400` for validation errors, `404` for not found.
- Access the DB via `c.get('db')` (injected by middleware) — not `c.env.DB` directly in routes.

```ts
const app = new Hono<AppType>();

app.post('/', async (c) => {
  const body = await c.req.json<{ name?: string }>();
  const name = body.name?.trim();
  if (!name) return c.json({ error: 'Name is required' }, 400);
  // ... success path
  return c.json(result, 201);
});

export default app;
```

## Drizzle ORM Conventions

- Eager loading uses `findMany`/`findFirst` with `with:` — not manual joins.
- Use `sql\`(datetime('now'))\``for`updatedAt`in mutations — not JS`new Date()`.
- Relations are defined separately with `relations()` — not inline in table definitions.
- Primary keys are UUID text strings — never auto-increment integers.

```ts
// ✅ Eager loading
const result = await db.query.scripts.findMany({
  with: { tracks: { with: { variants: true } } },
});

// ✅ Mutation with SQL timestamp
await db
  .update(scripts)
  .set({ name, updatedAt: sql`(datetime('now'))` })
  .where(eq(scripts.id, id));
```

## Services

- All API calls go through `apps/web/src/services/api.ts` (`fetchApi<T>` wrapper) — never call `fetch` directly in components or stores.
- Service singletons are exported as `export const myService = new MyService()`.

## Testing Patterns

**Backend route tests (Vitest):** Mock `db` with `vi.fn()`, inject via middleware into a new `Hono<AppType>()` app:

```ts
app.use('*', async (c, next) => {
  c.set('db', mockDb);
  await next();
});
app.route('/scripts', scriptRoutes);
const res = await app.request('/scripts');
```

**Frontend API tests (Vitest):** Spy on `globalThis.fetch`:

```ts
vi.spyOn(globalThis, 'fetch').mockResolvedValue({
  ok: true,
  json: () => Promise.resolve(data),
} as Response);
```

**Vue component tests (Vitest):** Mount with required plugins:

```ts
mount(MyComponent, { global: { plugins: [createPinia(), PrimeVue, i18n] } });
```

**E2E (Playwright):** Use `TestScriptTracker` from `helpers/api.ts` for data cleanup in `afterEach`, and `navigateTo()` from `helpers/pages.ts` for in-app navigation.

## Build & Test Commands

```bash
# Lint (with autofix)
nx run-many -t lint --fix

# Unit tests (all projects)
nx run-many -t test

# Dev servers
nx serve api        # Hono on :18181 — applies local D1 migrations first
nx serve web        # Vite on :5173

# E2E
npx nx e2e web-e2e
```
