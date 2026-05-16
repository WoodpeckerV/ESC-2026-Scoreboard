import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { countries, countryById, Country } from "./data/countries";
import scorecardBackground from "../to_use/UnitedByMusic_clear.webp";
import escLogo from "../to_use/ESC_Logo_70.png";

const ARTBOARD_WIDTH = 3318;
const ARTBOARD_HEIGHT = 2344;
const STORAGE_KEY = "esc-2026-ranking-v1";
const SLOT_COUNT = 25;

type Ranking = Array<string | null>;
type RegisterRankingItem = (countryId: string, node: HTMLDivElement | null) => void;

type DragPayload =
  | { origin: "running"; countryId: string }
  | { origin: "ranking"; countryId: string; slotIndex: number };

const emptyRanking = (): Ranking => Array.from({ length: SLOT_COUNT }, () => null);

const runningRows = [
  ...countries.slice(0, 13).map((country, index) => ({
    country,
    left: 158,
    top: [562, 686, 810, 935, 1059, 1183, 1307, 1432, 1556, 1680, 1805, 1929, 2053][index],
  })),
  ...countries.slice(13).map((country, index) => ({
    country,
    left: 910,
    top: [559, 686, 810, 935, 1059, 1183, 1307, 1432, 1556, 1680, 1805, 1929][index],
  })),
];

const rankingRows = [
  ...Array.from({ length: 13 }, (_, index) => ({
    position: index + 1,
    slotIndex: index,
    left: 1817,
    top: [468, 592, 715, 839, 962, 1086, 1209, 1333, 1456, 1580, 1703, 1827, 1950][index],
  })),
  ...Array.from({ length: 12 }, (_, index) => ({
    position: index + 14,
    slotIndex: index + 13,
    left: 2569,
    top: [466, 592, 715, 839, 962, 1086, 1209, 1333, 1456, 1580, 1703, 1827][index],
  })),
];

function readStoredRanking(): Ranking {
  const fallback = emptyRanking();

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return fallback;
    }

    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      return fallback;
    }

    const seen = new Set<string>();
    return fallback.map((_, index) => {
      const value = parsed[index];
      if (typeof value !== "string" || !countryById.has(value) || seen.has(value)) {
        return null;
      }
      seen.add(value);
      return value;
    });
  } catch {
    return fallback;
  }
}

