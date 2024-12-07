import { ensureDefined, isRegularNode } from './lib';
import type { EffectorGraph, EffectorNode, MyEdge, OpType, RegularEffectorNode } from './types';

type NodeId = string;
type EdgeId = string;

// Internal structures for efficient graph management
type InternalGraph = {
	nodes: Map<NodeId, EffectorNode>;
	edges: Map<EdgeId, MyEdge>; // Edges by id for fast lookup/removal
};

// BufferedGraph class
export class BufferedGraph {
	private graph: InternalGraph;
	private buffer: Array<() => void>; // Buffer to store operations

	// Two indexes for fast edge lookup
	private _sourceIndex: Map<NodeId, Set<EdgeId>> | null = null;
	private _targetIndex: Map<NodeId, Set<EdgeId>> | null = null;

	constructor(graph: EffectorGraph = { nodes: [], edges: [] }) {
		// Initialize internal graph structure with maps
		this.graph = {
			nodes: new Map<NodeId, EffectorNode>(graph.nodes.map((node) => [node.id, node])),
			edges: new Map<EdgeId, MyEdge>(graph.edges.map((edge) => [edge.id, edge])),
		};
		this.buffer = [];
	}

	// Lazy getter for sourceIndex
	private get sourceIndex(): Map<NodeId, Set<EdgeId>> {
		if (this._sourceIndex === null) {
			this._sourceIndex = this._buildSourceIndex();
		}
		return this._sourceIndex;
	}

	// Lazy getter for targetIndex
	private get targetIndex(): Map<NodeId, Set<EdgeId>> {
		if (this._targetIndex === null) {
			this._targetIndex = this._buildTargetIndex();
		}
		return this._targetIndex;
	}

	// Invalidate only the source index
	private _invalidateSourceIndex() {
		this._sourceIndex = null;
	}

	// Invalidate only the target index
	private _invalidateTargetIndex() {
		this._targetIndex = null;
	}

	// Invalidate both indexes
	private _invalidateIndexes() {
		this._invalidateSourceIndex();
		this._invalidateTargetIndex();
	}

	// Rebuild the source index
	private _buildSourceIndex(): Map<NodeId, Set<EdgeId>> {
		const sourceIndex = new Map<NodeId, Set<EdgeId>>();
		this.graph.edges.forEach((edge) => {
			if (!sourceIndex.has(edge.source)) {
				sourceIndex.set(edge.source, new Set());
			}
			sourceIndex.get(edge.source)?.add(edge.id);
		});
		return sourceIndex;
	}

	// Rebuild the target index
	private _buildTargetIndex(): Map<NodeId, Set<EdgeId>> {
		const targetIndex = new Map<NodeId, Set<EdgeId>>();
		this.graph.edges.forEach((edge) => {
			if (!targetIndex.has(edge.target)) {
				targetIndex.set(edge.target, new Set());
			}
			targetIndex.get(edge.target)?.add(edge.id);
		});
		return targetIndex;
	}

	get nodes(): IteratorObject<EffectorNode> {
		return this.graph.nodes.values();
	}

	get regularNodes(): IteratorObject<RegularEffectorNode> {
		return this.graph.nodes.values().filter(isRegularNode);
	}

	nodesByOp(opType: OpType): IteratorObject<RegularEffectorNode> {
		return this.regularNodes.filter((node) => node.data.effector.meta.hasOpType(opType));
	}

	get edges(): IteratorObject<MyEdge> {
		return this.graph.edges.values();
	}

	// Public method to add a node
	public addNode(node: EffectorNode) {
		this.buffer.push(() => this._addNode(node));
	}

	// Public method to remove a node
	public removeNode(nodeId: NodeId) {
		this.buffer.push(() => this._removeNode(nodeId));
	}

	// Public method to add an edge
	public addEdge(edge: MyEdge) {
		this.buffer.push(() => this._addEdge(edge));
	}

	// Public method to remove an edge by id
	public removeEdgeById(edgeId: EdgeId) {
		this.buffer.push(() => this._removeEdgeById(edgeId));
	}

	// Apply all buffered operations and invalidate indexes
	public applyOperations() {
		this.buffer.forEach((op) => op());
		this.buffer = []; // Clear the buffer after applying all operations
		this._invalidateIndexes(); // Invalidate both indexes
	}

	// Return the graph in the public format (arrays of nodes and edges)
	public getGraph(): EffectorGraph {
		return {
			nodes: Array.from(this.graph.nodes.values()),
			edges: Array.from(this.graph.edges.values()),
		};
	}

	// Public method to list edges from a node by edgeType
	public listEdgesFrom<T extends MyEdge = MyEdge>(nodeId: NodeId, predicate?: (edge: MyEdge) => edge is T): T[] {
		const edgeIds = this.sourceIndex.get(nodeId);
		if (!edgeIds) return [];

		// Retrieve edges by id and filter by edgeType
		return Array.from(edgeIds)
			.map((edgeId) => ensureDefined(this.graph.edges.get(edgeId)))
			.filter(predicate ?? ((edge): edge is T => true));
	}

