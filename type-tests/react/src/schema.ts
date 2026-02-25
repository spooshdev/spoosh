export type TestSchema = {
  posts: {
    GET: {
      data: { id: number; title: string }[];
      error: { customError: string };
    };
    POST: {
      data: { id: number };
      body: { title: string };
      error: { validation: string[] };
    };
  };
  "posts/:id": {
    GET: {
      data: { id: number; title: string };
      params: { id: string };
      error: { notFound: boolean };
    };
    PUT: {
      data: { id: number; title: string };
      params: { id: string };
      body: { title: string };
      error: { notFound: boolean };
    };
    DELETE: {
      data: { success: boolean };
      params: { id: string };
      error: { notFound: boolean };
    };
  };
  users: {
    GET: { data: { name: string }[] };
    POST: { data: { id: number }; body: { name: string } };
  };
  activities: {
    GET: {
      data: {
        items: { id: number; message: string }[];
        nextCursor: number | null;
      };
      query: { cursor?: number; limit?: number };
      error: { paginationError: number };
    };
  };
  uploads: {
    POST: {
      data: { url: string };
      body: FormData;
      error: { uploadFailed: string };
    };
  };
  notifications: {
    GET: {
      events: {
        alert: { data: { level: string } };
        message: { data: { content: string } };
      };
      error: { connectionError: boolean };
    };
  };
  "events/stream": {
    GET: {
      events: {
        update: { data: { value: number } };
      };
    };
  };
};

export type DefaultError = { message: string };
