import { expectType } from "tsd";
import { Spoosh, form, json, urlencoded, SpooshBody } from "@spoosh/core";
import { create } from "@spoosh/react";
import { cachePlugin } from "@spoosh/plugin-cache";
import type { TestSchema, DefaultError } from "./schema.js";

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  cachePlugin(),
]);
const { useWrite } = create(spoosh);

// =============================================================================
// Body parser return types
// =============================================================================

const jsonBody = json({ title: "test" });
expectType<SpooshBody<{ title: string }>>(jsonBody);

const formBody = form({ title: "test" });
expectType<SpooshBody<{ title: string }>>(formBody);

const urlencodedBody = urlencoded({ title: "test" });
expectType<SpooshBody<{ title: string }>>(urlencodedBody);

// =============================================================================
// Trigger with json() body parser
// =============================================================================

const createPost = useWrite((api) => api("posts").POST());

createPost.trigger({ body: json({ title: "New Post" }) });

// =============================================================================
// Trigger with form() body parser
// =============================================================================

createPost.trigger({ body: form({ title: "New Post" }) });

// =============================================================================
// Trigger with urlencoded() body parser
// =============================================================================

createPost.trigger({ body: urlencoded({ title: "New Post" }) });

// =============================================================================
// Mixed usage - raw body and parsed body should both work
// =============================================================================

createPost.trigger({ body: { title: "Raw body" } });
createPost.trigger({ body: json({ title: "JSON parsed" }) });
createPost.trigger({ body: form({ title: "Form parsed" }) });
createPost.trigger({ body: urlencoded({ title: "URL encoded" }) });

// =============================================================================
// Raw body validation still works
// =============================================================================

// @ts-expect-error - raw body must match schema
createPost.trigger({ body: { invalidField: "test" } });

// =============================================================================
// Parsed body validation - invalid fields should error
// =============================================================================

// @ts-expect-error - json body must match schema
createPost.trigger({ body: json({ invalidField: "test" }) });

// @ts-expect-error - form body must match schema
createPost.trigger({ body: form({ invalidField: "test" }) });

// @ts-expect-error - urlencoded body must match schema
createPost.trigger({ body: urlencoded({ invalidField: "test" }) });

// Note: Extra properties with correct required fields won't error due to TypeScript's
// structural typing through functions. This is a known limitation.
// json({ title: "valid", extraField: "invalid" }) - won't error

// =============================================================================
// FormData endpoint - should accept form() wrapper
// =============================================================================

const uploadFile = useWrite((api) => api("uploads").POST());

uploadFile.trigger({ body: new FormData() });

// @ts-expect-error - uploads endpoint expects FormData, not object
uploadFile.trigger({ body: { title: "test" } });
