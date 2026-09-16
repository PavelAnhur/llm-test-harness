import * as allure from "allure-js-commons";
import type { MultiRunResult } from "./multi-run";
import { type NotesWeek, buildNotesUrl } from "@config/notes";

export async function label(opts: {
  epic?: string;
  feature?: string;
  story?: string;
  severity?: allure.Severity;
  owner?: string;
  tags?: readonly string[];
}): Promise<void> {
  if (opts.epic) await allure.epic(opts.epic);
  if (opts.feature) await allure.feature(opts.feature);
  if (opts.story) await allure.story(opts.story);
  if (opts.severity) await allure.severity(opts.severity);
  if (opts.owner) await allure.owner(opts.owner);
  for (const tag of opts.tags ?? []) {
    await allure.tag(tag);
  }
}

export async function attachResult(
  name: string,
  result: MultiRunResult,
  formatted: string,
): Promise<void> {
  await allure.parameter(
    "threshold",
    `${(result.threshold * 100).toFixed(0)}%`,
  );
  const distinct = [...new Set(result.runs.map((r) => r.response))];
  await allure.attachment(
    `${name} -- all responses`,
    JSON.stringify(
      result.runs.map((r) => ({
        index: r.index,
        passed: r.passed,
        response: r.response,
        error: r.error,
        durationsMS: r.durationMs,
      })),
      null,
      2,
    ),
    allure.ContentType.JSON,
  );
  await allure.attachment(
    `${name} -- summary`,
    [
      formatted,
      "",
      `Distinct response: ${distinct.length}`,
      ...distinct.map((r, i) => ` [${i + 1}] ${r}`),
    ].join("\n"),
    allure.ContentType.TEXT,
  );
}

export async function note(text: string): Promise<void> {
  await allure.attachment("Note", text, allure.ContentType.TEXT);
}

export async function noteWithLink(
  week: NotesWeek,
  anchor: string,
  text: string,
): Promise<void> {
  const url = buildNotesUrl(week, anchor);
  const html = `
    <p>${escapeHtml(text)}</p>
    <p><a href="${url}" target="_blank" rel="noopener">
      Read the full write-up in notes/week-${week}.md →
    </a></p>
  `;
  await allure.attachment("Note", html, allure.ContentType.HTML);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
