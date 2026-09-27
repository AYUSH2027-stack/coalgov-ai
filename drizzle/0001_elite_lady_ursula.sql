CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int,
	`actorRole` varchar(64) NOT NULL,
	`action` varchar(48) NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` varchar(64) NOT NULL,
	`beforeState` text,
	`afterState` text,
	`result` enum('SUCCESS','FAILURE') NOT NULL DEFAULT 'SUCCESS',
	`traceId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `compliance_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reference` varchar(24) NOT NULL,
	`mineId` int NOT NULL,
	`requirement` varchar(180) NOT NULL,
	`category` enum('SAFETY','ENVIRONMENT','LABOUR','PRODUCTION','REGULATORY') NOT NULL,
	`dueDate` timestamp NOT NULL,
	`status` enum('COMPLIANT','DUE_SOON','OVERDUE','CRITICAL') NOT NULL DEFAULT 'DUE_SOON',
	`owner` varchar(120) NOT NULL,
	`evidenceKey` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `compliance_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `compliance_records_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
CREATE TABLE `corrective_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reference` varchar(24) NOT NULL,
	`mineId` int NOT NULL,
	`issue` varchar(180) NOT NULL,
	`source` varchar(120) NOT NULL,
	`assignedTo` varchar(120) NOT NULL,
	`priority` enum('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
	`deadline` timestamp NOT NULL,
	`status` enum('OPEN','ASSIGNED','IN_PROGRESS','EVIDENCE_SUBMITTED','AWAITING_VERIFICATION','VERIFIED','CLOSED') NOT NULL DEFAULT 'OPEN',
	`progress` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `corrective_actions_id` PRIMARY KEY(`id`),
	CONSTRAINT `corrective_actions_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
CREATE TABLE `mines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(16) NOT NULL,
	`name` varchar(140) NOT NULL,
	`region` varchar(80) NOT NULL,
	`compliance` decimal(5,2) NOT NULL DEFAULT '0',
	`riskLevel` enum('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'LOW',
	`openActions` int NOT NULL DEFAULT 0,
	`incidents` int NOT NULL DEFAULT 0,
	`lastInspectionAt` timestamp,
	`status` enum('OPERATIONAL','REVIEW_REQUIRED') NOT NULL DEFAULT 'OPERATIONAL',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mines_id` PRIMARY KEY(`id`),
	CONSTRAINT `mines_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_logs` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `compliance_mine_idx` ON `compliance_records` (`mineId`);--> statement-breakpoint
CREATE INDEX `compliance_due_idx` ON `compliance_records` (`dueDate`);--> statement-breakpoint
CREATE INDEX `compliance_status_idx` ON `compliance_records` (`status`);--> statement-breakpoint
CREATE INDEX `actions_mine_idx` ON `corrective_actions` (`mineId`);--> statement-breakpoint
CREATE INDEX `actions_status_idx` ON `corrective_actions` (`status`);--> statement-breakpoint
CREATE INDEX `actions_deadline_idx` ON `corrective_actions` (`deadline`);--> statement-breakpoint
CREATE INDEX `mines_region_idx` ON `mines` (`region`);--> statement-breakpoint
CREATE INDEX `mines_risk_idx` ON `mines` (`riskLevel`);