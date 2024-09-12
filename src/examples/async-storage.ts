import {createEffect, createEvent, createStore, sample} from "effector";

export function createAsyncStorageExample() {
    const init = createEvent();
    const increment = createEvent();
    const decrement = createEvent();
    const reset = createEvent();

    const fetchCountFromAsyncStorageFx = createEffect(async () => {
        // something
    });

    const updateCountInAsyncStorageFx = createEffect(async () => {
        // something
    });

    const $counter = createStore(0);

    sample({
        clock: fetchCountFromAsyncStorageFx.doneData,
        target: init,
    });

    $counter
        .on(init, (_, value) => value)
        .on(increment, (state) => state + 1)
        .on(decrement, (state) => state - 1)
        .reset(reset);

    sample({
        clock: $counter,
        target: updateCountInAsyncStorageFx,
    });

    return {
        init,
        decrement,
        increment,
        reset,
        $counter,
    }
}
