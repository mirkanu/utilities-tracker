ALTER TABLE "oil_purchases" ADD COLUMN "supplier" text;

INSERT INTO "oil_purchases" ("purchase_date", "supplier", "litres", "total_cost_gbp") VALUES
  ('2026-02-04', 'J&R Fuels', 200, 135.00),
  ('2025-09-04', 'J&R Fuels', 916, 483.00),
  ('2025-07-10', 'J&R Fuels', 300, 130.00),
  ('2025-03-24', 'J&R Fuels', 300, 175.00),
  ('2025-02-17', 'J&R Fuels', 250, 170.00);
