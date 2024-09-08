import { nanoid } from 'nanoid';
import { z } from 'zod';

const NotificationId = z.coerce.string().min(1).brand('ERMO Notification Id');
export type NotificationId = z.infer<typeof NotificationId>;
const NotificationStatus = z.enum(['info', 'error', 'success', 'warning']);
type NotificationStatus = z.infer<typeof NotificationStatus>;
export const NotificationStatusEnum = NotificationStatus.enum;
const ButtonProps = z.object({
    title: z.string().min(1),
    onClick: z.function().args(NotificationId).returns(z.void()),
});

interface ButtonProps extends z.infer<typeof ButtonProps> {}

const Locked = z.union([z.boolean(), z.literal('soft')]).brand('Notification Locked Param');
export type Locked = z.infer<typeof Locked>;
export const NotificationProps = z.object({
    id: NotificationId.optional().default(() => nanoid()),
    title: z.string().min(1),
    message: z.string().min(1).optional(),
    status: NotificationStatus,
    memorable: z.boolean().optional().default(false),
    locked: Locked.optional().default(false),
    buttons: z.array(ButtonProps).nonempty().optional(),
});

export interface NotificationProps extends z.infer<typeof NotificationProps> {}

export type NotificationPropsRaw = z.input<typeof NotificationProps>;

export type ExpandRecursively<T> = T extends (...args: infer A) => infer R
    ? (...args: ExpandRecursively<A>) => ExpandRecursively<R>
    : T extends object
      ? T extends infer O
          ? { [K in keyof O]: ExpandRecursively<O[K]> }
          : never
      : T;

export type Expand<T> = T extends (...args: infer A) => infer R
    ? (...args: A) => R
    : T extends object
      ? T extends infer O
          ? { [K in keyof O]: O[K] }
          : never
      : T;

export interface StatefulNotification extends NotificationProps {
    publishedAt: Date;
}
