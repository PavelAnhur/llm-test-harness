export const NOTES_BASE_URL =
  "https://github.com/PavelAnhur/playwright-llm-tests/blob/main/notes";

export const NOTES_WEEKS = [1, 2, 3, 4, 5] as const;

export type NotesWeek = (typeof NOTES_WEEKS)[number];

export function buildNotesUrl(week: NotesWeek, anchor: string): string {
  if (!/^[a-z0-9-]+$/.test(anchor)) {
    throw new Error(
      `Invalid anchor: "${anchor}". ` +
        `Anchors are lowercase, hyphen-separated, and derived from the heading text. ` +
        `Example: "day-4--adversarial-inputs".`,
    );
  }
  return `${NOTES_BASE_URL}/week-${week}.md#${anchor}`;
}
