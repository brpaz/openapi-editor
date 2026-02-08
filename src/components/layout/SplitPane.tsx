import { type ReactNode, useCallback, useRef, useState } from "react";

interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  onWidthChange?: (width: number) => void;
}

export default function SplitPane({
  left,
  right,
  defaultWidth = 280,
  minWidth = 180,
  maxWidth = 600,
  onWidthChange,
}: SplitPaneProps) {
  const [width, setWidth] = useState(defaultWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = ev.clientX - startX.current;
        const next = Math.min(maxWidth, Math.max(minWidth, startWidth.current + delta));
        setWidth(next);
      };

      const onMouseUp = () => {
        dragging.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        const delta = 0;
        const finalWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current + delta));
        onWidthChange?.(finalWidth);
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [width, minWidth, maxWidth, onWidthChange],
  );

  return (
    <div className="flex h-full overflow-hidden">
      <div className="h-full overflow-y-auto" style={{ width }}>
        {left}
      </div>
      <div
        className="h-full w-1 shrink-0 cursor-col-resize bg-gray-200 hover:bg-blue-400 dark:bg-gray-700 dark:hover:bg-blue-500"
        onMouseDown={onMouseDown}
      />
      <div className="h-full flex-1 overflow-y-auto">
        {right}
      </div>
    </div>
  );
}
