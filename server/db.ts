import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { auditLogs, complianceRecords, correctiveActions, inspectionEvidence, inspections, mines, type InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listMines() {
  const db = await getDb();
  return db ? db.select().from(mines).orderBy(desc(mines.compliance)) : [];
}

export async function listComplianceRecords() {
  const db = await getDb();
  return db ? db.select().from(complianceRecords).orderBy(desc(complianceRecords.dueDate)) : [];
}

export async function listCorrectiveActions(mineId?: number) {
  const db = await getDb();
  if (!db) return [];
  return mineId ? db.select().from(correctiveActions).where(eq(correctiveActions.mineId, mineId)).orderBy(desc(correctiveActions.deadline)) : db.select().from(correctiveActions).orderBy(desc(correctiveActions.deadline));
}

export async function getMineById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(mines).where(eq(mines.id, id)).limit(1);
  return result[0];
}

export async function getCorrectiveActionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(correctiveActions).where(eq(correctiveActions.id, id)).limit(1);
  return result[0];
}

export async function writeAuditEvent(input: { actorUserId?: number; actorRole: string; action: string; entityType: string; entityId: string; beforeState?: unknown; afterState?: unknown; traceId?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    beforeState: input.beforeState ? JSON.stringify(input.beforeState) : undefined,
    afterState: input.afterState ? JSON.stringify(input.afterState) : undefined,
    traceId: input.traceId,
    result: "SUCCESS",
  });
}

export async function listAuditLogs() {
  const db = await getDb();
  return db ? db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100) : [];
}

export async function listInspections() {
  const db = await getDb();
  return db ? db.select().from(inspections).orderBy(desc(inspections.scheduledAt)).limit(100) : [];
}

export async function listInspectionApprovalQueue() {
  const db = await getDb();
  return db ? db.select().from(inspections).where(eq(inspections.approvalStatus, "PENDING_REVIEW")).orderBy(desc(inspections.submittedAt)) : [];
}

export async function listAuditLogsForEntity(entityType: string, entityId: string) {
  const db = await getDb();
  return db ? db.select().from(auditLogs).where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId))).orderBy(desc(auditLogs.createdAt)) : [];
}

export async function getInspectionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(inspections).where(eq(inspections.id, id)).limit(1);
  return result[0];
}

export async function listInspectionEvidence(inspectionId: number) {
  const db = await getDb();
  return db ? db.select().from(inspectionEvidence).where(eq(inspectionEvidence.inspectionId, inspectionId)).orderBy(desc(inspectionEvidence.createdAt)) : [];
}
