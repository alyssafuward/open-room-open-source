"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from "react";

type Transform = { x: number; y: number; scale: number };

const MIN_SCALE = 0.35;
const MAX_SCALE = 2.5;
const DRAG_THRESHOLD_PX = 6;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export default function FloorPlanCanvas({ children }: { children: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [t, setT] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const tRef = useRef(t);
  tRef.current = t;

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchState = useRef<{ dist: number; scale: number; midX: number; midY: number } | null>(null);
  const panState = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);
  const didPanRef = useRef(false);
  const hasInteracted = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  // Initial placement: keep cards readable (never scale below 0.7) and center.
  // If the plan is bigger than the viewport at readable size, the user pans to explore.
  const fitToView = useCallback(() => {
    const vp = viewportRef.current;
    const el = contentRef.current;
    if (!vp || !el) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const cw = el.offsetWidth;
    const ch = el.offsetHeight;
    if (cw === 0 || ch === 0) return;
    const margin = 0.95;
    const fit = Math.min((vw * margin) / cw, (vh * margin) / ch, 1);
    const s = clamp(Math.max(fit, 0.7), MIN_SCALE, MAX_SCALE);
    setT({ x: (vw - cw * s) / 2, y: (vh - ch * s) / 2, scale: s });
  }, []);

  // Auto-fit while the user hasn't interacted yet — re-runs as content (and viewport) resize.
  useLayoutEffect(() => {
    const vp = viewportRef.current;
    const el = contentRef.current;
    if (!vp || !el) return;
    fitToView();
    const ro = new ResizeObserver(() => {
      if (!hasInteracted.current) fitToView();
    });
    ro.observe(el);
    ro.observe(vp);
    return () => ro.disconnect();
  }, [fitToView]);

  const applyZoomAtPoint = useCallback((nextScale: number, clientX: number, clientY: number) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const cur = tRef.current;
    const clamped = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    // Keep point under cursor fixed: newT = p - (p - oldT) * (newScale / oldScale)
    const ratio = clamped / cur.scale;
    const x = px - (px - cur.x) * ratio;
    const y = py - (py - cur.y) * ratio;
    setT({ x, y, scale: clamped });
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1) {
      didPanRef.current = false;
      panState.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: tRef.current.x,
        origY: tRef.current.y,
        moved: false,
      };
    } else if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      pinchState.current = {
        dist: Math.hypot(dx, dy),
        scale: tRef.current.scale,
        midX: (pts[0].x + pts[1].x) / 2,
        midY: (pts[0].y + pts[1].y) / 2,
      };
      panState.current = null;
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchState.current) {
      const pts = Array.from(pointers.current.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const dist = Math.hypot(dx, dy);
      const nextScale = pinchState.current.scale * (dist / pinchState.current.dist);
      applyZoomAtPoint(nextScale, pinchState.current.midX, pinchState.current.midY);
      didPanRef.current = true;
      return;
    }

    if (pointers.current.size === 1 && panState.current) {
      const dx = e.clientX - panState.current.startX;
      const dy = e.clientY - panState.current.startY;
      if (!panState.current.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        panState.current.moved = true;
        didPanRef.current = true;
      }
      if (panState.current.moved) {
        if (!isDragging) setIsDragging(true);
        setT(prev => ({ ...prev, x: panState.current!.origX + dx, y: panState.current!.origY + dy }));
      }
    }
  };

  const endPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchState.current = null;
    if (pointers.current.size === 0) {
      panState.current = null;
      setIsDragging(false);
    }
  };

  const onWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      // treat horizontal wheel as pan
      setT(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      return;
    }
    // pinch-zoom trackpad gestures come through as wheel + ctrlKey
    const factor = Math.exp(-e.deltaY * 0.0015);
    applyZoomAtPoint(tRef.current.scale * factor, e.clientX, e.clientY);
  };

  // Swallow synthetic clicks that happened during a pan/pinch
  const onClickCapture = (e: React.MouseEvent) => {
    if (didPanRef.current) {
      e.stopPropagation();
      e.preventDefault();
      didPanRef.current = false;
    }
  };

  const zoomBy = (factor: number) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    applyZoomAtPoint(tRef.current.scale * factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const reset = () => fitToView();

  return (
    <div
      ref={viewportRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onPointerLeave={endPointer}
      onWheel={onWheel}
      onClickCapture={onClickCapture}
      className="relative w-full flex-1 overflow-hidden bg-stone-100"
      style={{ touchAction: "none", cursor: isDragging ? "grabbing" : "grab" }}
    >
      <div
        ref={contentRef}
        style={{
          transform: `translate3d(${t.x}px, ${t.y}px, 0) scale(${t.scale})`,
          transformOrigin: "0 0",
          willChange: "transform",
          position: "absolute",
          top: 0,
          left: 0,
          width: "max-content",
          height: "max-content",
        }}
      >
        {children}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1 bg-white/90 backdrop-blur rounded-xl shadow-md border border-slate-200 p-1 z-10">
        <button
          onClick={() => zoomBy(1.2)}
          aria-label="Zoom in"
          className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 font-bold"
        >
          +
        </button>
        <button
          onClick={() => zoomBy(1 / 1.2)}
          aria-label="Zoom out"
          className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 font-bold"
        >
          −
        </button>
        <button
          onClick={reset}
          aria-label="Reset view"
          className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 text-[10px] font-bold"
        >
          ⤢
        </button>
      </div>
    </div>
  );
}
