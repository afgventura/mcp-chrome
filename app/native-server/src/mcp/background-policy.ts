import { TOOL_NAMES, TOOL_SCHEMAS } from 'chrome-mcp-shared';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

const disabledToolNames = new Set<string>([TOOL_NAMES.BROWSER.SWITCH_TAB]);

const backgroundToolNames = new Set(
  TOOL_SCHEMAS.filter((tool) => {
    const properties = tool.inputSchema?.properties;
    return (
      properties !== undefined && Object.prototype.hasOwnProperty.call(properties, 'background')
    );
  }).map((tool) => tool.name),
);

/**
 * Prevent MCP clients from stealing desktop focus whenever the Chrome tool
 * explicitly supports background execution. The server owns this policy so it
 * applies consistently across Codex, Claude, and direct HTTP clients.
 */
export function applyBackgroundPolicy(
  toolName: string,
  args: Record<string, unknown>,
): Record<string, unknown> {
  if (!backgroundToolNames.has(toolName)) return args;
  return { ...args, background: true };
}

export function isToolDisabled(toolName: string): boolean {
  return disabledToolNames.has(toolName);
}

export function filterExposedTools(tools: Tool[]): Tool[] {
  return tools.filter((tool) => !isToolDisabled(tool.name));
}
