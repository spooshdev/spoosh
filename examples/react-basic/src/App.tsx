import { FormEvent, useState } from "react";
import { usePages, useRead, useWrite } from "./client";

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "Request failed";
  }
  return "Request failed";
}

export function App() {
  const [title, setTitle] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const tasks = useRead((api) => api("tasks").GET(), { staleTime: 4_000 });
  const createTask = useWrite((api) => api("tasks").POST());
  const toggleTask = useWrite((api) => api("tasks/:id/toggle").POST());

  const activity = usePages(
    (api) => api("activities").GET({ query: { cursor: 0, limit: 6 } }),
    {
      canFetchNext: ({ lastPage }) => lastPage?.data?.nextCursor != null,
      nextPageRequest: ({ lastPage }) => ({
        query: { cursor: lastPage?.data?.nextCursor ?? 0, limit: 6 },
      }),
      merger: (pages) =>
        pages.flatMap((page) =>
          Array.isArray(page.data?.items) ? page.data.items : []
        ),
    }
  );
  const activityItems = activity.data ?? [];

  async function onSubmit(event: FormEvent) {
    event.preventDefault();

    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }

    await createTask.trigger({ body: { title: trimmed } });
    if (!createTask.error) {
      setTitle("");
    }
  }

  async function onToggleTask(id: string) {
    setTogglingId(id);
    try {
      await toggleTask.trigger({ params: { id } });
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <main className="shell">
      <header className="hero">
        <p className="eyebrow">React Basic Example</p>
        <h1>Spoosh Task Board</h1>
        <p>Vite + MSW + Devtool. Focused on read/write/infinite-read basics.</p>
      </header>

      <section className="panel">
        <h2>Create Task</h2>
        <form onSubmit={onSubmit} className="task-form">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add task title"
          />
          <button disabled={createTask.loading} type="submit">
            {createTask.loading ? "Adding..." : "Add"}
          </button>
        </form>
        {createTask.error ? (
          <small>{getErrorMessage(createTask.error)}</small>
        ) : null}
      </section>

      <section className="panel">
        <h2>Tasks</h2>
        {tasks.loading ? <p>Loading tasks...</p> : null}
        {tasks.error ? <p>Error: {getErrorMessage(tasks.error)}</p> : null}
        <ul className="list">
          {tasks.data?.map((task) => (
            <li className="item" key={task.id}>
              <label className="task-row">
                <input
                  type="checkbox"
                  checked={task.done}
                  disabled={togglingId === task.id}
                  onChange={() => {
                    void onToggleTask(task.id);
                  }}
                />
                <span className={task.done ? "task-title done" : "task-title"}>
                  {task.title}
                </span>
                {togglingId === task.id ? (
                  <small className="inline-loading">Updating...</small>
                ) : null}
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Activity Feed (Infinite)</h2>
        <ul className="list">
          {activityItems.map((item) => (
            <li className="item" key={item.id}>
              {item.message}
            </li>
          ))}
        </ul>
        {activity.error ? (
          <p>Error: {getErrorMessage(activity.error)}</p>
        ) : null}
        {activity.canFetchNext ? (
          <button
            className="load-more"
            onClick={() => void activity.fetchNext()}
            disabled={activity.fetchingNext}
          >
            {activity.fetchingNext ? "Loading..." : "Load more"}
          </button>
        ) : (
          <small>All activity loaded.</small>
        )}
      </section>
    </main>
  );
}
