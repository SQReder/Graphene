import styled from '@emotion/styled';
import type { OnEdgesChange, OnNodesChange } from '@xyflow/react';
import {
	applyEdgeChanges,
	applyNodeChanges,
	Background,
	Controls,
	MiniMap,
	ReactFlow,
	ReactFlowProvider,
	useNodes,
	useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGate, useUnit } from 'effector-react';
import type { FC, KeyboardEventHandler } from 'react';
import { useCallback, useState } from 'react';
import { useDarkMode } from 'usehooks-ts';
import { ConfigurationContext } from './ConfigurationContext';
import { GraphVariant } from './lib';
import type { appModelFactory } from './model';
import { EdgesViewVariant } from './model';
import { nodeTypes } from './nodeTypes';
import type { EffectorNode, MyEdge } from './types';
import { CleanerSelector } from './ui/CleanerSelector';

const Wrapper = styled.div`
	width: 100%;
	height: 100%;

	& * {
		box-sizing: border-box;
	}
`;

const withReactFlowProvider = <P extends object>(Component: React.ComponentType<P>) => {
	return function WithReactFlowProvider(props: P) {
		return (
			<ReactFlowProvider>
				<Component {...props} />
			</ReactFlowProvider>
		);
	};
};

export const Graphene: FC<{ model: ReturnType<typeof appModelFactory> }> = withReactFlowProvider(({ model }) => {
	useGate(model.Gate);

	const {
		nodes,
		nodesChanged,
		edges,
		edgesChanged,
		nodeClicked,
		edgeClicked,
		graphVariantChanged,
		edgesVariantChanged,
		visibleEdgesChanged,
		visibleEdges,
	} = useUnit(model);

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

	const setGraph = useCallback(
		(edges: EdgesViewVariant[], stage: GraphVariant) => {
			edgesVariantChanged(edges);
			graphVariantChanged(stage);
		},
		[edgesVariantChanged, graphVariantChanged],
	);

	return (
		<Wrapper>
			<ConfigurationContext.Provider value={{ layoutDirection: 'vertical', showNodeIds }}>
				<Aside>
					<button onClick={() => edgesVariantChanged([EdgesViewVariant.Reactive])}>Reactive</button>
					<button onClick={() => edgesVariantChanged([EdgesViewVariant.Ownership])}>Ownership</button>
					<button onClick={() => edgesVariantChanged([EdgesViewVariant.Reactive, EdgesViewVariant.Ownership])}>
						Reactive + Ownership
					</button>
					<hr />

					<button onClick={() => graphVariantChanged(GraphVariant.raw)}>Raw</button>
					<button onClick={() => graphVariantChanged(GraphVariant.cleaned)}>Cleaned</button>
					<button onClick={() => graphVariantChanged(GraphVariant.cleanedNoNodes)}>CleanedNoNodes</button>
					<button onClick={() => graphVariantChanged(GraphVariant.cleanedNoNodesLayouted)}>
						CleanedNoNodesLayouted
					</button>
					<hr />

					<details style={{ display: 'contents' }}>
						<summary>Reactive</summary>
						<button onClick={() => setGraph([EdgesViewVariant.Reactive], GraphVariant.raw)}>Raw</button>
						<button onClick={() => setGraph([EdgesViewVariant.Reactive], GraphVariant.cleaned)}>Cleaned</button>
						<button onClick={() => setGraph([EdgesViewVariant.Reactive], GraphVariant.cleanedNoNodes)}>
							CleanedNoNodes
						</button>
						<button onClick={() => setGraph([EdgesViewVariant.Reactive], GraphVariant.cleanedNoNodesLayouted)}>
							CleanedNoNodesLayouted
						</button>
					</details>

					<details style={{ display: 'contents' }}>
						<summary>Ownership</summary>
						<button onClick={() => setGraph([EdgesViewVariant.Ownership], GraphVariant.raw)}>Raw</button>
						<button onClick={() => setGraph([EdgesViewVariant.Ownership], GraphVariant.cleaned)}>Cleaned</button>
						<button onClick={() => setGraph([EdgesViewVariant.Ownership], GraphVariant.cleanedNoNodes)}>
							CleanedNoNodes
						</button>
						<button onClick={() => setGraph([EdgesViewVariant.Ownership], GraphVariant.cleanedNoNodesLayouted)}>
							CleanedNoNodes Layouted
						</button>
					</details>

					<hr />
					<CleanerSelector.View model={model.reactiveEdgeCleanerSelector} placeholder={'Reactive edge cleaners'} />
					<CleanerSelector.View model={model.ownershipEdgeCleanerSelector} placeholder={'Ownership edge cleaners'} />
					<CleanerSelector.View model={model.graphCleanerSelector} placeholder={'Graph cleaners'} />
					<hr />
					<Fieldset>
						<legend>Visible edges</legend>
						<label>
							<input
								type="radio"
								checked={visibleEdges === 'reactive'}
								onChange={() => visibleEdgesChanged('reactive')}
							/>
							Reactive
						</label>
						<label>
							<input
								type="radio"
								checked={visibleEdges === 'ownership'}
								onChange={() => visibleEdgesChanged('ownership')}
							/>
							Ownership
						</label>
						<label>
							<input
								type="radio"
								checked={visibleEdges === 'reactive+ownership'}
								onChange={() => visibleEdgesChanged('reactive+ownership')}
							/>
							Reactive + Ownership
						</label>
					</Fieldset>
					<hr />

					<Search />
					<hr />
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
						<summary>Legend</summary>
						<ul>
							<li>📦 - store</li>
							<li>🔔 - event</li>
							<li>⚡️ - effect</li>
							<li>⚡️~⚡️ - attached effect</li>
							<li>🏭 - factory</li>
						</ul>
					</Legend>
				</Aside>
				<div style={{ width: '100%', height: '100%', display: 'contents' }}>
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
		</Wrapper>
	);
});

const Search: FC = () => {
	const nodes = useNodes();
	const { setCenter } = useReactFlow();
	const [centerText, setCenterText] = useState('');

	function tryCenterNode() {
		const found = nodes.find((node) => node.id === centerText);
		if (found) setCenter(found.position.x, found.position.y);
	}

	const handleEnter: KeyboardEventHandler<HTMLInputElement> = (e) => {
		if (e.key === 'Enter') {
			tryCenterNode();
		}
	};

	return (
		<label style={{ display: 'flex', flexFlow: 'row nowrap', gap: '4px' }}>
			<input
				type="text"
				value={centerText}
				onChange={(e) => setCenterText(e.target.value)}
				onKeyUp={handleEnter}
				style={{ flex: 1 }}
				placeholder={'Center on node'}
			/>
			<button
				onClick={(e) => {
					e.preventDefault();
					tryCenterNode();
				}}
				style={{ flex: 'none' }}
			>
				Set center
			</button>
		</label>
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

const Aside = styled(Box)`
	position: absolute;
	top: 10px;
	right: 10px;

	z-index: 100;
	width: 300px;
`.withComponent('aside');

const Fieldset = styled(Box)`
	background: rgba(255, 255, 255, 0.75);
`.withComponent('fieldset');

const Legend = styled(Box)`
	ul {
		list-style: none;
		padding: 0;

		margin: 0;
	}
`.withComponent('details');
