import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development the API runs on port 3000; the proxy avoids CORS setup.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
