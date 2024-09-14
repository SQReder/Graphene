export type Comparator<T> = (first: T, second: T) => number;

/**
 * Создаёт комбинированный компаратор из нескольких других.
 * Позволяет удобно сделать цепочку сортировок вида "Сначала по X, затем по Y"
 *
 * @param {Array<Comparator<T>>} comparators Массив компараторов
 * @return {Comparator<T>} Комбинированный компаратор
 */
export function combineComparators<T>(...comparators: Array<Comparator<T>>): Comparator<T> {
	return (first, second) => {
		for (const comparator of comparators) {
			const result = comparator(first, second);
			if (result !== 0) return result;
		}
		return 0;
	};
}
