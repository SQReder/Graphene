import { isFactoryOwnershipEdge } from '../../lib';
import type { EffectorNode } from '../../types';
import type { NamedGraphVisitor } from '../types';
import { foldByShape } from './fold-by-shape';

// export const foldAgressive = (protectedNodes: Set<string>) => {
// 	console.log('🛡️ foldAgressive called with protectedNodes:', protectedNodes);
// 	return foldByShape<MyEdge>(
// 		'agressive-folder',
// 		(node) => {
// 			const isFactory = !!node.data.effector?.meta?.isFactory;
// 			const foldable = !node.data[Symbol.for('folded')];
// 			const unprotectedNode = !protectedNodes.has(node.id);
//
// 			const flags = [
// 				`${isFactory ? '🏭' : '❌'}`,
// 				`${foldable ? '📂' : '❌'}`,
// 				`${unprotectedNode ? '❌' : '🛡️'}`,
// 			].join();
//
// 			const canBeFoldedByAgressor = isFactory && foldable;
// 			const shouldFold = canBeFoldedByAgressor && unprotectedNode;
//
// 			console.log(`Node ${node.id} flags: ${flags}, shouldFold: ${shouldFold ? '✅' : '❌'}`, node);
//
// 			// ----
//
//
//
// 			// ----
//
// 			if (false) {
// 				node.data[Symbol.for('shouldFold')] = shouldFold;
// 				node.data[Symbol.for('canBeFoldedByAgressor')] = canBeFoldedByAgressor;
//
// 				return shouldFold;
// 			} else {
// 				return false;
// 			}
// 		},
// 		{
// 			skipMarkAsFolded: true,
// 			outboundEdgesFilter: (edge): edge is MyEdge => true,
// 		},
// 	);
// };

export const foldAgressive = (protectedNodes: Set<string>): NamedGraphVisitor => ({
	name: 'Fold agressive',
	visit: async (graph) => {
		const domainNodes = graph.nodes.filter((node) => node.data.effector?.isFactory);

		const predicate = isFactoryOwnershipEdge;

		const visited = new Set<string>();
		const domainsTopologicallySorted: EffectorNode[] = [];

		// Find root domains (domains with no parent domains)
		const rootDomains = Array.from(
			domainNodes.filter((node) => {
				const parentDomains = graph
					.listEdgesTo(node.id, predicate)
					.filter((edge) => edge.data.relatedNodes.source.data.effector?.meta?.isFactory);
				return parentDomains.length === 0;
			}),
		);

		console.group('Root Domains');
		console.log(
			'Found root domains:',
			rootDomains.map((node) => node.id),
		);
		console.groupEnd();

		function bfs(startNodes: EffectorNode[]) {
			console.group('BFS Initialization');
			console.log(
				'Starting BFS with nodes:',
				startNodes.map((node) => node.id),
			);
			const queue: EffectorNode[] = [...startNodes];
			console.groupEnd();

			while (queue.length > 0) {
				const node = queue.shift(); // Dequeue the next node
				if (!node) continue;

				console.group(`Processing node ${node.id}`);
				if (visited.has(node.id)) {
					console.log(`Node ${node.id} already visited, skipping...`);
					console.groupEnd();
					continue;
				}

				// Mark node as visited and process it
				visited.add(node.id);
				console.log(`Visiting node ${node.id}, adding to sorted list`);
				domainsTopologicallySorted.push(node);

				// Get all child domain nodes
				const childDomains = graph
					.listEdgesFrom(node.id, predicate)
					.filter((edge) => edge.data.relatedNodes.target.data.effector?.meta?.isFactory)
					.map((edge) => edge.data.relatedNodes.target);

				console.log(
					`Found child domains for node ${node.id}:`,
					childDomains.map((child) => child.id),
				);

				// Add unvisited children to the queue
				for (const child of childDomains) {
					if (!visited.has(child.id)) {
						console.log(`Enqueuing child node ${child.id}`);
						queue.push(child);
					} else {
						console.log(`Child node ${child.id} already visited, skipping...`);
					}
				}
				console.groupEnd();
			}
		}

		// Start BFS from each root domain
		console.group('Starting BFS for Root Domains');
		bfs(rootDomains);
		console.groupEnd();

		// Check for any unvisited domains (in case of cycles or disconnected domains)
		console.group('Checking for Unvisited Domains');
		for (const node of domainNodes) {
			if (!visited.has(node.id)) {
				console.log(`Node ${node.id} is unvisited, running BFS...`);
				bfs([node]);
			}
		}
		console.groupEnd();

		// The result array now contains domain nodes in breadth-first order from root to leaves
		console.group('Final Result');
		console.log(
			'Domains in BFS order:',
			domainsTopologicallySorted.map((node) => node.id + ' ' + node.data.effector?.name),
		);
		console.groupEnd();

		for (const factory of domainsTopologicallySorted.toReversed()) {
			const foo = foldByShape('waaagh', (node) => node.id === factory.id, {});
			foo.visit(graph);
			graph.applyOperations();
		}
	},
});
