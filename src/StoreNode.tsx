import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { Handle, NodeProps, NodeResizer, Position } from '@xyflow/react';
import { useLayouterContext } from './ConfigurationContext';
import { assertIsRegularEffectorDetails, getMetaIcon } from './lib';
import { EffectorNode, OpType, RegularEffectorNode } from './types';

const nodeWidth = css`
	//width: 150px;
`;

const nodeHeight = css`
	height: 40px;
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
	const icon = getMetaIcon(props.data.effector.meta);

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
	const icon = getMetaIcon(props.data.effector.meta);

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
	const icon = getMetaIcon(props.data.effector.meta);

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

	//width: 50px;
	${nodeHeight};

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
				<Icon>{meta.op === 'sample' ? (meta.joint ? '📊➕🔄' : '📊🔄') : '???'}</Icon>
				<div>
					<div>sample</div>
				</div>
			</Content>
		</SampleNodeContainer>
	);
};

const FactoryNodeContainer = styled.div`
	background: #ffffffaa;
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

	const meta = props.data.effector.meta;
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
