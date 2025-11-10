import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
    root: rootDir,
    resolve: {
        alias: {
            "@core": resolve(rootDir, "src/core"),
            "@models": resolve(rootDir, "src/models"),
            "@utils": resolve(rootDir, "src/utils"),
            "@helpers": resolve(rootDir, "src/helpers"),
            "@errors": resolve(rootDir, "src/errors"),
        },
    },
    test: {
        environment: "node",
        setupFiles: [],
        restoreMocks: true,
        clearMocks: true,
    },
});
