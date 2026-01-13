import type { MetadataRoute } from "next";
import { source } from "@/lib/source";

export const revalidate = false;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://spoosh.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = source.getPages();

  const docs = pages.map((page) => ({
    url: `${siteUrl}/docs/${page.slugs.join("/")}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${siteUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...docs,
  ];
}
