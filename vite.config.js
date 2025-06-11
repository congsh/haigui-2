import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    // 配置 historyApiFallback 以支持 SPA 路由
    historyApiFallback: true,
    proxy: {
      '/leancloud/1.1': {
        target: 'https://5zutwsdr.lc-cn-n1-shared.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/leancloud/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from:', req.url, proxyRes.statusCode);
          });
        },
      },
      '/leancloud/1.2': {
        target: 'https://5zutwsdr.lc-cn-n1-shared.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/leancloud/, ''),
      }
    },
    cors: true,
  },
  build: {
    outDir: 'dist',
    minify: true,
    sourcemap: false,
  }
});