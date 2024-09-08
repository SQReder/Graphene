import { attach, createApi, createEvent, createStore, Effect, EventCallable, sample, scopeBind, Store } from 'effector';
import { modelFactory } from 'effector-factorio';
import { createGate } from 'effector-react';
import type { TransitionStatus } from 'react-transition-state';

export function ensureDefined<T>(value: T, message?: string): NonNullable<T> {
    if (value === null || value === undefined) {
        const errorMessage = message ?? `Expected a value, but received ${value === null ? 'null' : 'undefined'}`;
        console.error(errorMessage);
        throw new RangeError(errorMessage);
    }
    return value;
}

export interface UiModel {
    '@@ui': Partial<UnitShapeProtocol>;
    [key: string]: unknown;
}

export type Dictionary<T> = Record<string, T>;

/**
 * @see {@link https://effector.dev/en/ecosystem-development/unit-shape-protocol/}
 */
export interface UnitShapeProtocol {
    // this is expected any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    '@@unitShape': () => Dictionary<EventCallable<any> | Effect<any, any, any> | Store<any>>;
    [key: string]: unknown;
}

import type { NotificationId, NotificationPropsRaw, StatefulNotification } from './types';
import { NotificationProps } from './types';

export const createNotification = (props: NotificationPropsRaw): NotificationProps => NotificationProps.parse(props);

type Params = {
    softDismissTimeoutMs?: number;
};

export const notificationsModelFactory = modelFactory(({ softDismissTimeoutMs = 3000 }: Params) => {
    const Gate = createGate<{
        setItem: (key: unknown) => void;
        deleteItem: (key: unknown) => void;
        toggle: (key: unknown, toEnter?: boolean) => void;
    }>();

    const $notificationList = createStore<{ map: Map<NotificationId, StatefulNotification> }>({ map: new Map() });

    const notificationsApi = createApi($notificationList, {
        add: ({ map }, appended: NotificationProps) => {
            if (map.has(appended.id)) {
                console.warn(`Notification with id ${appended.id} already exists`);
            }

            map.set(appended.id, { ...appended, publishedAt: new Date() });
            return { map };
        },
        remove: ({ map }, id: NotificationId) => {
            if (!map.has(id)) {
                console.warn(`Notification with id ${id} not found`);
            }
            return { map };
        },
    });

    const $transitionApi = Gate.state;

    const setItemFx = attach({
        source: $transitionApi,
        effect(api, notification: NotificationProps) {
            api.setItem(notification.id);
            api.toggle(notification.id, true);
        },
    });
    sample({
        clock: notificationsApi.add,
        target: setItemFx,
    });

    const hideItemFx = attach({
        source: $transitionApi,
        effect(api, id: NotificationId) {
            api.toggle(id, false);
        },
    });

    sample({
        clock: notificationsApi.remove,
        target: hideItemFx,
    });

    const deleteItemFx = attach({
        source: $transitionApi,
        effect(api, id: NotificationId) {
            api.deleteItem(id);
        },
    });

    const notificationResolved = createEvent<{ id: NotificationId; status: TransitionStatus }>();

    sample({
        clock: notificationResolved,
        filter: (pay) => pay.status === 'unmounted',
        fn: (x) => x.id,
        target: deleteItemFx,
    });

    const dismissRequestedById = createEvent<NotificationId>();

    const notificationDismissRequested = sample({
        clock: dismissRequestedById,
        source: $notificationList,
        filter: (notifications, id) => notifications.map.has(id),
        fn: (notifications, id): StatefulNotification => ensureDefined(notifications.map.get(id)),
    });

    const hideNotificationFx = attach({
        source: $transitionApi,
        effect(api, notification: StatefulNotification) {
            api.toggle(notification.id, false);

            const boundShowNotificationFx = scopeBind(showNotificationFx);

            if (notification.locked === 'soft') {
                setTimeout(() => {
                    void boundShowNotificationFx(notification);
                }, softDismissTimeoutMs);
            }
        },
    });

    const showNotificationFx = attach({
        source: $transitionApi,
        effect(api, notification: StatefulNotification) {
            api.toggle(notification.id, false);
        },
    });

    sample({
        clock: sample({
            clock: notificationDismissRequested,
            filter: (notification) => !notification.locked,
        }),
        target: hideNotificationFx,
    });

    const $sortedNotifications = $notificationList.map((items) =>
        Array.from(items.map.values()).sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime())
    );
    return {
        publish: notificationsApi.add,
        unpublish: notificationsApi.remove,
        '@@ui': {
            Gate,
            '@@unitShape': () => ({
                notificationList: $sortedNotifications,
                notificationResolved: notificationResolved,
                dismiss: dismissRequestedById,
            }),
        },
    } satisfies UiModel;
});
