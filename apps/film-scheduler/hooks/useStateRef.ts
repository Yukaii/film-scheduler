import { useCallback, useRef, useState } from 'react';

/**
 * State plus a ref that always holds the latest value. The ref is written in the
 * setter, not after render, so several updates in one frame (wheel or touchmove
 * bursts) build on each other instead of on the last rendered value.
 */
export default function useStateRef<T>(
  initialValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>, React.RefObject<T>] {
  const [state, setState] = useState(initialValue);
  const stateRef = useRef(initialValue);

  const setStateAndRef = useCallback<React.Dispatch<React.SetStateAction<T>>>((value) => {
    const next =
      typeof value === 'function' ? (value as (prev: T) => T)(stateRef.current) : value;
    stateRef.current = next;
    setState(next);
  }, []);

  return [state, setStateAndRef, stateRef];
}
