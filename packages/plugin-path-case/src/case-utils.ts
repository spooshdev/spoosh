import type { BuiltInCase } from "./types";

export function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function camelToSnake(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

export function camelToPascal(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function camelToTargetCase(str: string, target: BuiltInCase): string {
  switch (target) {
    case "kebab":
      return camelToKebab(str);
    case "snake":
      return camelToSnake(str);
    case "pascal":
      return camelToPascal(str);
    case "camel":
      return str;
  }
}
