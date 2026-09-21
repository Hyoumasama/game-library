"use client";

import { useLayoutEffect, useRef, useState } from "react";

export default function ExpandableGameSummary({
  summary,
  containerClassName = "",
  textClassName = "",
}: {
  summary?: string | null;
  containerClassName?: string;
  textClassName?: string;
}) {
  const text = summary?.trim() || "No description available.";
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  useLayoutEffect(() => {
    if (expanded || !paragraphRef.current) return;

    const paragraph = paragraphRef.current;
    const measure = () => {
      setCanExpand(paragraph.scrollHeight > paragraph.clientHeight + 1);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(paragraph);
    return () => observer.disconnect();
  }, [expanded, text]);

  return (
    <div className={containerClassName}>
      <p
        ref={paragraphRef}
        className={`${expanded ? "" : "line-clamp-2"} ${textClassName}`}
      >
        {text}
      </p>

      {canExpand ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          className="mt-1.5 text-sm font-semibold text-cyan-400 transition-colors hover:text-cyan-300 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          {expanded ? "Show Less" : "Read More"}
        </button>
      ) : null}
    </div>
  );
}
