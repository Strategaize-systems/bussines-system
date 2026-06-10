import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PasswordStrengthIndicator } from "../PasswordStrengthIndicator";

// Deterministic zxcvbn so the test asserts the component's score->visual mapping,
// not zxcvbn's heuristics (those are covered in password-policy.test.ts).
vi.mock("zxcvbn", () => ({
  default: vi.fn((pw: string) => ({
    score: pw === "correcthorsebatterystaple" ? 4 : 1,
  })),
}));

describe("PasswordStrengthIndicator", () => {
  it("renders nothing for an empty password", () => {
    const { container } = render(<PasswordStrengthIndicator password="" />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId("password-strength")).not.toBeInTheDocument();
  });

  it("shows the weak label for a low-score password (debounced)", async () => {
    render(<PasswordStrengthIndicator password="Password1234" />);
    await waitFor(() => {
      expect(screen.getByText(/Passwortstaerke: Schwach/)).toBeInTheDocument();
    });
  });

  it("shows the strong label for a high-score password (debounced)", async () => {
    render(<PasswordStrengthIndicator password="correcthorsebatterystaple" />);
    await waitFor(() => {
      expect(screen.getByText(/Passwortstaerke: Stark/)).toBeInTheDocument();
    });
  });
});
