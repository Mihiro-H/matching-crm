import { describe, expect, test } from "vitest";
import { parseCloudSignEvent } from "./parse-cloudsign-event";

describe("parseCloudSignEvent", () => {
  test("parses a signed document event", () => {
    expect(parseCloudSignEvent({ document_id: "doc-1", status: "signed" })).toEqual({
      ok: true,
      data: { documentId: "doc-1", status: "signed" },
    });
  });

  test("parses a declined/rejected document event", () => {
    expect(parseCloudSignEvent({ document_id: "doc-1", status: "declined" })).toEqual({
      ok: true,
      data: { documentId: "doc-1", status: "rejected" },
    });
  });

  test("treats an unrecognized status as ignorable rather than an error", () => {
    expect(parseCloudSignEvent({ document_id: "doc-1", status: "draft_updated" })).toEqual({
      ok: true,
      data: { documentId: "doc-1", status: "ignored" },
    });
  });

  test("errors when document_id is missing", () => {
    expect(parseCloudSignEvent({ status: "signed" })).toEqual({
      ok: false,
      error: "document_idが空です",
    });
  });

  test("errors when the payload is not an object", () => {
    expect(parseCloudSignEvent(null)).toEqual({ ok: false, error: "不正なリクエストです" });
  });
});
