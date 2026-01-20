import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { CodeBlock } from "@/components/code-block";

export const metadata: Metadata = {
  title: "Spoosh - Type-Safe API Client",
  description:
    "A type-safe API client with a powerful plugin system. Features caching, invalidation, retry, polling, optimistic updates, and more.",
  openGraph: {
    title: "Spoosh - Type-Safe API Client",
    description:
      "A type-safe API client with a powerful plugin system. Features caching, invalidation, retry, polling, optimistic updates, and more.",
    images: ["/og/home"],
  },
};

const GITHUB_URL = "https://github.com/nxnom/spoosh";

const heroCode = `import { Spoosh } from "@spoosh/core";
import { createReactSpoosh } from "@spoosh/react";
import { cachePlugin } from "@spoosh/plugin-cache";
import { deduplicationPlugin } from "@spoosh/plugin-deduplication";
import { invalidationPlugin } from "@spoosh/plugin-invalidation";

const spoosh = new Spoosh<ApiSchema, Error>("/api").use([
  cachePlugin({ staleTime: 5000 }),
  deduplicationPlugin(), // Prevent duplicate requests
  invalidationPlugin(), // Auto-refresh queries after mutations
]);

export const { useRead, useWrite } = createReactSpoosh(spoosh);`;

const exampleCode = `function UserList() {
  const { data, loading, error } = useRead(
    (api) => api.users.$get()
  );

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <ul>
      {data?.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}`;

export default function HomePage() {
  return (
    <main className="flex flex-col">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24 md:py-32">
        <div className="flex items-center gap-3 mb-6">
          <Logo className="w-12 h-12" />
          <h1 className="text-4xl md:text-5xl font-bold">Spoosh</h1>
        </div>

        <p className="text-xl md:text-2xl text-fd-muted-foreground max-w-2xl mb-8">
          A type-safe API client with a powerful plugin system
        </p>

        <div className="flex flex-wrap gap-4 justify-center mb-12">
          <Link
            href="/docs"
            className="px-6 py-3 bg-fd-primary text-fd-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
          <Link
            href={GITHUB_URL}
            className="px-6 py-3 border border-fd-border rounded-lg font-medium hover:bg-fd-accent transition-colors"
          >
            GitHub
          </Link>
        </div>

        {/* Code Preview */}
        <div className="w-full max-w-3xl text-left">
          <CodeBlock code={heroCode} lang="typescript" />
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16 bg-fd-muted">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Why Spoosh?
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              title="Type-Safe"
              description="Define your API schema once, get full TypeScript autocomplete and type checking everywhere."
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />

            <FeatureCard
              title="Plugin System"
              description="Extend functionality with plugins for caching, retry, polling, optimistic updates, and more."
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z"
                  />
                </svg>
              }
            />

            <FeatureCard
              title="Smart Cache Invalidation"
              description="Automatic tag-based cache invalidation after mutations. Your queries stay fresh without manual refetching."
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              }
            />

            <FeatureCard
              title="Your API is Your Code"
              description='API paths become TypeScript code. Define /posts/:id once, call it as api.posts(":id").$get. Zero runtime overhead, pure compile-time magic.'
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              }
            />

            <FeatureCard
              title="Framework Adapters"
              description="First-class support for Hono and Elysia with automatic type inference from your server routes."
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              }
            />

            <FeatureCard
              title="OpenAPI Conversion"
              description="Bidirectional conversion between TypeScript schemas and OpenAPI 3.0/3.1 specs. Import existing APIs or export for documentation."
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* Quick Example Section */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
            Simple & Powerful
          </h2>
          <p className="text-fd-muted-foreground text-center mb-8">
            Fetch data with automatic caching, loading states, and error
            handling
          </p>

          <CodeBlock code={exampleCode} lang="tsx" />
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-16 bg-fd-muted">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to get started?
          </h2>
          <p className="text-fd-muted-foreground mb-8">
            Install Spoosh and build type-safe API clients in minutes.
          </p>
          <CodeBlock
            code="npm install @spoosh/core @spoosh/react"
            lang="bash"
          />
          <div className="mt-8">
            <Link
              href="/docs/getting-started"
              className="inline-block px-6 py-3 bg-fd-primary text-fd-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Read the Documentation
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  title,
  description,
  icon,
  highlight,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-6 bg-fd-card border rounded-lg ${highlight ? "border-fd-primary ring-1 ring-fd-primary/20" : "border-fd-border"}`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${highlight ? "bg-fd-primary text-fd-primary-foreground" : "bg-fd-primary/10 text-fd-primary"}`}
      >
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-fd-muted-foreground text-sm">{description}</p>
    </div>
  );
}
