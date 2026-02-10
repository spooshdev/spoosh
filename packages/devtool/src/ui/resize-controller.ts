import type { ViewModel } from "./view-model";

export interface ResizeController {
  setupSidebarResize(handle: HTMLElement): void;
  setupDividerResize(handle: HTMLElement): void;
  setupHorizontalResize(handle: HTMLElement, listContent: HTMLElement): void;
  cleanup(): void;
  updateSidebarDOM(sidebar: HTMLElement): void;
  updateDividerDOM(listPanel: HTMLElement): void;
  updateHorizontalDOM(
    requestsSection: HTMLElement,
    eventsSection: HTMLElement
  ): void;
}

export function createResizeController(viewModel: ViewModel): ResizeController {
  let isResizingSidebar = false;
  let isResizingDivider = false;
  let isResizingHorizontal = false;
  let currentSidebar: HTMLElement | null = null;
  let currentListContent: HTMLElement | null = null;

  function handleMouseMove(e: MouseEvent): void {
    const state = viewModel.getState();

    if (isResizingSidebar && currentSidebar) {
      if (currentSidebar.classList.contains("bottom")) {
        const newHeight = window.innerHeight - e.clientY;
        const minHeight = 200;
        const maxHeight = Math.min(
          window.innerHeight - 40,
          window.innerHeight * 0.9
        );
        const clampedHeight = Math.min(
          Math.max(newHeight, minHeight),
          maxHeight
        );

        viewModel.setSidebarHeight(clampedHeight);
        currentSidebar.style.height = `${clampedHeight}px`;
      } else {
        const isLeft = currentSidebar.classList.contains("left");
        const newWidth = isLeft ? e.clientX : window.innerWidth - e.clientX;
        const minWidth = 400;
        const maxWidth = Math.min(
          window.innerWidth - 40,
          window.innerWidth * 0.9
        );
        const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);

        viewModel.setSidebarWidth(clampedWidth);
        currentSidebar.style.width = `${clampedWidth}px`;
      }
    }

    if (isResizingDivider && currentSidebar) {
      const sidebarRect = currentSidebar.getBoundingClientRect();
      const newListWidth = e.clientX - sidebarRect.left;
      const minWidth = 200;
      const maxWidth = state.sidebarWidth - 200;
      const clampedWidth = Math.min(Math.max(newListWidth, minWidth), maxWidth);

      viewModel.setListPanelWidth(clampedWidth);

      const listPanel = currentSidebar.querySelector(
        ".spoosh-list-panel"
      ) as HTMLElement;

      if (listPanel) {
        listPanel.style.width = `${clampedWidth}px`;
        listPanel.style.minWidth = `${clampedWidth}px`;
      }
    }

    if (isResizingHorizontal && currentListContent) {
      const rect = currentListContent.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const ratio = relativeY / rect.height;
      const minRatio = 0.2;
      const maxRatio = 0.8;
      const clampedRatio = Math.min(Math.max(ratio, minRatio), maxRatio);

      viewModel.setRequestsPanelHeight(clampedRatio);

      const requestsSection = currentListContent.querySelector(
        ".spoosh-requests-section"
      ) as HTMLElement;
      const eventsSection = currentListContent.querySelector(
        ".spoosh-events-section"
      ) as HTMLElement;

      if (requestsSection && eventsSection) {
        requestsSection.style.flex = String(clampedRatio);
        eventsSection.style.flex = String(1 - clampedRatio);
      }
    }
  }

  function handleMouseUp(): void {
    isResizingSidebar = false;
    isResizingDivider = false;
    isResizingHorizontal = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }

  function startResize(cursor: string): void {
    document.body.style.cursor = cursor;
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  function setupSidebarResize(handle: HTMLElement): void {
    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      isResizingSidebar = true;
      currentSidebar = handle.closest("#spoosh-devtool-sidebar") as HTMLElement;
      const isBottom = currentSidebar?.classList.contains("bottom");
      startResize(isBottom ? "ns-resize" : "ew-resize");
    });
  }

  function setupDividerResize(handle: HTMLElement): void {
    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      isResizingDivider = true;
      currentSidebar = handle.closest("#spoosh-devtool-sidebar") as HTMLElement;
      startResize("col-resize");
    });
  }

  function setupHorizontalResize(
    handle: HTMLElement,
    listContent: HTMLElement
  ): void {
    currentListContent = listContent;

    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      isResizingHorizontal = true;
      startResize("row-resize");
    });
  }

  function cleanup(): void {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    currentSidebar = null;
    currentListContent = null;
  }

  function updateSidebarDOM(sidebar: HTMLElement): void {
    const state = viewModel.getState();

    if (state.sidebarPosition === "bottom") {
      const maxHeight = Math.min(state.sidebarHeight, window.innerHeight - 40);
      sidebar.style.height = `${maxHeight}px`;
      sidebar.style.width = "";
    } else {
      const maxWidth = Math.min(state.sidebarWidth, window.innerWidth - 40);
      sidebar.style.width = `${maxWidth}px`;
      sidebar.style.height = "";
    }
  }

  function updateDividerDOM(listPanel: HTMLElement): void {
    const state = viewModel.getState();
    listPanel.style.width = `${state.listPanelWidth}px`;
    listPanel.style.minWidth = `${state.listPanelWidth}px`;
  }

  function updateHorizontalDOM(
    requestsSection: HTMLElement,
    eventsSection: HTMLElement
  ): void {
    const state = viewModel.getState();
    requestsSection.style.flex = String(state.requestsPanelHeight);
    eventsSection.style.flex = String(1 - state.requestsPanelHeight);
  }

  return {
    setupSidebarResize,
    setupDividerResize,
    setupHorizontalResize,
    cleanup,
    updateSidebarDOM,
    updateDividerDOM,
    updateHorizontalDOM,
  };
}
