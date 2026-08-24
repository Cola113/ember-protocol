import type {
  LanguageModelV1CallOptions,
  LanguageModelV1FunctionTool,
  LanguageModelV1FunctionToolCall,
  LanguageModelV1Prompt,
  LanguageModelV1ToolChoice
} from "@ai-sdk/provider";

const FALLBACK_USER_TEXT = "Follow the instructions and reply.";

export interface OpenAIChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

export interface OpenAIToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

export function regularTools(call: LanguageModelV1CallOptions): LanguageModelV1FunctionTool[] {
  if (call.mode?.type !== "regular" || !call.mode.tools) return [];
  return call.mode.tools.filter((tool): tool is LanguageModelV1FunctionTool => tool.type === "function");
}

export function regularToolChoice(call: LanguageModelV1CallOptions): LanguageModelV1ToolChoice | undefined {
  return call.mode?.type === "regular" ? call.mode.toolChoice : undefined;
}

export function promptSystemText(prompt: LanguageModelV1Prompt): string {
  return prompt
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n")
    .trim();
}

export function toOpenAIMessages(prompt: LanguageModelV1Prompt): OpenAIChatMessage[] {
  const messages: OpenAIChatMessage[] = [];
  for (const message of prompt) {
    if (message.role === "system") {
      messages.push({ role: "system", content: message.content });
      continue;
    }
    if (message.role === "user") {
      const content = message.content
        .map((part) => (part.type === "text" ? part.text : ""))
        .join("");
      messages.push({ role: "user", content: content || FALLBACK_USER_TEXT });
      continue;
    }
    if (message.role === "assistant") {
      const text = message.content
        .map((part) => (part.type === "text" ? part.text : ""))
        .join("");
      const toolCalls = message.content
        .filter((part) => part.type === "tool-call")
        .map((part) => ({
          id: part.toolCallId,
          type: "function" as const,
          function: {
            name: part.toolName,
            arguments: typeof part.args === "string" ? part.args : JSON.stringify(part.args ?? {})
          }
        }));
      const next: OpenAIChatMessage = {
        role: "assistant",
        content: text.length > 0 ? text : toolCalls.length > 0 ? null : FALLBACK_USER_TEXT
      };
      if (toolCalls.length > 0) next.tool_calls = toolCalls;
      messages.push(next);
      continue;
    }
    for (const part of message.content) {
      messages.push({
        role: "tool",
        tool_call_id: part.toolCallId,
        content: stringifyToolResult(part.result)
      });
    }
  }
  if (!messages.some((message) => message.role === "user" || message.role === "tool")) {
    messages.push({ role: "user", content: FALLBACK_USER_TEXT });
  }
  return messages;
}

export function toGeminiContents(prompt: LanguageModelV1Prompt): GeminiContent[] {
  const contents: GeminiContent[] = [];
  for (const message of prompt) {
    if (message.role === "system") continue;
    if (message.role === "user") {
      const text = message.content
        .map((part) => (part.type === "text" ? part.text : ""))
        .join("");
      contents.push({
        role: "user",
        parts: [{ text: text || FALLBACK_USER_TEXT }]
      });
      continue;
    }
    if (message.role === "assistant") {
      const parts: GeminiPart[] = [];
      for (const part of message.content) {
        if (part.type === "text" && part.text) {
          parts.push({ text: part.text });
        } else if (part.type === "tool-call") {
          parts.push({
            functionCall: {
              name: part.toolName,
              args: asRecord(part.args)
            }
          });
        }
      }
      contents.push({
        role: "model",
        parts: parts.length > 0 ? parts : [{ text: FALLBACK_USER_TEXT }]
      });
      continue;
    }
    contents.push({
      role: "user",
      parts: message.content.map((part) => ({
        functionResponse: {
          name: part.toolName,
          response: asRecord(part.result)
        }
      }))
    });
  }
  if (contents.length === 0) {
    contents.push({ role: "user", parts: [{ text: FALLBACK_USER_TEXT }] });
  }
  return contents;
}

export function toOpenAITools(tools: LanguageModelV1FunctionTool[]) {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));
}

export function toGeminiToolDeclarations(tools: LanguageModelV1FunctionTool[]) {
  return {
    functionDeclarations: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }))
  };
}

export function toOpenAIToolChoice(
  choice: LanguageModelV1ToolChoice | undefined
): string | { type: "function"; function: { name: string } } | undefined {
  if (!choice) return undefined;
  if (choice.type === "auto") return "auto";
  if (choice.type === "none") return "none";
  if (choice.type === "required") return "required";
  return { type: "function", function: { name: choice.toolName } };
}

export function toGeminiToolConfig(choice: LanguageModelV1ToolChoice | undefined) {
  if (!choice) return undefined;
  if (choice.type === "none") {
    return { functionCallingConfig: { mode: "NONE" } };
  }
  if (choice.type === "required") {
    return { functionCallingConfig: { mode: "ANY" } };
  }
  if (choice.type === "tool") {
    return {
      functionCallingConfig: {
        mode: "ANY",
        allowedFunctionNames: [choice.toolName]
      }
    };
  }
  return { functionCallingConfig: { mode: "AUTO" } };
}

export function parseGeminiToolCalls(
  parts: Array<{ text?: string; functionCall?: { name?: string; args?: unknown } }> | undefined
): { text: string; toolCalls: LanguageModelV1FunctionToolCall[] } {
  const toolCalls: LanguageModelV1FunctionToolCall[] = [];
  const textParts: string[] = [];
  const partsToParse = parts ?? [];
  for (let index = 0; index < partsToParse.length; index += 1) {
    const part = partsToParse[index];
    if (typeof part.text === "string" && part.text.length > 0) {
      textParts.push(part.text);
    }
    const fn = part.functionCall;
    if (fn?.name) {
      toolCalls.push({
        toolCallType: "function",
        toolCallId: `call_${index}_${sanitizeToolId(fn.name)}`,
        toolName: fn.name,
        args: JSON.stringify(fn.args ?? {})
      });
    }
  }
  return { text: textParts.join(""), toolCalls };
}

export function parseOpenAIToolCalls(
  message:
    | {
        content?: string | null;
        tool_calls?: Array<{
          id?: string;
          function?: { name?: string; arguments?: string };
        }>;
      }
    | undefined
): { text: string; toolCalls: LanguageModelV1FunctionToolCall[] } {
  const text = message?.content ?? "";
  const toolCalls: LanguageModelV1FunctionToolCall[] = (message?.tool_calls ?? []).flatMap((call, index) => {
    const name = call.function?.name;
    if (!name) return [];
    return [
      {
        toolCallType: "function" as const,
        toolCallId: call.id || `call_${index}_${sanitizeToolId(name)}`,
        toolName: name,
        args: call.function?.arguments ?? "{}"
      }
    ];
  });
  return { text, toolCalls };
}

function stringifyToolResult(result: unknown): string {
  if (typeof result === "string") return result;
  try {
    return JSON.stringify(result ?? {});
  } catch {
    return "{}";
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return { value };
    }
  }
  return { value };
}

function sanitizeToolId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32) || "tool";
}
