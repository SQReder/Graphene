export function ensureDefined<T>(value: T, message?: string): NonNullable<T> {
	if (value === null || value === undefined) {
		const errorMessage = message ?? `Expected a value, but received ${value === null ? 'null' : 'undefined'}`;
		console.error(errorMessage);
		throw new RangeError(errorMessage);
	}
	return value;
}
