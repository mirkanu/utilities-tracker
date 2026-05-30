CREATE TABLE "daily_temperatures" (
	"date" date PRIMARY KEY NOT NULL,
	"avg_temp_c" numeric(5, 2) NOT NULL,
	"hdd" numeric(5, 2) NOT NULL,
	"fetched_at" date NOT NULL
);
