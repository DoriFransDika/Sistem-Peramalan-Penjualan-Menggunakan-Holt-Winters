import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
    ],
    server: {
        host: '0.0.0.0',
        port: 5174,

        hmr: {
            host: 'prodigy-anywhere-buckshot.ngrok-free.dev',
            protocol: 'wss',
            clientPort: 443,
        },
    },
});
