import { notFound } from "next/navigation";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { baseOptions } from "@/lib/layout.shared";
import { getSourceByFramework, FRAMEWORKS, type Framework } from "@/lib/source";
import { FrameworkSwitcher } from "@/components/framework-switcher";
import type { Folder, Root } from "fumadocs-core/page-tree";

interface DocsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ framework: string }>;
}

export function generateStaticParams() {
  return FRAMEWORKS.map((framework) => ({ framework }));
}

function getTreeWithLLM(tree: Root, framework: Framework): Root {
  const llmFolder: Folder = {
    type: "folder",
    name: "LLM",
    index: undefined,
    children: [
      {
        type: "page",
        name: "Docs List",
        url: `/docs/${framework}/llms`,
        external: true,
      },
      {
        type: "page",
        name: "Full Docs",
        url: `/docs/${framework}/llms-full`,
        external: true,
      },
    ],
  };

  return {
    ...tree,
    children: [...tree.children, llmFolder],
  };
}

export default async function Layout({ children, params }: DocsLayoutProps) {
  const { framework } = await params;

  if (!FRAMEWORKS.includes(framework as Framework)) {
    notFound();
  }

  const source = getSourceByFramework(framework as Framework);
  const options = baseOptions(framework as Framework);
  const tree = getTreeWithLLM(source.getPageTree(), framework as Framework);

  return (
    <DocsLayout
      tree={tree}
      nav={options.nav}
      links={options.links?.filter((link) => link.type === "icon")}
      sidebar={{
        banner: <FrameworkSwitcher framework={framework as Framework} />,
      }}
    >
      {children}
    </DocsLayout>
  );
}
