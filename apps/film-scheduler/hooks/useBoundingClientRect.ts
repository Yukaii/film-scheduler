import { useEffect, useRef, useState } from "react";

export default function useBoundingClientRect(ref: React.RefObject<HTMLElement>) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  const observer = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (ref.current) {
      const updateRect = () => {
        if (ref.current) {
          setRect(ref.current.getBoundingClientRect());
        }
      };

      observer.current = new ResizeObserver(updateRect);
      observer.current.observe(ref.current);

      // Initial call to set the rect
      updateRect();

      return () => {
        if (observer.current) {
          observer.current.disconnect();
        }
      };
    }
  }, [ref]);

  return rect;
}
  