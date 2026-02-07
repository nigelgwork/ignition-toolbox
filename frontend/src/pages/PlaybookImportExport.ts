/**
 * Playbook import/export logic
 *
 * Extracted from Playbooks.tsx to reduce file size and improve maintainability.
 */

import type { QueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { createLogger } from '../utils/logger';
import type { PlaybookInfo } from '../types/api';

const logger = createLogger('PlaybookImportExport');

/** Notification callback type for showing snackbar messages */
export type ShowNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;

/**
 * Export a playbook as a JSON file download.
 */
export async function handleExport(
  playbook: PlaybookInfo,
  showNotification: ShowNotification
): Promise<void> {
  try {
    // Fetch full playbook export with YAML content
    const exportData = await api.playbooks.export(playbook.path);

    // Create download link
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${playbook.name.replace(/\s+/g, '_')}_export.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    showNotification(`Failed to export playbook: ${(error as Error).message}`, 'error');
  }
}

/**
 * Import a playbook from a JSON file.
 *
 * Opens a file picker, validates the file, handles security checks for
 * utility.python steps, and imports via the API.
 */
export function handleImport(
  showNotification: ShowNotification,
  queryClient: QueryClient
): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);

          // Validate export format
          if (!data.yaml_content || !data.name || !data.domain) {
            showNotification('Invalid export file: missing required fields (yaml_content, name, domain)', 'error');
            return;
          }

          // Security check: Warn about utility.python steps (potential code injection)
          const hasUtilityPython = data.yaml_content.includes('type: utility.python');
          if (hasUtilityPython) {
            const securityWarning = window.confirm(
              `SECURITY WARNING\n\n` +
              `This playbook contains Python code execution steps (utility.python).\n\n` +
              `Python steps can execute arbitrary code with full system access, including:\n` +
              `- Reading/modifying files\n` +
              `- Accessing credentials\n` +
              `- Network operations\n` +
              `- System commands\n\n` +
              `Only import playbooks from trusted sources!\n\n` +
              `Do you want to review the playbook code before importing?`
            );

            if (securityWarning) {
              // Show YAML content for review
              const reviewConfirm = window.confirm(
                `Playbook YAML Content:\n\n${data.yaml_content.substring(0, 1000)}...\n\n` +
                `(Full content shown in browser console)\n\n` +
                `Continue with import?`
              );
              logger.debug('=== PLAYBOOK CODE REVIEW ===');
              logger.debug(data.yaml_content);
              logger.debug('=== END PLAYBOOK CODE ===');

              if (!reviewConfirm) return;
            }
          }

          // Confirm import
          const confirmImport = window.confirm(
            `Import playbook "${data.name}"?\n\n` +
            `Domain: ${data.domain}\n` +
            `Version: ${data.version}\n\n` +
            `This will create a new playbook in your playbooks/${data.domain}/ directory.`
          );

          if (!confirmImport) return;

          // Import playbook (pass metadata to preserve verified status)
          const result = await api.playbooks.import(
            data.name,
            data.domain,
            data.yaml_content,
            false, // Don't overwrite by default
            data.metadata // Pass metadata to preserve verified status
          );

          showNotification(`Playbook imported to: ${result.path}`, 'success');

          // Refresh playbook list via React Query
          queryClient.invalidateQueries({ queryKey: ['playbooks'] });
        } catch (error) {
          showNotification(`Failed to import playbook: ${(error as Error).message}`, 'error');
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
}

/**
 * Reset all playbook metadata.
 */
export async function handleResetMetadata(
  showNotification: ShowNotification,
  queryClient: QueryClient
): Promise<void> {
  const confirmed = window.confirm(
    'Reset all playbook metadata?\n\n' +
    'This will clear all verification states, enabled/disabled states, and other metadata for all playbooks.\n\n' +
    'You will need to re-verify any playbooks that require verification.\n\n' +
    'This is useful for troubleshooting path-related issues on Windows.'
  );

  if (!confirmed) return;

  try {
    await api.playbooks.resetMetadata();
    showNotification('Playbook metadata has been reset.', 'success');
    queryClient.invalidateQueries({ queryKey: ['playbooks'] });
  } catch (error) {
    showNotification(`Failed to reset metadata: ${(error as Error).message}`, 'error');
  }
}
