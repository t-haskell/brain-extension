import { describe, expect, test } from "vitest";
import { parseQuickCapture } from "../../src/domain/capture";

const now = new Date("2026-04-29T12:00:00");

describe("quick capture parsing", () => {
  test("captures plain text as an inbox item with minimal required metadata", () => {
    expect(parseQuickCapture("buy furnace filters", now)).toMatchObject({
      title: "buy furnace filters",
      status: "inbox",
      areaId: "personal"
    });
  });

  test("parses work hashtags and natural-language schedule hints", () => {
    const draft = parseQuickCapture("tomorrow 9am send expense report #work", now);

    expect(draft).toMatchObject({
      title: "send expense report",
      areaId: "work",
      status: "scheduled"
    });
    expect(draft.dueAt?.toISOString()).toBe("2026-04-30T13:00:00.000Z");
  });

  test("routes not-now ideas into incubator with a review date", () => {
    const draft = parseQuickCapture("next month review woodworking bench idea #personal incubator", now);

    expect(draft).toMatchObject({
      title: "review woodworking bench idea",
      areaId: "personal",
      status: "incubator"
    });
    expect(draft.reviewAt).toBeInstanceOf(Date);
  });

  test("extracts cue-based triggers without creating noisy scheduled reminders", () => {
    expect(parseQuickCapture("if standup ends then send recap to team #work", now)).toMatchObject({
      title: "send recap to team",
      status: "inbox",
      kind: "reminder",
      areaId: "work",
      triggerCue: "standup ends",
      triggerAction: "send recap to team"
    });
  });
});
