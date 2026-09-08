import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Hóa đơn',
        short_name: 'Hóa đơn',
        description: 'Quản lý khách hàng và tạo hóa đơn.',
        theme_color: '#2563eb',
        background_color: '#f7f9fc',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/app-logo-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/app-logo-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})
