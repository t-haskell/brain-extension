import * as chrono from "chrono-node";
import { addMonths } from "date-fns";
import type { AreaId, TaskDraft } from "./types";
import { PERSONAL_AREA_ID, WORK_AREA_ID } from "./types";

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractArea(input: string): AreaId {
  if (/#work\b/i.test(input)) {
    return WORK_AREA_ID;
  }

  if (/#personal\b/i.test(input)) {
    return PERSONAL_AREA_ID;
  }

  return PERSONAL_AREA_ID;
}

function removeDateText(input: string, parsedDateText: string | null): string {
  if (!parsedDateText) {
    return input;
  }

  return input.replace(parsedDateText, " ");
}

export function parseQuickCapture(input: string, now = new Date()): TaskDraft {
  const areaId = extractArea(input);
  const withoutTags = input.replace(/#work\b/gi, " ").replace(/#personal\b/gi, " ");
  const isIncubator = /\bincubator\b/i.test(withoutTags);
  const withoutIncubatorToken = withoutTags.replace(/\bincubator\b/gi, " ");
  const parsedDate = chrono.parse(withoutIncubatorToken, now)[0] ?? null;
  const scheduledAt = parsedDate?.start.date() ?? null;
  const withoutDate = removeDateText(withoutIncubatorToken, parsedDate?.text ?? null);
  const cueMatch = normalizeWhitespace(withoutDate).match(/^if\s+(.+?)\s+then\s+(.+)$/i);

  if (cueMatch) {
    const triggerCue = normalizeWhitespace(cueMatch[1]);
    const triggerAction = normalizeWhitespace(cueMatch[2]);

    return {
      areaId,
      title: triggerAction,
      status: "inbox",
      kind: "reminder",
      triggerCue,
      triggerAction,
      source: "quick_capture"
    };
  }

  const title = normalizeWhitespace(withoutDate);

  return {
    areaId,
    title,
    status: isIncubator ? "incubator" : scheduledAt ? "scheduled" : "inbox",
    kind: "task",
    dueAt: isIncubator ? null : scheduledAt,
    reviewAt: isIncubator ? scheduledAt ?? addMonths(now, 1) : null,
    source: "quick_capture"
  };
}
