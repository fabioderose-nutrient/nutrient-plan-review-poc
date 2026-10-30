import { defineConfig, loadEnv } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

// The Nutrient Web SDK ships its WASM/worker assets in `nutrient-viewer-lib`.
// They have to be served from the app origin, so copy them next to the bundle.
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  return {
    // Set DEPLOY_BASE (for example /plan-review/) to serve the build from a sub-path.
    base: env.DEPLOY_BASE || "/",
    plugins: [
      viteStaticCopy({
        targets: [
          { src: "node_modules/@nutrient-sdk/viewer/dist/nutrient-viewer-lib", dest: "" },
        ],
      }),
    ],
    server: { port: 5180 },
  };
});
