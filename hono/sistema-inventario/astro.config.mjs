import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
// https://astro.build/config
export default defineConfig({
  adapter: cloudflare(),
  // para que lea D1
  output: "server",
});
