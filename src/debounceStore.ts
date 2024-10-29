import { createFactory } from '@withease/factories';
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
	return readonly(restore(debounce(source, timeoutMs), defaultState));
};

export const debounceStoreFactory = createFactory(
	<T>({ source, defaultState, timeoutMs }: { source: Store<T>; defaultState: T; timeoutMs: number }): Store<T> => {
		let $result: Store<T>;
		withRegion(source, () => {
			$result = readonly(restore(debounce(source, timeoutMs), defaultState));
		});
		return $result!;
	},
);

export const createBooleanStore = () => createStore(true);
