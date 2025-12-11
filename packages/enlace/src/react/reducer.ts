import type { HookState } from "./types";

export type HookAction =
  | { type: "RESET"; state?: HookState }
  | { type: "FETCH_START" }
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
