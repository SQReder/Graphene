import {NodeTypes} from '@xyflow/react';
import {EffectNode, EventNode, SampleNode, StoreNode} from './StoreNode.tsx';

export const nodeTypes: NodeTypes = {
    storeNode: StoreNode,
    eventNode: EventNode,
    effectNode: EffectNode,
    sampleNode: SampleNode
};
