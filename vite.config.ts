import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig({
	resolve: {
		alias: {
			elkjs: 'elkjs/lib/elk.bundled.js',
		},
	},
	plugins: [
		svgr(),
		react({
			plugins: [
				[
					// 'C:\\Users\\sqred\\Downloads\\Telegram Desktop\\effector_swc_plugin.wasm',
					'@effector/swc-plugin',
					{
						addLoc: true,
						addNames: true,
						factories: [
							'effector-factorio',
							'@farfetched/core',
							'@effector/reflect',
							'@effector/reflect/ssr',
							'@effector/reflect/scope',
							'atomic-router',
							'@withease/factories',
							'patronum',
							'./src/debounceStore',
							'./src/abortable',
							'./src/logEffectFail',
							'effector-storage',
						],
					},
				],
			],
		}),
	],
});
