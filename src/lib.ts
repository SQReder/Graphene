import {Meta, MetaType, OpType} from './types.ts';
import {absurd} from './App.tsx';

export function formatMeta(id: string, meta: Meta) {
    const id_ = `[${id}]`;
    switch (meta.op) {
        case OpType.Watch:
            return `${id_} .watch`;
        case OpType.On:
            return `${id_} .on`;
        case OpType.Map:
            return `${id_} .map`;
        case OpType.FilterMap:
            return `${id_} .filterMap`;
        case OpType.Store:
            return `📦 ${id_} ${meta.name}${meta.derived ? ' (derived)' : ''}`;
        case OpType.Event:
            return `🔔 ${id_} ${meta.name}${meta.derived ? ' (derived)' : ''}`;
        case OpType.Sample:
            return `${id_} sample ` + meta.joint;
        case OpType.Effect:
            return `⚡ ${id_}` + meta.name;
        default:
            switch (meta.type) {
                case MetaType.Factory:
                    return 'factory ' + meta.method;
                default:
                    console.log(meta);
                    try {
                        absurd(meta);
                    } catch (e) {
                        console.error(e, meta);
                    }
                    return 'unknown';
            }
    }
}