function useViewportMetrics() {
  const [metrics, setMetrics] = useState({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  useEffect(() => {
    const updateMetrics = () => {
      const scale = Math.min(window.innerWidth / ARTBOARD_WIDTH, window.innerHeight / ARTBOARD_HEIGHT);
      setMetrics({
        scale,
        offsetX: (window.innerWidth - ARTBOARD_WIDTH * scale) / 2,
        offsetY: (window.innerHeight - ARTBOARD_HEIGHT * scale) / 2,
      });
    };

    updateMetrics();
    window.addEventListener("resize", updateMetrics);
    return () => window.removeEventListener("resize", updateMetrics);
  }, []);

  return metrics;
}

function twoDigit(value: number) {
  return String(value).padStart(2, "0");
}

function findNearestEmptySlot(ranking: Ranking, targetSlot: number) {
  let closestSlot = -1;
  let closestDistance = Number.POSITIVE_INFINITY;

  ranking.forEach((countryId, index) => {
    if (countryId !== null) {
      return;
    }

    const distance = Math.abs(index - targetSlot);
    const shouldPreferAfterTarget = distance === closestDistance && index > targetSlot && closestSlot < targetSlot;
    if (distance < closestDistance || shouldPreferAfterTarget) {
      closestSlot = index;
      closestDistance = distance;
    }
  });

  return closestSlot;
}

function insertCountryAtSlot(current: Ranking, countryId: string, targetSlot: number) {
  const next = [...current];

  next.forEach((value, index) => {
    if (value === countryId) {
      next[index] = null;
    }
  });

  if (next[targetSlot] === null) {
    next[targetSlot] = countryId;
    return next;
  }

  const emptySlot = findNearestEmptySlot(next, targetSlot);
  if (emptySlot === -1) {
    next[targetSlot] = countryId;
    return next;
  }

  if (emptySlot > targetSlot) {
    for (let index = emptySlot; index > targetSlot; index -= 1) {
      next[index] = next[index - 1];
    }
  } else {
    for (let index = emptySlot; index < targetSlot; index += 1) {
      next[index] = next[index + 1];
    }
  }

  next[targetSlot] = countryId;
  return next;
}

function CountryTile({
  country,
  mode,
  placed = false,
  shimmering = false,
}: {
  country: Country;
  mode: "running" | "ranking";
  placed?: boolean;
  shimmering?: boolean;
}) {
  return (
    <div
      className={[
        "country-tile",
        `country-tile--${mode}`,
        placed ? "is-placed" : "",
        shimmering ? "is-shimmering" : "",
      ].join(" ")}
    >
      {mode !== "ranking" ? (
        <div className="country-tile__order">{twoDigit(country.order)}</div>
      ) : null}
      <img className="country-tile__flag" src={country.flag} alt="" draggable={false} />
      <div className="country-tile__name">{country.name}</div>
      {placed && mode === "running" ? <div className="country-tile__placed">Ranked</div> : null}
    </div>
  );
}

function RunningCountry({ country, placed, scale }: { country: Country; placed: boolean; scale: number }) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: `running-${country.id}`,
    disabled: placed,
    data: { origin: "running", countryId: country.id } satisfies DragPayload,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x / scale}px, ${transform.y / scale}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      className={["draggable-shell", isDragging ? "is-dragging" : ""].join(" ")}
      style={style}
      {...attributes}
      {...listeners}
      aria-disabled={placed}
    >
      <CountryTile country={country} mode="running" placed={placed} />
    </div>
  );
}

function RankedCountry({
  country,
  slotIndex,
  onRemove,
  scale,
  registerRankingItem,
  shimmering,
}: {
  country: Country;
  slotIndex: number;
  onRemove: (slotIndex: number) => void;
  scale: number;
  registerRankingItem: RegisterRankingItem;
  shimmering: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: `ranking-${slotIndex}-${country.id}`,
    data: { origin: "ranking", countryId: country.id, slotIndex } satisfies DragPayload,
  });

  const setCombinedRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      registerRankingItem(country.id, node);
    },
    [country.id, registerRankingItem, setNodeRef],
  );

  const style = transform
    ? {
        transform: `translate3d(${transform.x / scale}px, ${transform.y / scale}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setCombinedRef}
      data-country-id={country.id}
      className={["ranked-country-shell", isDragging ? "is-dragging" : ""].join(" ")}
      style={style}
      {...attributes}
      {...listeners}
    >
      <CountryTile country={country} mode="ranking" shimmering={shimmering} />
      <button
        className="remove-country"
        type="button"
        aria-label={`Remove ${country.name}`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => onRemove(slotIndex)}
      >
        Remove
      </button>
    </div>
  );
}

function RankingSlot({
  position,
  slotIndex,
  left,
  top,
  countryId,
  onRemove,
  scale,
  registerRankingItem,
  shimmeringCountryId,
}: {
  position: number;
  slotIndex: number;
  left: number;
  top: number;
  countryId: string | null;
  onRemove: (slotIndex: number) => void;
  scale: number;
  registerRankingItem: RegisterRankingItem;
  shimmeringCountryId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${slotIndex}`,
    data: { type: "slot", slotIndex },
  });
  const country = countryId ? countryById.get(countryId) : null;

  return (
    <div
      ref={setNodeRef}
      className={["ranking-slot", isOver ? "is-over" : ""].join(" ")}
      style={{ left, top }}
    >
      <div className="ranking-slot__number">{twoDigit(position)}</div>
      <div className="ranking-slot__body">
        {country ? (
          <RankedCountry
            country={country}
            slotIndex={slotIndex}
            onRemove={onRemove}
            scale={scale}
            registerRankingItem={registerRankingItem}
            shimmering={shimmeringCountryId === country.id}
          />
        ) : null}
      </div>
    </div>
  );
}

