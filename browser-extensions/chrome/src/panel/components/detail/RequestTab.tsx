import { For, Show, createSignal, type Component } from "solid-js";
import type { OperationTrace } from "@devtool/types";
import { JsonTree, CopyButton } from "../shared";
import { formatQueryParams } from "../../utils/format";

interface RequestTabProps {
  trace: OperationTrace;
  collapsedPaths: Map<string, Set<string>>;
  onTogglePath: (contextId: string, path: string) => void;
  sensitiveHeaders: Set<string>;
}

interface DataSectionProps {
  label: string;
  data: unknown;
  contextId: string;
  collapsedPaths: Set<string>;
  onTogglePath: (contextId: string, path: string) => void;
  badge?: string;
}

interface SpooshBody {
  __spooshBody: boolean;
  kind: "form" | "json" | "urlencoded";
  value: unknown;
}

function isSpooshBody(value: unknown): value is SpooshBody {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    obj.__spooshBody === true &&
    typeof obj.kind === "string" &&
    ["form", "json", "urlencoded"].includes(obj.kind) &&
    "value" in obj
  );
}

function isFileObject(value: unknown): boolean {
  if (value instanceof File) return true;
  if (typeof value !== "object" || value === null) return false;

  const obj = value as Record<string, unknown>;

  return (
    obj.constructor?.name === "File" ||
    (typeof obj.name === "string" &&
      typeof obj.size === "number" &&
      typeof obj.type === "string")
  );
}

function sanitizeFormValue(value: unknown): unknown {
  if (value instanceof File || isFileObject(value)) {
    const file = value as File;
    const name = file.name || "unknown";
    const size = file.size;
    const type = file.type || "unknown type";

    if (size) {
      const sizeStr =
        size < 1024
          ? `${size} B`
          : size < 1024 * 1024
            ? `${(size / 1024).toFixed(1)} KB`
            : `${(size / (1024 * 1024)).toFixed(1)} MB`;
      return `[File: ${name} (${sizeStr}, ${type})]`;
    }

    return `[File: ${name}]`;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    Object.keys(value).length === 0
  ) {
    return "[File]";
  }

  return value;
}

function sanitizeFormData(
  data: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    result[key] = sanitizeFormValue(value);
  }

  return result;
}

const DataSection: Component<DataSectionProps> = (props) => {
  const copyContent = () => JSON.stringify(props.data, null, 2);

  return (
    <div class="mb-4">
      <div class="text-[10px] font-semibold uppercase text-spoosh-text-muted mb-1 tracking-[0.5px]">
        {props.label}
        <Show when={props.badge}>
          <span
            class={`ml-1.5 px-1 py-px rounded text-[9px] font-medium normal-case ${
              props.badge === "form"
                ? "text-spoosh-success bg-spoosh-success/15"
                : props.badge === "urlencoded"
                  ? "text-spoosh-warning bg-spoosh-warning/15"
                  : "text-spoosh-text-muted bg-spoosh-surface"
            }`}
          >
            {props.badge}
          </span>
        </Show>
      </div>

      <div class="relative bg-spoosh-surface rounded border border-spoosh-border max-h-64 overflow-auto">
        <CopyButton text={copyContent()} class="absolute top-2 right-2 z-10" />

        <div class="p-2">
          <JsonTree
            data={props.data}
            contextId={props.contextId}
            collapsedPaths={props.collapsedPaths}
            onTogglePath={props.onTogglePath}
            withLineNumbers
          />
        </div>
      </div>
    </div>
  );
};

interface HeaderRowProps {
  name: string;
  value: string;
  isSensitive: boolean;
}

const HeaderRow: Component<HeaderRowProps> = (props) => {
  const [revealed, setRevealed] = createSignal(false);

  return (
    <div class="flex items-start gap-2 px-2 py-1 text-[11px] leading-[1.4] border-b border-spoosh-border last:border-b-0">
      <span class="text-spoosh-primary font-medium flex-shrink-0">
        {props.name}
      </span>

      <Show
        when={props.isSensitive}
        fallback={
          <span class="text-spoosh-text break-all flex-1 min-w-0">
            {props.value}
          </span>
        }
      >
        <div class="flex items-center gap-1.5 flex-1 min-w-0">
          <span
            class={`break-all ${revealed() ? "text-spoosh-text" : "text-spoosh-text-muted tracking-wider"}`}
          >
            {revealed() ? props.value : "\u2022\u2022\u2022\u2022\u2022\u2022"}
          </span>

          <button
            class="p-0.5 rounded text-spoosh-text-muted hover:text-spoosh-text transition-colors flex-shrink-0 bg-transparent border-none cursor-pointer flex items-center justify-center"
            onClick={() => setRevealed((v) => !v)}
            title={revealed() ? "Hide" : "Show"}
          >
            <Show
              when={revealed()}
              fallback={
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              }
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </Show>
          </button>
        </div>
      </Show>
    </div>
  );
};

