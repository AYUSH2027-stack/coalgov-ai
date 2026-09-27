import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createHash, createHmac } from "node:crypto";
import { correctiveActions, inspectionEvidence, inspections } from "../drizzle/schema";
import { getCorrectiveActionById, getDb, getInspectionById, getMineById, listAuditLogs, listAuditLogsForEntity, listComplianceRecords, listCorrectiveActions, listInspectionApprovalQueue, listInspectionEvidence, listInspections, listMines, writeAuditEvent } from "./db";
import { storagePut } from "./storage";

const stateFlow = ["OPEN", "ASSIGNED", "IN_PROGRESS", "EVIDENCE_SUBMITTED", "AWAITING_VERIFICATION", "VERIFIED", "CLOSED"] as const;
const progressByState = { OPEN: 0, ASSIGNED: 20, IN_PROGRESS: 55, EVIDENCE_SUBMITTED: 75, AWAITING_VERIFICATION: 90, VERIFIED: 100, CLOSED: 100 } as const;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  governance: router({
    summary: publicProcedure.query(async () => {
      const [mineRows, complianceRows, actionRows, inspectionRows] = await Promise.all([listMines(), listComplianceRecords(), listCorrectiveActions(), listInspections()]);
      const complianceRate = mineRows.length ? Number((mineRows.reduce((sum, mine) => sum + Number(mine.compliance), 0) / mineRows.length).toFixed(1)) : 0;
      return { totalMines: mineRows.length, complianceRate, criticalViolations: complianceRows.filter(row => row.status === "CRITICAL").length, overdueActions: actionRows.filter(row => row.deadline < new Date() && row.status !== "CLOSED").length, openIncidents: mineRows.reduce((sum, mine) => sum + mine.incidents, 0), inspectionsThisMonth: inspectionRows.length };
    }),
    mines: publicProcedure.query(() => listMines()),
    mine: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => getMineById(input.id)),
    compliance: publicProcedure.query(() => listComplianceRecords()),
    complianceCsv: publicProcedure.query(async () => {
      const rows = await listComplianceRecords();
      const header = "Reference,Requirement,Mine ID,Category,Due Date,Owner,Status";
      const csv = rows.map(row => [row.reference, row.requirement, row.mineId, row.category, row.dueDate.toISOString().slice(0, 10), row.owner, row.status].map(value => `"${String(value).replaceAll('"', '""')}"`).join(","));
      return [header, ...csv].join("\n");
    }),
    complianceReportMeta: publicProcedure.input(z.object({ filteredReferences: z.array(z.string().min(1)).optional() }).optional()).query(async ({ ctx, input }) => {
      const rows = await listComplianceRecords();
      const selected = input?.filteredReferences?.length ? rows.filter(row => input.filteredReferences?.includes(row.reference)) : rows;
      const canonical = selected.map(row => [row.reference, row.requirement, row.mineId, row.category, row.dueDate.toISOString(), row.owner, row.status].join("|" )).join("\n");
      const generatedAt = new Date().toISOString();
      const reportId = `RPT-${createHash("sha256").update(`${generatedAt}:${canonical}`).digest("hex").slice(0, 12).toUpperCase()}`;
      const datasetHash = createHash("sha256").update(canonical).digest("hex");
      const signer = ctx.user?.name ?? ctx.user?.email ?? "COALGOV demo manager";
      const signature = createHmac("sha256", process.env.JWT_SECRET ?? "coalgov-demo-signing-key").update(`${reportId}|${generatedAt}|${datasetHash}|${signer}`).digest("hex");
      await writeAuditEvent({ actorUserId: ctx.user?.id, actorRole: ctx.user?.role ?? "admin", action: "GENERATE", entityType: "ComplianceReport", entityId: reportId, afterState: { rowCount: selected.length, datasetHash, generatedAt, generatedBy: signer, signature } });
      const audit = await listAuditLogsForEntity("ComplianceReport", reportId);
      return { reportId, generatedAt, generatedBy: signer, role: ctx.user?.role ?? "admin", rowCount: selected.length, datasetHash, signature, auditEvents: audit.length };
    }),
    correctiveActions: publicProcedure.input(z.object({ mineId: z.number().int().positive().optional() }).optional()).query(({ input }) => listCorrectiveActions(input?.mineId)),
    audit: publicProcedure.query(() => listAuditLogs()),
    inspections: publicProcedure.query(() => listInspections()),
    inspectionApprovalQueue: publicProcedure.input(z.object({ role: z.enum(["admin", "manager", "inspector", "viewer"]).default("manager") }).optional()).query(async ({ input }) => {
      if (input?.role !== "admin" && input?.role !== "manager") return [];
      return listInspectionApprovalQueue();
    }),
    inspection: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => ({ inspection: await getInspectionById(input.id), evidence: await listInspectionEvidence(input.id) })),
    createInspection: publicProcedure.input(z.object({ mineId: z.number().int().positive(), inspector: z.string().min(2).max(120), scheduledAt: z.coerce.date(), observation: z.string().max(500).optional(), severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("LOW") })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const reference = `INS-${Math.floor(10000 + Math.random() * 89999)}`;
      const result = await db.insert(inspections).values({ ...input, reference, status: "SCHEDULED" });
      await writeAuditEvent({ actorUserId: ctx.user?.id, actorRole: ctx.user?.role ?? "DEMO_USER", action: "CREATE", entityType: "Inspection", entityId: reference, afterState: { ...input, reference, status: "SCHEDULED" } });
      return { reference, insertId: result[0].insertId };
    }),
    submitInspection: publicProcedure.input(z.object({ id: z.number().int().positive(), gpsLatitude: z.number().min(-90).max(90), gpsLongitude: z.number().min(-180).max(180), observation: z.string().min(3).max(2000), severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]), offlineClientId: z.string().regex(/^[a-zA-Z0-9_-]{8,64}$/).optional(), clientCapturedAt: z.coerce.date().optional() })).mutation(async ({ ctx, input }) => {
      const current = await getInspectionById(input.id);
      if (!current) throw new Error("Inspection not found");
      if (!["SCHEDULED", "IN_PROGRESS"].includes(current.status)) throw new Error("Inspection cannot be submitted from its current state");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.update(inspections).set({ gpsLatitude: String(input.gpsLatitude), gpsLongitude: String(input.gpsLongitude), observation: input.observation, severity: input.severity, offlineClientId: input.offlineClientId, approvalStatus: "PENDING_REVIEW", status: "SUBMITTED", submittedAt: new Date() }).where(eq(inspections.id, input.id));
      await writeAuditEvent({ actorUserId: ctx.user?.id, actorRole: ctx.user?.role ?? "DEMO_USER", action: "SUBMIT", entityType: "Inspection", entityId: current.reference, afterState: { ...current, ...input, status: "SUBMITTED", approvalStatus: "PENDING_REVIEW" } });
      return { ...current, ...input, status: "SUBMITTED" as const, approvalStatus: "PENDING_REVIEW" as const };
    }),
    reviewInspection: publicProcedure.input(z.object({ id: z.number().int().positive(), decision: z.enum(["APPROVE", "REJECT"]), reviewerName: z.string().min(2).max(120), reviewerRole: z.enum(["admin", "manager", "inspector", "viewer"]), note: z.string().max(1000).optional() })).mutation(async ({ ctx, input }) => {
      if (input.reviewerRole !== "admin" && input.reviewerRole !== "manager") throw new Error("Only managers and administrators can review inspections");
      const current = await getInspectionById(input.id);
      if (!current || current.approvalStatus !== "PENDING_REVIEW") throw new Error("Inspection is not awaiting review");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const approvalStatus = input.decision === "APPROVE" ? "APPROVED" as const : "REJECTED" as const;
      const status = input.decision === "APPROVE" ? "COMPLETED" as const : "IN_PROGRESS" as const;
      await db.update(inspections).set({ approvalStatus, status, approvedBy: input.reviewerName, approvedAt: new Date(), approvalNote: input.note }).where(eq(inspections.id, input.id));
      await writeAuditEvent({ actorUserId: ctx.user?.id, actorRole: input.reviewerRole, action: input.decision, entityType: "Inspection", entityId: current.reference, beforeState: current, afterState: { ...current, approvalStatus, status, approvedBy: input.reviewerName, approvalNote: input.note } });
      return { ...current, approvalStatus, status, approvedBy: input.reviewerName, approvalNote: input.note };
    }),
    uploadInspectionEvidence: publicProcedure.input(z.object({ inspectionId: z.number().int().positive(), fileName: z.string().min(1).max(255), mimeType: z.enum(["image/png", "image/jpeg", "application/pdf"]), fileSize: z.number().int().positive().max(10_000_000), base64: z.string().min(10) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const stored = await storagePut(`inspection-evidence/${ctx.user?.id ?? "demo"}/${safeName}`, Buffer.from(input.base64, "base64"), input.mimeType);
      const result = await db.insert(inspectionEvidence).values({ inspectionId: input.inspectionId, fileName: safeName, mimeType: input.mimeType, fileSize: input.fileSize, storageKey: stored.key, storageUrl: stored.url, uploadedBy: ctx.user?.name ?? ctx.user?.email ?? "Demo user" });
      await writeAuditEvent({ actorUserId: ctx.user?.id, actorRole: ctx.user?.role ?? "DEMO_USER", action: "UPLOAD", entityType: "InspectionEvidence", entityId: String(result[0].insertId), afterState: { inspectionId: input.inspectionId, fileName: safeName, fileSize: input.fileSize } });
      return { id: result[0].insertId, fileName: safeName, url: stored.url };
    }),
    createCorrectiveAction: protectedProcedure.input(z.object({ mineId: z.number().int().positive(), issue: z.string().min(3).max(180), source: z.string().min(2).max(120), assignedTo: z.string().min(2).max(120), priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]), deadline: z.coerce.date() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const reference = `CA-${Math.floor(10000 + Math.random() * 89999)}`;
      const result = await db.insert(correctiveActions).values({ ...input, reference, status: "OPEN", progress: 0 });
      await writeAuditEvent({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "CREATE", entityType: "CorrectiveAction", entityId: reference, afterState: { ...input, reference, status: "OPEN" } });
      return { reference, insertId: result[0].insertId };
    }),
    advanceCorrectiveAction: protectedProcedure.input(z.object({ id: z.number().int().positive(), expectedState: z.enum(stateFlow) })).mutation(async ({ ctx, input }) => {
      const current = await getCorrectiveActionById(input.id);
      if (!current) throw new Error("Corrective action not found");
      if (current.status !== input.expectedState) throw new Error("State conflict: action has changed since it was loaded");
      const next = stateFlow[stateFlow.indexOf(current.status) + 1];
      if (!next) return current;
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.update(correctiveActions).set({ status: next, progress: progressByState[next] }).where(eq(correctiveActions.id, current.id));
      await writeAuditEvent({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: next === "VERIFIED" ? "VERIFY" : next === "CLOSED" ? "CLOSE" : "UPDATE", entityType: "CorrectiveAction", entityId: current.reference, beforeState: current, afterState: { ...current, status: next, progress: progressByState[next] } });
      return { ...current, status: next, progress: progressByState[next] };
    }),
  }),
});

export type AppRouter = typeof appRouter;
