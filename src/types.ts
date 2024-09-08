import { Edge, Node } from '@xyflow/react';
import { Declaration } from 'effector/inspect';

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
    Combine: 'combine',
} as const;

type OpType = (typeof OpType)[keyof typeof OpType];

export const MetaType = {
    Factory: 'factory',
};

type MetaType = (typeof MetaType)[keyof typeof MetaType];

type DegenerateMeta = {
    op: typeof OpType.Watch | typeof OpType.On | typeof OpType.Map | typeof OpType.FilterMap | typeof OpType.Combine;
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

export interface MyEdge extends Edge<{label?: string, edgeType: 'reactive' | 'owns' | 'link' | 'unknown'}> {
    relatedNodes: {
        source: EffectorNode;
        target: EffectorNode;
        collapsed?: EffectorNode[];
    };
}

export interface Graph<NodeType extends Node = Node, EdgeType extends Edge = Edge> {
    nodes: NodeType[];
    edges: EdgeType[];
}

export class EffectorNodeDetails {
    get graphite(): Graphite {
        return this._graphite;
    }

    private readonly _graphite: Graphite;

    constructor(graphite: Graphite) {
        this._graphite = graphite;
    }

    get type(): typeof NodeFamily.Regular | typeof NodeFamily.Crosslink {
        const type = this._graphite.family.type;

        if (type === NodeFamily.Declaration) {
            throw new RangeError('Unexpected declaration type');
        }

        return type;
    }

    get meta(): Meta {
        return this._graphite.meta;
    }
}

export class EffectorDeclarationDetails {
    get declaration(): Declaration {
        return this._declaration;
    }

    private readonly _declaration: Declaration;

    constructor(declaration: Declaration) {
        this._declaration = declaration;
    }

    get type(): 'unit' | 'factory' | 'region' {
        return this._declaration.type;
    }

    get meta(): Record<string, unknown> {
        return this._declaration.meta;
    }
}

export type RegularEffectorDetails = {
    nodeType: typeof NodeFamily.Regular | typeof NodeFamily.Crosslink;
    effector: EffectorNodeDetails;
};

export type DeclarationEffectorDetails = {
    nodeType: typeof NodeFamily.Declaration;
    declaration: EffectorDeclarationDetails;
};

export type RegularEffectorNode = Node<{ label: string } & RegularEffectorDetails>;
export type DeclarationEffectorNode = Node<{ label: string } & DeclarationEffectorDetails>;

export type EffectorNode = RegularEffectorNode | DeclarationEffectorNode;
export type EffectorGraph = Graph<EffectorNode, MyEdge>;
