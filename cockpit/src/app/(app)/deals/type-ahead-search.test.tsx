import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { TypeAheadSearch } from "./type-ahead-search";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

const fetchMock = vi.fn();

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  fetchMock.mockReset();
  pushMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

function mockFetchResponse(results: Array<{ id: string; title: string; company_name?: string | null; contact_name?: string | null }>) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () =>
      Promise.resolve({
        results: results.map((r) => ({
          company_name: null,
          contact_name: null,
          ...r,
        })),
      }),
  });
}

async function flushDebounceAndFetch() {
  await act(async () => {
    vi.advanceTimersByTime(250);
  });
  // Drain microtasks (fetch + json promises + setState)
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

describe("TypeAheadSearch", () => {
  it("does not fetch for queries shorter than 2 chars", async () => {
    render(<TypeAheadSearch />);
    const input = screen.getByTestId("deals-typeahead-input");
    fireEvent.change(input, { target: { value: "a" } });
    await flushDebounceAndFetch();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("debounces and fetches typeahead API after threshold", async () => {
    mockFetchResponse([{ id: "d1", title: "Acme Onboarding" }]);
    render(<TypeAheadSearch />);
    const input = screen.getByTestId("deals-typeahead-input");
    fireEvent.change(input, { target: { value: "Acme" } });

    expect(fetchMock).not.toHaveBeenCalled();

    await flushDebounceAndFetch();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/deals/typeahead?q=Acme");
    expect(screen.getByTestId("deals-typeahead-result-d1")).toBeInTheDocument();
  });

  it("renders empty-state when API returns no results", async () => {
    mockFetchResponse([]);
    render(<TypeAheadSearch />);
    fireEvent.change(screen.getByTestId("deals-typeahead-input"), {
      target: { value: "xyz" },
    });
    await flushDebounceAndFetch();
    expect(screen.getByText("Keine Treffer")).toBeInTheDocument();
  });

  it("navigates to /deals/[id] on result click", async () => {
    mockFetchResponse([
      { id: "deal-42", title: "Foo Deal", company_name: "Bar AG" },
    ]);
    render(<TypeAheadSearch />);
    fireEvent.change(screen.getByTestId("deals-typeahead-input"), {
      target: { value: "Foo" },
    });
    await flushDebounceAndFetch();
    expect(screen.getByTestId("deals-typeahead-result-deal-42")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("deals-typeahead-result-deal-42"));
    expect(pushMock).toHaveBeenCalledWith("/deals/deal-42");
  });

  it("closes dropdown on Escape key", async () => {
    mockFetchResponse([{ id: "d1", title: "Acme" }]);
    render(<TypeAheadSearch />);
    const input = screen.getByTestId("deals-typeahead-input");
    fireEvent.change(input, { target: { value: "Acme" } });
    await flushDebounceAndFetch();
    expect(screen.getByTestId("deals-typeahead-dropdown")).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByTestId("deals-typeahead-dropdown")).toBeNull();
  });
});
