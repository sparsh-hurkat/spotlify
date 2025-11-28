import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/spotlify/', // GitHub Pages base path
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.PINECONE_API_KEY': JSON.stringify(env.PINECONE_API_KEY || ''),
        'process.env.PINECONE_INDEX_URL': JSON.stringify(env.PINECONE_INDEX_URL || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        assetsDir: 'assets',
        rollupOptions: {
          output: {
            assetFileNames: 'assets/[name].[ext]',
            chunkFileNames: 'assets/[name]-[hash].js',
            entryFileNames: 'assets/[name]-[hash].js'
          }
        }
      }
    };
});
