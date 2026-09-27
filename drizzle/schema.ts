import { int, index, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const mines = mysqlTable("mines", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 16 }).notNull().unique(),
  name: varchar("name", { length: 140 }).notNull(),
  region: varchar("region", { length: 80 }).notNull(),
  compliance: decimal("compliance", { precision: 5, scale: 2 }).notNull().default("0"),
  riskLevel: mysqlEnum("riskLevel", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]).notNull().default("LOW"),
  openActions: int("openActions").notNull().default(0),
  incidents: int("incidents").notNull().default(0),
  lastInspectionAt: timestamp("lastInspectionAt"),
  status: mysqlEnum("status", ["OPERATIONAL", "REVIEW_REQUIRED"]).notNull().default("OPERATIONAL"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ regionIdx: index("mines_region_idx").on(table.region), riskIdx: index("mines_risk_idx").on(table.riskLevel) }));

export const complianceRecords = mysqlTable("compliance_records", {
  id: int("id").autoincrement().primaryKey(),
  reference: varchar("reference", { length: 24 }).notNull().unique(),
  mineId: int("mineId").notNull(),
  requirement: varchar("requirement", { length: 180 }).notNull(),
  category: mysqlEnum("category", ["SAFETY", "ENVIRONMENT", "LABOUR", "PRODUCTION", "REGULATORY"]).notNull(),
  dueDate: timestamp("dueDate").notNull(),
  status: mysqlEnum("status", ["COMPLIANT", "DUE_SOON", "OVERDUE", "CRITICAL"]).notNull().default("DUE_SOON"),
  owner: varchar("owner", { length: 120 }).notNull(),
  evidenceKey: varchar("evidenceKey", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ mineIdx: index("compliance_mine_idx").on(table.mineId), dueIdx: index("compliance_due_idx").on(table.dueDate), statusIdx: index("compliance_status_idx").on(table.status) }));

export const correctiveActions = mysqlTable("corrective_actions", {
  id: int("id").autoincrement().primaryKey(),
  reference: varchar("reference", { length: 24 }).notNull().unique(),
  mineId: int("mineId").notNull(),
  issue: varchar("issue", { length: 180 }).notNull(),
  source: varchar("source", { length: 120 }).notNull(),
  assignedTo: varchar("assignedTo", { length: 120 }).notNull(),
  priority: mysqlEnum("priority", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]).notNull().default("MEDIUM"),
  deadline: timestamp("deadline").notNull(),
  status: mysqlEnum("status", ["OPEN", "ASSIGNED", "IN_PROGRESS", "EVIDENCE_SUBMITTED", "AWAITING_VERIFICATION", "VERIFIED", "CLOSED"]).notNull().default("OPEN"),
  progress: int("progress").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ mineIdx: index("actions_mine_idx").on(table.mineId), statusIdx: index("actions_status_idx").on(table.status), deadlineIdx: index("actions_deadline_idx").on(table.deadline) }));

export const inspections = mysqlTable("inspections", {
  id: int("id").autoincrement().primaryKey(),
  reference: varchar("reference", { length: 24 }).notNull().unique(),
  mineId: int("mineId").notNull(),
  inspector: varchar("inspector", { length: 120 }).notNull(),
  scheduledAt: timestamp("scheduledAt").notNull(),
  status: mysqlEnum("status", ["SCHEDULED", "IN_PROGRESS", "SUBMITTED", "UNDER_REVIEW", "COMPLETED", "CANCELLED"]).notNull().default("SCHEDULED"),
  approvalStatus: mysqlEnum("approvalStatus", ["NOT_REQUIRED", "PENDING_REVIEW", "APPROVED", "REJECTED"]).notNull().default("NOT_REQUIRED"),
  approvedBy: varchar("approvedBy", { length: 120 }),
  approvedAt: timestamp("approvedAt"),
  approvalNote: text("approvalNote"),
  offlineClientId: varchar("offlineClientId", { length: 64 }).unique(),
  gpsLatitude: decimal("gpsLatitude", { precision: 10, scale: 7 }),
  gpsLongitude: decimal("gpsLongitude", { precision: 10, scale: 7 }),
  observation: text("observation"),
  severity: mysqlEnum("severity", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]).notNull().default("LOW"),
  submittedAt: timestamp("submittedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ mineIdx: index("inspections_mine_idx").on(table.mineId), statusIdx: index("inspections_status_idx").on(table.status), scheduledIdx: index("inspections_scheduled_idx").on(table.scheduledAt) }));

export const inspectionEvidence = mysqlTable("inspection_evidence", {
  id: int("id").autoincrement().primaryKey(),
  inspectionId: int("inspectionId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  fileSize: int("fileSize").notNull(),
  storageKey: varchar("storageKey", { length: 255 }).notNull(),
  storageUrl: varchar("storageUrl", { length: 500 }).notNull(),
  uploadedBy: varchar("uploadedBy", { length: 120 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ inspectionIdx: index("evidence_inspection_idx").on(table.inspectionId), createdIdx: index("evidence_created_idx").on(table.createdAt) }));

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId"),
  actorRole: varchar("actorRole", { length: 64 }).notNull(),
  action: varchar("action", { length: 48 }).notNull(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: varchar("entityId", { length: 64 }).notNull(),
  beforeState: text("beforeState"),
  afterState: text("afterState"),
  result: mysqlEnum("result", ["SUCCESS", "FAILURE"]).notNull().default("SUCCESS"),
  traceId: varchar("traceId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ entityIdx: index("audit_entity_idx").on(table.entityType, table.entityId), createdIdx: index("audit_created_idx").on(table.createdAt) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Mine = typeof mines.$inferSelect;
export type ComplianceRecord = typeof complianceRecords.$inferSelect;
export type CorrectiveAction = typeof correctiveActions.$inferSelect;
export type Inspection = typeof inspections.$inferSelect;
export type InspectionEvidence = typeof inspectionEvidence.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
