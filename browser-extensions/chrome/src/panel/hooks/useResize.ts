import { onMount, onCleanup } from "solid-js";

interface UseResizeOptions {
  direction: "horizontal" | "vertical";
  onResize: (delta: number) => void;
  onResizeEnd?: () => void;
}

export function useResize(
  ref: () => HTMLElement | undefined,
  options: UseResizeOptions
) {
  let startPos = 0;
  let isDragging = false;

  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    isDragging = true;
    startPos = options.direction === "horizontal" ? e.clientX : e.clientY;

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor =
      options.direction === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const currentPos =
      options.direction === "horizontal" ? e.clientX : e.clientY;
    const delta = currentPos - startPos;
    startPos = currentPos;
    options.onResize(delta);
  };

  const handleMouseUp = () => {
    isDragging = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    options.onResizeEnd?.();
  };

  onMount(() => {
    const element = ref();

    if (element) {
      element.addEventListener("mousedown", handleMouseDown);
    }
  });

  onCleanup(() => {
    const element = ref();

    if (element) {
      element.removeEventListener("mousedown", handleMouseDown);
    }

    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  });
}
