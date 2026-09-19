# react-app/src/services/auth.ts

- login · function · L5-L15 — async function login(email: string, senha: string): Promise<Session>
- logout · function · L17-L23 — async function logout(): Promise<void>
- requestPasswordReset · function · L25-L27 — async function requestPasswordReset(email: string): Promise<void>
- acceptInvite · function · L30-L39 — async function acceptInvite(token: string, nova_senha: string): Promise<Session>
- resetPassword · function · L42-L44 — async function resetPassword(token: string, nova_senha: string): Promise<void>
