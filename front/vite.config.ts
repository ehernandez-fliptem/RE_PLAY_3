import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const host = env.REPLAY_BACK_HOST || '127.0.0.1';
    const port = env.REPLAY_BACK_PORT || '';
    const target = port ? `http://${host}:${port}` : `http://${host}`;

    return {
        optimizeDeps: {
            include: ['face-api.js'],
        },
        server: {
            proxy: {
                '/socket.io': {
                    target,
                    ws: true
                }
            }
        },
        plugins: [react()],
    };
});
