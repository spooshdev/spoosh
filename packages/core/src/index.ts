export { Spoosh } from "./Spoosh";
export {
  createClient,
  type SpooshClientConfig as ClientConfig,
} from "./createClient";

export * from "./types";
export * from "./utils";
export * from "./proxy";
export * from "./transport";
export { executeFetch } from "./fetch";
export {
  createMiddleware,
  applyMiddlewares,
  composeMiddlewares,
} from "./middleware";

export * from "./plugins";
export * from "./state";
export * from "./operations";
export * from "./events";
