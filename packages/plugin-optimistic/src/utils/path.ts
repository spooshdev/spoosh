export function isParameterSegment(segment: string): boolean {
  return segment.startsWith(":");
}

export function hasPatternParams(path: string): boolean {
  return path.split("/").some(isParameterSegment);
}

/**
 * Match a resolved path (e.g., "bsc/samples/465") against a pattern (e.g., "bsc/samples/:id").
 * Extracts param values from the resolved path based on pattern placeholders.
 */
export function pathMatchesPattern(
  resolvedPath: string,
  pattern: string
): {
  matches: boolean;
  params: Record<string, string>;
} {
  const resolvedSegments = resolvedPath.split("/").filter(Boolean);
  const patternSegments = pattern.split("/").filter(Boolean);

  if (resolvedSegments.length !== patternSegments.length) {
    return { matches: false, params: {} };
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternSegments.length; i++) {
    const patternSeg = patternSegments[i]!;
    const resolvedSeg = resolvedSegments[i]!;

    if (isParameterSegment(patternSeg)) {
      const paramName = patternSeg.slice(1);
      params[paramName] = resolvedSeg;
    } else if (patternSeg !== resolvedSeg) {
      return { matches: false, params: {} };
    }
  }

  return { matches: true, params };
}
