import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Result from Claude CLI execution
 */
export interface ClaudeExecutionResult {
  success: boolean;
  output: string;
  error?: string;
}

/**
 * Callback for streaming output
 */
export type StreamCallback = (chunk: string) => void;

/**
 * Claude Code CLI executor
 *
 * Manages spawning and communicating with the Claude CLI for AI chat functionality.
 */
export class ClaudeExecutor {
  private activeProcess: ChildProcess | null = null;

  /**
   * Check if Claude Code CLI is installed and available
   */
  async checkAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      // Try to run claude --version to check if it's installed
      const process = spawn('claude', ['--version'], {
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let hasOutput = false;

      process.stdout?.on('data', () => {
        hasOutput = true;
      });

      process.on('close', (code) => {
        // Claude CLI is available if it exits successfully and produces output
        resolve(code === 0 || hasOutput);
      });

      process.on('error', () => {
        resolve(false);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        process.kill();
        resolve(false);
      }, 5000);
    });
  }

  /**
   * Execute a query using Claude CLI
   *
   * @param prompt The user's message/prompt
   * @param systemPrompt Optional system prompt with context
   * @param onStream Optional callback for streaming output
   * @returns Execution result
   */
  async executeQuery(
    prompt: string,
    systemPrompt?: string,
    onStream?: StreamCallback
  ): Promise<ClaudeExecutionResult> {
    return new Promise((resolve) => {
      // Build the full prompt with system context if provided
      const fullPrompt = systemPrompt ? `${systemPrompt}\n\nUser: ${prompt}` : prompt;

      // Spawn claude CLI with --print flag for non-interactive output
      // Use --dangerously-skip-permissions to avoid permission prompts
      const args = ['--print', '--output-format', 'text', '--dangerously-skip-permissions'];

      this.activeProcess = spawn('claude', args, {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      // Write the prompt to stdin
      this.activeProcess.stdin?.write(fullPrompt);
      this.activeProcess.stdin?.end();

      // Handle stdout (streaming)
      this.activeProcess.stdout?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        if (onStream) {
          onStream(chunk);
        }
      });

      // Handle stderr
      this.activeProcess.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      // Handle process close
      this.activeProcess.on('close', (code) => {
        this.activeProcess = null;

        if (code === 0) {
          resolve({
            success: true,
            output: stdout.trim(),
          });
        } else {
          resolve({
            success: false,
            output: stdout.trim(),
            error: stderr.trim() || `Process exited with code ${code}`,
          });
        }
      });

      // Handle process errors
      this.activeProcess.on('error', (error) => {
        this.activeProcess = null;
        resolve({
          success: false,
          output: '',
          error: error.message,
        });
      });
    });
  }

  /**
   * Cancel any active execution
   */
  cancelExecution(): void {
    if (this.activeProcess) {
      this.activeProcess.kill('SIGTERM');
      this.activeProcess = null;
    }
  }

  /**
   * Check if an execution is currently running
   */
  isExecuting(): boolean {
    return this.activeProcess !== null;
  }
}

// Singleton instance
let claudeExecutorInstance: ClaudeExecutor | null = null;

/**
 * Get the singleton Claude executor instance
 */
export function getClaudeExecutor(): ClaudeExecutor {
  if (!claudeExecutorInstance) {
    claudeExecutorInstance = new ClaudeExecutor();
  }
  return claudeExecutorInstance;
}
