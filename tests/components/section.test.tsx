import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { Section } from "../../src/components/Section";

describe("Section", () => {
  test("exposes collapsed state and controls to assistive technology", async () => {
    const user = userEvent.setup();

    render(
      <Section title="Waiting Items" count={2}>
        <div>Two waiting tasks</div>
      </Section>
    );

    const button = screen.getByRole("button", { name: /Waiting Items/ });
    const panelId = button.getAttribute("aria-controls");

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId as string)).toHaveTextContent("Two waiting tasks");

    await user.click(button);

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(panelId as string)).toBeNull();
  });
});
