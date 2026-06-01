import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/explorer");
  await page.getByTestId("reset-demo").click();
  await page.getByRole("button", { name: "Confirm reset" }).click();
  await expect(page.getByText("Demo data reset.")).toBeVisible();
});

test("captures an inbox item and triages it into Work Next", async ({ page }) => {
  await page.goto("/inbox");

  await page.getByTestId("quick-capture-input").fill("call insurance about claim");
  await page.getByTestId("quick-capture-input").press("Enter");

  await expect(page.getByLabel("Select call insurance about claim")).toBeVisible();
  await page.getByLabel("Select call insurance about claim").check();
  await page.getByTestId("bulk-area").selectOption("work");
  await page.getByTestId("bulk-status").selectOption("next");
  await page.getByTestId("apply-triage").click();
  await expect(page.getByLabel("Select call insurance about claim")).toBeHidden();

  await page.goto("/work");
  await expect(page.getByText("call insurance about claim")).toBeVisible();
});

test("work and personal views keep area-specific commitments separated", async ({ page }) => {
  await page.goto("/work");
  await expect(page.getByText("Draft outline for memo")).toBeVisible();
  await expect(page.getByText("Need metrics from finance partner")).toBeVisible();
  await expect(page.getByText("Buy air filters")).toBeHidden();

  await page.goto("/personal");
  await expect(page.getByText("Buy air filters")).toBeVisible();
  await expect(page.getByText("Dentist appointment follow-up")).toBeVisible();
  await expect(page.getByText("Draft outline for memo")).toBeHidden();
});

