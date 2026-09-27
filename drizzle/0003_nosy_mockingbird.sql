ALTER TABLE `inspections` ADD `approvalStatus` enum('NOT_REQUIRED','PENDING_REVIEW','APPROVED','REJECTED') DEFAULT 'NOT_REQUIRED' NOT NULL;--> statement-breakpoint
ALTER TABLE `inspections` ADD `approvedBy` varchar(120);--> statement-breakpoint
ALTER TABLE `inspections` ADD `approvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `inspections` ADD `approvalNote` text;--> statement-breakpoint
ALTER TABLE `inspections` ADD `offlineClientId` varchar(64);--> statement-breakpoint
ALTER TABLE `inspections` ADD CONSTRAINT `inspections_offlineClientId_unique` UNIQUE(`offlineClientId`);