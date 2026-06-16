import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Auth Service: 직접 8081로 프록시 (Gateway Eureka 라우팅 불안정)
      '/api/v1/auth': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
      },
      // Command Service: 8082로 직접 프록시
      '/api/v1/commands': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        secure: false,
      },
      // Price Service - 모니터링 구독 API
      '/api/v1/monitoring': {
        target: 'http://localhost:8083',
        changeOrigin: true,
        secure: false,
      },
      // Payment Service - 지갑 API
      '/api/v1/wallet': {
        target: 'http://localhost:8084',
        changeOrigin: true,
        secure: false,
      },
      // Payment Service - 결제 내역 API
      '/api/v1/payments': {
        target: 'http://localhost:8084',
        changeOrigin: true,
        secure: false,
      },
      // Notification Service - 알림 설정 API
      '/api/notifications': {
        target: 'http://127.0.0.1:8085',
        changeOrigin: true,
        secure: false,
      },
      // Price Service - YouTube 리뷰 기반 추천 API
      '/api/v1/youtube': {
        target: 'http://localhost:8083',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
