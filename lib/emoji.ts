/**
 * The emoji score palette — edit this list freely.
 *
 * This is Isa's list, in her order. The order here is the order they appear
 * in the Sage Desk picker. Change a label, reorder, add, remove — it all just
 * works, with one guarantee: reviews store the emoji CHARACTER, not an index
 * into this array. Removing an entry never breaks a review that already used
 * it; that review keeps rendering its emoji, just without a label.
 *
 * Two house rules:
 *
 * 1. THIS IS NOT A SCALE. 😭 is not "worse" than 🙂 — these are reactions, not
 *    rankings. Nothing in the codebase may derive a number from an emoji or an
 *    emoji from a number.
 *
 * 2. NEUTRAL YELLOW ONLY — no skin-tone modifiers. Write 👎, never 👎🏼.
 *    assertNeutralPalette() below enforces this in development.
 */

export type EmojiOption = { char: string; label: string };

export const EMOJI_SCALE: EmojiOption[] = [
  { char: "💩", label: "garbage" },
  { char: "👎", label: "no" },
  { char: "🙄", label: "eye-roll" },
  { char: "🥱", label: "boring" },
  { char: "😐", label: "flat" },
  { char: "😕", label: "disappointing" },
  { char: "😊", label: "sweet" },
  { char: "🥹", label: "touching" },
  { char: "😂", label: "funny" },
  { char: "🤣", label: "hysterical" },
  { char: "🥲", label: "bittersweet" },
  { char: "🙂", label: "fine" },
  { char: "😍", label: "adored it" },
  { char: "🥰", label: "loved it" },
  { char: "🧐", label: "thinky" },
  { char: "🤩", label: "dazzling" },
  { char: "😎", label: "cool" },
  { char: "😭", label: "wrecked me" },
  { char: "😡", label: "furious" },
  { char: "🤯", label: "mind-blown" },
  { char: "😳", label: "shocked" },
  { char: "🥵", label: "steamy" },
  { char: "😱", label: "terrifying" },
  { char: "👏", label: "applause" },
  { char: "👌", label: "nailed it" },
  { char: "🙌", label: "hallelujah" },
  { char: "😬", label: "awkward" },
  { char: "🫩", label: "exhausted" },
  { char: "😴", label: "slept through it" },
  { char: "😵‍💫", label: "disoriented" },
  { char: "🤢", label: "queasy" },
  { char: "🫶", label: "love letter" },
  { char: "🫣", label: "couldn't look" },
  { char: "🤡", label: "clownish" },
  { char: "👍", label: "yes" },
  { char: "🙅", label: "hard pass" },
];

const SKIN_TONE = /[\u{1F3FB}-\u{1F3FF}]/u;
const VS16 = /️/g;

/** Trim + NFC-normalize so a stored value always matches the palette. */
export function normalizeEmoji(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const clean = raw.normalize("NFC").trim();
  return clean === "" ? null : clean;
}

/** Codepoint-safe length — "💩".length is 2, but it is one character. */
export function emojiLength(value: string): number {
  return Array.from(value).length;
}

/** Codepoint-safe clamp. Never use String.slice: it bisects surrogate pairs. */
export function clampEmoji(value: string, max = 16): string {
  return Array.from(value).slice(0, max).join("");
}

// Two keys per option — the raw char and its VS-16-stripped form — so a value
// that differs only by an invisible variation selector still finds its label.
const BY_CHAR = new Map<string, EmojiOption>();
for (const option of EMOJI_SCALE) {
  BY_CHAR.set(option.char, option);
  BY_CHAR.set(option.char.replace(VS16, ""), option);
}

function lookup(char: string | null | undefined): EmojiOption | null {
  const key = normalizeEmoji(char);
  if (!key) return null;
  return BY_CHAR.get(key) ?? BY_CHAR.get(key.replace(VS16, "")) ?? null;
}

/** The word for an emoji, or null if it is not (or no longer) in the palette. */
export function emojiLabel(char: string | null | undefined): string | null {
  return lookup(char)?.label ?? null;
}

export function isInPalette(char: string | null | undefined): boolean {
  return lookup(char) !== null;
}

/** Dev-time guard for house rule 2. Called from the picker. */
export function assertNeutralPalette(): void {
  if (process.env.NODE_ENV === "production") return;
  for (const { char, label } of EMOJI_SCALE) {
    if (SKIN_TONE.test(char)) {
      console.warn(
        `[emoji] "${label}" (${char}) carries a skin-tone modifier. The palette is neutral yellow — use the bare emoji.`
      );
    }
  }
}
