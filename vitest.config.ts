import { defineConfig } from "vitest/config";
import { engineDedupe } from "@loony/loony/vite/config";

export default defineConfig({
    plugins: [engineDedupe()],
    test: {
        include: ["tests/**/*.test.ts"],
        environment: "node",
    },
});
