import { serializeExport } from "../data/data-transfer";
import type { FocusGardenStateV1 } from "../domain/types";

export interface DataExporter {
  download(state: FocusGardenStateV1, localDate: string): boolean;
}

export const browserDataExporter: DataExporter = {
  download(state, localDate): boolean {
    let url: string | null = null;
    try {
      const blob = new Blob([serializeExport(state)], {
        type: "application/json;charset=utf-8",
      });
      url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `focus-garden-${localDate}.json`;
      link.hidden = true;
      document.body.append(link);
      try {
        link.click();
      } finally {
        link.remove();
      }
      return true;
    } catch {
      return false;
    } finally {
      if (url !== null) URL.revokeObjectURL(url);
    }
  },
};

export function localDateStamp(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
