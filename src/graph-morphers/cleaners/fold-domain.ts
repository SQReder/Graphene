import { isRegularNode } from '../../lib';
import { OpType } from '../../types';
import { foldByShape, type RootSelector } from './foldByShape';

const domainSelector: RootSelector = (node) => isRegularNode(node) && node.data.effector.meta.op === OpType.Domain;
export const foldDomain = foldByShape('Domain', domainSelector, {}, ['onEvent', 'onStore', 'onEffect', 'onDomain']);
