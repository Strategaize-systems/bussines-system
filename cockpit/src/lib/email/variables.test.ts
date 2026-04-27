import { describe, expect, it } from "vitest";

import { resolveVarsFromDeal } from "./variables";

describe("resolveVarsFromDeal", () => {
  it("liefert alle Felder wenn Deal+Contact+Company vorhanden", () => {
    const result = resolveVarsFromDeal(
      { title: "Pilotprojekt Q2", name: null },
      {
        first_name: "Anna",
        last_name: "Beispiel",
        position: "Geschaeftsfuehrerin",
      },
      { name: "Beispiel GmbH" },
    );

    expect(result).toEqual({
      vorname: "Anna",
      nachname: "Beispiel",
      firma: "Beispiel GmbH",
      position: "Geschaeftsfuehrerin",
      deal: "Pilotprojekt Q2",
    });
  });

  it("nutzt Deal-Title als Firma-Fallback wenn keine Company gesetzt", () => {
    const result = resolveVarsFromDeal(
      { title: "ACME Lead", name: null },
      { first_name: "Max", last_name: null, position: null },
      null,
    );

    expect(result.firma).toBe("ACME Lead");
    expect(result.deal).toBe("ACME Lead");
    expect(result.vorname).toBe("Max");
    expect(result.nachname).toBe("");
    expect(result.position).toBe("");
  });

  it("liefert leere Strings statt null/undefined wenn nichts vorhanden ist", () => {
    const result = resolveVarsFromDeal(null, null, null);

    expect(result).toEqual({
      vorname: "",
      nachname: "",
      firma: "",
      position: "",
      deal: "",
    });
  });
});
