import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
        process.env.VITE_SUPABASE_URL || 'https://rewcifdxtwvwabnxbafx.supabase.co'
      ),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
        process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_6oTfXVQa1z45xtlAfSyK2g_Ad2gs-el'
      ),
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true as const,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
