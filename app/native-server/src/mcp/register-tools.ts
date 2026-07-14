import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  CallToolResult,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import nativeMessagingHostInstance from '../native-messaging-host';
import { NativeMessageType, planKeyboardInput, TOOL_NAMES, TOOL_SCHEMAS } from 'chrome-mcp-shared';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { applyBackgroundPolicy, filterExposedTools, isToolDisabled } from './background-policy';

export async function listDynamicFlowTools(): Promise<Tool[]> {
  try {
    const response = await nativeMessagingHostInstance.sendRequestToExtensionAndWait(
      {},
      'rr_list_published_flows',
      20000,
    );
    if (response && response.status === 'success' && Array.isArray(response.items)) {
      const tools: Tool[] = [];
      for (const item of response.items) {
        const name = `flow.${item.slug}`;
        const description =
          (item.meta && item.meta.tool && item.meta.tool.description) ||
          item.description ||
          'Recorded flow';
        const properties: Record<string, any> = {};
        const required: string[] = [];
        for (const v of item.variables || []) {
          const desc = v.label || v.key;
          const typ = (v.type || 'string').toLowerCase();
          const prop: any = { description: desc };
          if (typ === 'boolean') prop.type = 'boolean';
          else if (typ === 'number') prop.type = 'number';
          else if (typ === 'enum') {
            prop.type = 'string';
            if (v.rules && Array.isArray(v.rules.enum)) prop.enum = v.rules.enum;
          } else if (typ === 'array') {
            // default array of strings; can extend with itemType later
            prop.type = 'array';
            prop.items = { type: 'string' };
          } else {
            prop.type = 'string';
          }
          if (v.default !== undefined) prop.default = v.default;
          if (v.rules && v.rules.required) required.push(v.key);
          properties[v.key] = prop;
        }
        // Run options
        properties['tabTarget'] = { type: 'string', enum: ['current', 'new'], default: 'current' };
        properties['refresh'] = { type: 'boolean', default: false };
        properties['captureNetwork'] = { type: 'boolean', default: false };
        properties['returnLogs'] = { type: 'boolean', default: false };
        properties['timeoutMs'] = { type: 'number', minimum: 0 };
        const tool: Tool = {
          name,
          description,
          inputSchema: { type: 'object', properties, required },
        };
        tools.push(tool);
      }
      return tools;
    }
    return [];
  } catch (e) {
    return [];
  }
}

export const setupTools = (server: Server) => {
  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: await listAvailableTools(),
  }));

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    handleToolCall(request.params.name, request.params.arguments || {}),
  );
};

export const listAvailableTools = async (): Promise<Tool[]> =>
  filterExposedTools([...TOOL_SCHEMAS, ...(await listDynamicFlowTools())]);

const DEFAULT_KEYBOARD_DELAY_MS = 50;

function waitForKeyboardDelay(delay: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function keyboardToolError(message: string): CallToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseKeyboardResponse(data: unknown): {
  success: boolean;
  targetElement?: unknown;
  results: unknown[];
} | null {
  if (!isRecord(data)) {
    return null;
  }

  const content = data.content;
  if (!Array.isArray(content)) {
    return null;
  }

  const textContent = content.find((item) => isRecord(item) && item.type === 'text');
  if (!isRecord(textContent) || typeof textContent.text !== 'string') {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(textContent.text);
    if (!isRecord(parsed) || !('success' in parsed)) {
      return null;
    }

    return {
      success: parsed.success === true,
      targetElement: 'targetElement' in parsed ? parsed.targetElement : undefined,
      results: 'results' in parsed && Array.isArray(parsed.results) ? parsed.results : [],
    };
  } catch {
    return null;
  }
}

async function handleKeyboardToolCall(args: Record<string, unknown>): Promise<CallToolResult> {
  const keys = args.keys;
  if (typeof keys !== 'string' || keys.length === 0) {
    return keyboardToolError('Invalid keyboard input: keys must be a non-empty string');
  }

  const requestedDelay = args.delay;
  const delay =
    typeof requestedDelay === 'number' && Number.isFinite(requestedDelay) && requestedDelay >= 0
      ? requestedDelay
      : DEFAULT_KEYBOARD_DELAY_MS;
  const keyboardInputs = planKeyboardInput(keys);
  const operationResults: unknown[] = [];
  let targetElement: unknown;
  let success = true;

  for (let index = 0; index < keyboardInputs.length; index += 1) {
    const response = await nativeMessagingHostInstance.sendRequestToExtensionAndWait(
      {
        name: TOOL_NAMES.BROWSER.KEYBOARD,
        args: { ...args, keys: keyboardInputs[index], delay: 0 },
      },
      NativeMessageType.CALL_TOOL,
      120000,
    );

    if (response.status !== 'success') {
      return keyboardToolError(`Error calling tool: ${response.error}`);
    }

    const parsedResponse = parseKeyboardResponse(response.data);
    if (!parsedResponse) {
      return keyboardToolError('Chrome extension returned an invalid keyboard response');
    }

    success = success && parsedResponse.success;
    operationResults.push(...parsedResponse.results);
    targetElement = parsedResponse.targetElement ?? targetElement;

    if (delay > 0 && index < keyboardInputs.length - 1) {
      await waitForKeyboardDelay(delay);
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success,
          message: success
            ? `Keyboard events simulated successfully: ${keys}`
            : `Some keyboard events failed for: ${keys}`,
          targetElement,
          results: operationResults,
        }),
      },
    ],
    isError: false,
  };
}

export const handleToolCall = async (name: string, args: any): Promise<CallToolResult> => {
  try {
    if (isToolDisabled(name)) {
      return {
        content: [
          {
            type: 'text',
            text: `${name} is disabled because it steals browser focus. Pass tabId directly to subsequent tools instead.`,
          },
        ],
        isError: true,
      };
    }

    const forwardedArgs = applyBackgroundPolicy(name, args);

    if (name === TOOL_NAMES.BROWSER.KEYBOARD) {
      return handleKeyboardToolCall(forwardedArgs);
    }

    // If calling a dynamic flow tool (name starts with flow.), proxy to common flow-run tool
    if (name && name.startsWith('flow.')) {
      // We need to resolve flow by slug to ID
      try {
        const resp = await nativeMessagingHostInstance.sendRequestToExtensionAndWait(
          {},
          'rr_list_published_flows',
          20000,
        );
        const items = (resp && resp.items) || [];
        const slug = name.slice('flow.'.length);
        const match = items.find((it: any) => it.slug === slug);
        if (!match) throw new Error(`Flow not found for tool ${name}`);
        const flowArgs = { flowId: match.id, args: forwardedArgs };
        const proxyRes = await nativeMessagingHostInstance.sendRequestToExtensionAndWait(
          { name: 'record_replay_flow_run', args: flowArgs },
          NativeMessageType.CALL_TOOL,
          120000,
        );
        if (proxyRes.status === 'success') return proxyRes.data;
        return {
          content: [{ type: 'text', text: `Error calling dynamic flow tool: ${proxyRes.error}` }],
          isError: true,
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error resolving dynamic flow tool: ${err?.message || String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
    // 发送请求到Chrome扩展并等待响应
    const response = await nativeMessagingHostInstance.sendRequestToExtensionAndWait(
      {
        name,
        args: forwardedArgs,
      },
      NativeMessageType.CALL_TOOL,
      120000, // 延长到 120 秒，避免性能分析等长任务超时
    );
    if (response.status === 'success') {
      return response.data;
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `Error calling tool: ${response.error}`,
          },
        ],
        isError: true,
      };
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error calling tool: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
};
