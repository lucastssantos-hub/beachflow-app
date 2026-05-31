import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// JSX clássico: o código portado do protótipo usa React.createElement (React no escopo)
// base: em produção (GitHub Pages) o app fica em /beachflow-app/; no dev fica em /
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/beachflow-app/' : '/',
  plugins: [react({ jsxRuntime: 'classic' })],
  server: { host: true },
}));
