type Node = {
	id: string;
	parentId?: string;
};

export function sortTreeNodesDFS<T extends Node>(nodes: T[]): T[] {
	const nodeMap = new Map<string, T>();
	const childrenMap = new Map<string, T[]>();
	const visited = new Set<string>();
	const sortedNodes: T[] = [];
	const inStack = new Set<string>(); // To detect cycles

	nodes.forEach((node) => {
		nodeMap.set(node.id, node);
		if (node.parentId) {
			// if (!nodeMap.has(node.parentId)) {
			// 	throw new Error(`Orphan node detected: parentId ${node.parentId} does not exist.`);
			// }
			if (!childrenMap.has(node.parentId)) {
				childrenMap.set(node.parentId, []);
			}
			childrenMap.get(node.parentId)!.push(node);
		}
	});

	function dfs(nodeId: string) {
		if (inStack.has(nodeId)) {
			throw new Error(`Cycle detected involving node ${nodeId}`);
		}
		if (visited.has(nodeId)) return;
		visited.add(nodeId);
		inStack.add(nodeId);

		const node = nodeMap.get(nodeId);
		if (!node) return;

		// Visit all children first
		const children = childrenMap.get(nodeId) || [];
		children.forEach((child) => dfs(child.id));

		// Add the node itself after its children
		sortedNodes.push(node);
		inStack.delete(nodeId);
	}

	// Start DFS from all root nodes
	nodes.forEach((node) => {
		if (!node.parentId) {
			dfs(node.id);
		}
	});

	return sortedNodes;
}

export function sortTreeNodesBFS<T extends Node>(nodes: T[], signal?: AbortSignal): T[] {
	const nodeMap = new Map<string, T>();
	const childrenMap = new Map<string, T[]>();
	const parentCountMap = new Map<string, number>(); // To track how many parents a node has
	const sortedNodes: T[] = [];
	const queue: T[] = [];

	// Step 1: Build the maps
	nodes.forEach((node) => {
		signal?.throwIfAborted();
		nodeMap.set(node.id, node);
		if (node.parentId) {
			if (!childrenMap.has(node.parentId)) {
				childrenMap.set(node.parentId, []);
			}
			childrenMap.get(node.parentId)!.push(node);
			parentCountMap.set(node.id, (parentCountMap.get(node.id) || 0) + 1);
		} else {
			parentCountMap.set(node.id, 0); // Root nodes
		}
	});

	// Step 2: Initialize the queue with root nodes (nodes with no parents)
	nodes.forEach((node) => {
		signal?.throwIfAborted();
		if (parentCountMap.get(node.id) === 0) {
			queue.push(node);
		}
	});

	// Step 3: Perform BFS traversal
	while (queue.length > 0) {
		signal?.throwIfAborted();
		const currentNode = queue.shift()!;
		sortedNodes.push(currentNode);

		const children = childrenMap.get(currentNode.id) || [];
		children.forEach((child) => {
			parentCountMap.set(child.id, parentCountMap.get(child.id)! - 1);
			if (parentCountMap.get(child.id) === 0) {
				queue.push(child);
			}
		});
	}

	// Step 4: Detect cycles (if there are nodes still with parents left unprocessed)
	if (sortedNodes.length !== nodes.length) {
		throw new Error('Cycle detected or orphan nodes present in the input.');
	}

	return sortedNodes;
}
