export type ExtractTriggerQuery<I> = I extends { query: infer Q }
  ? { query?: Q }
  : unknown;

export type ExtractTriggerBody<I> = I extends { body: infer B }
  ? { body?: B }
  : unknown;

export type ExtractTriggerParams<I> = I extends { params: infer P }
  ? { params?: P }
  : unknown;
