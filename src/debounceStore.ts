import { createStore, restore, type Store } from 'effector';
import { debounce, readonly } from 'patronum';

export const debounceStore = <T>({
	source,
	defaultState,
	timeoutMs,
}: {
	source: Store<T>;
	defaultState: T;
	timeoutMs: number;
}): Store<T> => readonly(restore(debounce(source, timeoutMs), defaultState));

export const createBooleanStore = () => createStore(true);
