import {
  getPageImage,
  getSourceByFramework,
  FRAMEWORKS,
  type Framework,
} from "@/lib/source";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/mdx-components";
import type { Metadata } from "next";
import { createRelativeLink } from "fumadocs-ui/mdx";

interface PageProps {
  params: Promise<{ framework: string; slug?: string[] }>;
}

export default async function Page({ params }: PageProps) {
  const { framework, slug } = await params;
  const source = getSourceByFramework(framework as Framework);
  const page = source.getPage(slug);

  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  const params: { framework: string; slug: string[] }[] = [];

  for (const framework of FRAMEWORKS) {
    const source = getSourceByFramework(framework);
    const pages = source.generateParams();

    for (const page of pages) {
      params.push({
        framework,
        slug: page.slug,
      });
    }
  }

  return params;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { framework, slug } = await params;
  const source = getSourceByFramework(framework as Framework);
  const page = source.getPage(slug);

  if (!page) notFound();

  const image = getPageImage(page, framework as Framework);
  const frameworkLabel = framework.charAt(0).toUpperCase() + framework.slice(1);

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      title: `${page.data.title} | Spoosh ${frameworkLabel}`,
      description: page.data.description,
      type: "article",
      images: [
        {
          url: image.url,
          width: 1200,
          height: 630,
          alt: page.data.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${page.data.title} | Spoosh ${frameworkLabel}`,
      description: page.data.description,
      images: [image.url],
    },
  };
}
