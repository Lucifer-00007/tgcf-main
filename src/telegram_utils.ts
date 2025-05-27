import { Bot, GrammyError } from 'grammy';
import { Message } from 'grammy/types';
import { InputFile } from 'grammy'; // Import InputFile
import { TgcfNodeMessage } from './message'; // Corrected import path for TgcfNodeMessage

// Helper function to clean up temporary files from TgcfNodeMessage
export async function cleanupTgcfMessageFile(tgcfMessage: TgcfNodeMessage | undefined): Promise<void> {
  if (tgcfMessage && tgcfMessage.filePath && tgcfMessage.cleanupFilePath) {
    console.log(`UTILS: Cleaning up temporary file: ${tgcfMessage.filePath}`);
    await tgcfMessage.clearTemporaryFile();
  }
}

export async function sendMessage(
  bot: Bot,
  destination: number,
  originalGrammyMessage: Message, // The original grammY message
  sourceChatId: number,
  showForwardedFrom: boolean | undefined,
  tgcfMessage?: TgcfNodeMessage // The processed TgcfNodeMessage
) {
  const messageToLogId = originalGrammyMessage.message_id;
  const textToSend = tgcfMessage?.text || originalGrammyMessage.text || originalGrammyMessage.caption;
  const entitiesToSend = tgcfMessage?.originalMessage?.entities || originalGrammyMessage.entities || tgcfMessage?.originalMessage?.caption_entities || originalGrammyMessage.caption_entities;
  const captionToSend = tgcfMessage?.text || originalGrammyMessage.caption; // Use tgcfMessage.text as caption if available

  // Determine which bot instance to use for sending
  const senderBot = tgcfMessage?.overrideSendBot || bot;
  if (tgcfMessage?.overrideSendBot) {
    console.log(`Using override sender bot for message ID ${messageToLogId} to destination ${destination}.`);
  }

  console.log(`Attempting to send/forward message ID ${messageToLogId} from ${sourceChatId} to ${destination} using bot ${senderBot === bot ? 'main' : 'override'}.`);
  try {
    if (showForwardedFrom) {
      // Forwarding inherently uses the bot that calls the method.
      // If an override bot is meant to forward, it should do so.
      await senderBot.api.forwardMessage(destination, sourceChatId, messageToLogId);
      console.log(`Message ${messageToLogId} forwarded from ${sourceChatId} to ${destination} using ${senderBot === bot ? 'main' : 'override'} bot.`);
    } else {
      const fileInput = tgcfMessage?.filePath ? new InputFile(tgcfMessage.filePath) : tgcfMessage?.fileId || undefined;

      if (tgcfMessage?.filePath && !fileInput) {
          console.warn(`File path ${tgcfMessage.filePath} provided but InputFile creation failed. Falling back to file_id if available.`);
      }
      
      const fileType = tgcfMessage?.fileType || (new TgcfNodeMessage(bot, originalGrammyMessage)).guessFileType();

      if (textToSend && fileType === 'nofile') {
        await senderBot.api.sendMessage(destination, textToSend, { entities: entitiesToSend });
        console.log(`Message ${messageToLogId} (text) copied from ${sourceChatId} to ${destination}`);
      } else if (fileInput && fileType === 'photo') {
        await senderBot.api.sendPhoto(destination, fileInput, { caption: captionToSend, caption_entities: entitiesToSend });
        console.log(`Message ${messageToLogId} (photo) copied from ${sourceChatId} to ${destination}`);
      } else if (fileInput && fileType === 'video') {
        await senderBot.api.sendVideo(destination, fileInput, { caption: captionToSend, caption_entities: entitiesToSend });
        console.log(`Message ${messageToLogId} (video) copied from ${sourceChatId} to ${destination}`);
      } else if (fileInput && fileType === 'audio') {
        await senderBot.api.sendAudio(destination, fileInput, { caption: captionToSend, caption_entities: entitiesToSend });
        console.log(`Message ${messageToLogId} (audio) copied from ${sourceChatId} to ${destination}`);
      } else if (fileInput && (fileType === 'document' || fileType === 'gif')) {
        await senderBot.api.sendDocument(destination, fileInput, { caption: captionToSend, caption_entities: entitiesToSend });
        console.log(`Message ${messageToLogId} (${fileType}) copied from ${sourceChatId} to ${destination}`);
      } else if (fileInput && fileType === 'sticker') {
        await senderBot.api.sendSticker(destination, fileInput);
        console.log(`Message ${messageToLogId} (sticker) copied from ${sourceChatId} to ${destination}`);
      } else if (fileInput && fileType === 'voice') {
        await senderBot.api.sendVoice(destination, fileInput, { caption: captionToSend, caption_entities: entitiesToSend });
        console.log(`Message ${messageToLogId} (voice) copied from ${sourceChatId} to ${destination}`);
      } else if (fileInput && fileType === 'video_note') {
        await senderBot.api.sendVideoNote(destination, fileInput);
        console.log(`Message ${messageToLogId} (video_note) copied from ${sourceChatId} to ${destination}`);
      }
      else if (originalGrammyMessage.location) {
        await senderBot.api.sendLocation(destination, originalGrammyMessage.location.latitude, originalGrammyMessage.location.longitude);
        console.log(`Message ${messageToLogId} (location) copied from ${sourceChatId} to ${destination}`);
      } else if (originalGrammyMessage.contact) {
        await senderBot.api.sendContact(destination, originalGrammyMessage.contact.phone_number, originalGrammyMessage.contact.first_name, { last_name: originalGrammyMessage.contact.last_name, vcard: originalGrammyMessage.contact.vcard });
        console.log(`Message ${messageToLogId} (contact) copied from ${sourceChatId} to ${destination}`);
      } else if (originalGrammyMessage.poll) {
        console.warn(`Message ID ${messageToLogId} from ${sourceChatId} is a poll. Copying polls is not directly supported, attempting to forward.`);
        await senderBot.api.forwardMessage(destination, sourceChatId, messageToLogId);
      }
      else if (textToSend) {
        await senderBot.api.sendMessage(destination, textToSend, { entities: entitiesToSend });
        console.log(`Message ${messageToLogId} (fallback text) copied from ${sourceChatId} to ${destination}`);
      }
      else {
        console.warn(`Message ID ${messageToLogId} from ${sourceChatId} is of an unsupported type or fileInput is missing. Attempting to forward.`);
        await senderBot.api.forwardMessage(destination, sourceChatId, messageToLogId);
      }
    }
  } catch (error) {
    console.error(`Error sending message ID ${messageToLogId} from ${sourceChatId} to ${destination} using ${senderBot === bot ? 'main' : 'override'} bot:`, error);
    if (error instanceof GrammyError) {
      console.error('GrammyError details:', error.description, error.error_code);
    }
    // Do not re-throw here to prevent one failed send from stopping others,
    // unless specific handling is required by the caller.
  }
}
