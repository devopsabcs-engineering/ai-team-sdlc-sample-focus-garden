import type { Clock, IdSource } from "../domain/timer";

export const systemClock: Clock = {
  now: () => Date.now(),
};

export const cryptoIdSource: IdSource = {
  next: () => crypto.randomUUID(),
};
