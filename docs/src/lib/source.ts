import { reactDocs, angularDocs } from "fumadocs-mdx:collections/server";
import { type InferPageType, loader } from "fumadocs-core/source";

export const FRAMEWORKS = ["react", "angular"] as const;
export type Framework = (typeof FRAMEWORKS)[number];

export const reactSource = loader({
  baseUrl: "/docs/react",
  source: reactDocs.toFumadocsSource(),
  plugins: [],
});

export const angularSource = loader({
  baseUrl: "/docs/angular",
  source: angularDocs.toFumadocsSource(),
  plugins: [],
});

export function getSourceByFramework(framework: Framework) {
  switch (framework) {
    case "react":
      return reactSource;
    case "angular":
      return angularSource;
  }
}

export function getPageImage(
  page: InferPageType<typeof reactSource>,
  framework: Framework
) {
  const segments = [...page.slugs, "image.png"];

  return {
    segments,
    url: `/og/docs/${framework}/${segments.join("/")}`,
  };
}

export async function getLLMText(page: InferPageType<typeof reactSource>) {
  const processed = await page.data.getText("processed");

  return `# ${page.data.title}

${processed}`;
}
