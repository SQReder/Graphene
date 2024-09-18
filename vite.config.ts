import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
	resolve: {
		alias: {
			elkjs: 'elkjs/lib/elk.bundled.js',
		},
	},
	plugins: [
		react({
			plugins: [
				[
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
						],
					},
				],
			],
		}),
	],
});
