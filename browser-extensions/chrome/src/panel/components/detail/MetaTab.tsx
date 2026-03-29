import { Show, type Component } from "solid-js";
import type { OperationTrace } from "@devtool/types";
import { JsonTree, Spinner, CopyButton } from "../shared";

interface MetaTabProps {
  trace: OperationTrace;
  collapsedPaths: Set<string>;
  onTogglePath: (contextId: string, path: string) => void;
}

export const MetaTab: Component<MetaTabProps> = (props) => {
  const isPending = () => props.trace.duration === undefined;
  const contextId = () => `meta-${props.trace.id}`;
  const meta = () => props.trace.meta;
  const hasMeta = () => meta() && Object.keys(meta()!).length > 0;

  const copyContent = () => JSON.stringify(meta(), null, 2);

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
        when={hasMeta()}
        fallback={
          <div class="flex items-center justify-center h-32 text-spoosh-text-muted text-sm">
            No meta data from plugins
          </div>
        }
      >
        <div class="flex-1 flex flex-col min-h-0">
          <div class="text-xs font-medium text-spoosh-text-muted mb-2">
            Plugin Meta
          </div>

          <div class="max-h-fit relative flex-1 flex flex-col min-h-0 bg-spoosh-surface rounded border border-spoosh-border">
            <CopyButton
              text={copyContent()}
              class="absolute top-2 right-2 z-10"
            />

            <div class="flex-1 flex flex-col min-h-0 p-3">
              <JsonTree
                data={meta()}
                contextId={contextId()}
                collapsedPaths={props.collapsedPaths}
                onTogglePath={props.onTogglePath}
                withLineNumbers
              />
            </div>
          </div>
        </div>
      </Show>
    </Show>
  );
};
