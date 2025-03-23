import { useEffect, useState } from "react";

export default function useTailwindBreakpoints() {
  const [breakpoints, setBreakpoints] = useState({
    sm: false,
    md: false,
    lg: false,
    xl: false,
    "2xl": false,
  });

  useEffect(() => {
    const updateBreakpoints = () => {
      const width = window.innerWidth;
      setBreakpoints({
        sm: width >= 640,
        md: width >= 768,
        lg: width >= 1024,
        xl: width >= 1280,
        "2xl": width >= 1536,
      });
    };

    window.addEventListener("resize", updateBreakpoints);
    updateBreakpoints();

    return () => {
      window.removeEventListener("resize", updateBreakpoints);
    };
  }, []);

  return breakpoints;
}