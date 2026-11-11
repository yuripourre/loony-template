import { defineConfig } from "vite";
import { createWebConfig } from "@loony/loony/vite/config";

// Web build (desktop browsers, phones, and VR headset browsers such as Meta Quest Browser).
// See createWebConfig for what the engine sets up; merge your own options with `mergeConfig`.
export default defineConfig(createWebConfig({ root: import.meta.dirname }));
