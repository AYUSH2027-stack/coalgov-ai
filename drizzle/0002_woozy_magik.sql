CREATE TABLE `inspection_evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inspectionId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`fileSize` int NOT NULL,
	`storageKey` varchar(255) NOT NULL,
	`storageUrl` varchar(500) NOT NULL,
	`uploadedBy` varchar(120) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inspection_evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inspections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reference` varchar(24) NOT NULL,
	`mineId` int NOT NULL,
	`inspector` varchar(120) NOT NULL,
	`scheduledAt` timestamp NOT NULL,
	`status` enum('SCHEDULED','IN_PROGRESS','SUBMITTED','UNDER_REVIEW','COMPLETED','CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
	`gpsLatitude` decimal(10,7),
	`gpsLongitude` decimal(10,7),
	`observation` text,
	`severity` enum('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'LOW',
	`submittedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inspections_id` PRIMARY KEY(`id`),
	CONSTRAINT `inspections_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
CREATE INDEX `evidence_inspection_idx` ON `inspection_evidence` (`inspectionId`);--> statement-breakpoint
CREATE INDEX `evidence_created_idx` ON `inspection_evidence` (`createdAt`);--> statement-breakpoint
CREATE INDEX `inspections_mine_idx` ON `inspections` (`mineId`);--> statement-breakpoint
CREATE INDEX `inspections_status_idx` ON `inspections` (`status`);--> statement-breakpoint
CREATE INDEX `inspections_scheduled_idx` ON `inspections` (`scheduledAt`);