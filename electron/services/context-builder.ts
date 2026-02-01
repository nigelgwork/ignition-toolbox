import * as http from 'http';

/**
 * Playbook summary from context API
 */
interface PlaybookSummary {
  name: string;
  description: string | null;
  domain: string | null;
  step_count: number;
  path: string;
}

/**
 * Execution summary from context API
 */
interface ExecutionSummary {
  execution_id: string;
  playbook_name: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
}

/**
 * Credential summary from context API
 */
interface CredentialSummary {
  name: string;
  has_gateway_url: boolean;
}

/**
 * CloudDesigner summary from context API
 */
interface CloudDesignerSummary {
  status: string;
  port: number | null;
}

/**
 * System summary from context API
 */
interface SystemSummary {
  browser_available: boolean;
  active_executions: number;
}

/**
 * Complete context summary from API
 */
export interface ContextSummary {
  playbooks: PlaybookSummary[];
  recent_executions: ExecutionSummary[];
  credentials: CredentialSummary[];
  clouddesigner: CloudDesignerSummary;
  system: SystemSummary;
}

/**
 * Context builder for AI chat
 *
 * Fetches project context from the Python backend and builds
 * a system prompt for the AI assistant.
 */
export class ContextBuilder {
  private backendPort: number;

  constructor(backendPort: number) {
    this.backendPort = backendPort;
  }

  /**
   * Update the backend port (if it changes after restart)
   */
  setBackendPort(port: number): void {
    this.backendPort = port;
  }

  /**
   * Fetch context summary from Python backend
   */
  async fetchContext(): Promise<ContextSummary | null> {
    return new Promise((resolve) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: this.backendPort,
          path: '/api/context/summary',
          method: 'GET',
          timeout: 5000,
        },
        (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const context = JSON.parse(data) as ContextSummary;
              resolve(context);
            } catch {
              console.error('[ContextBuilder] Failed to parse context response');
              resolve(null);
            }
          });
        }
      );

      req.on('error', (error) => {
        console.error('[ContextBuilder] Failed to fetch context:', error.message);
        resolve(null);
      });

      req.on('timeout', () => {
        req.destroy();
        console.error('[ContextBuilder] Context fetch timed out');
        resolve(null);
      });

      req.end();
    });
  }

  /**
   * Build a system prompt with project context for the AI
   */
  async buildSystemPrompt(): Promise<string> {
    const context = await this.fetchContext();

    let prompt = `You are Clawdbot, an AI assistant for Ignition Toolbox - a desktop application for visual acceptance testing of Ignition SCADA systems.

You help users with:
- Understanding playbook steps and execution results
- Debugging failed executions
- Suggesting playbook improvements
- Explaining Ignition SCADA concepts
- Troubleshooting browser automation issues

Always be concise and actionable. Focus on practical solutions.
`;

    if (!context) {
      prompt += '\n(Project context unavailable - backend may not be running)';
      return prompt;
    }

    prompt += '\n## Current Project Context\n';

    // Playbooks
    if (context.playbooks.length > 0) {
      prompt += '\n### Playbooks\n';
      for (const playbook of context.playbooks.slice(0, 20)) {
        const desc = playbook.description ? ` - ${playbook.description}` : '';
        const domain = playbook.domain ? ` [${playbook.domain}]` : '';
        prompt += `- **${playbook.name}**${domain}: ${playbook.step_count} steps${desc}\n`;
      }
      if (context.playbooks.length > 20) {
        prompt += `- ... and ${context.playbooks.length - 20} more playbooks\n`;
      }
    } else {
      prompt += '\n### Playbooks\nNo playbooks installed yet.\n';
    }

    // Recent Executions
    if (context.recent_executions.length > 0) {
      prompt += '\n### Recent Executions\n';
      for (const exec of context.recent_executions) {
        const status = exec.status.toUpperCase();
        const error = exec.error ? ` - Error: ${exec.error.slice(0, 100)}` : '';
        prompt += `- ${exec.playbook_name}: ${status}${error}\n`;
      }
    } else {
      prompt += '\n### Recent Executions\nNo recent executions.\n';
    }

    // Credentials
    if (context.credentials.length > 0) {
      prompt += '\n### Available Credentials\n';
      for (const cred of context.credentials) {
        const gateway = cred.has_gateway_url ? ' (has gateway URL)' : '';
        prompt += `- ${cred.name}${gateway}\n`;
      }
    }

    // System Status
    prompt += '\n### System Status\n';
    prompt += `- CloudDesigner: ${context.clouddesigner.status}`;
    if (context.clouddesigner.port) {
      prompt += ` (port ${context.clouddesigner.port})`;
    }
    prompt += '\n';
    prompt += `- Active Executions: ${context.system.active_executions}\n`;
    prompt += `- Browser Automation: ${context.system.browser_available ? 'Available' : 'Not Available'}\n`;

    return prompt;
  }

  /**
   * Get a simple context summary for display in the UI
   */
  async getDisplayContext(): Promise<{
    playbookCount: number;
    recentExecutions: { name: string; status: string }[];
    cloudDesignerStatus: string;
  }> {
    const context = await this.fetchContext();

    if (!context) {
      return {
        playbookCount: 0,
        recentExecutions: [],
        cloudDesignerStatus: 'unknown',
      };
    }

    return {
      playbookCount: context.playbooks.length,
      recentExecutions: context.recent_executions.slice(0, 5).map((e) => ({
        name: e.playbook_name,
        status: e.status,
      })),
      cloudDesignerStatus: context.clouddesigner.status,
    };
  }
}

// Singleton instance
let contextBuilderInstance: ContextBuilder | null = null;

/**
 * Get or create the singleton context builder instance
 */
export function getContextBuilder(backendPort?: number): ContextBuilder {
  if (!contextBuilderInstance && backendPort) {
    contextBuilderInstance = new ContextBuilder(backendPort);
  } else if (contextBuilderInstance && backendPort) {
    contextBuilderInstance.setBackendPort(backendPort);
  }

  if (!contextBuilderInstance) {
    throw new Error('ContextBuilder not initialized - backend port required');
  }

  return contextBuilderInstance;
}
