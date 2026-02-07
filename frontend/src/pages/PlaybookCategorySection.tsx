/**
 * PlaybookCategorySection - Categorization/grouping logic for playbooks
 *
 * Provides functions and components for organizing playbooks by domain
 * (gateway, designer, perspective) and by group.
 *
 * Extracted from Playbooks.tsx to reduce file size and improve maintainability.
 */

import type { PlaybookInfo } from '../types/api';
import { applyOrder } from './PlaybookDragHandlers';

/**
 * Categorize playbooks by domain field (preferred) or path (fallback)
 */
export function categorizePlaybooks(playbooks: PlaybookInfo[]) {
  const gateway: PlaybookInfo[] = [];
  const designer: PlaybookInfo[] = [];
  const perspective: PlaybookInfo[] = [];

  playbooks.forEach((playbook) => {
    // Prefer domain field from YAML metadata
    if (playbook.domain) {
      if (playbook.domain === 'gateway') {
        gateway.push(playbook);
      } else if (playbook.domain === 'designer') {
        designer.push(playbook);
      } else if (playbook.domain === 'perspective') {
        perspective.push(playbook);
      } else {
        // Unknown domain, fall back to path
        categorizeByPath(playbook);
      }
    } else {
      // No domain field, fall back to path
      categorizeByPath(playbook);
    }

    function categorizeByPath(pb: PlaybookInfo) {
      if (pb.path.includes('gateway/')) {
        gateway.push(pb);
      } else if (pb.path.includes('designer/')) {
        designer.push(pb);
      } else if (pb.path.includes('perspective/') || pb.path.includes('browser/')) {
        perspective.push(pb);
      } else {
        // Default to gateway if unclear
        gateway.push(pb);
      }
    }
  });

  // Apply saved order to each category
  return {
    gateway: applyOrder(gateway, 'gateway'),
    designer: applyOrder(designer, 'designer'),
    perspective: applyOrder(perspective, 'perspective'),
  };
}

/**
 * Group playbooks by their group field
 */
export function groupPlaybooks(playbooks: PlaybookInfo[]) {
  const grouped: Record<string, PlaybookInfo[]> = {};
  const ungrouped: PlaybookInfo[] = [];

  playbooks.forEach(playbook => {
    if (playbook.group) {
      if (!grouped[playbook.group]) {
        grouped[playbook.group] = [];
      }
      grouped[playbook.group].push(playbook);
    } else {
      ungrouped.push(playbook);
    }
  });

  return { grouped, ungrouped };
}

/** Domain display names */
export const domainNames: Record<string, string> = {
  gateway: 'Gateway',
  designer: 'Designer',
  perspective: 'Perspective',
};
