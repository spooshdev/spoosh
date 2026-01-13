import { codeToHtml } from 'shiki';

interface CodeBlockProps {
  code: string;
  lang?: string;
}

export async function CodeBlock({ code, lang = 'typescript' }: CodeBlockProps) {
  const html = await codeToHtml(code, {
    lang,
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
    defaultColor: false,
  });

  return (
    <div
      className="[&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:text-sm [&_pre]:border [&_pre]:border-fd-border [&_.shiki]:bg-fd-card [&_span]:[color:var(--shiki-light)] dark:[&_span]:[color:var(--shiki-dark)]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
