import type { NodeTypes } from '@xyflow/react';
import { CombineNode, EffectNode, EventNode, FactoryNode, SampleNode, StoreNode } from './StoreNode';

export const nodeTypes: NodeTypes = {
	storeNode: StoreNode,
	eventNode: EventNode,
	effectNode: EffectNode,
	sampleNode: SampleNode,
	factoryNode: FactoryNode,
	combineNode: CombineNode,
};
