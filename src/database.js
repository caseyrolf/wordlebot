import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
export { saveResult } from "./result-store.js";

export function openDatabase(path) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS wordle_results (
      id INTEGER PRIMARY KEY,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      puzzle_number INTEGER NOT NULL,
      guesses INTEGER,
      success INTEGER NOT NULL CHECK (success IN (0, 1)),
      posted_at TEXT NOT NULL,
      message_ts TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      UNIQUE(channel_id, user_id, puzzle_number)
    );
    CREATE INDEX IF NOT EXISTS wordle_results_channel_puzzle
      ON wordle_results(channel_id, puzzle_number);
    CREATE INDEX IF NOT EXISTS wordle_results_channel_puzzle_score
      ON wordle_results(channel_id, puzzle_number, success, guesses);
  `);
  return db;
}

export function userStats(db, channelId, userId) {
  return db.prepare(`
    SELECT COUNT(*) AS games,
           SUM(success) AS wins,
           ROUND(AVG(CASE WHEN success = 1 THEN guesses END), 2) AS average_guesses
    FROM wordle_results WHERE channel_id = ? AND user_id = ?
  `).get(channelId, userId);
}

export function leaderboard(db, channelId) {
  return db.prepare(`
    SELECT user_id,
           COUNT(*) AS games,
           SUM(success) AS wins,
           ROUND(100.0 * SUM(success) / COUNT(*), 1) AS success_rate,
           ROUND(AVG(CASE WHEN success = 1 THEN guesses END), 2) AS average_guesses
    FROM wordle_results
    WHERE channel_id = ?
    GROUP BY user_id
    ORDER BY success_rate DESC, average_guesses ASC, games DESC
    LIMIT 10
  `).all(channelId);
}

export function puzzleWinsLeaderboard(db, channelId) {
  return db.prepare(`
    WITH puzzle_minimums AS (
      SELECT puzzle_number, MIN(guesses) AS winning_guesses
      FROM wordle_results
      WHERE channel_id = ? AND success = 1
      GROUP BY puzzle_number
    )
    SELECT results.user_id, COUNT(*) AS puzzle_wins
    FROM wordle_results AS results
    INNER JOIN puzzle_minimums AS minimums
      ON minimums.puzzle_number = results.puzzle_number
      AND minimums.winning_guesses = results.guesses
    WHERE results.channel_id = ? AND results.success = 1
    GROUP BY results.user_id
    ORDER BY puzzle_wins DESC, results.user_id ASC
    LIMIT 10
  `).all(channelId, channelId);
}
