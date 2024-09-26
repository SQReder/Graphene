import { createStore, restore, type Store, withRegion } from 'effector';
import { debounce, readonly } from 'patronum';

export const debounceStore = <T>({
	source,
	defaultState,
	timeoutMs,
}: {
	source: Store<T>;
	defaultState: T;
	timeoutMs: number;
}): Store<T> => {
	let $debouncedStore: Store<T>;

	withRegion(source, () => {
		$debouncedStore = readonly(restore(debounce(source, timeoutMs), defaultState));
	});

	return $debouncedStore!;
};

export const createBooleanStore = () => createStore(true);
