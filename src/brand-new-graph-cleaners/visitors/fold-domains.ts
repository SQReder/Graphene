import { isParentToChildEdge, isReactiveEdge, isRegularNode, isSourceEdge } from '../../lib';
import type { EffectorNode } from '../../types';
import { OpType } from '../../types';
import type { NamedGraphVisitor } from '../types';

const ParentDomainSymbol = Symbol.for('parent domain');

export const foldDomains: NamedGraphVisitor = {
	name: 'Fold domains',
	visit: async (graph) => {
		const domainNodes = graph.nodesByOp(OpType.Domain);
		const predicate = isReactiveEdge;

		const visited = new Set<string>();
		const domainsTopologicallySorted: EffectorNode[] = [];

		// Find root domains (domains with no parent domains)
		const rootDomains = domainNodes.filter((node) => {
			const parentDomains = graph
				.listEdgesTo(node.id, predicate)
				.filter((edge) => edge.data.relatedNodes.source.data.effector?.meta.isDomain);
			return parentDomains.length === 0;
		});

		function dfs(node: EffectorNode) {
			if (visited.has(node.id)) return;
			visited.add(node.id);

			// Get all child domain nodes
			const childDomains = graph
				.listEdgesFrom(node.id, predicate)
				.filter((edge) => edge.data.relatedNodes.target.data.effector?.meta.isDomain)
				.map((edge) => edge.data.relatedNodes.target);

			// Recursively visit child domains
			for (const child of childDomains) {
				dfs(child);
			}

			// Add current node to result after visiting all children
			domainsTopologicallySorted.push(node);
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

		// The result array now contains domain nodes in topological order from leaves to root

		for (const domain of domainsTopologicallySorted) {
			const sourcedNodes = graph.getChildNodes(domain.id, isSourceEdge).filter((node) => isRegularNode(node));

			for (const sourcedNode of sourcedNodes) {
				const name = sourcedNode.data.effector?.name;

				if (name) {
					if (['onEvent', 'onStore', 'onEffect', 'onDomain'].includes(name)) {
						graph.removeNode(sourcedNode.id);
					} else {
						if (!sourcedNode[ParentDomainSymbol]) {
							sourcedNode[ParentDomainSymbol] = domain;
						}
					}
				}
			}
		}

		for (const node of graph.nodes) {
			const ownershipEdges = graph.listEdgesTo(node.id, isParentToChildEdge);

			for (const incomingEdge of ownershipEdges) {
				const source = incomingEdge.data.relatedNodes.source;
				if (source.data.effector?.meta?.isDomain) {
					if (source !== node[ParentDomainSymbol]) {
						graph.removeEdgeById(incomingEdge.id);
					}
				}
			}
		}
	},
};

export const detachDomains: NamedGraphVisitor = {
	name: 'Detach domains',
	visit: async (graph) => {
		for (const domain of graph.nodes.filter(isRegularNode).filter((node) => node.data.effector.meta.isDomain)) {
			domain.type = 'group';

			graph.listEdgesFrom(domain.id, isSourceEdge).forEach((edge) => {
				const target = edge.data.relatedNodes.target;
				target.parentId = domain.id;
				// target.expandParent = true;
				target['layoutOptions'] = {
					'org.eclipse.elk.partitioning.partition': Number(domain.id),
				};
				graph.removeEdgeById(edge.id);
			});

			graph.listEdgesFrom(domain.id, isReactiveEdge).forEach((edge) => {
				const target = edge.data.relatedNodes.target;
				target.parentId = domain.id;
				// target.expandParent = true;
				graph.removeEdgeById(edge.id);
			});
		}
	},
};