	// Public method to list edges to a node by edgeType
	public listEdgesTo<T extends MyEdge = MyEdge>(nodeId: NodeId, predicate?: (edge: MyEdge) => edge is T): T[] {
		const edgeIds = this.targetIndex.get(nodeId);
		if (!edgeIds) return [];

		// Retrieve edges by id and filter by edgeType
		return Array.from(edgeIds)
			.map((edgeId) => ensureDefined(this.graph.edges.get(edgeId)))
			.filter(predicate ?? ((edge): edge is T => true));
	}

	// Check if the node has outgoing edges
	public hasEdgesFrom(nodeId: NodeId): boolean {
		const edgeIds = this.sourceIndex.get(nodeId);
		return edgeIds ? edgeIds.size > 0 : false;
	}

	// Check if the node has incoming edges
	public hasEdgesTo(nodeId: NodeId): boolean {
		const edgeIds = this.targetIndex.get(nodeId);
		return edgeIds ? edgeIds.size > 0 : false;
	}

	// Internal method to add a node to the internal graph
	private _addNode(node: EffectorNode) {
		if (this.graph.nodes.has(node.id)) {
			// console.warn(`Warning: trying to add node with id ${node.id} but it already exists. Skipping.`);
			return;
		}

		// console.log(`Adding node with id ${node.id}`);

		this.graph.nodes.set(node.id, node);
	}

	// Get all child nodes of a node by edgeType
	public getChildNodes<T extends MyEdge = MyEdge>(
		nodeId: NodeId,
		predicate?: (edge: MyEdge) => edge is T,
	): EffectorNode[] {
		return this.listEdgesFrom(nodeId, predicate).map((edge) => edge.data.relatedNodes.target);
	}

	// Internal method to remove a node and its associated edges from the internal graph
	private _removeNode(nodeId: NodeId) {
		// console.log(`Removing node with id ${nodeId}`);
		// Remove the node
		this.graph.nodes.delete(nodeId);

		// Remove all outgoing edges from this node
		const outgoingEdges = this.sourceIndex.get(nodeId);
		if (outgoingEdges) {
			// console.log(`Removing outgoing edges of ${nodeId}`);
			outgoingEdges.forEach((edgeId) => {
				// console.log(`Removing outgoing edge with id ${edgeId}`);
				this._removeEdgeById(edgeId);
			});
		}

		// Remove all incoming edges to this node
		const incomingEdges = this.targetIndex.get(nodeId);
		if (incomingEdges) {
			// console.log(`Removing incoming edges of ${nodeId}`);
			incomingEdges.forEach((edgeId) => {
				// console.log(`Removing incoming edge with id ${edgeId}`);
				this._removeEdgeById(edgeId);
			});
		}
	}

	// Internal method to add an edge to the internal graph
	private _addEdge(edge: MyEdge) {
		if (this.graph.edges.has(edge.id)) {
			// console.warn(`Warning: trying to add edge with id ${edge.id} but it already exists. Skipping.`);
			return;
		}

		if (this.graph.nodes.has(edge.source) && this.graph.nodes.has(edge.target)) {
			this.graph.edges.set(edge.id, edge); // Store the edge by id

			// console.log(`Adding edge with id ${edge.id} from ${edge.source} to ${edge.target}`);

			// Update the indexes to reflect the new edge
			if (this.sourceIndex.has(edge.source)) {
				this.sourceIndex.get(edge.source)?.add(edge.id);
			} else {
				this.sourceIndex.set(edge.source, new Set([edge.id]));
			}

			if (this.targetIndex.has(edge.target)) {
				this.targetIndex.get(edge.target)?.add(edge.id);
			} else {
				this.targetIndex.set(edge.target, new Set([edge.id]));
			}
		}
	}

	// Internal method to remove an edge by id
	private _removeEdgeById(edgeId: EdgeId) {
		// console.log(`Removing edge with id ${edgeId}`);
		const edge = this.graph.edges.get(edgeId);
		if (!edge) {
			// console.warn(`Warning: trying to remove edge with id ${edgeId} but it does not exist. Skipping.`);
			return;
		}

		// console.log(`Removing edge with id ${edgeId} from ${edge.source} to ${edge.target}`);

		// Remove from source and target indexes
		// console.log(`Removing edge with id ${edgeId} from source index of ${edge.source}`);
		this.sourceIndex.get(edge.source)?.delete(edgeId);
		if (this.sourceIndex.get(edge.source)?.size === 0) {
			// console.log(`Removing source index of ${edge.source} since it has no edges`);
			this.sourceIndex.delete(edge.source);
		}

		// console.log(`Removing edge with id ${edgeId} from target index of ${edge.target}`);
		this.targetIndex.get(edge.target)?.delete(edgeId);
		if (this.targetIndex.get(edge.target)?.size === 0) {
			// console.log(`Removing target index of ${edge.target} since it has no edges`);
			this.targetIndex.delete(edge.target);
		}

		// Finally, remove the edge from the main edge map
		// console.log(`Removing edge with id ${edgeId} from the main edge map`);
		this.graph.edges.delete(edgeId);
	}

	public getNode(nodeId: NodeId): EffectorNode | undefined {
		return this.graph.nodes.get(nodeId);
	}

	public clone(): BufferedGraph {
		const graph = this.getGraph();
		return new BufferedGraph({
			nodes: graph.nodes.map((node) => ({ ...node })),
			edges: graph.edges.map((edge) => ({ ...edge })),
		});
	}
}
