import {
  For,
  Show,
  createMemo,
  createSignal,
  createEffect,
  onMount,
  onCleanup,
  useTransition,
  type Component,
} from "solid-js";

const LINE_HEIGHT = 20;
const BUFFER_LINES = 5;

interface JsonTreeProps {
  data: unknown;
  contextId: string;
  collapsedPaths: Set<string>;
  onTogglePath: (contextId: string, path: string) => void;
  withLineNumbers?: boolean;
}

interface RawLineData {
  indent: number;
  keyName: string | null;
  value: unknown;
  isExpandable: boolean;
  isExpanded: boolean;
  path: string;
  isCloseBracket: boolean;
  bracketType: "[" | "{" | "]" | "}" | null;
  previewText: string | null;
  isLast: boolean;
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

function buildRawLineData(
  value: unknown,
  collapsedPaths: Set<string>,
  path: string = "",
  depth: number = 0,
  isLast: boolean = true,
  keyName: string | null = null
): RawLineData[] {
  const lines: RawLineData[] = [];

  if (isPrimitive(value)) {
    lines.push({
      indent: depth,
      keyName,
      value,
      isExpandable: false,
      isExpanded: false,
      path,
      isCloseBracket: false,
      bracketType: null,
      previewText: null,
      isLast,
    });

    return lines;
  }

  const isArray = Array.isArray(value);
  const entries = isArray
    ? (value as unknown[]).map((v, i) => ({ key: String(i), value: v }))
    : Object.entries(value as Record<string, unknown>).map(([k, v]) => ({
        key: k,
        value: v,
      }));

  const isExpanded = !collapsedPaths.has(path);

  if (entries.length === 0) {
    lines.push({
      indent: depth,
      keyName,
      value: isArray ? [] : {},
      isExpandable: false,
      isExpanded: false,
      path,
      isCloseBracket: false,
      bracketType: isArray ? "[" : "{",
      previewText: null,
      isLast,
    });

    return lines;
  }

  const previewText = isArray
    ? `${entries.length} items`
    : `${entries.length} keys`;

  lines.push({
    indent: depth,
    keyName,
    value: null,
    isExpandable: true,
    isExpanded,
    path,
    isCloseBracket: false,
    bracketType: isArray ? "[" : "{",
    previewText: isExpanded ? null : previewText,
    isLast,
  });

  if (isExpanded) {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      const childPath = path ? `${path}.${entry.key}` : entry.key;
      const childIsLast = i === entries.length - 1;
      const childLines = buildRawLineData(
        entry.value,
        collapsedPaths,
        childPath,
        depth + 1,
        childIsLast,
        isArray ? null : entry.key
      );
      lines.push(...childLines);
    }

    lines.push({
      indent: depth,
      keyName: null,
      value: null,
      isExpandable: false,
      isExpanded: false,
      path: `${path}__close`,
      isCloseBracket: true,
      bracketType: isArray ? "]" : "}",
      previewText: null,
      isLast,
    });
  }

  return lines;
}

