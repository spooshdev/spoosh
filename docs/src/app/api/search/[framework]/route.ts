import { FRAMEWORKS, getSourceByFramework, type Framework } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";

export const revalidate = false;

const searchMap = Object.fromEntries(
  FRAMEWORKS.map((fw) => [
    fw,
    createFromSource(getSourceByFramework(fw), { language: "english" }),
  ])
) as Record<Framework, ReturnType<typeof createFromSource>>;

export function generateStaticParams() {
  return FRAMEWORKS.map((framework) => ({ framework }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ framework: string }> }
) {
  const { framework } = await params;

  return searchMap[framework as Framework].staticGET();
}
