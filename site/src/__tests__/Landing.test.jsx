// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Landing from "../pages/Landing.jsx";

// jsdom's localStorage isn't available under this Node/vitest combo
// (unrelated to this feature); useTheme() only touches localStorage for the
// dark-mode toggle, so stub it out for these sort-focused tests.
vi.mock("../useTheme.js", () => ({
  useTheme: () => ["light", () => {}],
}));

const FIXTURE = [
  { name: "zeta-skill", description: "z desc", type: "skill", category: "general", tags: [], version: "1.0.0", owner: "@a", updated: "2026-01-01" },
  { name: "alpha-prompt", description: "a desc", type: "prompt", category: "general", tags: [], version: "1.0.0", owner: "@a", updated: "2026-05-01" },
  { name: "middle-skill", description: "m desc", type: "skill", category: "general", tags: [], version: "1.0.0", owner: "@a", updated: "2026-03-01" },
];

function mockFetch() {
  global.fetch = vi.fn((url) => {
    if (String(url).includes("index.json")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(FIXTURE) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

async function renderLanding() {
  render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>
  );
  // wait for the async useCatalog fetch to resolve and cards to appear
  await waitFor(() => expect(screen.getByLabelText("排序方式")).toBeInTheDocument());
}

function cardNames() {
  return screen.getAllByText(/-skill$|-prompt$/).map((el) => el.textContent);
}

describe("Landing sort control", () => {
  beforeEach(() => {
    mockFetch();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("defaults to updated desc (newest first)", async () => {
    await renderLanding();
    expect(cardNames()).toEqual(["alpha-prompt", "middle-skill", "zeta-skill"]);
  });

  it("sorts by updated asc when selected", async () => {
    await renderLanding();
    fireEvent.change(screen.getByLabelText("排序方式"), { target: { value: "updated-asc" } });
    expect(cardNames()).toEqual(["zeta-skill", "middle-skill", "alpha-prompt"]);
  });

  it("sorts by name asc when selected", async () => {
    await renderLanding();
    fireEvent.change(screen.getByLabelText("排序方式"), { target: { value: "name-asc" } });
    expect(cardNames()).toEqual(["alpha-prompt", "middle-skill", "zeta-skill"]);
  });

  it("sorts by name desc when selected", async () => {
    await renderLanding();
    fireEvent.change(screen.getByLabelText("排序方式"), { target: { value: "name-desc" } });
    expect(cardNames()).toEqual(["zeta-skill", "middle-skill", "alpha-prompt"]);
  });

  it("groups by type (skill before prompt per TYPE_WHITELIST), name asc within group", async () => {
    await renderLanding();
    fireEvent.change(screen.getByLabelText("排序方式"), { target: { value: "type" } });
    // TYPE_WHITELIST = ["skill", "prompt", "mcp-server", "workflow"]
    expect(cardNames()).toEqual(["middle-skill", "zeta-skill", "alpha-prompt"]);
  });

  it("switching sort does not affect the search/filter result count", async () => {
    await renderLanding();
    fireEvent.change(screen.getByLabelText("搜尋"), { target: { value: "skill" } });
    await waitFor(() => expect(cardNames()).toHaveLength(2));
    fireEvent.change(screen.getByLabelText("排序方式"), { target: { value: "name-desc" } });
    expect(cardNames()).toEqual(["zeta-skill", "middle-skill"]);
  });
});