export const JsonTree: Component<JsonTreeProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  const [scrollTop, setScrollTop] = createSignal(0);
  const [containerHeight, setContainerHeight] = createSignal(0);
  const [pending, startTransition] = useTransition();

  const [rawLines, setRawLines] = createSignal<RawLineData[]>([]);

  createEffect(() => {
    const data = props.data;
    const collapsedPaths = props.collapsedPaths;

    startTransition(() => {
      const lineData = buildRawLineData(data, collapsedPaths);
      setRawLines(lineData);
    });
  });

  const lines = () => rawLines();

  const lineNumWidth = createMemo(() => {
    const count = lines().length;
    return Math.max(3, String(count).length);
  });

  const totalHeight = createMemo(() => lines().length * LINE_HEIGHT);

  const needsVirtualization = createMemo(() => {
    return containerHeight() > 0 && totalHeight() > containerHeight();
  });

  const visibleRange = createMemo(() => {
    if (!needsVirtualization()) {
      return { start: 0, end: lines().length };
    }

    const start = Math.max(
      0,
      Math.floor(scrollTop() / LINE_HEIGHT) - BUFFER_LINES
    );
    const visibleCount =
      Math.ceil(containerHeight() / LINE_HEIGHT) + BUFFER_LINES * 2;
    const end = Math.min(lines().length, start + visibleCount);
    return { start, end };
  });

  const visibleLines = createMemo(() => {
    const { start, end } = visibleRange();
    return lines()
      .slice(start, end)
      .map((line, idx) => ({
        ...line,
        lineNumber: start + idx + 1,
      }));
  });

  const handleScroll = (e: Event) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  };

  const handleToggle = (path: string) => {
    props.onTogglePath(props.contextId, path);
  };

  onMount(() => {
    if (!containerRef) return;

    const updateHeight = () => {
      if (containerRef) {
        setContainerHeight(containerRef.clientHeight);
      }
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });

    resizeObserver.observe(containerRef);
    onCleanup(() => resizeObserver.disconnect());
  });

  const renderPrimitiveValue = (value: unknown) => {
    if (value === null) {
      return <span class="text-spoosh-text-muted">null</span>;
    }

    if (value === undefined) {
      return <span class="text-spoosh-text-muted">undefined</span>;
    }

    if (typeof value === "string") {
      return <span class="text-spoosh-success">"{value}"</span>;
    }

    if (typeof value === "number") {
      return <span class="text-spoosh-warning">{value}</span>;
    }

    if (typeof value === "boolean") {
      return <span class="text-spoosh-primary">{String(value)}</span>;
    }

    return <span>{String(value)}</span>;
  };

  const renderLineContent = (line: RawLineData & { lineNumber: number }) => {
    const comma = line.isLast ? "" : ",";

    const keyPart = line.keyName ? (
      <>
        <span class="text-spoosh-primary">"{line.keyName}"</span>
        <span class="text-spoosh-text">: </span>
      </>
    ) : null;

    if (line.isCloseBracket) {
      return (
        <span class="whitespace-nowrap">
          {line.bracketType}
          {comma}
        </span>
      );
    }

    if (isPrimitive(line.value) && !line.isExpandable) {
      return (
        <span class="whitespace-nowrap">
          {keyPart}
          {renderPrimitiveValue(line.value)}
          {comma}
        </span>
      );
    }

    if (line.bracketType && !line.isExpandable) {
      const closeBracket = line.bracketType === "[" ? "]" : "}";
      return (
        <span class="whitespace-nowrap">
          {keyPart}
          {line.bracketType}
          {closeBracket}
          {comma}
        </span>
      );
    }

    if (line.isExpandable) {
      const closeBracket = line.bracketType === "[" ? "]" : "}";
      return (
        <span class="whitespace-nowrap">
          {keyPart}
          {line.bracketType}
          {line.previewText && (
            <>
              <span class="text-spoosh-text-muted ml-1">
                {line.previewText}
              </span>
              {closeBracket}
              {comma}
            </>
          )}
        </span>
      );
    }

    return null;
  };

  const renderLine = (line: RawLineData & { lineNumber: number }) => {
    if (needsVirtualization()) {
      const top = (line.lineNumber - 1) * LINE_HEIGHT;

      return (
        <div
          class="absolute left-0 right-0 flex items-center hover:bg-spoosh-surface/50"
          style={{
            top: `${top}px`,
            height: `${LINE_HEIGHT}px`,
          }}
        >
          <Show when={props.withLineNumbers}>
            <span
              class="text-spoosh-text-muted select-none pr-1 text-right shrink-0"
              style={{ width: `${lineNumWidth() + 2}ch` }}
            >
              {line.lineNumber}
            </span>
          </Show>

          <Show
            when={line.isExpandable}
            fallback={<span class="w-4 shrink-0" />}
          >
            <span
              class="w-4 shrink-0 cursor-pointer text-spoosh-text-muted hover:text-spoosh-text select-none text-center text-2xs opacity-0 group-hover:opacity-100"
              onClick={() => handleToggle(line.path)}
            >
              {line.isExpanded ? "▼" : "▶"}
            </span>
          </Show>

          <span style={{ "padding-left": `${line.indent * 16}px` }}>
            {renderLineContent(line)}
          </span>
        </div>
      );
    }

    return (
      <div
        class="flex items-center hover:bg-spoosh-surface/50"
        style={{ height: `${LINE_HEIGHT}px` }}
      >
        <Show when={props.withLineNumbers}>
          <span
            class="text-spoosh-text-muted select-none pr-1 text-right shrink-0"
            style={{ width: `${lineNumWidth() + 2}ch` }}
          >
            {line.lineNumber}
          </span>
        </Show>

        <Show when={line.isExpandable} fallback={<span class="w-4 shrink-0" />}>
          <span
            class="w-4 shrink-0 cursor-pointer text-spoosh-text-muted hover:text-spoosh-text select-none text-center text-2xs opacity-0 group-hover:opacity-100"
            onClick={() => handleToggle(line.path)}
          >
            {line.isExpanded ? "▼" : "▶"}
          </span>
        </Show>

        <span style={{ "padding-left": `${line.indent * 16}px` }}>
          {renderLineContent(line)}
        </span>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      class={`group font-mono text-xs overflow-auto flex-1 h-full w-full ${pending() ? "opacity-60" : ""}`}
      onScroll={handleScroll}
    >
      <Show
        when={needsVirtualization()}
        fallback={
          <div class="min-w-max">
            <For each={visibleLines()}>{renderLine}</For>
          </div>
        }
      >
        <div
          class="relative min-w-max"
          style={{ height: `${totalHeight()}px` }}
        >
          <For each={visibleLines()}>{renderLine}</For>
        </div>
      </Show>
    </div>
  );
};
