import { TOOL_SCHEMAS } from 'chrome-mcp-shared';

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
