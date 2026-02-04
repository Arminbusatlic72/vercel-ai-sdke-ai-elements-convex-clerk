import { Doc, Id } from "@/convex/_generated/dataModel";

// SSE Constants
export const SSE_DATA_PREFIX = "data: " as const;
export const SSE_DONE_MESSAGE = "[DONE]" as const;
export const SSE_LINE_DELIMITER = "\n\n" as const;

export type MessageRole = "user" | "assistant";
export type Package = Doc<"packages">;
export interface Message {
  role: MessageRole;
  content: string;
}
export type ModelConfig = {
  name: string;
  value: string;
  provider: "OpenAI" | "Google" | "Perplexity";
};

export enum StreamMessageType {
  Token = "token",
  Error = "error",
  Connected = "connected",
  Done = "done",
  ToolStart = "tool_start",
  ToolEnd = "tool_end"
}

export interface BaseStreamMessage {
  type: StreamMessageType;
}

export interface TokenMessage extends BaseStreamMessage {
  type: StreamMessageType.Token;
  token: string;
}

export interface ErrorMessage extends BaseStreamMessage {
  type: StreamMessageType.Error;
  error: string;
}

export interface ConnectedMessage extends BaseStreamMessage {
  type: StreamMessageType.Connected;
}

export interface DoneMessage extends BaseStreamMessage {
  type: StreamMessageType.Done;
}

export interface ToolStartMessage extends BaseStreamMessage {
  type: StreamMessageType.ToolStart;
  tool: string;
  input: unknown;
}

export interface ToolEndMessage extends BaseStreamMessage {
  type: StreamMessageType.ToolEnd;
  tool: string;
  output: unknown;
}

export type StreamMessage =
  | TokenMessage
  | ErrorMessage
  | ConnectedMessage
  | DoneMessage
  | ToolStartMessage
  | ToolEndMessage;

export interface ChatRequestBody {
  messages: Message[];
  newMessage: string;
  chatId: Id<"chats">;
}

export interface GPTConfig {
  gptId: string;
  name?: string;
  description?: string;
  model: string;
  apiKey?: string;
  systemPrompt?: string;
  vectorStoreId?: string;
  packageId?: Id<"packages">;
  pdfFiles?: {
    fileName: string;
    openaiFileId: string;
    uploadedAt: number;
  }[];
}

/* ================================
   Subscription / Billing Types
================================ */

export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export type UserRole = "admin" | "user";

/**
 * Subscription object stored on the user
 * mirrors what Convex returns
 */
export interface UserSubscription {
  status: SubscriptionStatus;
  plan: string; // matches your package key ("sandbox", "substack", etc)
  maxGpts: number;
  gptIds: string[];
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: number;
}

/**
 * This EXACTLY matches api.users.getUserSubscription
 * (your dashboard query response)
 */
export interface SubscriptionData {
  role: UserRole;

  plan: string;
  planLabel: string;

  aiCredits: number;
  aiCreditsResetAt?: number;
  canCreateProject: boolean;

  subscription: UserSubscription | null;
}
