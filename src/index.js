import "dotenv/config";
import { App } from "@slack/bolt";
import { openDatabase, saveResult, userStats, leaderboard, puzzleWinsLeaderboard, lossesLeaderboard } from "./database.js";
import { backfillChannel } from "./backfill.js";
import { parseWordle, formatUserStats } from "./wordle.js";

const required = ["SLACK_BOT_TOKEN", "SLACK_SIGNING_SECRET"];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}

const db = openDatabase(process.env.DATABASE_PATH ?? "./data/wordle.sqlite");
const socketMode = Boolean(process.env.SLACK_APP_TOKEN);
const commandName = process.env.SLACK_COMMAND_NAME ?? "/wordlebot";
if (!commandName.startsWith("/")) throw new Error("SLACK_COMMAND_NAME must begin with '/'");
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  ...(socketMode ? { socketMode: true, appToken: process.env.SLACK_APP_TOKEN } : {}),
});

app.message(async ({ message, logger }) => {
  // Ignore bot posts, message edits, and system subtypes.
  if (message.subtype || !message.user || !message.channel || !message.ts) return;
  const parsed = parseWordle(message.text);
  if (!parsed) return;

  try {
    saveResult(db, {
      ...parsed,
      channelId: message.channel,
      userId: message.user,
      postedAt: new Date(Number(message.ts) * 1000).toISOString(),
      messageTs: message.ts,
      rawText: message.text,
    });
  } catch (error) {
    logger.error(error);
  }
});

app.command(commandName, async ({ command, ack, respond, client, logger }) => {
  await ack();
  const [action = "stats", target] = command.text.trim().split(/\s+/, 2);

  if (action === "stats") {
    const userId = (target?.match(/^<@([A-Z0-9]+)>$/)?.[1]) ?? command.user_id;
    const stats = userStats(db, command.channel_id, userId);
    await respond({ response_type: "ephemeral", text: formatUserStats(stats, `<@${userId}>`) });
    return;
  }

  if (action === "leaderboard") {
    const rows = leaderboard(db, command.channel_id);
    const puzzleWins = puzzleWinsLeaderboard(db, command.channel_id);
    const losses = lossesLeaderboard(db, command.channel_id);
    const text = rows.length
      ? [
          "*Wordle leaderboard*",
          rows.map((row, i) => `${i + 1}. <@${row.user_id}> — ${row.success_rate}% success, ${row.average_guesses ?? "—"} avg, ${row.losses} losses, ${row.games} games`).join("\n"),
          "*Player losses* _(failed or tied for most guesses)_",
          losses.map((row, i) => `${i + 1}. <@${row.user_id}> — ${row.losses} loss${row.losses === 1 ? "" : "es"}`).join("\n"),
          "*Puzzle wins* _(lowest successful guess count; ties share the win)_",
          puzzleWins.length
            ? puzzleWins.map((row, i) => `${i + 1}. <@${row.user_id}> — ${row.puzzle_wins} win${row.puzzle_wins === 1 ? "" : "s"}`).join("\n")
            : "No completed Wordle puzzles yet.",
        ].join("\n\n")
      : "No Wordle results have been recorded in this channel yet.";
    await respond({ response_type: "in_channel", text });
    return;
  }

  if (action === "backfill") {
    try {
      const result = await backfillChannel({ client, db, channelId: command.channel_id });
      await respond({
        response_type: "ephemeral",
        text: `Backfill complete: scanned ${result.scanned} channel messages and found ${result.matched} Wordle shares. Existing results were updated instead of duplicated.`,
      });
    } catch (error) {
      logger.error(error);
      await respond({
        response_type: "ephemeral",
        text: "I couldn't read this channel's history. Confirm that I am invited to the channel and have the required history permission, then try again.",
      });
    }
    return;
  }

  await respond({ response_type: "ephemeral", text: "Usage: `/wordlebot stats [@person]`, `/wordlebot leaderboard`, or `/wordlebot backfill`" });
});

await app.start(process.env.PORT ?? 3000);
console.log(`⚡️ Wordle stats app running (${socketMode ? "Socket Mode" : "HTTP mode"})`);
