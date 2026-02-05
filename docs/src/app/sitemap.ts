import type { MetadataRoute } from "next";
import { getSourceByFramework, FRAMEWORKS } from "@/lib/source";

export const revalidate = false;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://spoosh.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];

  for (const framework of FRAMEWORKS) {
    const source = getSourceByFramework(framework);
    const pages = source.getPages();

    entries.push({
      url: `${siteUrl}/docs/${framework}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    });

    for (const page of pages) {
      entries.push({
        url: `${siteUrl}/docs/${framework}/${page.slugs.join("/")}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  return entries;
}
