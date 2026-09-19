# react-app/src/services/api.ts

- resolveBaseUrl · function · L6-L23 — function resolveBaseUrl(): string
- isAuthPath · function · L39-L41 — function isAuthPath(path = ''): boolean
- refreshAccessToken · function · L43-L68 — async function refreshAccessToken(): Promise<string | null>
- extractErrorMessage · function · L99-L117 — function extractErrorMessage(error: unknown): string
- apiGet · function · L119-L122 — async function apiGet<T>(path: string, params?: Record<string, unknown>): Promise<T>
- apiPost · function · L124-L127 — async function apiPost<T>(path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
- apiPatch · function · L129-L132 — async function apiPatch<T>(path: string, data?: unknown): Promise<T>
- apiDelete · function · L134-L137 — async function apiDelete<T>(path: string): Promise<T>
- apiPut · function · L139-L142 — async function apiPut<T>(path: string, body?: unknown, params?: Record<string, unknown>): Promise<T>
- apiUpload · function · L144-L158 — async function apiUpload<T>( path: string, file: File, params?: Record<string, unknown>, config?: AxiosRequestConfig, ): Promise<T>
- apiGetBlob · function · L160-L163 — async function apiGetBlob(path: string, params?: Record<string, unknown>): Promise<Blob>
