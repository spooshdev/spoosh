import {
  createContext,
  useContext,
  createSignal,
  createEffect,
  type ParentComponent,
  type Accessor,
} from "solid-js";

interface MatchInfo {
  componentId: string;
  localIndex: number;
}

interface FindContextValue {
  query: Accessor<string>;
  currentMatch: Accessor<MatchInfo | null>;
  registerMatches: (
    id: string,
    count: number,
    scrollFn: (idx: number) => void
  ) => void;
  unregisterMatches: (id: string) => void;
}

const FindContext = createContext<FindContextValue>({
  query: () => "",
  currentMatch: () => null,
  registerMatches: () => {},
  unregisterMatches: () => {},
});

interface MatchRegistry {
  count: number;
  scrollFn: (localIndex: number) => void;
}

export const FindProvider: ParentComponent<{
  query: () => string;
  onMatchCountChange: (count: number) => void;
  currentMatch: Accessor<number>;
}> = (props) => {
  const [registry, setRegistry] = createSignal<Map<string, MatchRegistry>>(
    new Map()
  );
  const [currentMatchInfo, setCurrentMatchInfo] =
    createSignal<MatchInfo | null>(null);

  const totalCount = () => {
    let total = 0;

    for (const entry of registry().values()) {
      total += entry.count;
    }

    return total;
  };

  const registerMatches = (
    id: string,
    count: number,
    scrollFn: (idx: number) => void
  ) => {
    setRegistry((prev) => {
      const next = new Map(prev);
      next.set(id, { count, scrollFn });
      return next;
    });

    queueMicrotask(() => props.onMatchCountChange(totalCount()));
  };

  const unregisterMatches = (id: string) => {
    setRegistry((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });

    queueMicrotask(() => props.onMatchCountChange(totalCount()));
  };

  const getMatchInfo = (globalIndex: number): MatchInfo | null => {
    if (globalIndex <= 0) return null;

    let remaining = globalIndex;

    for (const [id, entry] of registry().entries()) {
      if (remaining <= entry.count) {
        return { componentId: id, localIndex: remaining };
      }

      remaining -= entry.count;
    }

    return null;
  };

  createEffect(() => {
    const globalIndex = props.currentMatch();

    if (globalIndex <= 0) {
      setCurrentMatchInfo(null);
      return;
    }

    const info = getMatchInfo(globalIndex);
    setCurrentMatchInfo(info);

    if (info) {
      const entry = registry().get(info.componentId);
      entry?.scrollFn(info.localIndex);
    }
  });

  return (
    <FindContext.Provider
      value={{
        query: props.query,
        currentMatch: currentMatchInfo,
        registerMatches,
        unregisterMatches,
      }}
    >
      {props.children}
    </FindContext.Provider>
  );
};

export const useFindContext = () => useContext(FindContext);

export const useFindQuery = () => useContext(FindContext).query;
