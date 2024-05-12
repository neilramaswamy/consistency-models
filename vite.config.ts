import solid from "solid-start/vite";
import { defineConfig } from "vite";
import devtools from "solid-devtools/vite";
import vercel from "solid-start-vercel";

export default defineConfig({
    plugins: [solid({ adapter: vercel() })],
});
