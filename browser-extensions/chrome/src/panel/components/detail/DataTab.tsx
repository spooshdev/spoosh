import { Show, type Component } from "solid-js";
import type { OperationTrace } from "@devtool/types";
import { JsonTree, Spinner, CopyButton } from "../shared";

interface DataTabProps {
  trace: OperationTrace;
  collapsedPaths: Set<string>;
  onTogglePath: (contextId: string, path: string) => void;
}

interface DataSectionProps {
  label: string;
  data: unknown;
  contextId: string;
  collapsedPaths: Set<string>;
  onTogglePath: (contextId: string, path: string) => void;
  isError?: boolean;
}

const DataSection: Component<DataSectionProps> = (props) => {
  const isString = () => typeof props.data === "string";

  const copyContent = () => {
    if (isString()) return props.data as string;
    return JSON.stringify(props.data, null, 2);
  };

  return (
    <div class="flex-1 flex flex-col min-h-0">
      <div class="text-xs font-medium text-spoosh-text-muted mb-2">
        {props.label}
      </div>

      <div class="relative flex-1 flex flex-col min-h-0 bg-spoosh-surface rounded border border-spoosh-border">
        <CopyButton text={copyContent()} class="absolute top-2 right-2 z-10" />

        <div
          class={`flex-1 flex flex-col min-h-0 p-3 ${props.isError ? "text-spoosh-error" : ""}`}
        >
          <Show
            when={isString()}
            fallback={
              <JsonTree
                data={props.data}
                contextId={props.contextId}
                collapsedPaths={props.collapsedPaths}
                onTogglePath={props.onTogglePath}
                withLineNumbers
              />
            }
          >
            <pre class="font-mono text-xs whitespace-pre-wrap break-all overflow-auto">
              {props.data as string}
            </pre>
          </Show>
        </div>
      </div>
    </div>
  );
};

export const DataTab: Component<DataTabProps> = (props) => {
  const isPending = () => props.trace.duration === undefined;
  const contextId = () => `data-${props.trace.id}`;

  return (
    <Show
      when={!isPending()}
      fallback={
        <div class="flex flex-col items-center justify-center h-32 text-spoosh-text-muted">
          <Spinner size="md" />
          <div class="mt-2 text-sm">Fetching...</div>
        </div>
      }
    >
      <Show
        when={props.trace.response}
        fallback={
          <div class="flex items-center justify-center h-32 text-spoosh-text-muted text-sm">
            No response data
          </div>
        }
      >
        {(response) => (
          <>
            <Show when={response().aborted}>
              <DataSection
                label="Aborted"
                data={response().error ?? "Request was aborted"}
                contextId={contextId()}
                collapsedPaths={props.collapsedPaths}
                onTogglePath={props.onTogglePath}
              />
            </Show>

            <Show when={!response().aborted && response().error}>
              <DataSection
                label="Error"
                data={response().error}
                contextId={contextId()}
                collapsedPaths={props.collapsedPaths}
                onTogglePath={props.onTogglePath}
                isError
              />
            </Show>

            <Show when={!response().aborted && !response().error}>
              <DataSection
                label="Response Data"
                data={response().data}
                contextId={contextId()}
                collapsedPaths={props.collapsedPaths}
                onTogglePath={props.onTogglePath}
              />
            </Show>
          </>
        )}
      </Show>
    </Show>
  );
};
