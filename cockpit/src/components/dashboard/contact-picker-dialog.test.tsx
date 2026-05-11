import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContactPickerDialog } from "./contact-picker-dialog";

const CONTACTS = [
  { id: "c1", first_name: "Anna", last_name: "Schmidt", phone: "+49 30 12345" },
  { id: "c2", first_name: "Max", last_name: "Mustermann", phone: "+49 40 67890" },
  { id: "c3", first_name: "Eva", last_name: "Lehmann", phone: null },
  { id: "c4", first_name: "Tom", last_name: "Berger", phone: "+49 89 1111" },
];

describe("ContactPickerDialog", () => {
  it("hides contacts without phone number", () => {
    render(<ContactPickerDialog contacts={CONTACTS} open={true} onOpenChange={() => {}} />);
    expect(screen.getByTestId("contact-picker-result-c1")).toBeInTheDocument();
    expect(screen.queryByTestId("contact-picker-result-c3")).toBeNull();
  });

  it("filters by name substring (case insensitive)", () => {
    render(<ContactPickerDialog contacts={CONTACTS} open={true} onOpenChange={() => {}} />);
    fireEvent.change(screen.getByTestId("contact-picker-input"), {
      target: { value: "muster" },
    });
    expect(screen.getByTestId("contact-picker-result-c2")).toBeInTheDocument();
    expect(screen.queryByTestId("contact-picker-result-c1")).toBeNull();
  });

  it("filters by phone-number substring", () => {
    render(<ContactPickerDialog contacts={CONTACTS} open={true} onOpenChange={() => {}} />);
    fireEvent.change(screen.getByTestId("contact-picker-input"), {
      target: { value: "89" },
    });
    expect(screen.getByTestId("contact-picker-result-c4")).toBeInTheDocument();
    expect(screen.queryByTestId("contact-picker-result-c1")).toBeNull();
  });

  it("uses tel: href on contact result", () => {
    render(<ContactPickerDialog contacts={CONTACTS} open={true} onOpenChange={() => {}} />);
    const link = screen.getByTestId("contact-picker-result-c1");
    expect(link.getAttribute("href")).toBe("tel:+49 30 12345");
  });

  it("calls onOpenChange(false) when contact is clicked", () => {
    const onOpenChange = vi.fn();
    render(<ContactPickerDialog contacts={CONTACTS} open={true} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByTestId("contact-picker-result-c1"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders empty state when no phone-bearing contacts match", () => {
    render(<ContactPickerDialog contacts={CONTACTS} open={true} onOpenChange={() => {}} />);
    fireEvent.change(screen.getByTestId("contact-picker-input"), {
      target: { value: "xyz123" },
    });
    expect(
      screen.getByText("Kein Kontakt mit Telefonnummer gefunden."),
    ).toBeInTheDocument();
  });

  it("clears query on X-button click", () => {
    render(<ContactPickerDialog contacts={CONTACTS} open={true} onOpenChange={() => {}} />);
    const input = screen.getByTestId("contact-picker-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "muster" } });
    expect(input.value).toBe("muster");
    fireEvent.click(screen.getByTestId("contact-picker-clear"));
    expect(input.value).toBe("");
  });
});
