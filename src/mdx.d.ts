/**
 * In order to import .mdx file without eslint error.
 */
declare module '*.mdx' {
	import type { ComponentType } from 'react';
	const MDXComponent: ComponentType;
	export default MDXComponent;
}
