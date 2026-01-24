export { createProxyHandler } from "./handler";
export { createFlatProxyHandler } from "./flat-handler";

export {
  createSelectorProxy,
  extractPathFromSelector,
  extractMethodFromSelector,
  HTTP_METHODS,
  type SelectorFunction,
  type CapturedCall,
  type SelectedEndpoint,
  type SelectorResult,
  type HttpMethodKey,
} from "./selector-proxy";
