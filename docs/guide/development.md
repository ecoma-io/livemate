# Development Guide

## Unit & Integration Tests (Vitest)

```bash
# Test một project
pnpm nx test api
pnpm nx test web

# Test tất cả projects
pnpm nx run-many -t test
```

## E2E Tests (Playwright)

```bash
pnpm nx e2e web-e2e
```

## Linting

```bash
# Lint toàn bộ workspace
pnpm nx run-many -t lint

# Lint với autofix
pnpm nx run-many -t lint -- --fix
```

> Husky + lint-staged tự động chạy ESLint trên staged files khi commit.

## Type Checking

```bash
# Typecheck một project
pnpm nx typecheck api
pnpm nx typecheck web

# Typecheck tất cả
pnpm nx run-many -t typecheck
```

## Build

```bash
# Build một project
pnpm nx build api    # wrangler deploy --dry-run (kiểm tra output)
pnpm nx build web    # vite build

# Build tất cả
pnpm nx run-many -t build
```

## Nx Affected (CI-style)

Chỉ chạy trên các project bị ảnh hưởng bởi thay đổi — phù hợp khi muốn mô phỏng CI trên máy local:

```bash
pnpm nx affected -t lint
pnpm nx affected -t typecheck
pnpm nx affected -t test
pnpm nx affected -t build
```

## Commit Convention

Commit message phải theo format **Conventional Commits**:

```
type(scope): message

# Ví dụ:
feat(player): add speed selector
fix(api): handle empty script name
chore(deps): update vite to v7
```

commitlint sẽ chặn commit không đúng format qua Husky `commit-msg` hook.

## Tài liệu liên quan

- [Getting Started](./getting-started.md) — Cài đặt và chạy local
- [Deployment](./deployment.md) — Deploy lên Production
- [CI/CD Pipeline](../devops/ci-cd.md) — Workflow GitHub Actions
