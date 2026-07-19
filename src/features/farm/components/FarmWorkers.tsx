"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

export type WorkerCfg = {
  dim: number;
  dx: number;
  dy: number;
  ox: number;
  oy: number;
  size: number;
};

type Cell = { col: number; row: number };

type Phase = "walk" | "dwell" | "inside" | "mine";

type WorkerState = {
  col: number;
  row: number;
  tcol: number;
  trow: number;
  facing: number;
  speed: number;
  phase: Phase;
  timer: number;
};

type FarmWorkersProps = {
  cfg: WorkerCfg;
  count: number;
  buildings: Cell[];
  rallyActive: boolean;
};

/** Sprite frame aspect (width / height) of trooper-walk-sheet.png. */
const FRAME_ASPECT = 373 / 555;

/**
 * Roaming trooper units — original pixel-art armoured troopers (VENA white/teal,
 * NOT the trademarked stormtrooper design) rendered from a 4-frame walk-cycle
 * sprite sheet with a true steps(4) animation.
 *
 * Behaviour: each trooper picks a random grid cell and walks there. If that
 * cell holds a building it "enters" (fades + shrinks into the structure),
 * waits inside, then reappears and heads to the next cell. Worker 0 is the
 * gold commander. Purely decorative.
 */
export default function FarmWorkers({ cfg, count, buildings, rallyActive }: FarmWorkersProps) {
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const workers = useRef<WorkerState[]>([]);
  const rallyRef = useRef(rallyActive);
  rallyRef.current = rallyActive;
  const buildingsRef = useRef(buildings);
  buildingsRef.current = buildings;

  useEffect(() => {
    const max = Math.max(0, cfg.dim - 1);
    const cell = () => Math.round(Math.random() * max);
    workers.current = Array.from({ length: count }, () => ({
      col: cell(),
      row: cell(),
      tcol: cell(),
      trow: cell(),
      facing: Math.random() > 0.5 ? 1 : -1,
      speed: 0.7 + Math.random() * 0.4,
      phase: "walk" as Phase,
      timer: Math.random() * 1.4,
    }));
  }, [count, cfg.dim]);

  useEffect(() => {
    const max = Math.max(0, cfg.dim - 1);
    let raf = 0;
    let last = performance.now();

    const isBuilding = (c: number, r: number) =>
      buildingsRef.current.some((b) => b.col === c && b.row === r);

    const pickTarget = (w: WorkerState) => {
      for (let tries = 0; tries < 6; tries++) {
        const tc = Math.round(Math.random() * max);
        const tr = Math.round(Math.random() * max);
        if (tc !== Math.round(w.col) || tr !== Math.round(w.row)) {
          w.tcol = tc;
          w.trow = tr;
          return;
        }
      }
      w.tcol = Math.round(Math.random() * max);
      w.trow = Math.round(Math.random() * max);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const boost = rallyRef.current ? 1.9 : 1;

      workers.current.forEach((w, i) => {
        let walking = false;
        let inside = false;
        let mining = false;

        if (w.phase === "inside") {
          inside = true;
          w.timer -= dt;
          if (w.timer <= 0) {
            pickTarget(w);
            w.phase = "walk";
          }
        } else if (w.phase === "mine") {
          mining = true;
          w.timer -= dt;
          if (w.timer <= 0) {
            pickTarget(w);
            w.phase = "walk";
          }
        } else if (w.phase === "dwell") {
          w.timer -= dt;
          if (w.timer <= 0) {
            pickTarget(w);
            w.phase = "walk";
          }
        } else {
          const dcol = w.tcol - w.col;
          const drow = w.trow - w.row;
          const dist = Math.hypot(dcol, drow);
          if (dist < 0.08) {
            if (isBuilding(w.tcol, w.trow)) {
              w.phase = "inside";
              w.timer = 1.3 + Math.random() * 1.6;
            } else if (Math.random() < 0.62) {
              // Dig at an empty patch of ground
              w.phase = "mine";
              w.timer = 1.5 + Math.random() * 1.6;
            } else {
              w.phase = "dwell";
              w.timer = 0.4 + Math.random() * 1.3;
            }
          } else {
            const step = Math.min(dist, w.speed * boost * 0.85 * dt);
            w.col += (dcol / dist) * step;
            w.row += (drow / dist) * step;
            walking = true;
            const dScreenX = dcol - drow;
            if (Math.abs(dScreenX) > 0.001) w.facing = dScreenX < 0 ? -1 : 1;
          }
        }

        const left = cfg.ox + (w.col - w.row) * cfg.dx;
        const top  = cfg.oy + (w.col + w.row) * cfg.dy;
        // Tiles use z = (col+row)*100 + {40 empty | 50 built}.
        // Workers use z = floor((col+row)*100) + 60  → above own tile (50), below
        // the next-row tile (140) until >81 % of the way there, then in front.
        // "Inside" uses +30 to slip just below the building's 50, hiding the trooper.
        const z = Math.floor((w.col + w.row) * 100) + (inside ? 30 : 60);

        const el = nodeRefs.current[i];
        if (el) {
          el.style.left = `${left}%`;
          el.style.top = `${top}%`;
          el.style.zIndex = String(z);
          el.style.transform = `translate(-50%, -100%) scaleX(${w.facing})`;
          el.style.setProperty("--walk", String(boost));
          el.classList.toggle("farm-worker-walking", walking);
          el.classList.toggle("farm-worker-inside", inside);
          el.classList.toggle("farm-worker-mining", mining);
        }
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cfg]);

  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const isCmd = i === 0;
        const h = Math.round(cfg.size * (isCmd ? 0.92 : 0.8));
        const w = Math.round(h * FRAME_ASPECT);
        const style = {
          height: `${h}px`,
          width: `${w}px`,
          "--fw": `${w}px`,
        } as CSSProperties;
        return (
          <div
            key={i}
            ref={(el) => {
              nodeRefs.current[i] = el;
            }}
            className={`farm-worker ${isCmd ? "farm-worker-cmd" : ""} ${rallyActive ? "farm-worker-rally" : ""}`}
            style={style}
            aria-hidden
          >
            <div className="farm-trooper">
              <div className="farm-trooper-film" />
            </div>
            <div className="farm-trooper-mine">
              <div className="farm-trooper-mine-film" />
            </div>
            <span className="farm-trooper-spark farm-trooper-spark-1" />
            <span className="farm-trooper-spark farm-trooper-spark-2" />
            <span className="farm-trooper-spark farm-trooper-spark-3" />
            <span className="farm-trooper-dust" />
          </div>
        );
      })}
    </>
  );
}
