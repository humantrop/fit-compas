"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Countdown that is honest about how much time actually passed.
 *
 * It stores the moment it ends and compares against the clock, rather than
 * subtracting one second per tick. Browsers throttle timers in a backgrounded
 * tab to once a minute, and phones suspend them entirely on screen lock — a
 * decrementing counter comes back from a locked screen believing four seconds
 * of a ninety second rest have gone by. This one comes back correct.
 *
 * Remounted per step (the components are keyed by step key), so there is no
 * reset path to get wrong.
 */
export function useCountdown(
  durationSec: number,
  autoStart: boolean,
  onComplete: () => void,
) {
  const [remaining, setRemaining] = useState(durationSec);
  const [running, setRunning] = useState(autoStart);

  const endsAtRef = useRef<number | null>(
    autoStart ? Date.now() + durationSec * 1000 : null,
  );
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    if (!running) return;

    if (endsAtRef.current === null) {
      endsAtRef.current = Date.now() + remaining * 1000;
    }

    // 200ms: the ring animates smoothly and the number never sticks on a
    // value for longer than it should. Cheap enough at this granularity.
    const id = window.setInterval(() => {
      const left = (endsAtRef.current! - Date.now()) / 1000;

      if (left <= 0) {
        window.clearInterval(id);
        setRemaining(0);
        setRunning(false);
        endsAtRef.current = null;
        completeRef.current();
      } else {
        setRemaining(left);
      }
    }, 200);

    return () => window.clearInterval(id);
    // `remaining` is read once on resume and then owned by the interval —
    // listing it here would restart the interval on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const pause = useCallback(() => {
    if (endsAtRef.current !== null) {
      setRemaining(Math.max(0, (endsAtRef.current - Date.now()) / 1000));
    }
    endsAtRef.current = null;
    setRunning(false);
  }, []);

  const start = useCallback(() => {
    setRunning((was) => {
      if (was) return was;
      endsAtRef.current = Date.now() + remaining * 1000;
      return true;
    });
  }, [remaining]);

  const extend = useCallback((seconds: number) => {
    if (endsAtRef.current !== null) {
      endsAtRef.current += seconds * 1000;
      setRemaining(Math.max(0, (endsAtRef.current - Date.now()) / 1000));
    } else {
      setRemaining((value) => value + seconds);
    }
  }, []);

  return { remaining, running, pause, start, extend };
}

/** Seconds since the session opened. Same clock-based reasoning as above. */
export function useElapsed(startedAtMs: number | null): number {
  const [elapsed, setElapsed] = useState(() =>
    startedAtMs === null ? 0 : Math.max(0, (Date.now() - startedAtMs) / 1000),
  );

  useEffect(() => {
    if (startedAtMs === null) return;

    const tick = () =>
      setElapsed(Math.max(0, (Date.now() - startedAtMs) / 1000));

    tick();
    const id = window.setInterval(tick, 1000);
    // A tab that was in the background comes back with a stale number until
    // the next tick; this makes it correct on the frame it becomes visible.
    document.addEventListener("visibilitychange", tick);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [startedAtMs]);

  return elapsed;
}

/**
 * Keeps the screen on while a workout is running.
 *
 * Not supported everywhere and not permitted in every context, so every call
 * is guarded and a failure is silent — a screen that dims is a nuisance, an
 * exception thrown mid-set is a bug. The Capacitor build gets the native
 * equivalent in feature 19; this covers the browser.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined") return;
    if (!("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          await lock.release();
          return;
        }
        sentinel = lock;
      } catch {
        // Denied, or the tab is not visible. Nothing to do about either.
      }
    };

    // The lock is dropped whenever the tab is hidden and is not restored on
    // its own — without this, one glance at a notification ends it.
    const onVisible = () => {
      if (document.visibilityState === "visible" && sentinel === null) {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [active]);
}
