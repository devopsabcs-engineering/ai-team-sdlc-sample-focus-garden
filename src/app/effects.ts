import { SPECIES_IDS } from "../domain/types";
import type { RandomSource } from "../domain/random";

export interface ExclusiveLock {
  run<T>(callback: () => T): Promise<T>;
}

export interface CompletionAudio {
  play(): Promise<void>;
}

const RANDOM_LIMIT =
  Math.floor(0x1_0000_0000 / SPECIES_IDS.length) * SPECIES_IDS.length;

export const cryptoRandomSource: RandomSource = {
  next(): number {
    const values = new Uint32Array(1);
    let value: number;
    do {
      crypto.getRandomValues(values);
      value = values[0]!;
    } while (value >= RANDOM_LIMIT);
    return value / RANDOM_LIMIT;
  },
};

export const stateLock: ExclusiveLock = {
  run<T>(callback: () => T): Promise<T> {
    if (navigator.locks === undefined) {
      return Promise.resolve().then(callback);
    }
    return navigator.locks.request<T>("focus-garden:state", callback);
  },
};

export const gentleChime: CompletionAudio = {
  async play(): Promise<void> {
    const context = new AudioContext();
    try {
      if (context.state === "suspended") await context.resume();
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime + 0.42,
      );
      gain.connect(context.destination);

      const first = context.createOscillator();
      first.type = "sine";
      first.frequency.value = 523.25;
      first.connect(gain);
      first.start();
      first.stop(context.currentTime + 0.22);

      const second = context.createOscillator();
      second.type = "sine";
      second.frequency.value = 659.25;
      second.connect(gain);
      second.start(context.currentTime + 0.14);
      second.stop(context.currentTime + 0.42);
      await new Promise<void>((resolve) => {
        second.addEventListener("ended", () => resolve(), { once: true });
      });
    } finally {
      await context.close();
    }
  },
};
