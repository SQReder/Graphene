import {Edge} from "@xyflow/react";

export const LinkType = {
    Crosslink: 'crosslink',
    Regular: 'regular',
} as const;
export type LinkType = (typeof LinkType)[keyof typeof LinkType];

interface Family {
    type: LinkType;
    links: Graphite[];
    owners: Graphite[];
}

export const OpType = {
    Watch: 'watch',
    Store: 'store',
    Event: 'event',
    Map: 'map',
    On: 'on',
    Sample: 'sample',
    FilterMap: 'filterMap',
    Effect: 'effect',
} as const;

type OpType = (typeof OpType)[keyof typeof OpType];

export const MetaType = {
    Factory: 'factory',
};

type MetaType = (typeof MetaType)[keyof typeof MetaType];

type DegenerateMeta = {
    op: typeof OpType.Watch | typeof OpType.On | typeof OpType.Map | typeof OpType.FilterMap;
};

type SampleMeta = {
    joint: number;
    op: typeof OpType.Sample;
};

export type UnitMeta = {
    op: typeof OpType.Store | typeof OpType.Event | typeof OpType.Effect;
    name: string;
    derived: boolean;
};

type FactoryMeta = {
    op: undefined;
    type: typeof MetaType.Factory;
    name: string;
    method: string;
};

export type Meta = DegenerateMeta | UnitMeta | SampleMeta | FactoryMeta;

export interface Graphite {
    id: string;
    family: Family;
    meta: Meta;
    next: Graphite[];
}

export interface MyEdge extends Edge {
    fromId: string;
    toId: string;
    fromFormatted: string;
    toFormatted: string;
    from: Meta;
    to: Meta;
    __graphite_from: Graphite;
    __graphite_to: Graphite;
    isForDeletion: boolean
}

export interface MetaInfo {
    __graphite: Graphite;

    linkedTo: Set<string>;
    meta: Meta;
    type: LinkType;

    [key: string]: unknown;
}
