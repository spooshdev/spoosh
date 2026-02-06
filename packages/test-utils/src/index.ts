import {
  createStateManager,
  createEventEmitter,
  type PluginContext,
  type OperationState,
  type StateManager,
  type EventEmitter,
  type SpooshResponse,
} from "@spoosh/core";
import { vi, type Mock } from "vitest";

export { createStateManager, createEventEmitter };

/**
 * Creates a default OperationState with optional overrides.
 */
export function createState<TData = unknown, TError = unknown>(
  overrides: Partial<OperationState<TData, TError>> = {}
): OperationState<TData, TError> {
  return {
    data: undefined as TData | undefined,
    error: undefined as TError | undefined,
    timestamp: 0,
    ...overrides,
  };
}

export type MockContextOptions<TData = unknown, TError = unknown> = {
  stateManager?: StateManager;

  eventEmitter?: EventEmitter;

  queryKey?: string;

  path?: string;

  method?: string;

  tags?: string[];

  operationType?: "read" | "write" | "infiniteRead";

  pluginOptions?: unknown;

  forceRefetch?: boolean;

  hookId?: string;

  state?: Partial<OperationState<TData, TError>>;

  request?: Record<string, unknown>;

  /** Custom metadata map for the context */
  metadata?: Map<string, unknown>;

  /** Custom plugins object with get function */
  plugins?: { get: ReturnType<typeof vi.fn> };
};

/**
 * Creates a mock PluginContext for testing plugins.
 */
export function createMockContext<TData = unknown, TError = unknown>(
  options: MockContextOptions<TData, TError> = {}
): PluginContext {
  const {
    stateManager = createStateManager(),
    eventEmitter = createEventEmitter(),
    queryKey = '{"method":"GET","path":["test"]}',
    path = "test",
    method = "GET",
    tags = ["test"],
    operationType = "read",
    pluginOptions,
    forceRefetch,
    hookId,
    request = {},
    metadata = new Map(),
    plugins = { get: vi.fn() },
  } = options;

  return {
    operationType,
    path,
    method,
    queryKey,
    tags,
    requestTimestamp: Date.now(),
    request,
    metadata,
    stateManager,
    eventEmitter,
    plugins,
    pluginOptions,
    forceRefetch,
    hookId,
  } as unknown as PluginContext;
}

/**
 * Creates a mock SpooshResponse.
 */
export function createMockResponse<TData = unknown, TError = unknown>(
  overrides: Partial<SpooshResponse<TData, TError>> = {}
): SpooshResponse<TData, TError> {
  return {
    status: 200,
    data: undefined as TData | undefined,
    error: undefined as TError | undefined,
    ...overrides,
  } as SpooshResponse<TData, TError>;
}

export type MockNextFn<TData = unknown, TError = unknown> = Mock<
  () => Promise<SpooshResponse<TData, TError>>
>;

/**
 * Creates a mock next function for middleware testing.
 */
export function createMockNext<TData = unknown, TError = unknown>(
  response?: Partial<SpooshResponse<TData, TError>>
): MockNextFn<TData, TError> {
  return vi.fn().mockResolvedValue(createMockResponse<TData, TError>(response));
}

/**
 * Creates a mock next function that throws an error.
 */
export function createMockNextError<TError = Error>(
  error: TError
): MockNextFn<never, TError> {
  return vi.fn().mockRejectedValue(error);
}

/**
 * Creates a mock next function that returns an error response.
 */
export function createMockNextWithError<TData = unknown, TError = unknown>(
  error: TError,
  status = 500
): MockNextFn<TData, TError> {
  return vi.fn().mockResolvedValue(
    createMockResponse<TData, TError>({
      status,
      data: undefined,
      error,
    })
  );
}
