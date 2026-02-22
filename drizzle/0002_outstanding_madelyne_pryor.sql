CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stripeCustomerId` varchar(255),
	`stripeSubscriptionId` varchar(255),
	`stripePaymentIntentId` varchar(255),
	`plan` enum('per_letter','monthly','annual') NOT NULL,
	`status` enum('active','canceled','past_due','trialing','incomplete','none') NOT NULL DEFAULT 'none',
	`lettersAllowed` int NOT NULL DEFAULT 0,
	`lettersUsed` int NOT NULL DEFAULT 0,
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`cancelAtPeriodEnd` boolean NOT NULL DEFAULT false,
	`metadataJson` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `letter_requests` MODIFY COLUMN `status` enum('submitted','researching','drafting','pending_review','under_review','needs_changes','approved','rejected') NOT NULL DEFAULT 'submitted';