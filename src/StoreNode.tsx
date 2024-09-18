import { css } from '@emotion/react';
import styled from '@emotion/styled';
import type { NodeProps } from '@xyflow/react';
import { Handle, NodeResizer, Position } from '@xyflow/react';
import { useLayouterContext } from './ConfigurationContext';
import { assertIsRegularEffectorDetails, ensureDefined, getMetaIcon } from './lib';
import type { EffectorNode, RegularEffectorNode } from './types';

const nodeWidth = css`
	width: 100%;
`;

const nodeHeight = css`
	height: 100%;
`;

const StoreNodeContainer = styled.div`
	background: burlywood;
	${nodeWidth};
	${nodeHeight};

	font-size: 1rem;

	display: flex;
	align-items: center;
	justify-content: center;

	padding: 8px 4px;
`;

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

export const StoreNode = (props: NodeProps<EffectorNode>) => {
	const { layoutDirection, showNodeIds } = useLayouterContext();

	assertIsRegularEffectorDetails(props.data);

	const name = props.data.effector.name;
	const icon = getMetaIcon(props.data.effector.meta.value);

	return (
		<StoreNodeContainer>
			{/*<Handle type='target' position={Position.Top} style={{ left: 10 }} />*/}
			<Handle type="target" position={layoutDirection === 'horizontal' ? Position.Left : Position.Top} />
			<Handle type="source" position={layoutDirection === 'horizontal' ? Position.Right : Position.Bottom} />

			{showNodeIds && <NodeId>{props.id}</NodeId>}
			<Content>
				<Icon>{icon}</Icon>
				<div>
					<div>{name}</div>
				</div>
			</Content>
		</StoreNodeContainer>
	);
};

const EventNodeContainer = styled.div`
	background: lightyellow;
	${nodeWidth};
	${nodeHeight};

	font-size: 1rem;

	display: flex;
	align-items: center;
	justify-content: center;

	padding: 8px 4px;
`;

export const EventNode = (props: NodeProps<EffectorNode>) => {
	const { layoutDirection, showNodeIds } = useLayouterContext();

	assertIsRegularEffectorDetails(props.data);

	const name = props.data.effector.name;
	const icon = getMetaIcon(props.data.effector.meta.value);

	return (
		<EventNodeContainer>
			<Handle type="target" position={layoutDirection === 'horizontal' ? Position.Left : Position.Top} />
			<Handle type="source" position={layoutDirection === 'horizontal' ? Position.Right : Position.Bottom} />

			{showNodeIds && <NodeId>{props.id}</NodeId>}
			<Content>
				<Icon>{icon}</Icon>
				<div>
					<div>{name}</div>
				</div>
			</Content>
		</EventNodeContainer>
	);
};

const EffectNodeContainer = styled.div`
	background: palegreen;
	${nodeWidth};
	${nodeHeight};

	font-size: 1rem;

	display: flex;
	align-items: center;
	justify-content: center;

	padding: 8px 4px;
`;

export const EffectNode = (props: NodeProps) => {
	const { layoutDirection, showNodeIds } = useLayouterContext();

	assertIsRegularEffectorDetails(props.data);

	const name = props.data.effector.name;
	const icon = getMetaIcon(props.data.effector.meta.value);

	return (
		<EffectNodeContainer>
			<Handle type="target" position={layoutDirection === 'horizontal' ? Position.Left : Position.Top} />
			<Handle type="source" position={layoutDirection === 'horizontal' ? Position.Right : Position.Bottom} />

			{showNodeIds && <NodeId>{props.id}</NodeId>}
			<Content>
				<Icon>{icon}</Icon>
				<div>
					<div>{name}</div>
				</div>
			</Content>
		</EffectNodeContainer>
	);
};

const SampleNodeContainer = styled.div`
	background: lightblue;
	${nodeHeight};
	${nodeWidth};

	font-size: 1rem;

	display: flex;
	align-items: center;
	justify-content: center;

	padding: 8px 4px;
`;

export const SampleNode = (props: NodeProps) => {
	const { layoutDirection, showNodeIds } = useLayouterContext();

	assertIsRegularEffectorDetails(props.data);

	const meta = props.data.effector.meta;

	return (
		<SampleNodeContainer>
			<Handle type="target" position={layoutDirection === 'horizontal' ? Position.Left : Position.Top} />
			<Handle type="source" position={layoutDirection === 'horizontal' ? Position.Right : Position.Bottom} />

			{showNodeIds && <NodeId>{props.id}</NodeId>}
			<Content>
				<Icon>{meta.asSample?.joint ? '📊➕🔄' : '📊🔄'}</Icon>
				<div>
					<div>sample</div>
				</div>
			</Content>
		</SampleNodeContainer>
	);
};

const FactoryNodeContainer = styled.div`
	background: transparent;
	${nodeWidth};
	${nodeHeight};

	font-size: 1rem;

	display: flex;
	align-items: center;
	justify-content: center;

	padding: 8px 4px;
`;

export const FactoryNode = (props: NodeProps<RegularEffectorNode>) => {
	const { layoutDirection, showNodeIds } = useLayouterContext();

	const meta = ensureDefined(props.data.effector.meta.asFactory);
	const icon = getMetaIcon(meta);

	return (
		<FactoryNodeContainer>
			<NodeResizer isVisible={props.selected} />
			<Handle type="target" position={layoutDirection === 'horizontal' ? Position.Left : Position.Top} />
			<Handle type="source" position={layoutDirection === 'horizontal' ? Position.Right : Position.Bottom} />

			{showNodeIds && <NodeId>{props.id}</NodeId>}
			<Content>
				<Icon>{icon}</Icon>
				<div>
					<div>{meta.op === undefined ? `${meta.method}(${meta.name})` : '???'}</div>
				</div>
			</Content>
		</FactoryNodeContainer>
	);
};

const nodeCircleSize = css`
	width: 100%;
	height: 100%;
`;

const CombineNodeContainer = styled.div`
	background: #ffffffaa;
	${nodeCircleSize};

	font-size: 1rem;

	display: flex;
	align-items: center;
	justify-content: center;

	//padding: 8px 4px;
	position: relative;
	border-radius: 10px;
`;

const CombineNodeLabel = styled.div`
	position: absolute;
	left: calc(100% + 4px);
`;

const CombineNodeId = styled.div`
	position: absolute;
	right: calc(100% + 4px);

	color: rgba(0, 0, 0, 0.5);

	font-size: 0.75rem;
`;

export const CombineNode = (props: NodeProps<RegularEffectorNode>) => {
	const { layoutDirection, showNodeIds } = useLayouterContext();

	const meta = props.data.effector.meta.value;
	const icon = getMetaIcon(meta);

	return (
		<CombineNodeContainer>
			<Handle type="target" position={layoutDirection === 'horizontal' ? Position.Left : Position.Top} />
			<Handle type="source" position={layoutDirection === 'horizontal' ? Position.Right : Position.Bottom} />

			{showNodeIds && <CombineNodeId>{props.id}</CombineNodeId>}
			<Content>
				<Icon>{icon}</Icon>
			</Content>
			<CombineNodeLabel>combine</CombineNodeLabel>
		</CombineNodeContainer>
	);
};
