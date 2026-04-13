import { useState, useEffect, useRef, useMemo, useCallback, type RefObject } from 'react';
import { useCanvasStore } from '@/lib/store';

export interface ViewportStyles {
  width: number;
  height: number;
  left: number;
  top: number;
}

/**
 * Hook for managing Canvas viewport size and position
 * Handles viewport scaling, positioning, and Canvas dragging
 */
export function useViewportSize(canvasRef: RefObject<HTMLElement | null>) {
  const [viewportLeft, setViewportLeft] = useState(0);
  const [viewportTop, setViewportTop] = useState(0);

  const canvasPercentage = useCanvasStore.use.canvasPercentage();
  const canvasDragged = useCanvasStore.use.canvasDragged();
  const setCanvasScale = useCanvasStore.use.setCanvasScale();
  const setCanvasDragged = useCanvasStore.use.setCanvasDragged();

  const setViewportRatio = useCanvasStore.use.setViewportRatio();
  const setViewportSize = useCanvasStore.use.setViewportSize();
  const viewportRatio = useCanvasStore.use.viewportRatio();
  const viewportSize = useCanvasStore.use.viewportSize();

  // Initialize viewport position with adaptive logic
  const initViewportPosition = useCallback(() => {
    if (!canvasRef.current) return;
    const canvasWidth = canvasRef.current.clientWidth;
    const canvasHeight = canvasRef.current.clientHeight;
    
    // Determine the "True" aspect ratio of the PHYSICAL container
    const physicalRatio = canvasHeight / canvasWidth;

    // Decide which layout mode to use based on the current screen
    const targetRatio = physicalRatio > 1.2 ? 16 / 9 : 9 / 16; // Note: In this project, ratio is H/W
    const targetWidth = targetRatio > 1 ? 562.5 : 1000;
    
    // Update store so elements know to switch their layout
    setViewportRatio(targetRatio);
    setViewportSize(targetWidth);

    if (physicalRatio > targetRatio) {
      const viewportActualWidth = canvasWidth * (canvasPercentage / 100);
      setCanvasScale(viewportActualWidth / targetWidth);
      setViewportLeft((canvasWidth - viewportActualWidth) / 2);
      setViewportTop((canvasHeight - viewportActualWidth * targetRatio) / 2);
    } else {
      const viewportActualHeight = canvasHeight * (canvasPercentage / 100);
      setCanvasScale(viewportActualHeight / (targetWidth * targetRatio));
      setViewportLeft((canvasWidth - viewportActualHeight / targetRatio) / 2);
      setViewportTop((canvasHeight - viewportActualHeight) / 2);
    }
  }, [canvasRef, canvasPercentage, setViewportRatio, setViewportSize, setCanvasScale]);

  // Update viewport position
  const setViewportPosition = useCallback(
    (newValue: number, oldValue: number) => {
      if (!canvasRef.current) return;
      const canvasWidth = canvasRef.current.clientWidth;
      const canvasHeight = canvasRef.current.clientHeight;
      
      const physicalRatio = canvasHeight / canvasWidth;
      const targetRatio = physicalRatio > 1.2 ? 16 / 9 : 9 / 16;
      const targetWidth = targetRatio > 1 ? 562.5 : 1000;

      if (physicalRatio > targetRatio) {
        const newViewportActualWidth = canvasWidth * (newValue / 100);
        const oldViewportActualWidth = canvasWidth * (oldValue / 100);
        const newViewportActualHeight = newViewportActualWidth * targetRatio;
        const oldViewportActualHeight = oldViewportActualWidth * targetRatio;

        setCanvasScale(newViewportActualWidth / targetWidth);

        setViewportLeft((prev) => prev - (newViewportActualWidth - oldViewportActualWidth) / 2);
        setViewportTop((prev) => prev - (newViewportActualHeight - oldViewportActualHeight) / 2);
      } else {
        const newViewportActualHeight = canvasHeight * (newValue / 100);
        const oldViewportActualHeight = canvasHeight * (oldValue / 100);
        const newViewportActualWidth = newViewportActualHeight / targetRatio;
        const oldViewportActualWidth = oldViewportActualHeight / targetRatio;

        setCanvasScale(newViewportActualHeight / (targetWidth * targetRatio));

        setViewportLeft((prev) => prev - (newViewportActualWidth - oldViewportActualWidth) / 2);
        setViewportTop((prev) => prev - (newViewportActualHeight - oldViewportActualHeight) / 2);
      }
    },
    [canvasRef, setCanvasScale],
  );

  // Track previous Canvas percentage for detecting changes
  const prevCanvasPercentageRef = useRef(canvasPercentage);

  // Update viewport position when canvas percentage changes
  useEffect(() => {
    if (prevCanvasPercentageRef.current !== canvasPercentage) {
      setViewportPosition(canvasPercentage, prevCanvasPercentageRef.current);
      prevCanvasPercentageRef.current = canvasPercentage;
    }
  }, [canvasPercentage, setViewportPosition]);

  // Reset viewport position when viewport ratio or size changes
  useEffect(() => {
    initViewportPosition();
  }, [viewportRatio, viewportSize, initViewportPosition]);

  // Reset viewport position when drag state is restored
  useEffect(() => {
    if (!canvasDragged) {
      initViewportPosition();
    }
  }, [canvasDragged, initViewportPosition]);

  // Reset viewport position when canvas is resized
  useEffect(() => {
    const el = canvasRef.current;
    const resizeObserver = new ResizeObserver(initViewportPosition);
    if (el) {
      resizeObserver.observe(el);
    }
    return () => {
      if (el) {
        resizeObserver.unobserve(el);
      }
    };
  }, [canvasRef, initViewportPosition]);

  // Drag canvas viewport
  const dragViewport = useCallback(
    (e: React.MouseEvent) => {
      let isMouseDown = true;

      const startPageX = e.pageX;
      const startPageY = e.pageY;

      const originLeft = viewportLeft;
      const originTop = viewportTop;

      const handleMouseMove = (e: MouseEvent) => {
        if (!isMouseDown) return;

        const currentPageX = e.pageX;
        const currentPageY = e.pageY;

        setViewportLeft(originLeft + (currentPageX - startPageX));
        setViewportTop(originTop + (currentPageY - startPageY));
      };

      const handleMouseUp = () => {
        isMouseDown = false;
        document.onmousemove = null;
        document.onmouseup = null;

        setCanvasDragged(true);
      };

      document.onmousemove = handleMouseMove;
      document.onmouseup = handleMouseUp;
    },
    [viewportLeft, viewportTop, setCanvasDragged],
  );

  // Viewport position and size styles
  const viewportStyles: ViewportStyles = useMemo(
    () => ({
      width: viewportSize,
      height: viewportSize * viewportRatio,
      left: viewportLeft,
      top: viewportTop,
    }),
    [viewportSize, viewportRatio, viewportLeft, viewportTop],
  );

  return {
    viewportStyles,
    dragViewport,
  };
}
