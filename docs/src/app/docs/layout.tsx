import { source } from "@/lib/source";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { baseOptions } from "@/lib/layout.shared";

export default function Layout({ children }: LayoutProps<"/docs">) {
  const options = baseOptions();

  return (
    <DocsLayout
      tree={source.getPageTree()}
      nav={options.nav}
      links={options.links?.filter((link) => link.type === "icon")}
    >
      {children}
    </DocsLayout>
  );
}
