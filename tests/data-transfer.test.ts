import { describe, expect, it } from "vitest";

import {
  MAX_IMPORT_BYTES,
  decodeImportFile,
  serializeExport,
  type ImportFile,
} from "../src/data/data-transfer";
import { VALID_STATE_V1 } from "./fixtures/schema-v1";

function fileFromBytes(bytes: Uint8Array, size = bytes.byteLength): ImportFile {
  return {
    size,
    arrayBuffer: () =>
      Promise.resolve(
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer,
      ),
  };
}

function jsonFile(value: unknown, size?: number): ImportFile {
  return fileFromBytes(new TextEncoder().encode(JSON.stringify(value)), size);
}

describe("local data transfer", () => {
  it("round trips every canonical field as indented UTF-8 JSON", async () => {
    const exported = serializeExport(VALID_STATE_V1);
    const result = await decodeImportFile(
      fileFromBytes(new TextEncoder().encode(exported)),
    );

    expect(exported.startsWith('{\n  "schemaVersion": 1,')).toBe(true);
    expect(exported.endsWith("\n")).toBe(true);
    expect(result).toEqual({
      ok: true,
      value: VALID_STATE_V1,
      preview: {
        recordCount: 1,
        earliestCompletedAt: "2026-10-05T12:25:00.000Z",
        latestCompletedAt: "2026-10-05T12:25:00.000Z",
        hasActiveTimer: false,
        selectedPreset: "25-5",
        soundEnabled: true,
        theme: "golden",
      },
    });
  });

  it("accepts the exact byte limit and rejects either reported or actual overflow", async () => {
    await expect(
      decodeImportFile(jsonFile(VALID_STATE_V1, MAX_IMPORT_BYTES)),
    ).resolves.toMatchObject({ ok: true });
    await expect(
      decodeImportFile(jsonFile(VALID_STATE_V1, MAX_IMPORT_BYTES + 1)),
    ).resolves.toEqual({ ok: false, code: "oversize" });
    await expect(
      decodeImportFile(
        fileFromBytes(new Uint8Array(MAX_IMPORT_BYTES + 1), MAX_IMPORT_BYTES),
      ),
    ).resolves.toEqual({ ok: false, code: "oversize" });
  });

  it.each([
    [
      "malformed JSON",
      fileFromBytes(new TextEncoder().encode("{")),
      "malformed",
    ],
    ["invalid UTF-8", fileFromBytes(Uint8Array.from([0xc3, 0x28])), "encoding"],
    [
      "unsupported version",
      jsonFile({ ...VALID_STATE_V1, schemaVersion: 2 }),
      "unsupported-version",
    ],
    [
      "invalid date",
      jsonFile({ ...VALID_STATE_V1, savedAt: "2026-10-05" }),
      "invalid",
    ],
    [
      "duplicate ID",
      jsonFile({
        ...VALID_STATE_V1,
        sessions: [VALID_STATE_V1.sessions[0], VALID_STATE_V1.sessions[0]],
      }),
      "invalid",
    ],
    [
      "invalid invariant",
      jsonFile({
        ...VALID_STATE_V1,
        sessions: [
          {
            ...VALID_STATE_V1.sessions[0],
            completedAt: "2026-10-05T11:00:00.000Z",
          },
        ],
      }),
      "invalid",
    ],
  ])(
    "rejects %s from unknown without canonicalizing it",
    async (_name, file, code) => {
      await expect(decodeImportFile(file)).resolves.toEqual({
        ok: false,
        code,
      });
    },
  );

  it("applies the file bound before an oversized high-record document", async () => {
    const session = VALID_STATE_V1.sessions[0];
    if (session === undefined) throw new Error("Missing session fixture.");
    const sessions = Array.from({ length: 10_001 }, (_, index) => ({
      ...session,
      id: `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`,
    }));

    await expect(
      decodeImportFile(jsonFile({ ...VALID_STATE_V1, sessions })),
    ).resolves.toEqual({ ok: false, code: "oversize" });
  });

  it("maps file read rejection without throwing", async () => {
    await expect(
      decodeImportFile({
        size: 10,
        arrayBuffer: () => Promise.reject(new DOMException("gone")),
      }),
    ).resolves.toEqual({ ok: false, code: "read" });
  });
});
