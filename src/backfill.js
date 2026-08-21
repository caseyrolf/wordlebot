import { saveResult } from "./result-store.js";
import { parseWordle } from "./wordle.js";

function importMessage(db, channelId, message) {
  if (message.subtype || !message.user || !message.ts) return false;
  const parsed = parseWordle(message.text);
  if (!parsed) return false;

  saveResult(db, {
    ...parsed,
    channelId,
    userId: message.user,
    postedAt: new Date(Number(message.ts) * 1000).toISOString(),
    messageTs: message.ts,
    rawText: message.text,
  });
  return true;
}

// Imports root channel messages. Historical thread replies are excluded so a
// backfill does not need a separate API request for every thread in a channel.
export async function backfillChannel({ client, db, channelId }) {
  let cursor;
  let scanned = 0;
  let matched = 0;

  do {
    const response = await client.conversations.history({
      channel: channelId,
      cursor,
      limit: 100,
    });
    const messages = response.messages ?? [];
    scanned += messages.length;
    for (const message of messages) {
      if (importMessage(db, channelId, message)) matched += 1;
    }
    cursor = response.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return { scanned, matched };
}
