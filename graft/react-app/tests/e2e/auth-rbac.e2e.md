# react-app/tests/e2e/auth-rbac.e2e.ts

- AccountKey · type · L3-L3 — type AccountKey = 'master' | 'franqueado' | 'cliente'
- Account · interface · L5-L13 — interface Account
- valueFromEnv · function · L45-L49 — function valueFromEnv(name: string): string
- hasCredentials · function · L51-L53 — function hasCredentials(account: Account): boolean
- routePattern · function · L55-L58 — function routePattern(path: string): RegExp
- assertNoHorizontalOverflow · function · L60-L63 — async function assertNoHorizontalOverflow(page: Page)
- assertNoBlockingError · function · L65-L68 — async function assertNoBlockingError(page: Page)
- loginAs · function · L70-L108 — async function loginAs(page: Page, account: Account)
- logout · function · L110-L113 — async function logout(page: Page)
