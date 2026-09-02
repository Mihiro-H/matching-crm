import { describe, expect, test } from "vitest";
import { parseCloudSignEvent } from "./parse-cloudsign-event";

describe("parseCloudSignEvent", () => {
  test("parses a completed(signed) document event (status 2, confirmed by CloudSign's help center)", () => {
    expect(
      parseCloudSignEvent({
        documentID: "doc-1",
        status: 2,
        userID: "user-1",
        email: "signer@example.com",
        text: "COMPLETED : ...",
      })
    ).toEqual({
      ok: true,
      data: { documentId: "doc-1", status: "signed", rawStatus: 2 },
    });
  });

  test("treats an unrecognized status code as unknown rather than guessing (CloudSign does not publicly document the full status code list)", () => {
    expect(parseCloudSignEvent({ documentID: "doc-1", status: 1 })).toEqual({
      ok: true,
      data: { documentId: "doc-1", status: "unknown", rawStatus: 1 },
    });
  });

  test("errors when documentID is missing", () => {
    expect(parseCloudSignEvent({ status: 2 })).toEqual({
      ok: false,
      error: "documentIDが空です",
    });
  });

  test("errors when status is not a number", () => {
    expect(parseCloudSignEvent({ documentID: "doc-1", status: "signed" })).toEqual({
      ok: false,
      error: "statusが不正です",
    });
  });

  test("errors when the payload is not an object", () => {
    expect(parseCloudSignEvent(null)).toEqual({ ok: false, error: "不正なリクエストです" });
  });
});
