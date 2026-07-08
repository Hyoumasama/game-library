"use client";

import { ReactNode, useRef, useState } from "react";

const EDIT_TRIGGER = 70;
const DELETE_TRIGGER = -70;
const DELETE_WIDTH = -96;

export default function SwipeGameCard({
  children,
  onEdit,
  onDelete,
  disabled = false,
}: {
  children: ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const startX = useRef(0);
  const startY = useRef(0);
  const didSwipe = useRef(false);

  const [offsetX, setOffsetX] = useState(0);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <div className="relative overflow-hidden rounded-[1.6rem] md:overflow-visible">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOffsetX(0);
          onDelete();
        }}
        className="absolute inset-y-0 right-0 z-0 hidden w-24 items-center justify-center rounded-[1.6rem] bg-red-600 text-sm font-black text-white md:hidden"
      >
        Delete
      </button>

      <div
        className="relative z-10 transition-transform duration-200 md:transition-none"
        style={{ transform: `translateX(${offsetX}px)` }}
        onClickCapture={(event) => {
          if (!didSwipe.current) return;

          event.preventDefault();
          event.stopPropagation();
          didSwipe.current = false;
        }}
        onTouchStart={(event) => {
          startX.current = event.touches[0].clientX;
          startY.current = event.touches[0].clientY;
          didSwipe.current = false;
        }}
        onTouchMove={(event) => {
          const currentX = event.touches[0].clientX;
          const currentY = event.touches[0].clientY;

          const diffX = currentX - startX.current;
          const diffY = currentY - startY.current;

          if (Math.abs(diffY) > Math.abs(diffX)) return;

          if (diffX > 0) {
            setOffsetX(Math.min(diffX, 90));
          } else {
            setOffsetX(Math.max(diffX, DELETE_WIDTH));
          }
        }}
        onTouchEnd={() => {
          if (offsetX >= EDIT_TRIGGER) {
            didSwipe.current = true;
            setOffsetX(0);
            onEdit();
            return;
          }

          if (offsetX <= DELETE_TRIGGER) {
            didSwipe.current = true;
            setOffsetX(DELETE_WIDTH);
            return;
          }

          setOffsetX(0);
        }}
      >
        {children}
      </div>
    </div>
  );
}