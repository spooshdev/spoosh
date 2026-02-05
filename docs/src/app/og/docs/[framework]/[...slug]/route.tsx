import {
  getPageImage,
  getSourceByFramework,
  FRAMEWORKS,
  type Framework,
} from "@/lib/source";
import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { OGImage } from "@/lib/og-image";

export const revalidate = false;

interface RouteParams {
  params: Promise<{ framework: string; slug: string[] }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { framework, slug } = await params;

  if (!FRAMEWORKS.includes(framework as Framework)) {
    notFound();
  }

  const source = getSourceByFramework(framework as Framework);
  const page = source.getPage(slug.slice(0, -1));

  if (!page) notFound();

  const frameworkLabel = framework.charAt(0).toUpperCase() + framework.slice(1);

  return new ImageResponse(
    <OGImage
      title={page.data.title}
      description={page.data.description}
      badge={frameworkLabel}
    />,
    {
      width: 1200,
      height: 630,
    }
  );
}

export function generateStaticParams() {
  const params: { framework: string; slug: string[] }[] = [];

  for (const framework of FRAMEWORKS) {
    const source = getSourceByFramework(framework);
    const pages = source.getPages();

    for (const page of pages) {
      params.push({
        framework,
        slug: getPageImage(page, framework).segments,
      });
    }
  }

  return params;
}
