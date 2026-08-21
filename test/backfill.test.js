import test from "node:test";
import assert from "node:assert/strict";
import { backfillChannel } from "../src/backfill.js";

test("backfill imports Wordle messages across paginated history", async () => {
  const calls = [];
  const saved = [];
  const client = {
    conversations: {
      history: async ({ cursor }) => {
        calls.push(cursor);
        return cursor
          ? { messages: [{ user: "U2", ts: "2.000", text: "Wordle 12 X/6" }], response_metadata: {} }
          : {
              messages: [
                { user: "U1", ts: "1.000", text: "Wordle 11 2/6" },
                { user: "U1", ts: "1.100", text: "not a result" },
              ],
              response_metadata: { next_cursor: "next" },
            };
      },
    },
  };
  const db = { prepare: () => ({ run: (result) => saved.push(result) }) };

  const result = await backfillChannel({ client, db, channelId: "C1" });
  assert.deepEqual(calls, [undefined, "next"]);
  assert.deepEqual(result, { scanned: 3, matched: 2 });
  assert.equal(saved[0].puzzleNumber, 11);
  assert.equal(saved[1].success, 0);
});
