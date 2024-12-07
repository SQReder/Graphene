import type { NodeTypes } from '@xyflow/react';
import { CombineNode, EffectNode, EventNode, FactoryNode, FileNode, SampleNode, StoreNode } from './StoreNode';
import { SyntheticNodeTypes } from './types';

export const nodeTypes: NodeTypes = {
	storeNode: StoreNode,
	eventNode: EventNode,
	effectNode: EffectNode,
	sampleNode: SampleNode,
	factoryNode: FactoryNode,
	combineNode: CombineNode,
	[SyntheticNodeTypes.File]: FileNode,
};
