import { escapeHtml } from "./format";

export interface JsonTreeOptions {
  withLineNumbers?: boolean;
  contextId?: string;
  collapsedPaths?: ReadonlySet<string>;
}

interface TreeNode {
  type: "object" | "array" | "primitive";
  value: unknown;
  key?: string;
  path: string;
  isLast: boolean;
  depth: number;
}

function isPrimitive(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function getValueType(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  return typeof value;
}

function formatPrimitiveValue(value: unknown): string {
  const type = getValueType(value);

  switch (type) {
    case "null":
      return '<span class="spoosh-syn-null">null</span>';
    case "undefined":
      return '<span class="spoosh-syn-null">undefined</span>';
    case "string":
      return `<span class="spoosh-syn-str">"${escapeHtml(String(value))}"</span>`;
    case "number":
      return `<span class="spoosh-syn-num">${value}</span>`;
    case "boolean":
      return `<span class="spoosh-syn-bool">${value}</span>`;
    default:
      return escapeHtml(String(value));
  }
}

function renderTreeNode(
  node: TreeNode,
  options: JsonTreeOptions,
  lines: string[]
): void {
  const { contextId = "json", collapsedPaths = new Set() } = options;
  const { value, key, path, isLast, depth } = node;
  const indent = "  ".repeat(depth);
  const isExpanded = !collapsedPaths.has(path);

  if (isPrimitive(value)) {
    const keyPart = key
      ? `<span class="spoosh-syn-key">"${escapeHtml(key)}"</span>: `
      : "";
    const comma = isLast ? "" : ",";
    lines.push(
      `<span class="spoosh-json-arrow-col"></span>${indent}${keyPart}${formatPrimitiveValue(value)}${comma}`
    );
    return;
  }

  const isArray = Array.isArray(value);
  const entries = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);

  const isEmpty = entries.length === 0;
  const openBracket = isArray ? "[" : "{";
  const closeBracket = isArray ? "]" : "}";
  const keyPart = key
    ? `<span class="spoosh-syn-key">"${escapeHtml(key)}"</span>: `
    : "";

  if (isEmpty) {
    const comma = isLast ? "" : ",";
    lines.push(
      `<span class="spoosh-json-arrow-col"></span>${indent}${keyPart}${openBracket}${closeBracket}${comma}`
    );
    return;
  }

  const expandIcon = isExpanded ? "▼" : "▶";
  const previewText = isExpanded
    ? ""
    : ` <span class="spoosh-json-preview">${isArray ? `${entries.length} items` : `${entries.length} keys`}</span>`;

  lines.push(
    `<span class="spoosh-json-arrow-col"><span class="spoosh-json-toggle" data-action="toggle-json-path" data-context-id="${contextId}" data-path="${escapeHtml(path)}">${expandIcon}</span></span>${indent}${keyPart}${openBracket}${previewText}`
  );

  if (isExpanded) {
    entries.forEach(([entryKey, entryValue], index) => {
      const childPath = path ? `${path}.${entryKey}` : entryKey;
      const childNode: TreeNode = {
        type: isPrimitive(entryValue)
          ? "primitive"
          : Array.isArray(entryValue)
            ? "array"
            : "object",
        value: entryValue,
        key: isArray ? undefined : entryKey,
        path: childPath,
        isLast: index === entries.length - 1,
        depth: depth + 1,
      };
      renderTreeNode(childNode, options, lines);
    });

    const comma = isLast ? "" : ",";
    lines.push(
      `<span class="spoosh-json-arrow-col"></span>${indent}${closeBracket}${comma}`
    );
  }
}

export function formatJsonTree(data: unknown, options: JsonTreeOptions = {}): string {
  const lines: string[] = [];

  const rootNode: TreeNode = {
    type: isPrimitive(data)
      ? "primitive"
      : Array.isArray(data)
        ? "array"
        : "object",
    value: data,
    path: "",
    isLast: true,
    depth: 0,
  };

  renderTreeNode(rootNode, options, lines);

  if (!options.withLineNumbers) {
    return lines.join("\n");
  }

  const maxLineNum = lines.length;
  const lineNumWidth = String(maxLineNum).length;

  return lines
    .map((line, index) => {
      const lineNum = String(index + 1).padStart(lineNumWidth, " ");
      return `<span class="spoosh-json-line-num">${lineNum}</span>${line}`;
    })
    .join("\n");
}
