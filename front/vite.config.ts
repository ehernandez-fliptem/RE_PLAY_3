import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    optimizeDeps: {
        include: ['face-api.js'],
    },
    server: {
        proxy: {
            '/socket.io': {
                target: 'http://127.0.0.1',
                ws: true
            }
        }
    },
    plugins: [react()],
})
