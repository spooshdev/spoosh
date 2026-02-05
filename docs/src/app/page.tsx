import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { CodeBlock } from "@/components/code-block";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions } from "@/lib/layout.shared";
import { GITHUB_URL } from "@/lib/constants";

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
    (api) => api("users").GET()
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

const frameworks = [
  {
    name: "React",
    slug: "react",
    description: "React hooks for data fetching with full type safety",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44-.96-.236-2.006-.417-3.107-.534-.66-.905-1.345-1.727-2.035-2.447 1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442-1.107.117-2.154.298-3.113.538-.112-.49-.195-.964-.254-1.42-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87-.728.063-1.466.098-2.21.098-.74 0-1.477-.035-2.202-.093-.406-.582-.802-1.204-1.183-1.86-.372-.64-.71-1.29-1.018-1.946.303-.657.646-1.313 1.013-1.954.38-.66.773-1.286 1.18-1.868.728-.064 1.466-.098 2.21-.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933-.2-.39-.41-.783-.64-1.174-.225-.392-.465-.774-.705-1.146zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493-.28-.958-.646-1.956-1.1-2.98.45-1.017.81-2.01 1.085-2.964zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39.24-.375.48-.762.705-1.158.225-.39.435-.788.636-1.18zm-9.945.02c.2.392.41.783.64 1.175.23.39.465.772.705 1.143-.695-.102-1.365-.23-2.006-.386.18-.63.406-1.282.66-1.933zM17.92 16.32c.112.493.2.968.254 1.423.23 1.868-.054 3.32-.714 3.708-.147.09-.338.128-.563.128-1.012 0-2.514-.807-4.11-2.28.686-.72 1.37-1.536 2.02-2.44 1.107-.118 2.154-.3 3.113-.54zm-11.83.01c.96.234 2.006.415 3.107.532.66.905 1.345 1.727 2.035 2.446-1.595 1.483-3.092 2.295-4.11 2.295-.22-.005-.406-.05-.553-.132-.666-.38-.955-1.834-.73-3.703.054-.46.142-.944.25-1.438zm4.56.64c.44.02.89.034 1.345.034.46 0 .915-.01 1.36-.034-.44.572-.895 1.095-1.345 1.565-.455-.47-.91-.993-1.36-1.565z" />
      </svg>
    ),
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20 hover:border-cyan-500/50",
  },
  {
    name: "Angular",
    slug: "angular",
    description: "Angular signals for reactive data fetching",
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M9.931 12.645h4.138l-2.07-4.908m0-7.737L.68 3.982l1.726 14.771L12 24l9.596-5.242L23.32 3.984 11.999.001zm7.064 18.31h-2.638l-1.422-3.503H8.996l-1.422 3.504h-2.64L12 2.65z" />
      </svg>
    ),
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20 hover:border-red-500/50",
  },
];

export default function HomePage() {
  return (
    <HomeLayout {...baseOptions()}>
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
              href="/docs/react"
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

        {/* Framework Selector Section */}
        <section id="frameworks" className="px-6 py-16 bg-fd-muted">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
              Choose Your Framework
            </h2>
            <p className="text-fd-muted-foreground text-center mb-12">
              Spoosh provides first-class support for multiple frontend
              frameworks
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {frameworks.map((framework) => (
                <Link
                  key={framework.slug}
                  href={`/docs/${framework.slug}`}
                  className={`p-6 bg-fd-card border-2 rounded-lg transition-all ${framework.borderColor}`}
                >
                  <div
                    className={`w-14 h-14 rounded-lg flex items-center justify-center mb-4 ${framework.bgColor} ${framework.color}`}
                  >
                    {framework.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {framework.name}
                  </h3>
                  <p className="text-fd-muted-foreground">
                    {framework.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-6 py-16">
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
                description='API paths become TypeScript code. Define "posts/:id" once, call it as api("posts/:id").GET(). Zero runtime overhead, pure compile-time magic.'
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
                description="First-class support for React and Angular with automatic type inference from your server routes."
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
        <section className="px-6 py-16 bg-fd-muted">
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
        <section className="px-6 py-16">
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
            <div className="mt-8 flex gap-4 justify-center flex-wrap">
              <Link
                href="/docs/react/getting-started"
                className="inline-block px-6 py-3 bg-fd-primary text-fd-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                React Documentation
              </Link>
              <Link
                href="/docs/angular/getting-started"
                className="inline-block px-6 py-3 border border-fd-border rounded-lg font-medium hover:bg-fd-accent transition-colors"
              >
                Angular Documentation
              </Link>
            </div>
          </div>
        </section>
      </main>
    </HomeLayout>
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
