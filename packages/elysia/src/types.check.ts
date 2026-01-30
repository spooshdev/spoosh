/* eslint-disable @typescript-eslint/no-unused-vars */
import { Elysia, t } from "elysia";
import type { ElysiaToSpoosh } from "./types";

const postsRoutes = new Elysia({ prefix: "/posts" })
  .get("/", () => [] as { id: number; title: string }[])
  .post("/", ({ body }) => ({ id: 1, ...body }), {
    body: t.Object({ title: t.String(), content: t.String() }),
  })
  .get("/:id", ({ params }) => ({ post: { id: params.id, title: "Post" } }))
  .put("/:id", ({ body }) => ({ updated: true, ...body }), {
    body: t.Object({ title: t.String(), content: t.String() }),
  })
  .delete("/:id", () => ({ deleted: true }));

const usersRoutes = new Elysia({ prefix: "/users" })
  .get("/", () => [] as { id: number; name: string }[])
  .post("/", ({ body }) => ({ id: 1, ...body }), {
    body: t.Object({ name: t.String(), email: t.String() }),
  })
  .get("/:id", ({ params }) => ({ user: { id: params.id, name: "John" } }))
  .put("/:id", ({ body }) => ({ updated: true, ...body }), {
    body: t.Object({ name: t.String(), email: t.String() }),
  })
  .delete("/:id", () => ({ deleted: true }));

const commentsRoutes = new Elysia({ prefix: "/comments" })
  .get("/", () => [] as { id: number; text: string }[])
  .post("/", ({ body }) => ({ id: 1, ...body }), {
    body: t.Object({ text: t.String() }),
  });

const authRoutes = new Elysia({ prefix: "/auth" })
  .post("/login", ({ body }) => ({ token: "abc123", ...body }), {
    body: t.Object({ email: t.String(), password: t.String() }),
  })
  .post("/logout", () => ({ success: true }))
  .get("/me", () => ({ user: { id: 1, name: "John" } }));

const searchRoutes = new Elysia({ prefix: "/search" }).get(
  "/",
  ({ query }) => ({ results: [] as string[], term: query.q }),
  {
    query: t.Object({ q: t.String(), limit: t.Optional(t.Number()) }),
  }
);

const uploadRoutes = new Elysia({ prefix: "/upload" }).post(
  "/",
  ({ body }) => ({ uploaded: true, filename: body.file.name }),
  {
    body: t.Object({ file: t.File(), description: t.String() }),
  }
);

const nestedPostsRoutes = new Elysia({ prefix: "/posts" })
  .get("/:postId", ({ params }) => ({ post: { id: params.postId } }))
  .use(commentsRoutes);

const nestedUsersRoutes = new Elysia({ prefix: "/api/users" })
  .get("/", () => [] as { id: number }[])
  .use(nestedPostsRoutes);

const app = new Elysia()
  .get("/", () => ({ message: "Hello" }))
  .get("/health", () => ({ status: "ok" }))
  .get("/count", () => 42)
  .get("/items", () => ["a", "b", "c"])
  .use(postsRoutes)
  .use(usersRoutes)
  .use(authRoutes)
  .use(searchRoutes)
  .use(uploadRoutes)
  .use(nestedUsersRoutes);

type Schema = ElysiaToSpoosh<typeof app>;

// Root routes
const _root: Schema["/"]["GET"]["data"] = { message: "Hello" };
const _checkHealthGet: Schema["health"]["GET"]["data"] = { status: "ok" };

// Primitive returns
const _checkCountGet: Schema["count"]["GET"]["data"] = 42;
const _checkItemsGet: Schema["items"]["GET"]["data"] = ["a", "b"];

// Posts CRUD
const _checkPostsGet: Schema["posts"]["GET"]["data"] = [];
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
const _checkPostsIdPut: Schema["posts/:id"]["PUT"]["data"] = {
  updated: true,
  title: "a",
  content: "b",
};
const _checkPostsIdPutBody: Schema["posts/:id"]["PUT"]["body"] = {
  title: "a",
  content: "b",
};
const _checkPostsIdDelete: Schema["posts/:id"]["DELETE"]["data"] = {
  deleted: true,
};

// Users CRUD
const _checkUsersGet: Schema["users"]["GET"]["data"] = [];
const _checkUsersPost: Schema["users"]["POST"]["data"] = {
  id: 1,
  name: "a",
  email: "b",
};
const _checkUsersPostBody: Schema["users"]["POST"]["body"] = {
  name: "a",
  email: "b",
};
const _checkUsersIdGet: Schema["users/:id"]["GET"]["data"] = {
  user: { id: "1", name: "John" },
};
const _checkUsersIdPut: Schema["users/:id"]["PUT"]["data"] = {
  updated: true,
  name: "a",
  email: "b",
};
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
  email: "a",
  password: "b",
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

// Form data with File (maps to body)
const _checkUploadPost: Schema["upload"]["POST"]["data"] = {
  uploaded: true,
  filename: "test.jpg",
};
const _checkUploadPostBody: Schema["upload"]["POST"]["body"] = {
  file: new File([], "test.jpg"),
  description: "A test file",
};

// Deeply nested routes
const _checkApiUsersGet: Schema["api/users"]["GET"]["data"] = [];
const _checkApiUsersPostsCommentsGet: Schema["api/users/posts/comments"]["GET"]["data"] =
  [];
const _checkApiUsersPostsCommentsPost: Schema["api/users/posts/comments"]["POST"]["data"] =
  { id: 1, text: "hello" };
const _checkApiUsersPostsCommentsPostBody: Schema["api/users/posts/comments"]["POST"]["body"] =
  { text: "hello" };
