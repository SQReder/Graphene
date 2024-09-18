import type { ExpandRecursively, PipeFunction } from './utils';

interface FlowFn {
	<A, B>(a: PipeFunction<A, B>): ExpandRecursively<PipeFunction<A, B>>;

	<A, B, C>(a: PipeFunction<A, B>, b: PipeFunction<B, C>): PipeFunction<A, C>;

	<A, B, C, D>(a: PipeFunction<A, B>, b: PipeFunction<B, C>, c: PipeFunction<C, D>): PipeFunction<A, D>;

	<A, B, C, D, E>(
		a: PipeFunction<A, B>,
		b: PipeFunction<B, C>,
		c: PipeFunction<C, D>,
		d: PipeFunction<D, E>,
	): PipeFunction<A, E>;
}

/**
 * Функция `flow` принимает в качестве аргументов произвольное количество функций и возвращает новую функцию,
 * которая при вызове применит все переданные функции последовательно, слева направо, к входному значению.
 *
 * @function
 * @param {...Function} fns - Функции, которые будут последовательно применены к входному значению.
 * @returns {Function} Функция, применяющая все переданные функции последовательно, слева направо, к входному значению.
 *
 * @example
 * const multiplyByTwo = (x: number) => x * 2;
 * const addThree = (x: number) => x + 3;
 * const myFlow = flow(multiplyByTwo, addThree);
 * console.log(myFlow(5)); // Вернет 13
 */
export const flow: FlowFn = (...fns: Array<PipeFunction<unknown, unknown>>): PipeFunction<unknown, unknown> => {
	return (value) => fns.reduce((acc, fn) => fn(acc), value);
};