interface HeadersSectionProps {
  headers: Record<string, string>;
  sensitiveHeaders: Set<string>;
}

const HeadersSection: Component<HeadersSectionProps> = (props) => {
  const headerEntries = () => Object.entries(props.headers);

  return (
    <div class="mb-4">
      <div class="text-[10px] font-semibold uppercase text-spoosh-text-muted mb-1 tracking-[0.5px]">
        Headers
      </div>

      <div class="bg-spoosh-surface rounded border border-spoosh-border overflow-hidden">
        <For each={headerEntries()}>
          {([name, value]) => (
            <HeaderRow
              name={name}
              value={value}
              isSensitive={props.sensitiveHeaders.has(name.toLowerCase())}
            />
          )}
        </For>
      </div>
    </div>
  );
};

interface UrlSectionProps {
  path: string;
  query?: Record<string, unknown>;
}

const UrlSection: Component<UrlSectionProps> = (props) => {
  const fullUrl = () => {
    const queryParams = formatQueryParams(props.query);
    return queryParams ? `${props.path}?${queryParams}` : props.path;
  };

  return (
    <div class="mb-4">
      <div class="text-[10px] font-semibold uppercase text-spoosh-text-muted mb-1 tracking-[0.5px]">
        URL
      </div>

      <div class="relative bg-spoosh-surface rounded border border-spoosh-border">
        <CopyButton text={fullUrl()} class="absolute top-2 right-2 z-10" />

        <div class="p-2 pr-10 text-[11px] text-spoosh-text break-all">
          {props.path}
          <Show when={formatQueryParams(props.query)}>
            <span class="text-spoosh-text-muted">
              ?{formatQueryParams(props.query)}
            </span>
          </Show>
        </div>
      </div>
    </div>
  );
};

export const RequestTab: Component<RequestTabProps> = (props) => {
  const baseContextId = () => `request-${props.trace.id}`;
  const getCollapsedPaths = (suffix: string) =>
    props.collapsedPaths.get(`${baseContextId()}-${suffix}`) ??
    new Set<string>();

  const headers = () =>
    props.trace.finalHeaders ??
    (props.trace.request.headers as Record<string, string> | undefined);
  const query = () =>
    props.trace.request.query as Record<string, unknown> | undefined;
  const body = () => props.trace.request.body;
  const params = () =>
    props.trace.request.params as Record<string, unknown> | undefined;
  const isReadOperation = () => props.trace.method === "GET";

  const hasTags = () => isReadOperation() && props.trace.tags.length > 0;
  const hasParams = () => params() && Object.keys(params()!).length > 0;
  const hasQuery = () => query() && Object.keys(query()!).length > 0;
  const hasBody = () => body() !== undefined;
  const hasHeaders = () => headers() && Object.keys(headers()!).length > 0;

  const getBodyData = (): { data: unknown; badge?: string } => {
    const bodyValue = body();

    if (isSpooshBody(bodyValue)) {
      const displayValue =
        typeof bodyValue.value === "object" && bodyValue.value !== null
          ? sanitizeFormData(bodyValue.value as Record<string, unknown>)
          : bodyValue.value;
      return { data: displayValue, badge: bodyValue.kind };
    }

    if (bodyValue instanceof FormData) {
      const formDataObj: Record<string, unknown> = {};
      bodyValue.forEach((value, key) => {
        formDataObj[key] = sanitizeFormValue(value);
      });
      return { data: formDataObj, badge: "form" };
    }

    return { data: bodyValue, badge: "json" };
  };

  return (
    <>
      <UrlSection path={props.trace.path} query={query()} />

      <Show when={hasHeaders()}>
        <HeadersSection
          headers={headers()!}
          sensitiveHeaders={props.sensitiveHeaders}
        />
      </Show>

      <Show when={hasTags()}>
        <DataSection
          label="Tags"
          data={props.trace.tags}
          contextId={`${baseContextId()}-tags`}
          collapsedPaths={getCollapsedPaths("tags")}
          onTogglePath={props.onTogglePath}
        />
      </Show>

      <Show when={hasParams()}>
        <DataSection
          label="Params"
          data={params()}
          contextId={`${baseContextId()}-params`}
          collapsedPaths={getCollapsedPaths("params")}
          onTogglePath={props.onTogglePath}
        />
      </Show>

      <Show when={hasQuery()}>
        <DataSection
          label="Query"
          data={query()}
          contextId={`${baseContextId()}-query`}
          collapsedPaths={getCollapsedPaths("query")}
          onTogglePath={props.onTogglePath}
        />
      </Show>

      <Show when={hasBody()}>
        {(() => {
          const { data, badge } = getBodyData();
          return (
            <DataSection
              label="Body"
              data={data}
              contextId={`${baseContextId()}-body`}
              collapsedPaths={getCollapsedPaths("body")}
              onTogglePath={props.onTogglePath}
              badge={badge}
            />
          );
        })()}
      </Show>
    </>
  );
};
