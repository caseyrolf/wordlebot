export function saveResult(db, result) {
  const statement = db.prepare(`
    INSERT INTO wordle_results
      (channel_id, user_id, puzzle_number, guesses, success, posted_at, message_ts, raw_text)
    VALUES (@channelId, @userId, @puzzleNumber, @guesses, @success, @postedAt, @messageTs, @rawText)
    ON CONFLICT(channel_id, user_id, puzzle_number) DO UPDATE SET
      guesses = excluded.guesses,
      success = excluded.success,
      posted_at = excluded.posted_at,
      message_ts = excluded.message_ts,
      raw_text = excluded.raw_text
  `);
  statement.run(result);
}
