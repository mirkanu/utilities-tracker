CREATE TABLE "electricity_bills" (
	"id" serial PRIMARY KEY NOT NULL,
	"bill_month" date NOT NULL,
	"total_cost_gbp" numeric(8, 2) NOT NULL,
	"total_kwh" numeric(10, 2) NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "electricity_contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"unit_rate_pence" numeric(6, 3) NOT NULL,
	"contract_type" text NOT NULL,
	"expiry_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "electricity_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"reading_date" date NOT NULL,
	"reading_kwh" numeric(10, 2) NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "oil_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_date" date NOT NULL,
	"litres" numeric(8, 2) NOT NULL,
	"total_cost_gbp" numeric(8, 2) NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "oil_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"reading_date" date NOT NULL,
	"height_cm" integer NOT NULL,
	"notes" text
);
