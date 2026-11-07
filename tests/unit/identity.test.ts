import { describe, expect, it } from "vitest";
import {
  documentIdSchema,
  qrIdSchema,
} from "@/modules/documents/domain/identity";

describe.each([documentIdSchema, qrIdSchema])(
  "permanent identity boundary",
  (schema) => {
    it("accepts UUID without changing it", () => {
      const id = "65da1a81-bb4a-4832-a2bf-e470ac776e93";
      expect(schema.parse(id)).toBe(id);
    });
    it.each(["BAC-2026-001", "", "https://example.com", 1, null])(
      "rejects non-UUID %s",
      (input) => {
        expect(schema.safeParse(input).success).toBe(false);
      },
    );
  },
);
