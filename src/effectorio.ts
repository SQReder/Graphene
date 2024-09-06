import { createDomain as originalCreateDomain, Store, Event, Effect } from 'effector';

const rootDomain = originalCreateDomain('Effectorio');

const { createDomain, createEvent, createStore, createEffect } = rootDomain;

const stores: Store<any>[] = [];
const events: Event<any>[] = [];
const effects: Effect<any, any, any>[] = [];

rootDomain.onCreateStore((store) => {
    stores.push(store);
});

rootDomain.onCreateEvent((event) => {
    events.push(event);
});

rootDomain.onCreateEffect((effect) => {
    effects.push(effect);
});

export const units = () => {
    return { stores, events, effects };
};

export { createDomain, createEvent, createStore, createEffect };
