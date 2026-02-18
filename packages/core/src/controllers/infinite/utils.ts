import type { StateManager } from "../../state";
import type { InfiniteReadState, InfiniteRequestOptions } from "./types";

export function shallowMergeRequest(
  initial: InfiniteRequestOptions,
  override: Partial<InfiniteRequestOptions>
): InfiniteRequestOptions {
  return {
    query: override.query
      ? { ...initial.query, ...override.query }
      : initial.query,
    params: override.params
      ? { ...initial.params, ...override.params }
      : initial.params,
    body: override.body !== undefined ? override.body : initial.body,
  };
}

export type PageData<TData> = {
  allResponses: TData[];
  allRequests: InfiniteRequestOptions[];
};

export function collectPageData<TData>(
  pageKeys: string[],
  stateManager: StateManager,
  pageRequests: Map<string, InfiniteRequestOptions>,
  initialRequest: InfiniteRequestOptions
): PageData<TData> {
  const allResponses: TData[] = [];
  const allRequests: InfiniteRequestOptions[] = [];

  for (const key of pageKeys) {
    const cached = stateManager.getCache(key);

    if (cached?.state?.data !== undefined) {
      allResponses.push(cached.state.data as TData);
      allRequests.push(pageRequests.get(key) ?? initialRequest);
    }
  }

  return { allResponses, allRequests };
}

export function createInitialInfiniteState<
  TData,
  TItem,
  TError,
>(): InfiniteReadState<TData, TItem, TError> {
  return {
    data: undefined,
    allResponses: undefined,
    allRequests: undefined,
    canFetchNext: false,
    canFetchPrev: false,
    error: undefined,
  };
}
