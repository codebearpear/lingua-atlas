import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // De app staat op https://codebearpear.github.io/lingua-atlas/
  base: '/lingua-atlas/',
  plugins: [react()],
})
