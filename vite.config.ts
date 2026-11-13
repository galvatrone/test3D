import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Lets dist/index.html work when opened straight from disk (file://) as well as from any host:
 * browsers block <script type="module"> and crossorigin requests on file://, so the build ships
 * one classic deferred script and plain stylesheet links instead.
 */
function classicScriptForFileProtocol(): Plugin {
  return {
    name: 'classic-script-for-file-protocol',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      return html
        .replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, '<script defer src="$1"></script>')
        .replace(/<link rel="stylesheet" crossorigin href=/g, '<link rel="stylesheet" href=')
        .replace(/<link rel="modulepreload"[^>]*>\n?/g, '')
    },
  }
}

// base './' keeps every asset path relative, so the build runs from any folder or sub-path.
export default defineConfig({
  base: './',
  plugins: [react(), classicScriptForFileProtocol()],
  build: {
    // images imported from src/assets are inlined as data URLs (see src/lib/assets.ts)
    assetsInlineLimit: 3_000_000,
    modulePreload: false,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/app-[hash].js',
      },
    },
  },
})
