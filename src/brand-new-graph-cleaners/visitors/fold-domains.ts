import { isParentToChildEdge, isReactiveEdge, isRegularNode, isSourceEdge } from '../../lib';
import { OpType } from '../../OpType';
import type { EffectorNode } from '../../types';
import type { NamedGraphVisitor } from '../types';

const ParentDomainSymbol = Symbol.for('parent domain');

export const foldDomains: NamedGraphVisitor = {
	name: 'Fold domains',
	visit: async (graph) => {
		console.group('Fold Domains Visit');
		const domainNodes = graph.nodesByOp(OpType.Domain);
		const predicate = isReactiveEdge;

		const visited = new Set<string>();
		const domainsTopologicallySorted: EffectorNode[] = [];

		console.group('Finding Root Domains');
		// Find root domains (domains with no parent domains)
		const rootDomains = domainNodes.filter((node) => {
			const parentDomains = graph
				.listEdgesTo(node.id, predicate)
				.filter((edge) => edge.data.relatedNodes.source.data.effector?.meta.isDomain);
			return parentDomains.length === 0;
		});
		console.log('Root Domains:', rootDomains);
		console.groupEnd();

		function dfs(node: EffectorNode) {
			if (visited.has(node.id)) return;
			visited.add(node.id);

			console.group('DFS Visit:', node.id);
			// Get all child domain nodes
			const childDomains = graph
				.listEdgesFrom(node.id, predicate)
				.filter((edge) => edge.data.relatedNodes.target.data.effector?.meta.isDomain)
				.map((edge) => edge.data.relatedNodes.target);

			console.log('Child Domains:', childDomains);

			// Recursively visit child domains
			for (const child of childDomains) {
				dfs(child);
			}

			// Add current node to result after visiting all children
			domainsTopologicallySorted.push(node);
			console.groupEnd();
		}

		// Start DFS from each root domain
		for (const rootDomain of rootDomains) {
			dfs(rootDomain);
		}

		// Check for any unvisited domains (in case of cycles or disconnected domains)
		for (const node of domainNodes) {
			if (!visited.has(node.id)) {
				dfs(node);
			}
		}

		console.log('Domains Topologically Sorted:', domainsTopologicallySorted);

		// The result array now contains domain nodes in topological order from leaves to root

		console.group('Processing Domains');
		for (const domain of domainsTopologicallySorted) {
			const sourcedNodes = graph.getChildNodes(domain.id, isSourceEdge).filter((node) => isRegularNode(node));
			console.log('Domain:', domain);
			console.log('Sourced Nodes:', sourcedNodes);

			for (const sourcedNode of sourcedNodes) {
				const name = sourcedNode.data.effector?.name;
				console.groupCollapsed('Name:', name);
				console.log('Sourced Node:', sourcedNode);

				if (name) {
					if (['onEvent', 'onStore', 'onEffect', 'onDomain'].includes(name)) {
						console.log('Removing Node:', sourcedNode.id);
						graph.removeNode(sourcedNode.id);

						graph
							.listEdgesFrom(sourcedNode.id, isReactiveEdge)
							.map((e) => e.data.relatedNodes.target)
							.filter((n) => n.data.effector?.meta?.op === OpType.Watch)
							.forEach((n) => graph.removeNode(n.id));
					} else {
						if (!sourcedNode[ParentDomainSymbol]) {
							sourcedNode[ParentDomainSymbol] = domain;
							console.log('Setting Parent Domain:', domain);
						}
					}
				}
				console.groupEnd();
			}
		}
		console.groupEnd();

		console.group('Removing Ownership Edges');
		for (const node of graph.nodes) {
			const ownershipEdges = graph.listEdgesTo(node.id, isParentToChildEdge);
			console.log('Node:', node, 'Ownership Edges:', ownershipEdges);

			for (const incomingEdge of ownershipEdges) {
				const source = incomingEdge.data.relatedNodes.source;
				if (source.data.effector?.meta?.isDomain) {
					if (source !== node[ParentDomainSymbol]) {
						console.log('Removing Edge:', incomingEdge.id);
						graph.removeEdgeById(incomingEdge.id);
					}
				}
			}
		}
		console.groupEnd();

		for (const domain of domainsTopologicallySorted) {
			for (const outgoingSourceEdge of graph.listEdgesFrom(domain.id, (e) => isSourceEdge(e) || isReactiveEdge(e))) {
				graph.removeEdgeById(outgoingSourceEdge.id);
			}
		}

		console.groupEnd();
	},
};

export const detachDomains: NamedGraphVisitor = {
	name: 'Detach domains',
	visit: async (graph) => {
		for (const domain of graph.nodes.filter(isRegularNode).filter((node) => node.data.effector.meta.isDomain)) {
			// domain.type = 'group';

			graph.listEdgesFrom(domain.id, isSourceEdge).forEach((edge) => {
				const target = edge.data.relatedNodes.target;
				// target.parentId = domain.id;
				// target.expandParent = true;
				target['layoutOptions'] = {
					'org.eclipse.elk.partitioning.partition': Number(domain.id),
				};
				graph.removeEdgeById(edge.id);
			});

			graph.listEdgesFrom(domain.id, isReactiveEdge).forEach((edge) => {
				// const target = edge.data.relatedNodes.target;
				// target.parentId = domain.id;
				// target.expandParent = true;
				graph.removeEdgeById(edge.id);
			});
		}
	},
};
