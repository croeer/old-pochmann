import { defineConfig } from 'astro/config'

export default defineConfig({
 vite: {
   server: {
     https: {
       key: './localhost-key.pem',
       cert: './localhost.pem',
     },
   },
 },
})
