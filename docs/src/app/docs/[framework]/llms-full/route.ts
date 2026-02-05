import {
  getLLMText,
  reactSource,
  angularSource,
  type Framework,
} from "@/lib/source";

export const revalidate = false;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ framework: string }> }
) {
  const { framework } = await params;
  const source = framework === "angular" ? angularSource : reactSource;
  const title = framework === "angular" ? "Angular" : "React";

  const pages = source.getPages().map(getLLMText);
  const scanned = await Promise.all(pages);

  const content = [`# Spoosh ${title} Documentation\n`, ...scanned].join(
    "\n\n"
  );

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": "inline",
    },
  });
}

export function generateStaticParams(): { framework: Framework }[] {
  return [{ framework: "react" }, { framework: "angular" }];
}
