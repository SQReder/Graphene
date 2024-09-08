import { Edge, Node } from '@xyflow/react';
import {Declaration} from "effector/inspect";

export const NodeFamily = {
    Crosslink: 'crosslink',
    Regular: 'regular',
    Declaration: 'declaration',
} as const;
export type NodeFamily = (typeof NodeFamily)[keyof typeof NodeFamily];

interface Family {
    type: NodeFamily;
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
    op: typeof OpType.Store | typeof OpType.Event;
    name: string;
    derived: boolean;
};

export type EffectMeta = {
    op: typeof OpType.Effect;
    name: string;
    attached: number;
};

type FactoryMeta = {
    op: undefined;
    type: typeof MetaType.Factory;
    name: string;
    method: string;
};

export type Meta = DegenerateMeta | UnitMeta | EffectMeta | SampleMeta | FactoryMeta;

export interface Graphite {
    id: string;
    family: Family;
    meta: Meta;
    next: Graphite[];
    scope: {
        fn: (...args: unknown[]) => unknown;
    };
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
    isForDeletion?: boolean;
    collapsed?: EffectorNode[];
}

export interface MetaInfo {
    __graphite: Graphite;

    linkedTo: Set<string>;
    meta: Meta;
    type: NodeFamily;

    [key: string]: unknown;
}

export interface Graph<NodeType extends Node = Node, EdgeType extends Edge = Edge> {
    nodes: NodeType[];
    edges: EdgeType[];
}

export type RegularEffectorNode = Node & {
    id: string;

    nodeType: typeof NodeFamily.Crosslink | typeof NodeFamily.Regular;
    meta: Meta;

    graphite: Graphite;
}

export type DeclarationEffectorNode = Node & {
    id: string;

    nodeType: typeof NodeFamily.Declaration;
    meta: Meta;

    declaration: Declaration;
}

export type EffectorNode = RegularEffectorNode | DeclarationEffectorNode;
export type EffectorGraph = Graph<EffectorNode, MyEdge>;
