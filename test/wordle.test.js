import test from "node:test";
import assert from "node:assert/strict";
import { parseWordle } from "../src/wordle.js";

test("parses a successful standard Wordle share", () => {
  assert.deepEqual(parseWordle("Wordle 1,278 3/6\n\n🟨⬛🟩⬛⬛"), {
    puzzleNumber: 1278, guesses: 3, success: 1,
  });
});

test("parses an unsuccessful share", () => {
  assert.deepEqual(parseWordle("Wordle 1278 X/6*"), {
    puzzleNumber: 1278, guesses: null, success: 0,
  });
});

test("ignores non-Wordle text", () => assert.equal(parseWordle("hello team"), null));
