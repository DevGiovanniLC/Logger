import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        'Transport/index': 'src/core/Transport/index.ts',
        'Formatter/index': 'src/core/Formatter/index.ts'
    },
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
