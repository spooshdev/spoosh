import type { HookState, InfiniteRequestOptions } from "./types";

export type HookAction =
  | { type: "RESET"; state?: HookState }
  | { type: "FETCH_START" }
  | { type: "MUTATION_START" }
  | { type: "FETCH_SUCCESS"; data: unknown }
  | { type: "FETCH_ERROR"; error: unknown }
  | { type: "SYNC_CACHE"; state: HookState };

export const initialState: HookState = {
  loading: false,
  fetching: false,
  data: undefined,
  error: undefined,
};

export function hookReducer(state: HookState, action: HookAction): HookState {
  switch (action.type) {
    case "RESET":
      return action.state ?? initialState;

    case "FETCH_START":
      return {
        ...state,
        loading: state.data === undefined,
        fetching: true,
        error: undefined,
      };

    case "MUTATION_START":
      return {
        ...state,
        loading: true,
        fetching: true,
        error: undefined,
      };

    case "FETCH_SUCCESS":
      return {
        loading: false,
        fetching: false,
        data: action.data,
        error: undefined,
      };

    case "FETCH_ERROR":
      return {
        loading: false,
        fetching: false,
        data: undefined,
        error: action.error,
      };

    case "SYNC_CACHE":
      return action.state;

    default:
      return state;
  }
}

export type InfiniteHookState<TData, TItem> = {
  data: TItem[] | undefined;
  allResponses: TData[] | undefined;
  allRequests: InfiniteRequestOptions[] | undefined;
  loading: boolean;
  fetching: boolean;
  fetchingNext: boolean;
  fetchingPrev: boolean;
  canFetchNext: boolean;
  canFetchPrev: boolean;
  error: unknown;
  isOptimistic: boolean;
};

export type InfiniteHookAction<TData, TItem> =
  | { type: "RESET" }
  | { type: "FETCH_INITIAL_START" }
  | { type: "FETCH_NEXT_START" }
  | { type: "FETCH_PREV_START" }
  | { type: "FETCH_ERROR"; error: unknown }
  | { type: "SYNC_CACHE"; state: Partial<InfiniteHookState<TData, TItem>> };

export const initialInfiniteState: InfiniteHookState<unknown, unknown> = {
  data: undefined,
  allResponses: undefined,
  allRequests: undefined,
  loading: false,
  fetching: false,
  fetchingNext: false,
  fetchingPrev: false,
  canFetchNext: false,
  canFetchPrev: false,
  error: undefined,
  isOptimistic: false,
};

export function infiniteHookReducer<TData, TItem>(
  state: InfiniteHookState<TData, TItem>,
  action: InfiniteHookAction<TData, TItem>
): InfiniteHookState<TData, TItem> {
  switch (action.type) {
    case "RESET":
      return initialInfiniteState as InfiniteHookState<TData, TItem>;

    case "FETCH_INITIAL_START":
      return {
        ...state,
        loading: state.data === undefined,
        fetching: true,
        error: undefined,
      };

    case "FETCH_NEXT_START":
      return {
        ...state,
        fetching: true,
        fetchingNext: true,
        error: undefined,
      };

    case "FETCH_PREV_START":
      return {
        ...state,
        fetching: true,
        fetchingPrev: true,
        error: undefined,
      };

    case "FETCH_ERROR":
      return {
        ...state,
        loading: false,
        fetching: false,
        fetchingNext: false,
        fetchingPrev: false,
        error: action.error,
      };

    case "SYNC_CACHE":
      return {
        ...state,
        ...action.state,
        loading: false,
        fetching: false,
        fetchingNext: false,
        fetchingPrev: false,
      };

    default:
      return state;
  }
}
