import { fileURLToPath } from "node:url"
import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
    resolve: {
        alias: {
            "@": fileURLToPath(new URL(".", import.meta.url)),
        },
    },
    test: {
        environment: "node",
        exclude: [...configDefaults.exclude, "tmp/**"],
        // Scrypt and provisioning subprocesses need time under parallel CI load.
        testTimeout: 20000,
        hookTimeout: 30000,
    },
})
