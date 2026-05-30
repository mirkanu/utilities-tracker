CREATE TABLE "beis_monthly_prices" (
	"month_start" date PRIMARY KEY NOT NULL,
	"ppl_pence" numeric(6, 3) NOT NULL,
	"fetched_at" date NOT NULL
);
