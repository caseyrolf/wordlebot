import test from "node:test";
import assert from "node:assert/strict";
import { openDatabase, puzzleWinsLeaderboard, saveResult } from "../src/database.js";

function result({ channelId = "C1", userId, puzzleNumber, guesses, success = 1 }) {
  return {
    channelId,
    userId,
    puzzleNumber,
    guesses,
    success,
    postedAt: "2026-08-24T00:00:00.000Z",
    messageTs: `${puzzleNumber}.${userId}`,
    rawText: `Wordle ${puzzleNumber} ${guesses ?? "X"}/6`,
  };
}

test("awards each tied lowest successful score a puzzle win", () => {
  const db = openDatabase(":memory:");
  for (const entry of [
    result({ userId: "U1", puzzleNumber: 100, guesses: 3 }),
    result({ userId: "U2", puzzleNumber: 100, guesses: 3 }),
    result({ userId: "U3", puzzleNumber: 100, guesses: 4 }),
    result({ userId: "U1", puzzleNumber: 101, guesses: 4 }),
    result({ userId: "U2", puzzleNumber: 101, guesses: 2 }),
    result({ userId: "U3", puzzleNumber: 102, guesses: null, success: 0 }),
    result({ channelId: "C2", userId: "U3", puzzleNumber: 100, guesses: 1 }),
  ]) saveResult(db, entry);

  assert.deepEqual(puzzleWinsLeaderboard(db, "C1"), [
    { user_id: "U2", puzzle_wins: 2 },
    { user_id: "U1", puzzle_wins: 1 },
  ]);
  db.close();
});
