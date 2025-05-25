import { Bot, GrammyError } from 'grammy';
import { Message } from 'grammy/types';

export async function sendMessage(
import { InputFile } from 'grammy'; // Import InputFile
import { TgcfNodeMessage } from '../message'; // Import TgcfNodeMessage

export async function sendMessage(
  bot: Bot,
  destination: number,
  originalGrammyMessage: Message, // The original grammY message
  sourceChatId: number,
  showForwardedFrom: boolean | undefined,
  tgcfMessage?: TgcfNodeMessage // The processed TgcfNodeMessage, optional for now
) {
  const messageToLogId = originalGrammyMessage.message_id;
  const textToSend = tgcfMessage?.text || originalGrammyMessage.text || originalGrammyMessage.caption;
  const entitiesToSend = tgcfMessage?.originalMessage?.entities || originalGrammyMessage.entities || tgcfMessage?.originalMessage?.caption_entities || originalGrammyMessage.caption_entities;
  const captionToSend = tgcfMessage?.text || originalGrammyMessage.caption; // Use tgcfMessage.text as caption if available

  console.log(`Attempting to send/forward message ID ${messageToLogId} from ${sourceChatId} to ${destination}`);
  try {
    if (showForwardedFrom) {
      await bot.api.forwardMessage(destination, sourceChatId, messageToLogId);
      console.log(`Message ${messageToLogId} forwarded from ${sourceChatId} to ${destination}`);
    } else {
      // Use tgcfMessage.filePath if available (preferred for modified files)
      const fileInput = tgcfMessage?.filePath ? new InputFile(tgcfMessage.filePath) : tgcfMessage?.fileId || undefined;

      if (tgcfMessage?.filePath && !fileInput) { // Should not happen if filePath is valid
          console.warn(`File path ${tgcfMessage.filePath} provided but InputFile creation failed. Falling back to file_id if available.`);
      }
      
      const fileType = tgcfMessage?.fileType || (new TgcfNodeMessage(bot,originalGrammyMessage)).guessFileType(); // Guess from original if not in tgcfMessage

      if (textToSend && fileType === 'nofile') { // Ensure it's a text-only message if fileType is nofile
        await bot.api.sendMessage(destination, textToSend, { entities: entitiesToSend });
        console.log(`Message ${messageToLogId} (text) copied from ${sourceChatId} to ${destination}`);
      } else if (fileInput && fileType === 'photo') {
        await bot.api.sendPhoto(destination, fileInput, { caption: captionToSend, caption_entities: entitiesToSend });
        console.log(`Message ${messageToLogId} (photo) copied from ${sourceChatId} to ${destination}`);
      } else if (fileInput && fileType === 'video') {
        await bot.api.sendVideo(destination, fileInput, { caption: captionToSend, caption_entities: entitiesToSend });
        console.log(`Message ${messageToLogId} (video) copied from ${sourceChatId} to ${destination}`);
      } else if (fileInput && fileType === 'audio') {
        await bot.api.sendAudio(destination, fileInput, { caption: captionToSend, caption_entities: entitiesToSend });
        console.log(`Message ${messageToLogId} (audio) copied from ${sourceChatId} to ${destination}`);
      } else if (fileInput && (fileType === 'document' || fileType === 'gif')) { // Treat GIF as document for sending copy
        await bot.api.sendDocument(destination, fileInput, { caption: captionToSend, caption_entities: entitiesToSend });
        console.log(`Message ${messageToLogId} (${fileType}) copied from ${sourceChatId} to ${destination}`);
      } else if (fileInput && fileType === 'sticker') {
        await bot.api.sendSticker(destination, fileInput);
        console.log(`Message ${messageToLogId} (sticker) copied from ${sourceChatId} to ${destination}`);
      } else if (fileInput && fileType === 'voice') {
        await bot.api.sendVoice(destination, fileInput, { caption: captionToSend, caption_entities: entitiesToSend });
        console.log(`Message ${messageToLogId} (voice) copied from ${sourceChatId} to ${destination}`);
      } else if (fileInput && fileType === 'video_note') {
        await bot.api.sendVideoNote(destination, fileInput);
        console.log(`Message ${messageToLogId} (video_note) copied from ${sourceChatId} to ${destination}`);
      }
      // Original grammY message based sending for types not relying on tgcfMessage.filePath
      else if (originalGrammyMessage.location) {
        await bot.api.sendLocation(destination, originalGrammyMessage.location.latitude, originalGrammyMessage.location.longitude);
        console.log(`Message ${messageToLogId} (location) copied from ${sourceChatId} to ${destination}`);
      } else if (originalGrammyMessage.contact) {
        await bot.api.sendContact(destination, originalGrammyMessage.contact.phone_number, originalGrammyMessage.contact.first_name, { last_name: originalGrammyMessage.contact.last_name, vcard: originalGrammyMessage.contact.vcard });
        console.log(`Message ${messageToLogId} (contact) copied from ${sourceChatId} to ${destination}`);
      } else if (originalGrammyMessage.poll) {
        console.warn(`Message ID ${messageToLogId} from ${sourceChatId} is a poll. Copying polls is not directly supported, attempting to forward.`);
        await bot.api.forwardMessage(destination, sourceChatId, messageToLogId);
      }
      // Fallback for text messages if no other type matched but textToSend is available
      else if (textToSend) {
        await bot.api.sendMessage(destination, textToSend, { entities: entitiesToSend });
        console.log(`Message ${messageToLogId} (fallback text) copied from ${sourceChatId} to ${destination}`);
      }
      else {
        console.warn(`Message ID ${messageToLogId} from ${sourceChatId} is of an unsupported type or fileInput is missing. Attempting to forward.`);
        await bot.api.forwardMessage(destination, sourceChatId, messageToLogId);
      }
    }
  } catch (error) {
    console.error(`Error sending message ID ${messageToLogId} from ${sourceChatId} to ${destination}:`, error);
    if (error instanceof GrammyError) {
      console.error('GrammyError details:', error.description, error.error_code);
    }
    // Do not re-throw here to prevent one failed send from stopping others,
    // unless specific handling is required by the caller.
  }
}
