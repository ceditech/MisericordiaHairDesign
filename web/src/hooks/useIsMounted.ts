import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False during server rendering and the first client render (hydration), true afterwards.
 * Use it to defer browser-only output without a `useEffect` + `setState` pair.
 */
export function useIsMounted(): boolean {
    return useSyncExternalStore(subscribe, () => true, () => false);
}
