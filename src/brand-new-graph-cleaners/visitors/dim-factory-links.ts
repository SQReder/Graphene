import { createLinkEdge } from '../../edge-factories';
import { isParentToChildEdge, isRegularNode } from '../../lib';
import type { NamedGraphVisitor } from '../types';

export const dimFactoryLinks: NamedGraphVisitor = {
	name: 'Dim factory links',
	visit: async (graph) => {
		graph.nodes
			.filter(isRegularNode)
			.filter((node) => node.data.effector.meta.isFactory)
			.forEach((node) => {
				graph.listEdgesFrom(node.id, isParentToChildEdge).forEach((edge) => {
					graph.removeEdgeById(edge.id);
					graph.addEdge(
						createLinkEdge({
							id: edge.id + ' [dimmed]',
							source: edge.data.relatedNodes.source,
							target: edge.data.relatedNodes.target,
							extras: (edge) => {
								edge.data = {
									...edge.data,
								};
								edge.style = {
									...edge.style,
									stroke: 'rgba(198, 177, 250, 1)',
									strokeWidth: 1,
									strokeDasharray: '2,4',
								};
							},
						}),
					);
				});
			});
	},
};
