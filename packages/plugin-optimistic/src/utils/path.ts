export function isParameterSegment(segment: string): boolean {
  return segment.startsWith(":");
}

export function hasPatternParams(path: string): boolean {
  return path.split("/").some(isParameterSegment);
}

export function pathMatchesPattern(
  actualPath: string,
  pattern: string
): {
  matches: boolean;
  params: Record<string, string>;
  paramMapping: Record<string, string>;
} {
  const actualSegments = actualPath.split("/").filter(Boolean);
  const patternSegments = pattern.split("/").filter(Boolean);

  if (actualSegments.length !== patternSegments.length) {
    return { matches: false, params: {}, paramMapping: {} };
  }

  const params: Record<string, string> = {};
  const paramMapping: Record<string, string> = {};

  for (let i = 0; i < patternSegments.length; i++) {
    const patternSeg = patternSegments[i]!;
    const actualSeg = actualSegments[i]!;

    if (isParameterSegment(patternSeg)) {
      const targetParamName = patternSeg.slice(1);

      if (isParameterSegment(actualSeg)) {
        const actualParamName = actualSeg.slice(1);
        paramMapping[targetParamName] = actualParamName;
        continue;
      }

      params[targetParamName] = actualSeg;
    } else if (isParameterSegment(actualSeg)) {
      continue;
    } else if (patternSeg !== actualSeg) {
      return { matches: false, params: {}, paramMapping: {} };
    }
  }

  return { matches: true, params, paramMapping };
}
