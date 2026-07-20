import { describe, it, expect } from "vitest";
import { sortSkills, SORT_OPTIONS, DEFAULT_SORT } from "../sort.js";

const fixture = [
  { name: "beta", type: "prompt", updated: "2026-01-10" },
  { name: "alpha", type: "skill", updated: "2026-03-05" },
  { name: "gamma", type: "workflow", updated: "2025-12-01" },
  { name: "delta", type: "skill", updated: "2026-03-05" },
];

describe("sortSkills", () => {
  it("does not mutate the input array (returns a new array)", () => {
    const original = [...fixture];
    const out = sortSkills(fixture, "name-asc");
    expect(fixture).toEqual(original); // untouched
    expect(out).not.toBe(fixture);
  });

  it("sorts by updated desc (newest first) — default", () => {
    const out = sortSkills(fixture, "updated-desc");
    expect(out.map((s) => s.name)).toEqual(["alpha", "delta", "beta", "gamma"]);
  });

  it("sorts by updated asc (oldest first)", () => {
    const out = sortSkills(fixture, "updated-asc");
    expect(out.map((s) => s.name)).toEqual(["gamma", "beta", "alpha", "delta"]);
  });

  it("sorts by name asc (A -> Z)", () => {
    const out = sortSkills(fixture, "name-asc");
    expect(out.map((s) => s.name)).toEqual(["alpha", "beta", "delta", "gamma"]);
  });

  it("sorts by name desc (Z -> A)", () => {
    const out = sortSkills(fixture, "name-desc");
    expect(out.map((s) => s.name)).toEqual(["gamma", "delta", "beta", "alpha"]);
  });

  it("groups by type (whitelist order: skill, prompt, mcp-server, workflow), name asc within group", () => {
    const out = sortSkills(fixture, "type");
    expect(out.map((s) => s.name)).toEqual(["alpha", "delta", "beta", "gamma"]);
    expect(out.map((s) => s.type)).toEqual(["skill", "skill", "prompt", "workflow"]);
  });

  it("falls back to updated-desc for an unknown sort key", () => {
    const out = sortSkills(fixture, "not-a-real-option");
    expect(out.map((s) => s.name)).toEqual(["alpha", "delta", "beta", "gamma"]);
  });

  it("DEFAULT_SORT is a valid option and matches the desc-by-updated behavior", () => {
    expect(SORT_OPTIONS.some((o) => o.value === DEFAULT_SORT)).toBe(true);
    expect(DEFAULT_SORT).toBe("updated-desc");
  });

  it("handles an empty list", () => {
    expect(sortSkills([], "name-asc")).toEqual([]);
  });
});
