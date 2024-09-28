import { ensureDefined, isRegularNode } from './lib';
import type { EdgeType, EffectorGraph, EffectorNode, MyEdge, OpType, RegularEffectorNode } from './types';

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
	private sourceIndex: Map<NodeId, Set<EdgeId>> | null;
	private targetIndex: Map<NodeId, Set<EdgeId>> | null;

	constructor(graph: EffectorGraph = { nodes: [], edges: [] }) {
		// Initialize internal graph structure with maps
		this.graph = {
			nodes: new Map<NodeId, EffectorNode>(graph.nodes.map((node) => [node.id, node])),
			edges: new Map<EdgeId, MyEdge>(graph.edges.map((edge) => [edge.id, edge])),
		};
		this.buffer = [];
		this.sourceIndex = null;
		this.targetIndex = null;
	}

	public clone(): BufferedGraph {
		return new BufferedGraph(this.getGraph());
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
		console.group('applyOperations');
		this.buffer.forEach((op) => op());
		this.buffer = []; // Clear the buffer after applying all operations
		this._invalidateIndexes(); // Invalidate and rebuild indexes
		console.groupEnd();
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
		if (!this.sourceIndex) {
			this._buildIndexes();
		}
		const edgeIds = this.sourceIndex?.get(nodeId);
		if (!edgeIds) return [];

		// Retrieve edges by id and filter by edgeType
		return Array.from(edgeIds)
			.map((edgeId) => ensureDefined(this.graph.edges.get(edgeId)))
			.filter(predicate ?? ((edge): edge is T => true));
	}

	// Public method to list edges to a node by edgeType
	public listEdgesTo<T extends MyEdge = MyEdge>(nodeId: NodeId, predicate?: (edge: MyEdge) => edge is T): T[] {
		if (!this.targetIndex) {
			this._buildIndexes();
		}
		const edgeIds = this.targetIndex?.get(nodeId);
		if (!edgeIds) return [];

		// Retrieve edges by id and filter by edgeType
		return Array.from(edgeIds)
			.map((edgeId) => ensureDefined(this.graph.edges.get(edgeId)))
			.filter(predicate ?? ((edge): edge is T => true));
	}

	// Internal method to add a node to the internal graph
	private _addNode(node: EffectorNode) {
		if (!this.graph.nodes.has(node.id)) {
			this.graph.nodes.set(node.id, node);
		}
	}

	// Internal method to remove a node and its associated edges from the internal graph
	private _removeNode(nodeId: NodeId) {
		console.groupCollapsed(`Removing node ${nodeId}`);

		// Remove the node
		console.debug(`Removing node ${nodeId}`);
		this.graph.nodes.delete(nodeId);

		// Remove all outgoing edges from this node
		const outgoingEdges = this.sourceIndex?.get(nodeId);
		console.debug(`Removing ${outgoingEdges?.size} outgoing edges from ${nodeId}`);
		outgoingEdges?.forEach((edgeId) => {
			console.debug(`Removing edge ${edgeId}`);
			this._removeEdgeById(edgeId);
		});

		// Remove all incoming edges to this node
		const incomingEdges = this.targetIndex?.get(nodeId);
		console.debug(`Removing ${incomingEdges?.size} incoming edges to ${nodeId}`);
		incomingEdges?.forEach((edgeId) => {
			console.debug(`Removing edge ${edgeId}`);
			this._removeEdgeById(edgeId);
		});

		console.groupEnd();
	}
	// Internal method to add an edge to the internal graph
	private _addEdge(edge: MyEdge) {
		if (this.graph.nodes.has(edge.source) && this.graph.nodes.has(edge.target)) {
			this.graph.edges.set(edge.id, edge); // Store the edge by id

			// Update source and target indexes
			if (!this.sourceIndex) this.sourceIndex = new Map();
			if (!this.targetIndex) this.targetIndex = new Map();

			this.sourceIndex.get(edge.source)?.add(edge.id) ?? this.sourceIndex.set(edge.source, new Set([edge.id]));
			this.targetIndex.get(edge.target)?.add(edge.id) ?? this.targetIndex.set(edge.target, new Set([edge.id]));
		}
	}

	// Internal method to remove an edge by id
	private _removeEdgeById(edgeId: EdgeId) {
		const edge = this.graph.edges.get(edgeId);
		if (!edge) {
			console.warn(`Edge ${edgeId} doesn't exist`);
			return;
		}

		// Remove from source and target indexes
		console.debug(`Remove edge ${edgeId} from source index`, edge.source);
		this.sourceIndex?.get(edge.source)?.delete(edgeId);
		if (this.sourceIndex?.get(edge.source)?.size === 0) {
			this.sourceIndex.delete(edge.source);
			console.debug(`Removed empty source index for node ${edge.source}`);
		}

		console.debug(`Remove edge ${edgeId} from target index`, edge.target);
		this.targetIndex?.get(edge.target)?.delete(edgeId);
		if (this.targetIndex?.get(edge.target)?.size === 0) {
			this.targetIndex.delete(edge.target);
			console.debug(`Removed empty target index for node ${edge.target}`);
		}

		// Finally, remove the edge from the main edge map
		this.graph.edges.delete(edgeId);
		console.debug(`Removed edge ${edgeId}`);
	}
	// Invalidate indexes after operations
	private _invalidateIndexes() {
		console.log('invalidate indexes');
		this.sourceIndex = null;
		this.targetIndex = null;
	}

	// Build indexes for fast edge search
	private _buildIndexes() {
		console.log('rebuild indexes');
		this.sourceIndex = new Map<NodeId, Set<EdgeId>>();
		this.targetIndex = new Map<NodeId, Set<EdgeId>>();

		this.graph.edges.forEach((edge) => {
			this.sourceIndex!.get(edge.source)?.add(edge.id) ?? this.sourceIndex!.set(edge.source, new Set([edge.id]));
			this.targetIndex!.get(edge.target)?.add(edge.id) ?? this.targetIndex!.set(edge.target, new Set([edge.id]));
		});
	}
}
