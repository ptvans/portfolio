import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Built into the portfolio's public/ folder so Create React App copies it into
// the site build; served at <site>/protos/.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../public/protos',
    emptyOutDir: true,
  },
})
