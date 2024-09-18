/**
 * Debugging type that will display a fully resolved type
 * in Intellisense instead of just the type aliases
 *
 * @type {T} The type to expand out
 */
export type ExpandRecursively<T> = T extends (...args: infer A) => infer R
	? (...args: ExpandRecursively<A>) => ExpandRecursively<R>
	: T extends object
	? T extends infer O
		? { [K in keyof O]: ExpandRecursively<O[K]> }
		: never
	: T;

export type Expand<T> = T extends (...args: infer A) => infer R
	? (...args: A) => R
	: T extends object
	? T extends infer O
		? { [K in keyof O]: O[K] }
		: never
	: T;

export type NullishAttributes<T> = T extends undefined ? undefined : T extends null ? null : never;

export type PipeFunction<T, R> = (value: T) => R;
export type StrictPipeFunction<T, R> = PipeFunction<NonNullable<T>, R>;
export type MaybePipeFunction<T, R> = PipeFunction<T | null, R | null>;
