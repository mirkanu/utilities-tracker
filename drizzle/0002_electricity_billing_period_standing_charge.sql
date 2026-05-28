-- Add standing_charge_pence to electricity_contracts (nullable: existing contracts have none)
ALTER TABLE "electricity_contracts" ADD COLUMN "standing_charge_pence" numeric(6, 3);

-- Add billing period columns to electricity_bills
ALTER TABLE "electricity_bills" ADD COLUMN "period_start" date;
ALTER TABLE "electricity_bills" ADD COLUMN "period_end" date;

-- Migrate existing data: period_start = bill_month, period_end = last day of that month
UPDATE "electricity_bills"
SET period_start = bill_month,
    period_end = (DATE_TRUNC('month', bill_month::date) + INTERVAL '1 month' - INTERVAL '1 day')::date;

-- Make new columns NOT NULL (safe after migration)
ALTER TABLE "electricity_bills" ALTER COLUMN "period_start" SET NOT NULL;
ALTER TABLE "electricity_bills" ALTER COLUMN "period_end" SET NOT NULL;

-- Drop the old bill_month column
ALTER TABLE "electricity_bills" DROP COLUMN "bill_month";
