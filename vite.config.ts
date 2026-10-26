import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  // 같은 파일을 연달아 고치면 기본 감시가 두 번째 변경을 놓쳐 옛 모듈을 내주는 일이 있어 폴링으로 본다.
  server: { port: 5173, watch: { usePolling: true, interval: 200 } },
})
