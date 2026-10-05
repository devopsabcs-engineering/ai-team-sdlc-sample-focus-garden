import { afterEach, describe, expect, it, vi } from "vitest";

import { browserDataExporter, localDateStamp } from "../src/app/data-effects";
import { serializeExport } from "../src/data/data-transfer";
import { VALID_STATE_V1 } from "./fixtures/schema-v1";

describe("browser data export", () => {
  Object.defineProperties(URL, {
    createObjectURL: {
      configurable: true,
      value: () => "",
    },
    revokeObjectURL: {
      configurable: true,
      value: () => undefined,
    },
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("downloads the full JSON through a temporary revoked Blob URL", () => {
    const create = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:focus-garden");
    const revoke = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    let blob: Blob | undefined;
    create.mockImplementation((value) => {
      if (value instanceof Blob) blob = value;
      return "blob:focus-garden";
    });

    expect(browserDataExporter.download(VALID_STATE_V1, "2026-10-05")).toBe(
      true,
    );
    expect(click).toHaveBeenCalledOnce();
    expect(
      document.querySelector('a[download="focus-garden-2026-10-05.json"]'),
    ).toBeNull();
    expect(revoke).toHaveBeenCalledWith("blob:focus-garden");
    expect(blob?.type).toBe("application/json;charset=utf-8");
    expect(blob?.size).toBe(
      new TextEncoder().encode(serializeExport(VALID_STATE_V1)).byteLength,
    );
  });

  it("surfaces a failed download and still revokes its URL", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:failed");
    const revoke = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      throw new DOMException("blocked");
    });

    expect(browserDataExporter.download(VALID_STATE_V1, "2026-10-05")).toBe(
      false,
    );
    expect(revoke).toHaveBeenCalledWith("blob:failed");
  });

  it("formats filenames from the local calendar date", () => {
    expect(localDateStamp(new Date(2026, 0, 2, 23, 59))).toBe("2026-01-02");
  });
});
