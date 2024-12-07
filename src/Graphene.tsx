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
import type { ComponentType, FC, KeyboardEventHandler, ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDarkMode } from 'usehooks-ts';
import { ConfigurationContext } from './ConfigurationContext';
import { GraphVariant } from './lib';
import type { appModelFactory, VisibleEdgesVariant } from './model/app';
import { nodeTypes } from './nodeTypes';
import { type EffectorNode, type MyEdge } from './types';
import { CleanerSelector } from './ui/CleanerSelector';

const Wrapper = styled.div`
	width: 100%;
	height: 100%;
	min-height: 400px;

	display: flex;

	& * {
		box-sizing: border-box;
	}
`;

const withReactFlowProvider = <P extends object>(Component: ComponentType<P>) => {
	return function WithReactFlowProvider(props: P) {
		return (
			<ReactFlowProvider>
				<Component {...props} />
			</ReactFlowProvider>
		);
	};
};

const Label: FC<{
	variant: VisibleEdgesVariant;
	value: VisibleEdgesVariant;
	onChange: (value: VisibleEdgesVariant) => void;
	children: ReactNode;
}> = ({ variant, value, onChange, children }) => (
	<label>
		<input type="radio" checked={value === variant} onChange={() => onChange(variant)} />
		{children}
	</label>
);

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
		visibleEdgesChanged,
		visibleEdges,
		hideNodesWithNoLocationChanged,
		hideNodesWithNoLocation,
		excludeOwnershipFromLayouting,
		excludeOwnershipFromLayoutingChanged,
		toggleFactoryNode,
		unfoldedFactoryNodes,
		viewportSizeChanged,
		viewportPosAndZoomChanged,
	} = useUnit(model);

	const reactFlowWrapper = useRef<HTMLDivElement>(null);

	const { viewport } = useReactFlow();

	const onNodesChange = useCallback<OnNodesChange<EffectorNode>>(
		(changes) => nodesChanged(applyNodeChanges(changes, nodes)),
		[nodes, nodesChanged],
	);

	const onEdgesChange = useCallback<OnEdgesChange<MyEdge>>(
		(changes) => edgesChanged(applyEdgeChanges<MyEdge>(changes, edges)),
		[edges, edgesChanged],
	);

	// Handle window resizes
	useEffect(() => {
		const updateViewportSize = () => {
			if (!reactFlowWrapper.current) return;
			const rect = reactFlowWrapper.current.getBoundingClientRect();
			viewportSizeChanged({
				width: rect.width,
				height: rect.height,
			});
		};

		const observer = new ResizeObserver(updateViewportSize);
		if (reactFlowWrapper.current) {
			observer.observe(reactFlowWrapper.current);
			updateViewportSize();
		}

		return () => observer.disconnect();
	}, [viewportSizeChanged]);

	const [showNodeIds, setShowNodeIds] = useState(true);

	const { isDarkMode } = useDarkMode({});

	return (
		<Wrapper>
			<ConfigurationContext.Provider
				value={{
					layoutDirection: 'vertical',
					showNodeIds,
					toggleFactoryNode: toggleFactoryNode,
					unfoldedFactories: unfoldedFactoryNodes,
				}}
			>
				<Aside>
					<button onClick={() => graphVariantChanged(GraphVariant.raw)}>Raw</button>
					<button onClick={() => graphVariantChanged(GraphVariant.cleaned)}>Cleaned</button>
					<button onClick={() => graphVariantChanged(GraphVariant.cleanedNoNodes)}>CleanedNoNodes</button>
					<button onClick={() => graphVariantChanged(GraphVariant.cleanedNoNodesLayouted)}>
						CleanedNoNodesLayouted
					</button>
					<hr />

					<CleanerSelector.View model={model.graphCleanerSelector} placeholder={'Graph cleaners'} />
					<hr />
					<Fieldset>
						<legend>Visible edges</legend>
						<Label variant={'reactive'} value={visibleEdges} onChange={visibleEdgesChanged}>
							Reactive
						</Label>
						<Label variant={'source'} value={visibleEdges} onChange={visibleEdgesChanged}>
							Source
						</Label>
						<Label variant={'parent-to-child'} value={visibleEdges} onChange={visibleEdgesChanged}>
							Ownership
						</Label>
						<Label variant={'factory-ownership'} value={visibleEdges} onChange={visibleEdgesChanged}>
							Factory Ownership
						</Label>
						<Label variant={'reactive+source'} value={visibleEdges} onChange={visibleEdgesChanged}>
							Reactive + Source
						</Label>
						<Label variant={'reactive+parent-to-child'} value={visibleEdges} onChange={visibleEdgesChanged}>
							Reactive + Ownership
						</Label>
						<Label variant={'reactive+source+parent-to-child'} value={visibleEdges} onChange={visibleEdgesChanged}>
							All
						</Label>
					</Fieldset>
					<hr />

					<Search />
					<hr />
					<label title={'Show node ids in the graph'}>
						<input type="checkbox" checked={showNodeIds} onChange={(e) => setShowNodeIds(e.target.checked)} />
						Show node ids
					</label>
					<label title={'Hide nodes with no location'}>
						<input
							type="checkbox"
							checked={hideNodesWithNoLocation}
							onChange={(e) => hideNodesWithNoLocationChanged(e.target.checked)}
						/>
						Hide nodes with no location
					</label>
					<label title={'Exclude ownership from layouting'}>
						<input
							type="checkbox"
							checked={excludeOwnershipFromLayouting}
							onChange={(e) => excludeOwnershipFromLayoutingChanged(e.target.checked)}
						/>
						Exclude ownership from layouting
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
				<div style={{ flex: 1 }} ref={reactFlowWrapper}>
					<ReactFlow
						snapGrid={[10, 10]}
						snapToGrid
						nodes={nodes}
						onNodesChange={onNodesChange}
						onNodeClick={(_, node) => nodeClicked(node)}
						edges={edges}
						onEdgesChange={onEdgesChange}
						onEdgeClick={(_, edge) => edgeClicked(edge)}
						onNodeDoubleClick={(_, { id }) => toggleFactoryNode(id)}
						// fitView
						nodeTypes={nodeTypes}
						minZoom={0.1}
						onViewportChange={(viewport) =>
							viewportPosAndZoomChanged({
								x: viewport.x,
								y: viewport.y,
								zoom: viewport.zoom,
							})
						}
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
		if (found) setCenter(found.position.x, found.position.y, { zoom: 1 });
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
