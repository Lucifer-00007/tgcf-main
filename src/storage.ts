// In-memory store for message mappings
// Key: `${original_chat_id}-${original_msg_id}`, Value: Map<dest_chat_id, forwarded_msg_info>
// forwarded_msg_info could be just a message_id or a more complex object if needed.
export const messageMappings = new Map<string, Map<number, { message_id: number; can_be_edited?: boolean; can_edit_caption?: boolean; }>>();

// Configuration for storage (can be moved to main config later)
const KEEP_LAST_MANY = 10000; // How many message mappings to keep per source-destination pair

/**
 * Stores a mapping from an original message to its forwarded version in a destination chat.
 * @param originalChatId The ID of the chat where the original message was sent.
 * @param originalMessageId The ID of the original message.
 * @param destChatId The ID of the chat where the message was forwarded/copied.
 * @param forwardedMessageId The ID of the message in the destination chat.
 */
export function storeMessageMapping(
  originalChatId: number,
  originalMessageId: number,
  destChatId: number,
  forwardedMessageId: number
): void {
  const key = `${originalChatId}-${originalMessageId}`;
  if (!messageMappings.has(key)) {
    messageMappings.set(key, new Map());
  }
  const destinationMap = messageMappings.get(key)!;
  destinationMap.set(destChatId, { message_id: forwardedMessageId }); // Add more info as needed

  // Basic mechanism to limit the size of the map to prevent memory leaks
  // This is a very simple approach; more sophisticated LRU cache might be needed for large scale.
  if (messageMappings.size > KEEP_LAST_MANY) {
    // Delete the oldest entry (maps are iterated in insertion order)
    const oldestKey = messageMappings.keys().next().value;
    if (oldestKey) {
      messageMappings.delete(oldestKey);
      console.log(`Storage: Pruned oldest message mapping for key ${oldestKey} to maintain size.`);
    }
  }
}

/**
 * Retrieves information about a forwarded message in a specific destination chat.
 * @param originalChatId The ID of the chat where the original message was sent.
 * @param originalMessageId The ID of the original message.
 * @param destChatId The ID of the destination chat.
 * @returns The forwarded message info (e.g., { message_id: number }) or undefined if not found.
 */
export function getForwardedMessage(
  originalChatId: number,
  originalMessageId: number,
  destChatId: number
): { message_id: number } | undefined {
  const key = `${originalChatId}-${originalMessageId}`;
  const destinationMap = messageMappings.get(key);
  if (destinationMap) {
    return destinationMap.get(destChatId);
  }
  return undefined;
}

/**
 * Retrieves all forwarded message information for a given original message.
 * @param originalChatId The ID of the chat where the original message was sent.
 * @param originalMessageId The ID of the original message.
 * @returns A Map where keys are destination chat IDs and values are forwarded message info, or undefined.
 */
export function getForwardedMessages(
  originalChatId: number,
  originalMessageId: number
): Map<number, { message_id: number }> | undefined {
  const key = `${originalChatId}-${originalMessageId}`;
  return messageMappings.get(key);
}

/**
 * Removes all mappings for a given original message.
 * @param originalChatId The ID of the chat where the original message was sent.
 *_ @param originalMessageId The ID of the original message.
 */
export function removeMessageMapping(
  originalChatId: number,
  originalMessageId: number
): void {
  const key = `${originalChatId}-${originalMessageId}`;
  if (messageMappings.has(key)) {
    messageMappings.delete(key);
  }
}

// Placeholder for future database integration (e.g., loading from/saving to MongoDB)
export async function loadMappingsFromDB() {
  console.log("Storage: loadMappingsFromDB (placeholder) - Not implemented.");
}

export async function saveMappingsToDB() {
  console.log("Storage: saveMappingsToDB (placeholder) - Not implemented.");
}

console.log("Storage: In-memory message mapping store initialized.");
