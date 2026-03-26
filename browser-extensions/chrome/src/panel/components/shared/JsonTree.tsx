import {
  For,
  Show,
  createMemo,
  createSignal,
  onMount,
  onCleanup,
  type Component,
  type JSX,
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

interface LineData {
  lineNumber: number;
  indent: number;
  content: JSX.Element;
  isExpandable: boolean;
  isExpanded: boolean;
  path: string;
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

function renderPrimitiveValue(value: unknown): JSX.Element {
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
}

function buildLineData(
  value: unknown,
  collapsedPaths: Set<string>,
  path: string = "",
  depth: number = 0,
  isLast: boolean = true,
  keyName?: string
): LineData[] {
  const lines: LineData[] = [];
  const comma = isLast ? "" : ",";

  const keyPart = keyName ? (
    <>
      <span class="text-spoosh-primary">"{keyName}"</span>
      <span class="text-spoosh-text">: </span>
    </>
  ) : null;

  if (isPrimitive(value)) {
    lines.push({
      lineNumber: 0,
      indent: depth,
      content: (
        <span class="whitespace-nowrap">
          {keyPart}
          {renderPrimitiveValue(value)}
          {comma}
        </span>
      ),
      isExpandable: false,
      isExpanded: false,
      path,
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

  const openBracket = isArray ? "[" : "{";
  const closeBracket = isArray ? "]" : "}";
  const isExpanded = !collapsedPaths.has(path);

  if (entries.length === 0) {
    lines.push({
      lineNumber: 0,
      indent: depth,
      content: (
        <span class="whitespace-nowrap">
          {keyPart}
          {openBracket}
          {closeBracket}
          {comma}
        </span>
      ),
      isExpandable: false,
      isExpanded: false,
      path,
    });

    return lines;
  }

  const previewText = isArray
    ? `${entries.length} items`
    : `${entries.length} keys`;

  lines.push({
    lineNumber: 0,
    indent: depth,
    content: (
      <span class="whitespace-nowrap">
        {keyPart}
        {openBracket}
        {!isExpanded && (
          <>
            <span class="text-spoosh-text-muted ml-1">{previewText}</span>
            {closeBracket}
            {comma}
          </>
        )}
      </span>
    ),
    isExpandable: true,
    isExpanded,
    path,
  });

  if (isExpanded) {
    entries.forEach((entry, index) => {
      const childPath = path ? `${path}.${entry.key}` : entry.key;
      const childIsLast = index === entries.length - 1;
      const childLines = buildLineData(
        entry.value,
        collapsedPaths,
        childPath,
        depth + 1,
        childIsLast,
        isArray ? undefined : entry.key
      );
      lines.push(...childLines);
    });

    lines.push({
      lineNumber: 0,
      indent: depth,
      content: (
        <span class="whitespace-nowrap">
          {closeBracket}
          {comma}
        </span>
      ),
      isExpandable: false,
      isExpanded: false,
      path: `${path}__close`,
    });
  }

  return lines;
}

export const JsonTree: Component<JsonTreeProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  const [scrollTop, setScrollTop] = createSignal(0);
  const [containerHeight, setContainerHeight] = createSignal(0);

  const lines = createMemo(() => {
    const lineData = buildLineData(props.data, props.collapsedPaths);
    return lineData.map((line, index) => ({
      ...line,
      lineNumber: index + 1,
    }));
  });

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
    return lines().slice(start, end);
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

  const renderLine = (line: LineData) => {
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
              class="text-spoosh-text-muted select-none pr-3 text-right flex-shrink-0"
              style={{ width: `${lineNumWidth() + 2}ch` }}
            >
              {line.lineNumber}
            </span>
          </Show>

          <Show
            when={line.isExpandable}
            fallback={<span class="w-4 flex-shrink-0" />}
          >
            <span
              class="w-4 flex-shrink-0 cursor-pointer text-spoosh-text-muted hover:text-spoosh-text select-none text-center text-2xs"
              onClick={() => handleToggle(line.path)}
            >
              {line.isExpanded ? "▼" : "▶"}
            </span>
          </Show>

          <span style={{ "padding-left": `${line.indent * 16}px` }}>
            {line.content}
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
            class="text-spoosh-text-muted select-none pr-3 text-right flex-shrink-0"
            style={{ width: `${lineNumWidth() + 2}ch` }}
          >
            {line.lineNumber}
          </span>
        </Show>

        <Show
          when={line.isExpandable}
          fallback={<span class="w-4 flex-shrink-0" />}
        >
          <span
            class="w-4 flex-shrink-0 cursor-pointer text-spoosh-text-muted hover:text-spoosh-text select-none text-center text-2xs"
            onClick={() => handleToggle(line.path)}
          >
            {line.isExpanded ? "▼" : "▶"}
          </span>
        </Show>

        <span style={{ "padding-left": `${line.indent * 16}px` }}>
          {line.content}
        </span>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      class="font-mono text-xs overflow-auto flex-1 h-full w-full"
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
