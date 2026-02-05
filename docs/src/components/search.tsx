"use client";
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from "fumadocs-ui/components/dialog/search";
import { useDocsSearch } from "fumadocs-core/search/client";
import { create } from "@orama/orama";
import { useI18n } from "fumadocs-ui/contexts/i18n";
import { usePathname } from "next/navigation";

function initOrama() {
  return create({
    schema: { _: "string" },
    // https://docs.orama.com/docs/orama-js/supported-languages
    language: "english",
  });
}

function useFramework(): string {
  const pathname = usePathname();

  if (pathname.startsWith("/docs/angular")) return "angular";

  return "react";
}

export default function DefaultSearchDialog(props: SharedProps) {
  const { locale } = useI18n();
  const framework = useFramework();

  const { search, setSearch, query } = useDocsSearch(
    {
      type: "static",
      from: `/api/search/${framework}`,
      initOrama,
      locale,
    },
    [framework]
  );

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      {...props}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== "empty" ? query.data : null} />
      </SearchDialogContent>
    </SearchDialog>
  );
}
