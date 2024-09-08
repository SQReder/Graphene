import {NodeTypes} from '@xyflow/react';
import {EffectNode, EventNode, StoreNode} from './StoreNode.tsx';

export const nodeTypes: NodeTypes = {
    storeNode: StoreNode,
    eventNode: EventNode,
    effectNode: EffectNode,
};
