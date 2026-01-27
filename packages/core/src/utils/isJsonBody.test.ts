import { containsFile, isJsonBody } from "./isJsonBody";

describe("containsFile", () => {
  it("should return true for File instance", () => {
    expect(containsFile(new File([], "test.txt"))).toBe(true);
  });

  it("should return true for Blob instance", () => {
    expect(containsFile(new Blob([]))).toBe(true);
  });

  it("should return true for object containing File", () => {
    expect(containsFile({ file: new File([], "test.txt") })).toBe(true);
  });

  it("should return true for object containing Blob", () => {
    expect(containsFile({ data: new Blob([]) })).toBe(true);
  });

  it("should return true for array containing File", () => {
    expect(containsFile([new File([], "test.txt")])).toBe(true);
  });

  it("should return true for nested object containing File", () => {
    expect(containsFile({ nested: { file: new File([], "test.txt") } })).toBe(
      true
    );
  });

  it("should return true for nested array containing File", () => {
    expect(containsFile({ files: [new File([], "test.txt")] })).toBe(true);
  });

  it("should return false for plain string", () => {
    expect(containsFile("string")).toBe(false);
  });

  it("should return false for plain object", () => {
    expect(containsFile({ title: "test", count: 5 })).toBe(false);
  });

  it("should return false for null", () => {
    expect(containsFile(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(containsFile(undefined)).toBe(false);
  });

  it("should return false for array of primitives", () => {
    expect(containsFile([1, 2, 3])).toBe(false);
  });
});

describe("isJsonBody", () => {
  it("should return true for plain object", () => {
    expect(isJsonBody({ title: "test" })).toBe(true);
  });

  it("should return true for array", () => {
    expect(isJsonBody([1, 2, 3])).toBe(true);
  });

  it("should return false for null", () => {
    expect(isJsonBody(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isJsonBody(undefined)).toBe(false);
  });

  it("should return false for string", () => {
    expect(isJsonBody("string")).toBe(false);
  });

  it("should return false for FormData", () => {
    expect(isJsonBody(new FormData())).toBe(false);
  });

  it("should return false for Blob", () => {
    expect(isJsonBody(new Blob([]))).toBe(false);
  });

  it("should return false for ArrayBuffer", () => {
    expect(isJsonBody(new ArrayBuffer(8))).toBe(false);
  });

  it("should return false for URLSearchParams", () => {
    expect(isJsonBody(new URLSearchParams())).toBe(false);
  });

  it("should return true for object containing File", () => {
    expect(isJsonBody({ file: new File([], "test.txt") })).toBe(true);
  });

  it("should return true for object containing Blob", () => {
    expect(isJsonBody({ data: new Blob([]) })).toBe(true);
  });

  it("should return true for array containing File", () => {
    expect(isJsonBody([new File([], "test.txt")])).toBe(true);
  });

  it("should return true for nested object containing File", () => {
    expect(isJsonBody({ nested: { file: new File([], "test.txt") } })).toBe(
      true
    );
  });

  it("should return true for object with mixed primitives", () => {
    expect(
      isJsonBody({ title: "test", count: 5, active: true, items: [1, 2, 3] })
    ).toBe(true);
  });
});
