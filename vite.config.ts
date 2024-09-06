import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react({
    plugins: [["@effector/swc-plugin",{ "addLoc": true, addNames: true, factories: ['effector-factorio', './src/effectorio.ts', '/src/effectorio.ts', 'effectorio.ts', './effectorio.ts'] }]]
  })],
})
