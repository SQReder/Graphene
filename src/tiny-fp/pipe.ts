import type { PipeFunction } from './utils';

interface Pipe {
	<A, B>(value: A, a: PipeFunction<A, B>): B;

	<A, B, C>(value: A, a: PipeFunction<A, B>, b: PipeFunction<B, C>): C;

	<A, B, C, D>(value: A, a: PipeFunction<A, B>, b: PipeFunction<B, C>, c: PipeFunction<C, D>): D;

	<A, B, C, D, E>(
		value: A,
		a: PipeFunction<A, B>,
		b: PipeFunction<B, C>,
		c: PipeFunction<C, D>,
		d: PipeFunction<D, E>,
	): E;
}

/**
 * Функция `pipe` принимает в качестве аргументов значение и произвольное количество функций,
 * который будут применены последовательно, слева направо, к входному значению.
 *
 * @function
 * @param {T} value Значение к которому нужно применить трансформации
 * @param {...Function} fns - Функции, которые будут последовательно применены к входному значению.
 * @returns {R} Результат применения переданных функций ко входному значению
 *
 * @example
 * const multiplyByTwo = (x: number) => x * 2;
 * const addThree = (x: number) => x + 3;
 * console.log(pipe(5, multiplyByTwo, addThree)); // Вернет 13
 */
export const pipe: Pipe = (value: unknown, ...fns: Array<PipeFunction<unknown, unknown>>): unknown =>
	fns.reduce((acc, fn) => fn(acc), value);
