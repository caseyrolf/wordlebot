// Standard Wordle shares begin, for example: "Wordle 1,278 3/6" or "Wordle 1,278 X/6".
export function parseWordle(text) {
  if (typeof text !== "string") return null;
  const match = text.match(/(?:^|\n)\s*Wordle\s+(\d[\d,]*)\s+([1-6X])\/6\*?/i);
  if (!match) return null;

  const value = match[2].toUpperCase();
  return {
    puzzleNumber: Number(match[1].replaceAll(",", "")),
    guesses: value === "X" ? null : Number(value),
    success: value === "X" ? 0 : 1,
  };
}

export function formatUserStats(stats, mention) {
  if (!stats.games) return `No Wordle results found for ${mention} in this channel yet.`;
  const rate = ((stats.wins / stats.games) * 100).toFixed(1);
  const average = stats.average_guesses ?? "—";
  return `${mention}: *${stats.games}* games · *${rate}%* success rate · *${average}* average guesses (wins)`;
}
