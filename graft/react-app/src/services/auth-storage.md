# react-app/src/services/auth-storage.ts

- isRemember · function · L32-L38 — function isRemember(): boolean
- setRemember · function · L40-L46 — function setRemember(remember: boolean): void
- primaryStorage · function · L48-L50 — function primaryStorage(): Storage
- read · function · L53-L61 — function read(key: string): string | null
- write · function · L63-L69 — function write(key: string, value: string): void
- remove · function · L71-L78 — function remove(key: string): void
- getAccessToken · function · L80-L82 — function getAccessToken(): string | null
- getRefreshToken · function · L84-L86 — function getRefreshToken(): string | null
- getSavedUser · function · L88-L97 — function getSavedUser(): User | null
- saveSession · function · L99-L103 — function saveSession(session: Session): void
- saveUser · function · L105-L107 — function saveUser(user: User): void
- updateAccessToken · function · L109-L112 — function updateAccessToken(accessToken: string, refreshToken?: string): void
- clearSession · function · L114-L118 — function clearSession(): void
- restoreSession · function · L120-L129 — function restoreSession(): Session | null
- saveLastEmail · function · L131-L138 — function saveLastEmail(email: string): void
- getLastEmail · function · L140-L146 — function getLastEmail(): string
