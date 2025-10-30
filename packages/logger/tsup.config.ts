import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    outDir: 'dist',
    target: 'es2022',
    treeshake: true,
    outExtension: ({ format }) => ({
        js: format === 'esm' ? '.mjs' : '.cjs',
        dts: '.d.ts',
    }),
});
