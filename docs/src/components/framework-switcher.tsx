"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FRAMEWORKS, type Framework } from "@/lib/source";
import {
  ReactIcon,
  AngularIcon,
  ChevronDownIcon,
  CheckIcon,
} from "@/components/icons";

const frameworkConfig: Record<
  Framework,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
  }
> = {
  react: {
    label: "React",
    icon: <ReactIcon className="w-5 h-5" />,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
  angular: {
    label: "Angular",
    icon: <AngularIcon className="w-5 h-5" />,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
};

export function FrameworkSwitcher({ framework }: { framework: Framework }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitch = (newFramework: Framework) => {
    if (newFramework === framework) {
      setIsOpen(false);
      return;
    }

    let newPathname = pathname.replace(
      `/docs/${framework}`,
      `/docs/${newFramework}`
    );

    if (framework === "react" && newFramework === "angular") {
      newPathname = newPathname.replace("/hooks", "/injects");
      newPathname = newPathname.replace("/use-read", "/inject-read");
      newPathname = newPathname.replace("/use-write", "/inject-write");
      newPathname = newPathname.replace("/use-lazy-read", "/inject-lazy-read");
      newPathname = newPathname.replace("/use-pages", "/inject-pages");
      newPathname = newPathname.replace("/use-queue", "/inject-queue");
    } else if (framework === "angular" && newFramework === "react") {
      newPathname = newPathname.replace("/injects", "/hooks");
      newPathname = newPathname.replace("/inject-read", "/use-read");
      newPathname = newPathname.replace("/inject-write", "/use-write");
      newPathname = newPathname.replace("/inject-lazy-read", "/use-lazy-read");
      newPathname = newPathname.replace("/inject-pages", "/use-pages");
      newPathname = newPathname.replace("/inject-queue", "/use-queue");
    }

    setIsOpen(false);
    router.push(newPathname);
  };

  const currentConfig = frameworkConfig[framework];

  return (
    <div className="pt-3 pb-4 border-b border-fd-border" ref={dropdownRef}>
      <label className="text-xs font-medium text-fd-muted-foreground mb-2 block">
        Framework
      </label>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-fd-border bg-fd-card hover:bg-fd-accent transition-colors cursor-pointer"
        >
          <span className={currentConfig.color}>{currentConfig.icon}</span>
          <span className="flex-1 text-left font-medium text-sm">
            {currentConfig.label}
          </span>
          <span
            className={`text-fd-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
          >
            <ChevronDownIcon className="w-4 h-4" />
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 py-1 rounded-lg border border-fd-border bg-fd-popover shadow-lg">
            {FRAMEWORKS.map((fw) => {
              const config = frameworkConfig[fw];
              const isSelected = fw === framework;

              return (
                <button
                  key={fw}
                  onClick={() => handleSwitch(fw)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    isSelected ? config.bgColor : "hover:bg-fd-accent"
                  }`}
                >
                  <span className={config.color}>{config.icon}</span>
                  <span className="flex-1 text-sm font-medium">
                    {config.label}
                  </span>
                  {isSelected && (
                    <span className={config.color}>
                      <CheckIcon className="w-4 h-4" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
