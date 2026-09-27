import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeContext(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

const corporateUser: AuthenticatedUser = {
  id: 42,
  openId: "corporate-demo",
  email: "corporate@coalgov.demo",
  name: "Riya Menon",
  loginMethod: "demo",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("governance procedures", () => {
  it("returns the executive dashboard summary for an authenticated user", async () => {
    const caller = appRouter.createCaller(makeContext(corporateUser));
    await expect(caller.governance.summary()).resolves.toMatchObject({
      totalMines: expect.any(Number),
      complianceRate: expect.any(Number),
      criticalViolations: expect.any(Number),
      overdueActions: expect.any(Number),
    });
  });

  it("returns the live summary for the dashboard workspace without a login redirect", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    await expect(caller.governance.summary()).resolves.toMatchObject({
      totalMines: expect.any(Number),
      complianceRate: expect.any(Number),
    });
  });

  it("exports a compliance CSV with a stable header", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    await expect(caller.governance.complianceCsv()).resolves.toContain("Reference,Requirement,Mine ID,Category,Due Date,Owner,Status");
  });

  it("returns signed metadata for a branded compliance report", async () => {
    const caller = appRouter.createCaller(makeContext(corporateUser));
    await expect(caller.governance.complianceReportMeta()).resolves.toMatchObject({
      reportId: expect.stringMatching(/^RPT-/),
      datasetHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      signature: expect.stringMatching(/^[a-f0-9]{64}$/),
      rowCount: expect.any(Number),
    });
  });

  it("only exposes the approval queue to manager and administrator roles", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    await expect(caller.governance.inspectionApprovalQueue({ role: "inspector" })).resolves.toEqual([]);
    await expect(caller.governance.inspectionApprovalQueue({ role: "manager" })).resolves.toBeInstanceOf(Array);
  });

  it("rejects inspection review attempts from inspector roles", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    await expect(caller.governance.reviewInspection({ id: 1, decision: "APPROVE", reviewerName: "Field Inspector", reviewerRole: "inspector" })).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });

  it("rejects evidence files larger than the configured 10 MB limit", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    await expect(caller.governance.uploadInspectionEvidence({ inspectionId: 1, fileName: "field.jpg", mimeType: "image/jpeg", fileSize: 10_000_001, base64: "base64-payload" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
