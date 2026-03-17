export interface ConversationTimeLike {
  source_created_at?: number | null;
  first_captured_at?: number;
  last_captured_at?: number;
  created_at: number;
  updated_at: number;
}

function isFiniteTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function getConversationSourceCreatedAt(
  conversation: ConversationTimeLike
): number | null {
  return isFiniteTimestamp(conversation.source_created_at)
    ? conversation.source_created_at
    : null;
}

export function getConversationFirstCapturedAt(
  conversation: ConversationTimeLike
): number {
  return isFiniteTimestamp(conversation.first_captured_at)
    ? conversation.first_captured_at
    : conversation.created_at;
}

export function getConversationLastCapturedAt(
  conversation: ConversationTimeLike
): number {
  return isFiniteTimestamp(conversation.last_captured_at)
    ? conversation.last_captured_at
    : conversation.updated_at;
}

export function getConversationOriginAt(
  conversation: ConversationTimeLike
): number {
  return (
    getConversationSourceCreatedAt(conversation) ??
    getConversationFirstCapturedAt(conversation)
  );
}

export function getConversationCaptureFreshnessAt(
  conversation: ConversationTimeLike
): number {
  return getConversationLastCapturedAt(conversation);
}

export function getConversationRecordModifiedAt(
  conversation: ConversationTimeLike
): number {
  return conversation.updated_at;
}
