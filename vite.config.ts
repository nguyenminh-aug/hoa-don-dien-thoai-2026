import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
const base = mode === 'production' && process.env.GITHUB_ACTIONS === 'true' ? '/hoa-don-dien-thoai-2026/' : '/'
return {
  base,
  server: { host: '127.0.0.1', port: 5174, strictPort: true },
  preview: { host: '127.0.0.1', port: 4174, strictPort: true },
  build: { outDir: mode === 'staging' ? 'dist-staging' : 'dist' },
  plugins: [
    react(),
    VitePWA({
      disable: mode !== 'production',
      registerType: 'autoUpdate',
      manifest: {
        name: 'Hóa đơn',
        short_name: 'Hóa đơn',
        description: 'Quản lý khách hàng và tạo hóa đơn.',
        theme_color: '#2563eb',
        background_color: '#f7f9fc',
        display: 'standalone',
        start_url: base,
        icons: [
          { src: 'app-logo-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'app-logo-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
}
})