test("three-dot task menu exposes workflow actions", async ({ page }) => {
  await page.goto("/");

  const taskCard = page.getByTestId("task-card-task-draft-memo-outline");
  await taskCard.getByRole("button", { name: "More task actions" }).click();
  await expect(page.getByRole("menu", { name: "Task actions" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Make active" }).click();

  await expect(page.getByRole("menu", { name: "Task actions" })).toBeHidden();
  await expect(page.getByTestId("wip-meter")).toContainText("Active 1/3");
  await page.goto("/work");
  const workTaskCard = page.getByTestId("task-card-task-draft-memo-outline");
  await expect(workTaskCard.getByText("active")).toBeVisible();
  await workTaskCard.getByRole("button", { name: "More task actions" }).click();
  await page.getByRole("menuitem", { name: "Stop active work" }).click();
  await expect(workTaskCard.getByText("next")).toBeVisible();
  await expect(page.getByTestId("wip-meter")).toContainText("Active 0/3");
});

test("command summary cards and WIP meter are clickable", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("cloud-account-chip")).toContainText("Local only");
  await page.locator(".attention-signal").click();
  await expect(page).toHaveURL(/#lane-waiting-due/);

  await page.getByTestId("wip-meter").click();
  await expect(page).toHaveURL(/#capacity/);
});

test("task action buttons align to the card edge", async ({ page }) => {
  async function expectActionRailAligned(testId: string) {
    const card = page.getByTestId(testId);
    const cardBox = await card.boundingBox();
    const actionsBox = await card.locator(".task-actions").boundingBox();

    expect(cardBox).not.toBeNull();
    expect(actionsBox).not.toBeNull();

    const cardRight = cardBox!.x + cardBox!.width;
    const actionsRight = actionsBox!.x + actionsBox!.width;
    expect(cardRight - actionsRight).toBeLessThan(18);
    expect(actionsBox!.x).toBeGreaterThan(cardBox!.x + cardBox!.width * 0.68);
  }

  await page.goto("/");
  await expectActionRailAligned("task-card-task-draft-memo-outline");
  await expectActionRailAligned("task-card-task-buy-air-filters");

  await page.goto("/work");
  await expectActionRailAligned("task-card-task-draft-memo-outline");
  await expectActionRailAligned("task-card-task-finance-metrics");
});

test("waiting cards can open editable details", async ({ page }) => {
  await page.goto("/waiting");

  const waitingCard = page.getByTestId("task-card-task-finance-metrics");
  await waitingCard.getByRole("button", { name: "Edit details" }).click();

  await expect(page.getByRole("heading", { name: "Details" })).toBeVisible();
  await expect(page.getByLabel("Waiting on")).toHaveValue("Finance partner");
  await expect(page.getByRole("group", { name: "Review / follow-up" })).toBeVisible();
});

test("detail date controls expose click-friendly presets without overflowing", async ({ page }) => {
  await page.goto("/waiting");

  const waitingCard = page.getByTestId("task-card-task-finance-metrics");
  await waitingCard.getByRole("button", { name: "Edit details" }).click();

  const pane = page.getByRole("complementary", { name: "Task details" });
  const reviewDate = pane.getByRole("group", { name: "Review / follow-up" });
  await expect(reviewDate.getByRole("button", { name: "Tomorrow" })).toBeVisible();
  await expect(reviewDate.getByRole("button", { name: "Next week" })).toBeVisible();

  await reviewDate.getByRole("button", { name: "Next week" }).click();
  await expect(reviewDate.getByLabel("Date")).not.toHaveValue("");
  await expect(reviewDate.getByLabel("Time")).toHaveValue("09:00");

  const paneBox = await pane.boundingBox();
  const reviewBox = await reviewDate.boundingBox();
  expect(paneBox).not.toBeNull();
  expect(reviewBox).not.toBeNull();
  expect(reviewBox!.x + reviewBox!.width).toBeLessThanOrEqual(paneBox!.x + paneBox!.width);
});

test("focus console opens a usable focus timer", async ({ page }) => {
  await page.goto("/");

  const taskCard = page.getByTestId("task-card-task-draft-memo-outline");
  await taskCard.getByRole("button", { name: "Set focus" }).click();

  await expect(page.getByTestId("focus-console")).toContainText("Draft outline for memo");
  await page.getByRole("button", { name: "Open focus timer" }).click();

  const dialog = page.getByRole("dialog", { name: "Focus timer" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Draft outline for memo");
  await expect(dialog.getByText("25:00")).toBeVisible();

  await dialog.getByRole("button", { name: "15 min" }).click();
  await expect(dialog.getByText("15:00")).toBeVisible();
  await dialog.getByRole("button", { name: "Start" }).click();
  await expect(dialog.getByRole("button", { name: "Pause" })).toBeVisible();
});

test("creates a project with its first next action", async ({ page }) => {
  await page.goto("/projects");

  await page.getByTestId("project-title").fill("Plan garage cleanup");
  await page.getByTestId("project-area").selectOption("personal");
  await page.getByTestId("project-outcome").fill("Garage is sorted and donation run is complete.");
  await page.getByTestId("project-next-action").fill("List donation items");
  await page.getByTestId("create-project").click();

  const projectCard = page.locator(".project-card").filter({ hasText: "Plan garage cleanup" });
  await expect(projectCard).toBeVisible();
  await expect(projectCard.getByText("List donation items")).toBeVisible();
  await expect(projectCard.getByText("Has next action")).toBeVisible();

  await projectCard.getByLabel("Project status for Plan garage cleanup").selectOption("on_hold");
  await projectCard.getByRole("button", { name: "Save project" }).click();
  await expect(projectCard.locator("span.badge.neutral", { hasText: "on hold" })).toBeVisible();
});

test("weekly review surfaces checklist and project health", async ({ page }) => {
  await page.goto("/reviews/weekly");

  await expect(page.getByRole("heading", { name: "Weekly Review" })).toBeVisible();
  await expect(page.getByLabel("Clear Inbox")).toBeVisible();
  await expect(page.getByRole("button", { name: /Active Project Health/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Prepare retail architecture memo" })).toBeVisible();
  await expect(page.getByText("Has next action")).toBeVisible();
  await expect(page.getByRole("button", { name: /Waiting Items/ })).toBeVisible();
  await expect(page.getByText("Need metrics from finance partner")).toBeVisible();
});

test("monthly incubator review can promote a ready item into active structure", async ({ page }) => {
  await page.goto("/reviews/incubator");

  await expect(page.getByText("Explore internal dev tooling cleanup")).toBeVisible();
  await page.getByRole("button", { name: "Create next action" }).first().click();
  await page.goto("/work");

  await expect(page.getByText("Explore internal dev tooling cleanup")).toBeVisible();
});

test("monthly incubator review can snooze and archive ideas", async ({ page }) => {
  await page.goto("/reviews/incubator");

  const readyRow = page.locator(".incubator-row").filter({ hasText: "Explore internal dev tooling cleanup" });
  await readyRow.getByRole("button", { name: "Snooze" }).click();
  await expect(readyRow).toBeHidden();

  await page.goto("/incubator");
  const laterRow = page.locator(".incubator-row").filter({ hasText: "Build woodworking bench" });
  await laterRow.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("Build woodworking bench")).toBeHidden();
});

test("explorer exposes filters and export controls for local ownership", async ({ page }) => {
  await page.goto("/explorer");

  await expect(page.getByTestId("export-json")).toBeVisible();
  await expect(page.getByTestId("export-csv")).toBeVisible();
  await expect(page.getByTestId("reset-demo")).toBeVisible();
  await expect(page.getByRole("button", { name: "Import" })).toBeDisabled();

  await page.getByLabel("Filter by status").selectOption("waiting");
  await expect(page.getByText("Need metrics from finance partner")).toBeVisible();
  await expect(page.getByText("Draft outline for memo")).toBeHidden();

  await page.getByLabel("Filter by status").selectOption("all");
  await page.getByLabel("Filter by area").selectOption("personal");
  await page.getByLabel("Search text").fill("air filters");
  await expect(page.getByText("Buy air filters")).toBeVisible();
  await expect(page.getByText("Need metrics from finance partner")).toBeHidden();

  await page.getByTestId("reset-demo").click();
  await expect(page.getByRole("button", { name: "Confirm reset" })).toBeVisible();
});

test("mobile viewport supports core navigation without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/inbox");

  await page.getByTestId("quick-capture-input").fill("mobile smoke task #work");
  await page.getByTestId("quick-capture-input").press("Enter");
  await expect(page.getByLabel("Select mobile smoke task")).toBeVisible();

  await page.getByRole("button", { name: "Edit details" }).first().click();
  await expect(page.getByRole("complementary", { name: "Task details" })).toBeVisible();
  await page.getByRole("button", { name: "Close details" }).click();

  await page.goto("/explorer");
  await expect(page.getByLabel("Search text")).toBeVisible();
  await expect(page.getByRole("button", { name: "Import" })).toBeDisabled();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
