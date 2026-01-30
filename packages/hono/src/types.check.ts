/* eslint-disable @typescript-eslint/no-unused-vars */
import { Hono } from "hono";
import { hc } from "hono/client";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { HonoToSpoosh } from "./types";

const postsRoutes = new Hono()
  .get("/", (c) => c.json({ posts: [] as { id: number; title: string }[] }))
  .post(
    "/",
    zValidator("json", z.object({ title: z.string(), content: z.string() })),
    (c) => {
      const body = c.req.valid("json");
      return c.json({ id: 1, ...body });
    }
  )
  .get("/:id", (c) =>
    c.json({ post: { id: c.req.param("id"), title: "Post" } })
  )
  .put(
    "/:id",
    zValidator("json", z.object({ title: z.string(), content: z.string() })),
    (c) => c.json({ updated: true })
  )
  .delete("/:id", (c) => c.json({ deleted: true }));

const usersRoutes = new Hono()
  .get("/", (c) => c.json({ users: [] as { id: number; name: string }[] }))
  .post(
    "/",
    zValidator("json", z.object({ name: z.string(), email: z.string() })),
    (c) => c.json({ id: 1 })
  )
  .get("/:id", (c) => c.json({ user: { id: c.req.param("id"), name: "John" } }))
  .put(
    "/:id",
    zValidator("json", z.object({ name: z.string(), email: z.string() })),
    (c) => c.json({ updated: true })
  )
  .delete("/:id", (c) => c.json({ deleted: true }));

const commentsRoutes = new Hono()
  .get("/", (c) => c.json({ comments: [] as { id: number; text: string }[] }))
  .post("/", zValidator("json", z.object({ text: z.string() })), (c) =>
    c.json({ id: 1 })
  );

const authRoutes = new Hono()
  .post(
    "/login",
    zValidator("json", z.object({ email: z.string(), password: z.string() })),
    (c) => c.json({ token: "abc123" })
  )
  .post("/logout", (c) => c.json({ success: true }))
  .get("/me", (c) => c.json({ user: { id: 1, name: "John" } }));

const searchRoutes = new Hono().get(
  "/",
  zValidator(
    "query",
    z.object({ q: z.string(), limit: z.number().optional() })
  ),
  (c) => {
    const query = c.req.valid("query");
    return c.json({ results: [] as string[], term: query.q });
  }
);

const uploadRoutes = new Hono().post(
  "/",
  zValidator(
    "form",
    z.object({ file: z.instanceof(File), description: z.string() })
  ),
  (c) => {
    const form = c.req.valid("form");
    return c.json({ uploaded: true, filename: form.file.name });
  }
);

const nestedPostsRoutes = new Hono()
  .get("/:postId", (c) => c.json({ post: { id: c.req.param("postId") } }))
  .route("/:postId/comments", commentsRoutes);

const nestedUsersRoutes = new Hono()
  .get("/", (c) => c.json({ users: [] as string[] }))
  .route("/:userId/posts", nestedPostsRoutes);

const app = new Hono()
  .get("/", (c) => c.json({ message: "Hello" }))
  .get("/health", (c) => c.json({ status: "ok" }))
  .route("/posts", postsRoutes)
  .route("/users", usersRoutes)
  .route("/auth", authRoutes)
  .route("/search", searchRoutes)
  .route("/upload", uploadRoutes)
  .route("/api/users", nestedUsersRoutes);

type Schema = HonoToSpoosh<typeof app>;

// Root routes
const _checkRootGet: Schema["/"]["GET"]["data"] = { message: "Hello" };
const _checkHealthGet: Schema["health"]["GET"]["data"] = { status: "ok" };

// Posts CRUD
const _checkPostsGet: Schema["posts"]["GET"]["data"] = { posts: [] };
const _checkPostsPost: Schema["posts"]["POST"]["data"] = {
  id: 1,
  title: "a",
  content: "b",
};
const _checkPostsPostBody: Schema["posts"]["POST"]["body"] = {
  title: "a",
  content: "b",
};
const _checkPostsIdGet: Schema["posts/:id"]["GET"]["data"] = {
  post: { id: "1", title: "a" },
};
const _checkPostsIdPut: Schema["posts/:id"]["PUT"]["data"] = { updated: true };
const _checkPostsIdPutBody: Schema["posts/:id"]["PUT"]["body"] = {
  title: "a",
  content: "b",
};
const _checkPostsIdDelete: Schema["posts/:id"]["DELETE"]["data"] = {
  deleted: true,
};

// Users CRUD
const _checkUsersGet: Schema["users"]["GET"]["data"] = { users: [] };
const _checkUsersPost: Schema["users"]["POST"]["data"] = { id: 1 };
const _checkUsersPostBody: Schema["users"]["POST"]["body"] = {
  name: "a",
  email: "b",
};
const _checkUsersIdGet: Schema["users/:id"]["GET"]["data"] = {
  user: { id: "1", name: "John" },
};
const _checkUsersIdPut: Schema["users/:id"]["PUT"]["data"] = { updated: true };
const _checkUsersIdPutBody: Schema["users/:id"]["PUT"]["body"] = {
  name: "a",
  email: "b",
};
const _checkUsersIdDelete: Schema["users/:id"]["DELETE"]["data"] = {
  deleted: true,
};

// Auth routes
const _checkAuthLoginPost: Schema["auth/login"]["POST"]["data"] = {
  token: "abc123",
};
const _checkAuthLoginPostBody: Schema["auth/login"]["POST"]["body"] = {
  email: "a",
  password: "b",
};
const _checkAuthLogoutPost: Schema["auth/logout"]["POST"]["data"] = {
  success: true,
};
const _checkAuthMeGet: Schema["auth/me"]["GET"]["data"] = {
  user: { id: 1, name: "John" },
};

// Search with query params
const _checkSearchGet: Schema["search"]["GET"]["data"] = {
  results: [],
  term: "test",
};
const _checkSearchGetQuery: Schema["search"]["GET"]["query"] = { q: "test" };
const _checkSearchGetQueryWithLimit: Schema["search"]["GET"]["query"] = {
  q: "test",
  limit: 10,
};

// Form data (maps to body)
const _checkUploadPost: Schema["upload"]["POST"]["data"] = {
  uploaded: true,
  filename: "test.jpg",
};
const _checkUploadPostBody: Schema["upload"]["POST"]["body"] = {
  file: new File([], "test.jpg"),
  description: "A test file",
};

// Deeply nested routes
const _checkApiUsersGet: Schema["api/users"]["GET"]["data"] = { users: [] };
const _checkApiUsersPostsGet: Schema["api/users/:userId/posts/:postId"]["GET"]["data"] =
  { post: { id: "1" } };
const _checkApiUsersPostsCommentsGet: Schema["api/users/:userId/posts/:postId/comments"]["GET"]["data"] =
  { comments: [] };
const _checkApiUsersPostsCommentsPost: Schema["api/users/:userId/posts/:postId/comments"]["POST"]["data"] =
  { id: 1 };
const _checkApiUsersPostsCommentsPostBody: Schema["api/users/:userId/posts/:postId/comments"]["POST"]["body"] =
  { text: "hello" };
