import { css, type SerializedStyles } from '@emotion/react';
import styled from '@emotion/styled';
import type { NodeProps } from '@xyflow/react';
import { Handle, NodeResizer, Position } from '@xyflow/react';
import type { ReactNode } from 'react';
import { type ConfigurationContextType, useLayouterContext } from './ConfigurationContext';
import { getMetaIcon } from './getMetaIcon';
import { assertIsRegularEffectorDetails } from './lib';
import { type EffectorNode, OpType, type RegularEffectorDetails } from './types';

// Base styles shared across nodes
const baseStyles = css`
	width: 100%;
	height: 100%;
	font-size: 1rem;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 8px 4px;
	border: 1px solid #303030;
`;

// Node type specific styles
const nodeStyles = {
	store: css`
		background: burlywood;
	`,
	event: css`
		background: lightyellow;
	`,
	effect: css`
		background: palegreen;
	`,
	sample: css`
		background: lightblue;
	`,
	factory: css`
		background: rgba(255, 255, 255, 0.5);
	`,
	combine: css`
		background: transparent;
		padding: 0;
	`,
} as const satisfies Record<string, SerializedStyles>;

// Reusable styled components
const Content = styled.div`
	display: flex;
	align-items: center;
	gap: 4px;
`;

const Icon = styled.div``;

const NodeId = styled.div`
	position: absolute;
	top: 2px;
	left: 2px;
	color: rgba(0, 0, 0, 0.5);
	font-size: 0.75rem;
`;

const NodeExpand = styled.div<{ foldState: boolean }>`
	position: absolute;
	top: 2px;
	right: 2px;
	& > button {
		padding: 0;
		width: 16px;
		height: 16px;
		background: ${({ foldState }) => (foldState ? '#ff6666' : '#66ff66')};
	}
`;

// Node container factory
const createNodeContainer = (type: keyof typeof nodeStyles) => styled.div`
	${baseStyles};
	${nodeStyles[type]};
`;

// Special case for combine node
const Circle = styled.div`
	width: 20px;
	height: 20px;
	border-radius: 10px;
	color: #303030;
	background: #ffffffaa;
	border: 1px solid #303030;
	display: flex;
	align-items: center;
	justify-content: center;
	flex: none;
`;

type CustomContextFn = (props: NodeProps<EffectorNode>, context: ConfigurationContextType) => ReactNode;

interface NodeConfig {
	type: keyof typeof nodeStyles;
	getIcon: (data: RegularEffectorDetails) => ReactNode;
	showResizer?: boolean;
	showExpand?: boolean;
	customContent?: CustomContextFn;
}

export const createFlowNode = (config: NodeConfig) => {
	const NodeContainer = createNodeContainer(config.type);

	function FlowNode(props: NodeProps<EffectorNode>) {
		const ctx = useLayouterContext();
		const { layoutDirection, showNodeIds, toggleFactoryNode, unfoldedFactories } = ctx;
		const nodeId = props.data.id;

		const handlePosition = {
			target: layoutDirection === 'horizontal' ? Position.Left : Position.Top,
			source: layoutDirection === 'horizontal' ? Position.Right : Position.Bottom,
		};

		assertIsRegularEffectorDetails(props.data);

		return (
			<NodeContainer>
				{config.showResizer && <NodeResizer isVisible={props.selected} />}
				<Handle type="target" position={handlePosition.target} />
				<Handle type="source" position={handlePosition.source} />

				{showNodeIds && <NodeId>{props.id}</NodeId>}

				{config.customContent ? (
					config.customContent(props, ctx)
				) : (
					<Content>
						<Icon>{config.getIcon(props.data)}</Icon>
						<div>
							<div>{props.data.effector?.name}</div>
						</div>
					</Content>
				)}

				{config.showExpand && props.data[Symbol.for('canBeFoldedByAggressor')] && (
					<NodeExpand foldState={unfoldedFactories.has(nodeId)}>
						<button onClick={() => toggleFactoryNode(nodeId)}>{unfoldedFactories.has(nodeId) ? '-' : '+'}</button>
					</NodeExpand>
				)}
			</NodeContainer>
		);
	}

	// add display name for generated component
	FlowNode.displayName = `FlowNode(${config.type[0]?.toUpperCase() + config.type.slice(1)})`;

	return FlowNode;
};

// Example usage for creating specific nodes
export const StoreNode = createFlowNode({
	type: 'store',
	getIcon: (data) => getMetaIcon(data.effector.meta.value),
});

export const EventNode = createFlowNode({
	type: 'event',
	getIcon: (data) => (data.effector.isMergeEvent ? '〰️' : getMetaIcon(data.effector.meta.value)),
});

export const EffectNode = createFlowNode({
	type: 'effect',
	getIcon: (data) => getMetaIcon(data.effector.meta.value),
});

export const SampleNode = createFlowNode({
	type: 'sample',
	getIcon: (data) => (data.effector.meta.asSample?.joint ? '📊➕🔄' : '📊🔄'),
});

export const FactoryNode = createFlowNode({
	type: 'factory',
	getIcon: (data) => getMetaIcon(data.effector.meta.value),
	showResizer: true,
	showExpand: true,
});

const NodeIdDiv = styled.div`
	color: rgba(0, 0, 0, 0.5);
	font-size: 0.75rem;
	width: max-content;
	min-width: 60px;
	flex: 1;
	text-align: right;
`;

const StyledDiv = styled.div`
	width: 60px;
	font-size: 0.75rem;
	flex: 1;
`;

// Example of custom content for combine node
const combinedNodeCustomContent: CustomContextFn = (props, { showNodeIds }) => (
	<>
		{showNodeIds && <NodeIdDiv>{props.id}</NodeIdDiv>}
		<Circle>
			<Icon>{getMetaIcon({ op: OpType.Combine })}</Icon>
		</Circle>
		<StyledDiv>combine</StyledDiv>
	</>
);

export const CombineNode = createFlowNode({
	type: 'combine',
	getIcon: () => getMetaIcon({ op: OpType.Combine }),
	customContent: combinedNodeCustomContent,
});
