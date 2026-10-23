import type { MetadataRoute } from "next";
import { getSourceByFramework, FRAMEWORKS } from "@/lib/source";
import { SITE_URL } from "@/lib/constants";

export const revalidate = false;

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];

  for (const framework of FRAMEWORKS) {
    const pages = getSourceByFramework(framework).getPages();

    for (const page of pages) {
      entries.push({
        url: `${SITE_URL}${page.url}`,
        changeFrequency: "weekly",
        priority: page.slugs.length === 0 ? 0.9 : 0.8,
      });
    }
  }

  return entries;
}