function RunningOrder({
  ranking,
  scale,
}: {
  ranking: Ranking;
  scale: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "running-order",
    data: { type: "running-order" },
  });
  const rankedIds = useMemo(() => new Set(ranking.filter(Boolean)), [ranking]);

  return (
    <section ref={setNodeRef} className={["running-order-zone", isOver ? "is-over" : ""].join(" ")}>
      <h2 className="running-order-heading">Running Order</h2>
      {runningRows.map(({ country, left, top }) => (
        <div className="running-row-position" style={{ left, top }} key={country.id}>
          <RunningCountry country={country} placed={rankedIds.has(country.id)} scale={scale} />
        </div>
      ))}
    </section>
  );
}

function Scorecard({
  ranking,
  onRemove,
  metrics,
  artboardRef,
  registerRankingItem,
  shimmeringCountryId,
}: {
  ranking: Ranking;
  onRemove: (slotIndex: number) => void;
  metrics: { scale: number; offsetX: number; offsetY: number };
  artboardRef: React.RefObject<HTMLDivElement | null>;
  registerRankingItem: RegisterRankingItem;
  shimmeringCountryId: string | null;
}) {
  return (
    <div className="scorecard-viewport">
      <main
        id="scorecard-artboard"
        className="scorecard-artboard"
        ref={artboardRef}
        style={{
          transform: `translate3d(${metrics.offsetX}px, ${metrics.offsetY}px, 0) scale(${metrics.scale})`,
        } as React.CSSProperties}
      >
        <div className="eurovision-logo" aria-label="Eurovision Song Contest Vienna 2026">
          <img src={escLogo} alt="" draggable={false} />
        </div>

        <header className="scorecard-header">
          <h1 className="grand-final">Grand Final</h1>
          <p className="scorecard-label">SCORECARD</p>
        </header>

        <RunningOrder ranking={ranking} scale={metrics.scale} />

        <section className="ranking-zone">
          <h2 className="ranking-heading">Ranking</h2>
          {rankingRows.map(({ position, slotIndex, left, top }) => (
            <RankingSlot
              key={slotIndex}
              position={position}
              slotIndex={slotIndex}
              left={left}
              top={top}
              countryId={ranking[slotIndex]}
              onRemove={onRemove}
              scale={metrics.scale}
              registerRankingItem={registerRankingItem}
              shimmeringCountryId={shimmeringCountryId}
            />
          ))}
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const metrics = useViewportMetrics();
  const artboardRef = useRef<HTMLDivElement>(null);
  const rankingItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const previousRankingRects = useRef<Map<string, DOMRect>>(new Map());
  const shimmerTimerRef = useRef<number | null>(null);
  const shimmerFrameRef = useRef<number | null>(null);
  const [ranking, setRanking] = useState<Ranking>(() => readStoredRanking());
  const [shimmeringCountryId, setShimmeringCountryId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ranking));
  }, [ranking]);

  useEffect(() => {
    return () => {
      if (shimmerTimerRef.current !== null) {
        window.clearTimeout(shimmerTimerRef.current);
      }
      if (shimmerFrameRef.current !== null) {
        window.cancelAnimationFrame(shimmerFrameRef.current);
      }
    };
  }, []);

  const registerRankingItem = useCallback<RegisterRankingItem>((countryId, node) => {
    if (node) {
      rankingItemRefs.current.set(countryId, node);
      return;
    }

    rankingItemRefs.current.delete(countryId);
  }, []);

  const captureRankingRects = useCallback(() => {
    const nextRects = new Map<string, DOMRect>();
    rankingItemRefs.current.forEach((node, countryId) => {
      nextRects.set(countryId, node.getBoundingClientRect());
    });
    previousRankingRects.current = nextRects;
  }, []);

  const triggerPlacementShimmer = useCallback((countryId: string) => {
    if (shimmerTimerRef.current !== null) {
      window.clearTimeout(shimmerTimerRef.current);
    }
    if (shimmerFrameRef.current !== null) {
      window.cancelAnimationFrame(shimmerFrameRef.current);
    }

    setShimmeringCountryId(null);
    shimmerFrameRef.current = window.requestAnimationFrame(() => {
      setShimmeringCountryId(countryId);
      shimmerTimerRef.current = window.setTimeout(() => {
        setShimmeringCountryId(null);
        shimmerTimerRef.current = null;
      }, 1300);
      shimmerFrameRef.current = null;
    });
  }, []);

  useLayoutEffect(() => {
    const previousRects = previousRankingRects.current;
    if (previousRects.size === 0) {
      return;
    }

    rankingItemRefs.current.forEach((node, countryId) => {
      const previousRect = previousRects.get(countryId);

      if (!previousRect) {
        node.animate(
          [
            { opacity: 0, transform: "scale(0.96)" },
            { opacity: 1, transform: "scale(1)" },
          ],
          {
            duration: 220,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          },
        );
        return;
      }

      const currentRect = node.getBoundingClientRect();
      const deltaX = (previousRect.left - currentRect.left) / metrics.scale;
      const deltaY = (previousRect.top - currentRect.top) / metrics.scale;

      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) {
        return;
      }

      node.animate(
        [
          { transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.995)` },
          { transform: "translate3d(0, 0, 0) scale(1)" },
        ],
        {
          duration: 360,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        },
      );
    });

    previousRankingRects.current = new Map();
  }, [metrics.scale, ranking]);

  const removeFromRanking = useCallback(
    (slotIndex: number) => {
      captureRankingRects();
      setRanking((current) => current.map((countryId, index) => (index === slotIndex ? null : countryId)));
    },
    [captureRankingRects],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DragPayload | undefined;
    document.body.dataset.draggingCountry = data?.countryId ?? "";
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeData = event.active.data.current as DragPayload | undefined;
    const overData = event.over?.data.current as { type?: string; slotIndex?: number } | undefined;
    delete document.body.dataset.draggingCountry;

    if (!activeData || !event.over) {
      return;
    }

    if (overData?.type === "running-order") {
      if (activeData.origin === "ranking") {
        removeFromRanking(activeData.slotIndex);
      }
      return;
    }

    if (overData?.type !== "slot" || typeof overData.slotIndex !== "number") {
      return;
    }

    const targetSlot = overData.slotIndex;
    if (activeData.origin === "ranking" && activeData.slotIndex === targetSlot) {
      return;
    }

    captureRankingRects();
    setRanking((current) => insertCountryAtSlot(current, activeData.countryId, targetSlot));
    triggerPlacementShimmer(activeData.countryId);
  };

  const handleDragCancel = () => {
    delete document.body.dataset.draggingCountry;
  };

  const resetRanking = () => {
    setRanking(emptyRanking());
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      autoScroll={false}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        className="app-shell"
        style={{ "--app-bg": `url(${scorecardBackground})` } as React.CSSProperties}
      >
        <div className="toolbar" aria-label="Scorecard controls">
          <button className="control-button" type="button" onClick={resetRanking}>
            Reset ranking
          </button>
        </div>
        <Scorecard
          ranking={ranking}
          onRemove={removeFromRanking}
          metrics={metrics}
          artboardRef={artboardRef}
          registerRankingItem={registerRankingItem}
          shimmeringCountryId={shimmeringCountryId}
        />
      </div>
    </DndContext>
  );
}
