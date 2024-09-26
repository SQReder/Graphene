import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import del from 'rollup-plugin-delete';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import { visualizer } from 'rollup-plugin-visualizer';

export default {
	input: 'src/index.ts',
	output: [
		{
			dir: 'dist',
			preserveModules: true,
			preserveModulesRoot: 'src',
			sourcemap: true,
			interop: 'auto',
			format: 'cjs',
			exports: 'named',
			entryFileNames: '[name].cjs.js',
		},
		{
			dir: 'dist',
			preserveModules: true,
			preserveModulesRoot: 'src',
			sourcemap: true,
			interop: 'auto',
			format: 'es',
			exports: 'named',
			entryFileNames: '[name].esm.js',
		},
	],
	plugins: [
		peerDepsExternal(),
		typescript({
			// typescript: tspc,
			// tsconfig: './tsconfig.build.json',
		}),
		nodeResolve(),
		commonjs(),
		babel({
			babelHelpers: 'runtime',
			exclude: 'node_modules/**',
			extensions: ['.ts', '.tsx'],
		}),
		terser(),
		del({ targets: 'dist/*' }),
		visualizer(),
	],
};
