import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { executeFetch } from "./fetch";

describe("executeFetch keepalive", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({}), {
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  function getInit(): RequestInit {
    return fetchMock.mock.calls[0]![1] as RequestInit;
  }

  it("does not set keepalive by default", async () => {
    await executeFetch("/api", ["events"], "POST", {});

    expect(getInit().keepalive).toBeUndefined();
  });

  it("uses instance default keepalive", async () => {
    await executeFetch("/api", ["events"], "POST", { keepalive: true });

    expect(getInit().keepalive).toBe(true);
  });

  it("sets keepalive per request", async () => {
    await executeFetch("/api", ["events"], "POST", {}, { keepalive: true });

    expect(getInit().keepalive).toBe(true);
  });

  it("per-request keepalive overrides instance default", async () => {
    await executeFetch(
      "/api",
      ["events"],
      "POST",
      { keepalive: true },
      { keepalive: false }
    );

    expect(getInit().keepalive).toBe(false);
  });
});

describe("executeFetch priority", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockResolvedValue(new Response(null));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  function getInit(): RequestInit {
    return fetchMock.mock.calls[0]![1] as RequestInit;
  }

  it("does not set priority by default", async () => {
    await executeFetch("/api", ["posts"], "GET", {});

    expect(getInit().priority).toBeUndefined();
  });

  it("uses instance default priority", async () => {
    await executeFetch("/api", ["posts"], "GET", { priority: "low" });

    expect(getInit().priority).toBe("low");
  });

  it("per-request priority overrides instance default", async () => {
    await executeFetch(
      "/api",
      ["posts"],
      "GET",
      { priority: "low" },
      { priority: "high" }
    );

    expect(getInit().priority).toBe("high");
  });
});
