-- CreateEnum
CREATE TYPE "ChangeRecordType" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum (idempotent - may already exist from prior migrations)
DO $$ BEGIN
    CREATE TYPE "ChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE "change_requests" (
    "id" BIGSERIAL NOT NULL,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "author_id" BIGINT NOT NULL,
    "reviewer_id" BIGINT,
    "review_comment" TEXT,
    "reviewed_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wire_change_records" (
    "id" BIGSERIAL NOT NULL,
    "wire_id" BIGINT,
    "record_type" "ChangeRecordType" NOT NULL,
    "from_destination" VARCHAR(100),
    "to_destination" VARCHAR(100),
    "wire_code_id" SMALLINT,
    "color_id" SMALLINT,
    "io_type_id" VARCHAR(255),
    "sub" SMALLINT,
    "word" SMALLINT,
    "bits" SMALLINT,
    "power" VARCHAR(255),
    "origin" VARCHAR(255),
    "wire_number" VARCHAR(255),
    "hw_models_id" SMALLINT,
    "remarks" VARCHAR(255),
    "note_code" VARCHAR(255),
    "change_number" VARCHAR(255),
    "change_date" DATE,
    "hw_address" VARCHAR(255),
    "coord" VARCHAR(255),
    "decommissioned" VARCHAR(255),
    "ped" VARCHAR(255),
    "network" VARCHAR(255),
    "changes" JSON,
    "change_request_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wire_change_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_change_request_author" ON "change_requests"("author_id");

-- CreateIndex
CREATE INDEX "idx_change_request_status" ON "change_requests"("status");

-- CreateIndex
CREATE INDEX "idx_change_request_created" ON "change_requests"("created_at");

-- CreateIndex
CREATE INDEX "idx_change_record_request" ON "wire_change_records"("change_request_id");

-- CreateIndex
CREATE INDEX "idx_change_record_wire" ON "wire_change_records"("wire_id");

-- CreateIndex
CREATE INDEX "idx_change_record_created" ON "wire_change_records"("created_at");

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wire_change_records" ADD CONSTRAINT "wire_change_records_change_request_id_fkey" FOREIGN KEY ("change_request_id") REFERENCES "change_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data from wire_change_requests to new structure (only if old table exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wire_change_requests') THEN
        INSERT INTO "change_requests" ("id", "status", "comment", "author_id", "reviewer_id", "review_comment", "reviewed_at", "created_at", "updated_at")
        SELECT 
            "id",
            "status",
            NULL,
            "author_id",
            "reviewer_id",
            "review_comment",
            "reviewed_at",
            "created_at",
            "updated_at"
        FROM "wire_change_requests";

        INSERT INTO "wire_change_records" (
            "id", "wire_id", "record_type", "from_destination", "to_destination",
            "wire_code_id", "color_id", "io_type_id", "sub", "word", "bits",
            "power", "origin", "wire_number", "hw_models_id", "remarks", "note_code",
            "change_number", "change_date", "hw_address", "coord", "decommissioned",
            "ped", "network", "changes", "change_request_id", "created_at", "updated_at"
        )
        SELECT 
            "id", "wire_id", "request_type"::"text"::"ChangeRecordType",
            "from_destination", "to_destination", "wire_code_id", "color_id", "io_type_id",
            "sub", "word", "bits", "power", "origin", "wire_number", "hw_models_id",
            "remarks", "note_code", "change_number", "change_date", "hw_address", "coord",
            "decommissioned", "ped", "network", "changes",
            "id", -- change_request_id maps 1-to-1 with old id
            "created_at", "updated_at"
        FROM "wire_change_requests";

        PERFORM setval(pg_get_serial_sequence('change_requests', 'id'), COALESCE((SELECT MAX(id) FROM change_requests), 0) + 1, false);
        PERFORM setval(pg_get_serial_sequence('wire_change_records', 'id'), COALESCE((SELECT MAX(id) FROM wire_change_records), 0) + 1, false);

        DROP TABLE "wire_change_requests";
    END IF;
END $$;

-- Drop old enum type if it exists
DROP TYPE IF EXISTS "ChangeRequestType";

