# Wordle Slack Stats

A small Slack app that records standard Wordle shares posted in a channel and reports per-person stats and a channel leaderboard. Results are kept in a local SQLite database.

## Run it

1. Create a Slack app at [api.slack.com/apps](https://api.slack.com/apps) and enable **Socket Mode**. Create an app-level token with the `connections:write` scope.
2. Under **OAuth & Permissions**, add these bot token scopes: `channels:history`, `groups:history`, `chat:write`, and `commands`. Install the app to your workspace.
3. Under **Event Subscriptions**, subscribe to bot events `message.channels` (and `message.groups` for private channels). Under **Slash Commands**, create `/wordlebot`.
4. Copy `.env.example` to `.env`, fill in the three Slack tokens/secrets, and set `SLACK_COMMAND_NAME` to the exact command configured in Slack.
5. Install and run:

   ```sh
   npm install
   npm start
   ```

Invite the bot to each channel it should read with `/invite @YourBot`.

## Commands

- `/wordlebot stats` — your stats in the current channel
- `/wordlebot stats @someone` — another member's stats
- `/wordlebot leaderboard` — top ten members with losses plus puzzle wins in the current channel
- `/wordlebot backfill` — import older top-level messages from the current channel

The app recognizes shares such as `Wordle 1,278 3/6` and `Wordle 1,278 X/6`. Reposting or editing a share updates that person's result for the same puzzle rather than adding a duplicate.

The leaderboard's **Puzzle wins** section counts the person or people with the lowest successful guess count for each puzzle. Ties share the win; unsuccessful results do not qualify.

The main leaderboard counts a loss when a player failed (`X/6`) or tied for the highest successful guess count reported for that puzzle. A puzzle only contributes losses for players who reported a result.

Backfill requires the bot to be invited to the target channel. It scans top-level channel messages; it does not scan replies within historical message threads. It may take time for very large channels because Slack paginates and rate-limits history requests.

## Privacy and limits

Only messages matching the Wordle-share header are stored, along with the matching message text, author/channel IDs, result, and timestamp. Statistics are intentionally scoped to the channel where the command is used.
