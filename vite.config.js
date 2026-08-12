import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';
export default defineConfig({
    plugins: [
        vue(),
        nodePolyfills({
            globals: {
                Buffer: true,
                global: true,
                process: true
            }
        })
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    server: {
        port: 5174,
        open: false,
        proxy: {
            '/api-washu': {
                target: 'https://lambda.epigenomegateway.org',
                changeOrigin: true,
                rewrite: function (path) { return path.replace(/^\/api-washu/, ''); }
            },
            '/api-chipseq': {
                target: 'http://10.1.20.6:8080',
                changeOrigin: true,
                rewrite: function (path) { return path.replace(/^\/api-chipseq/, ''); },
                configure: function (proxy) {
                    proxy.on('proxyReq', function (proxyReq, req) {
                        if (req.headers.range) {
                            proxyReq.setHeader('range', req.headers.range);
                        }
                    });
                    proxy.on('proxyRes', function (proxyRes) {
                        proxyRes.headers['access-control-allow-origin'] = '*';
                        proxyRes.headers['access-control-allow-headers'] = 'Range, Content-Type, Authorization';
                        proxyRes.headers['access-control-allow-methods'] = 'GET, HEAD, OPTIONS';
                        proxyRes.headers['access-control-expose-headers'] = 'Content-Range, Content-Length, Accept-Ranges';
                    });
                }
            }
        }
    }
});
