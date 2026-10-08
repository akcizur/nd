import { defineConfig } from 'vite';
export default defineConfig(({mode})=>({
  base:mode==='production'?'/nd/':'/',
  server:{host:'0.0.0.0',port:5173,strictPort:false},
  preview:{host:'0.0.0.0',port:4173},
  build:{target:'es2022',sourcemap:false,assetsDir:'assets'}
}));