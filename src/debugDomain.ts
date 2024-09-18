import type { Domain, Effect, Event, Store } from 'effector';
import { debug } from 'patronum';

const keys = new WeakSet();

export function debugDomain(domain: Domain, trace = false): void {
	const hook = (u: Event<unknown> | Effect<unknown, unknown, unknown> | Store<unknown>) => {
		if (!keys.has(u)) {
			keys.add(u);
			debug({ trace }, u);
		}
	};

	domain.onCreateStore(hook);
	domain.onCreateEvent(hook);
	domain.onCreateEffect(hook);
}
