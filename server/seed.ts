import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { auditLogs, complianceRecords, correctiveActions, inspections, mines } from "../drizzle/schema";

const db = process.env.DATABASE_URL ? drizzle(process.env.DATABASE_URL) : null;
if (!db) throw new Error("DATABASE_URL is required to seed COALGOV AI");

const mineSeeds = [
  { code: "M-17", name: "Kestrel Ridge Mine", region: "Eastern Basin", compliance: "68.00", riskLevel: "HIGH" as const, openActions: 7, incidents: 3, status: "REVIEW_REQUIRED" as const, lastInspectionAt: new Date("2026-09-18T04:00:00Z") },
  { code: "M-07", name: "Northstar Colliery", region: "Central Basin", compliance: "92.00", riskLevel: "LOW" as const, openActions: 2, incidents: 0, status: "OPERATIONAL" as const, lastInspectionAt: new Date("2026-09-24T04:00:00Z") },
  { code: "M-21", name: "Blackwood Open Cast", region: "Western Basin", compliance: "81.00", riskLevel: "MEDIUM" as const, openActions: 4, incidents: 1, status: "OPERATIONAL" as const, lastInspectionAt: new Date("2026-09-22T04:00:00Z") },
  { code: "M-12", name: "Redbank Underground", region: "Northern Basin", compliance: "89.00", riskLevel: "MEDIUM" as const, openActions: 3, incidents: 1, status: "OPERATIONAL" as const, lastInspectionAt: new Date("2026-09-20T04:00:00Z") },
  { code: "M-01", name: "Pinecrest Mine", region: "Eastern Basin", compliance: "96.00", riskLevel: "LOW" as const, openActions: 1, incidents: 0, status: "OPERATIONAL" as const, lastInspectionAt: new Date("2026-09-23T04:00:00Z") },
];

const seed = async () => {
  for (const mine of mineSeeds) await db.insert(mines).values(mine).onDuplicateKeyUpdate({ set: mine });
  const mineRows = await db.select().from(mines);
  const byCode = new Map(mineRows.map(m => [m.code, m.id]));
  const compliance = [
    { reference: "CMP-24091", mineId: byCode.get("M-17")!, requirement: "Statutory safety committee minutes", category: "SAFETY" as const, dueDate: new Date("2026-09-24T00:00:00Z"), status: "OVERDUE" as const, owner: "A. Prasad" },
    { reference: "CMP-24102", mineId: byCode.get("M-21")!, requirement: "Quarterly water quality analysis", category: "ENVIRONMENT" as const, dueDate: new Date("2026-09-30T00:00:00Z"), status: "DUE_SOON" as const, owner: "N. Shah" },
    { reference: "CMP-24074", mineId: byCode.get("M-07")!, requirement: "Contractor insurance certificate", category: "LABOUR" as const, dueDate: new Date("2026-10-02T00:00:00Z"), status: "COMPLIANT" as const, owner: "S. Rao" },
    { reference: "CMP-24063", mineId: byCode.get("M-12")!, requirement: "Ventilation inspection register", category: "REGULATORY" as const, dueDate: new Date("2026-10-08T00:00:00Z"), status: "COMPLIANT" as const, owner: "P. Nair" },
    { reference: "CMP-24112", mineId: byCode.get("M-17")!, requirement: "Emergency response drill evidence", category: "SAFETY" as const, dueDate: new Date("2026-09-30T00:00:00Z"), status: "CRITICAL" as const, owner: "A. Prasad" },
  ];
  for (const record of compliance) await db.insert(complianceRecords).values(record).onDuplicateKeyUpdate({ set: record });
  const actions = [
    { reference: "CA-10396", mineId: byCode.get("M-17")!, issue: "PPE compliance — haul road", source: "Inspection INS-28944", assignedTo: "Safety Officer", priority: "CRITICAL" as const, deadline: new Date("2026-09-24T00:00:00Z"), status: "IN_PROGRESS" as const, progress: 64 },
    { reference: "CA-10411", mineId: byCode.get("M-17")!, issue: "Emergency drill evidence", source: "Compliance CMP-24112", assignedTo: "Mine Manager", priority: "HIGH" as const, deadline: new Date("2026-09-30T00:00:00Z"), status: "ASSIGNED" as const, progress: 24 },
    { reference: "CA-10482", mineId: byCode.get("M-12")!, issue: "Conveyor guard replacement", source: "Inspection INS-29001", assignedTo: "Maintenance Lead", priority: "MEDIUM" as const, deadline: new Date("2026-10-01T00:00:00Z"), status: "AWAITING_VERIFICATION" as const, progress: 92 },
    { reference: "CA-10428", mineId: byCode.get("M-07")!, issue: "Contractor induction records", source: "Document expiry", assignedTo: "Apex Haulage", priority: "MEDIUM" as const, deadline: new Date("2026-10-04T00:00:00Z"), status: "OPEN" as const, progress: 8 },
  ];
  for (const action of actions) await db.insert(correctiveActions).values(action).onDuplicateKeyUpdate({ set: action });
  const inspectionSeeds = [
    { reference: "INS-29017", mineId: byCode.get("M-07")!, inspector: "Arun Prasad", scheduledAt: new Date("2026-09-26T04:50:00Z"), status: "SUBMITTED" as const, approvalStatus: "PENDING_REVIEW" as const, gpsLatitude: "23.1864000", gpsLongitude: "85.2799000", observation: "Haul road signage and PPE controls reviewed. One minor observation requires follow-up.", severity: "MEDIUM" as const, submittedAt: new Date("2026-09-26T05:25:00Z") },
    { reference: "INS-28944", mineId: byCode.get("M-17")!, inspector: "Arun Prasad", scheduledAt: new Date("2026-09-18T04:00:00Z"), status: "COMPLETED" as const, approvalStatus: "APPROVED" as const, approvedBy: "Riya Menon", approvedAt: new Date("2026-09-18T08:00:00Z"), gpsLatitude: "23.4126000", gpsLongitude: "85.7102000", observation: "Recurring PPE compliance issue identified on haul road.", severity: "HIGH" as const, submittedAt: new Date("2026-09-18T06:20:00Z") },
    { reference: "INS-29001", mineId: byCode.get("M-12")!, inspector: "Neha Shah", scheduledAt: new Date("2026-09-28T04:00:00Z"), status: "SCHEDULED" as const, gpsLatitude: null, gpsLongitude: null, observation: null, severity: "LOW" as const, submittedAt: null },
  ];
  for (const inspection of inspectionSeeds) await db.insert(inspections).values(inspection).onDuplicateKeyUpdate({ set: inspection });
  await db.insert(auditLogs).values({ actorRole: "SYSTEM", action: "SEED", entityType: "GovernanceDemo", entityId: "SIH26024", afterState: JSON.stringify({ mines: mineSeeds.length, compliance: compliance.length, actions: actions.length }), result: "SUCCESS" }).onDuplicateKeyUpdate({ set: { result: "SUCCESS" } });
  console.log("COALGOV AI demo data seeded");
};

seed().catch(error => { console.error(error); process.exit(1); });
