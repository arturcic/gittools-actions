import { resolve } from 'node:path'
import { builtinModules } from 'node:module'
import { defineConfig, UserConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export function viteConfig(entry: { [p: string]: string }, manualChunks: (id: string) => string | undefined): UserConfig {
    return defineConfig({
        root: resolve(__dirname, '..'),
        esbuild: {
            target: 'node20'
        },
        plugins: [
            tsconfigPaths({
                root: '..'
            })
        ],
        build: {
            target: 'esnext',
            lib: {
                formats: ['es'],
                entry
            },
            rollupOptions: {
                external: [...builtinModules, ...builtinModules.map(module => `node:${module}`)],
                output: {
                    entryFileNames: '[name].js',
                    chunkFileNames: '[name].js',
                    manualChunks: (id: string) => {
                        if (id.includes('node_modules/semver') || id.includes('node_modules/lru-cache') || id.includes('node_modules/yallist')) {
                            return `libs/semver`
                        }
                        const chunk = manualChunks(id)
                        if (chunk) {
                            return chunk
                        }
                    }
                }
            },
            emptyOutDir: false,
            sourcemap: true,
            minify: false
        }
    } as UserConfig)
}
