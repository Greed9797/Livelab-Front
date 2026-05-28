import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

function normalizeProxyTarget(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined
  return raw.trim().replace(/\/v1\/?$/, '').replace(/\/+$/, '')
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = normalizeProxyTarget(env.VITE_DEV_API_PROXY_TARGET)
  const proxyOrigin = env.VITE_DEV_API_PROXY_ORIGIN?.trim() || 'https://livelab-3601f.web.app'
  const appVersion = String(Date.now())

  // Emite dist/version.json no build pra detecção de versão nova em runtime.
  const versionJsonPlugin = {
    name: 'emit-version-json',
    generateBundle() {
      // @ts-expect-error rollup emitFile typing
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ v: appVersion }) })
    },
  }

  return {
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    plugins: [react(), tailwindcss(), versionJsonPlugin],
    esbuild: {
      // Remove console.log + debugger no build de produção pra reduzir bundle.
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            query: ['@tanstack/react-query', 'zustand', 'axios'],
            charts: ['recharts'],
            icons: ['lucide-react'],
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: proxyTarget
        ? {
            '/v1': {
              target: proxyTarget,
              changeOrigin: true,
              secure: true,
              headers: {
                Origin: proxyOrigin,
              },
            },
          }
        : undefined,
    },
  }
})
