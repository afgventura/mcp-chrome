import { randomUUID } from 'node:crypto';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { handleToolCall, listAvailableTools } from './register-tools';

type JsonRpcId = string | number | null;

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}

export interface DispatchResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body?: unknown;
}

const JSON_RPC_VERSION = '2.0';
const DEFAULT_PROTOCOL_VERSION = '2025-03-26';

const result = (id: JsonRpcId, value: unknown): unknown => ({
  jsonrpc: JSON_RPC_VERSION,
  id,
  result: value,
});

const error = (id: JsonRpcId, code: number, message: string): unknown => ({
  jsonrpc: JSON_RPC_VERSION,
  id,
  error: { code, message },
});

/**
 * Stateless HTTP request dispatcher with generated session identifiers.
 *
 * The TypeScript MCP SDK's low-level Server owns one active transport. Sharing
 * it across clients lets the latest connection steal earlier responses. This
 * dispatcher keeps the tool registry and Chrome bridge shared while returning
 * every JSON-RPC response through the HTTP request that produced it.
 */
export class McpHttpDispatcher {
  public async dispatch(body: unknown, sessionId?: string): Promise<DispatchResponse> {
    if (!this.isJsonRpcRequest(body)) {
      return { statusCode: 400, body: error(null, -32600, 'Invalid Request') };
    }

    if (body.method === 'initialize') {
      return this.initialize(body);
    }

    // Match mcp-go's StatelessGeneratingSessionIdManager: initialization
    // generates an ID, but subsequent requests only require a non-empty ID.
    // This keeps clients usable across native-host restarts and needs no
    // abandoned-session cleanup in the long-running local daemon.
    if (!sessionId) {
      return { statusCode: 400, body: error(body.id ?? null, -32000, 'Invalid MCP session ID') };
    }

    if (body.id === undefined) {
      return { statusCode: 202 };
    }

    const id = body.id;
    switch (body.method) {
      case 'ping':
        return { statusCode: 200, body: result(id, {}) };
      case 'tools/list':
        return { statusCode: 200, body: result(id, { tools: await listAvailableTools() }) };
      case 'tools/call':
        return this.callTool(id, body.params);
      case 'resources/list':
        return { statusCode: 200, body: result(id, { resources: [] }) };
      case 'prompts/list':
        return { statusCode: 200, body: result(id, { prompts: [] }) };
      case 'logging/setLevel':
        return { statusCode: 200, body: result(id, {}) };
      default:
        return { statusCode: 200, body: error(id, -32601, `Method not found: ${body.method}`) };
    }
  }

  public terminate(sessionId?: string): DispatchResponse {
    if (!sessionId) {
      return { statusCode: 404, body: error(null, -32000, 'Invalid MCP session ID') };
    }
    return { statusCode: 204 };
  }

  private initialize(message: JsonRpcRequest): DispatchResponse {
    const sessionId = randomUUID();
    const requestedVersion = message.params?.protocolVersion;
    const protocolVersion =
      typeof requestedVersion === 'string' ? requestedVersion : DEFAULT_PROTOCOL_VERSION;

    return {
      statusCode: 200,
      headers: { 'mcp-session-id': sessionId },
      body: result(message.id ?? null, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'ChromeMcpServer', version: '1.0.0' },
      }),
    };
  }

  private async callTool(
    id: JsonRpcId,
    params: Record<string, unknown> | undefined,
  ): Promise<DispatchResponse> {
    const name = params?.name;
    const args = params?.arguments;
    if (typeof name !== 'string' || (args !== undefined && !this.isRecord(args))) {
      return { statusCode: 200, body: error(id, -32602, 'Invalid tools/call parameters') };
    }

    const toolResult: CallToolResult = await handleToolCall(name, args ?? {});
    return { statusCode: 200, body: result(id, toolResult) };
  }

  private isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
    return (
      this.isRecord(value) &&
      value.jsonrpc === JSON_RPC_VERSION &&
      typeof value.method === 'string' &&
      (value.id === undefined ||
        value.id === null ||
        typeof value.id === 'string' ||
        typeof value.id === 'number') &&
      (value.params === undefined || this.isRecord(value.params))
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
