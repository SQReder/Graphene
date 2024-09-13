import styled from '@emotion/styled';
import {
	applyEdgeChanges,
	applyNodeChanges,
	Background,
	Controls,
	MiniMap,
	OnEdgesChange,
	OnNodesChange,
	ReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useUnit } from 'effector-react';
import { FC, useCallback, useEffect, useState } from 'react';
import { useDarkMode } from 'usehooks-ts';
import './App.css';
import { ConfigurationContext } from './ConfigurationContext';
import { GraphVariant } from './lib';
import { appModelFactory, EdgesViewVariant } from './model';
import { nodeTypes } from './nodeTypes';
import { EffectorNode, MyEdge } from './types';

export const App: FC<{ model: ReturnType<typeof appModelFactory> }> = ({ model }) => {
	const {
		nodes,
		nodesChanged,
		edges,
		edgesChanged,
		nodeClicked,
		edgeClicked,
		selectedGraphVariant,
		graphVariantChanged,
		edgesVariantChanged,
	} = useUnit(model);

	useEffect(() => {
		console.log('🙅', nodes);
	}, [nodes]);
	useEffect(() => {
		console.log('🏭🏭🏭', edges);
	}, [edges]);
	useEffect(() => {
		console.log('⚡', selectedGraphVariant);
	}, [selectedGraphVariant]);

	const onNodesChange = useCallback<OnNodesChange<EffectorNode>>(
		(changes) => nodesChanged(applyNodeChanges(changes, nodes)),
		[nodes, nodesChanged],
	);

	const onEdgesChange = useCallback<OnEdgesChange<MyEdge>>(
		(changes) => edgesChanged(applyEdgeChanges<MyEdge>(changes, edges)),
		[edges, edgesChanged],
	);

	const [replaceNodes, setReplaceNodes] = useState(true);
	const [showNodeIds, setShowNodeIds] = useState(true);

	const { isDarkMode } = useDarkMode({});

	console.log(nodes);

	const setGraph = useCallback(
		(edges: EdgesViewVariant, stage: GraphVariant) => {
			edgesVariantChanged(edges);
			graphVariantChanged(stage);
		},
		[edgesVariantChanged, graphVariantChanged],
	);

	return (
		<ConfigurationContext.Provider value={{ layoutDirection: 'vertical', showNodeIds }}>
			<Buttons>
				<button onClick={() => edgesVariantChanged(EdgesViewVariant.Reactive)}>Reactive</button>
				<button onClick={() => edgesVariantChanged(EdgesViewVariant.Ownership)}>Ownership</button>
				<button onClick={() => edgesVariantChanged(EdgesViewVariant.ReactiveOwnership)}>Reactive + Ownership</button>
				<hr />

				<button onClick={() => graphVariantChanged(GraphVariant.raw)}>Raw</button>
				<button onClick={() => graphVariantChanged(GraphVariant.cleaned)}>Cleaned</button>
				<button onClick={() => graphVariantChanged(GraphVariant.cleanedNoNodes)}>CleanedNoNodes</button>
				<button onClick={() => graphVariantChanged(GraphVariant.cleanedNoNodesLayouted)}>CleanedNoNodesLayouted</button>
				<hr />

				<button onClick={() => setGraph(EdgesViewVariant.Reactive, GraphVariant.raw)}>Reactive Raw</button>
				<button onClick={() => setGraph(EdgesViewVariant.Reactive, GraphVariant.cleaned)}>Reactive Cleaned</button>
				<button onClick={() => setGraph(EdgesViewVariant.Reactive, GraphVariant.cleanedNoNodes)}>
					Reactive CleanedNoNodes
				</button>
				<button onClick={() => setGraph(EdgesViewVariant.Reactive, GraphVariant.cleanedNoNodesLayouted)}>
					Reactive CleanedNoNodesLayouted
				</button>
				<hr />

				<button onClick={() => setGraph(EdgesViewVariant.Ownership, GraphVariant.raw)}>Ownership Raw</button>
				<button onClick={() => setGraph(EdgesViewVariant.Ownership, GraphVariant.cleaned)}>Ownership Cleaned</button>
				<button onClick={() => setGraph(EdgesViewVariant.Ownership, GraphVariant.cleanedNoNodes)}>
					Ownership CleanedNoNodes
				</button>
				<button onClick={() => setGraph(EdgesViewVariant.Ownership, GraphVariant.cleanedNoNodesLayouted)}>
					Ownership CleanedNoNodes Layouted
				</button>

				<hr />

				{/*<button onClick={() => setViewMode('rx-ownership-graph')}>Reactive + Ownership</button>*/}
				{/*<hr />*/}
				{/*<Fieldset>*/}
				{/*	<legend>Visible edges</legend>*/}
				{/*	<label>*/}
				{/*		<input type="radio" checked={visibleEdges === 'rx'} onChange={() => setVisibleEdges('rx')} />*/}
				{/*		Reactive*/}
				{/*	</label>*/}
				{/*	<label>*/}
				{/*		<input type="radio" checked={visibleEdges === 'ownership'} onChange={() => setVisibleEdges('ownership')} />*/}
				{/*		Ownership*/}
				{/*	</label>*/}
				{/*	<label>*/}
				{/*		<input*/}
				{/*			type="radio"*/}
				{/*			checked={visibleEdges === 'rx+ownership'}*/}
				{/*			onChange={() => setVisibleEdges('rx+ownership')}*/}
				{/*		/>*/}
				{/*		Reactive + Ownership*/}
				{/*	</label>*/}
				{/*</Fieldset>*/}
				<label title={'Hack to save nodes positions when switching between views'}>
					<input type="checkbox" checked={replaceNodes} onChange={(e) => setReplaceNodes(e.target.checked)} />
					Replace nodes
				</label>
				<label title={'Show node ids in the graph'}>
					<input type="checkbox" checked={showNodeIds} onChange={(e) => setShowNodeIds(e.target.checked)} />
					Show node ids
				</label>
				<hr />
				<Legend>
					<div>
						<strong>legend</strong>
					</div>
					<ul>
						<li>📦 - store</li>
						<li>🔔 - event</li>
						<li>⚡️ - effect</li>
						<li>⚡️~⚡️ - attached effect</li>
						<li>🏭 - factory</li>
					</ul>
				</Legend>
			</Buttons>
			<div style={{ width: '100%', height: '100%' }}>
				<ReactFlow
					snapGrid={[10, 10]}
					snapToGrid
					nodes={nodes}
					onNodesChange={onNodesChange}
					onNodeClick={(_, node) => {
						console.log('👉👉👉 node', node);
						return nodeClicked(node);
					}}
					edges={edges}
					onEdgesChange={onEdgesChange}
					onEdgeClick={(_, edge) => edgeClicked(edge)}
					fitView
					nodeTypes={nodeTypes}
				>
					<Background bgColor={isDarkMode ? '#303030' : undefined} color={'#ccc'} />
					<MiniMap pannable zoomable bgColor={isDarkMode ? '#303030' : undefined} />
					<Controls />
				</ReactFlow>
			</div>
		</ConfigurationContext.Provider>
	);
};

const Box = styled.div`
	display: flex;
	flex-flow: column;
	gap: 4px;
	// thin gray border
	border: 1px solid #ccc;
	padding: 4px;

	background: rgba(255, 255, 255, 0.75);
`;

const Buttons = styled(Box)`
	position: absolute;
	top: 10px;
	right: 10px;

	z-index: 100;
`;

const Fieldset = styled(Box)`
	background: rgba(255, 255, 255, 0.75);
`.withComponent('fieldset');

const Legend = styled(Box)`
	ul {
		list-style: none;
		padding: 0;

		margin: 0;
	}
`;
