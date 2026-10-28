CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS "chunk_embeddings" (
	"chunk_id" uuid PRIMARY KEY NOT NULL,
	"model_name" text DEFAULT 'text-embedding-3-small' NOT NULL,
	"embedding" vector(1536) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "code_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repo_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"symbol_id" uuid,
	"content" text NOT NULL,
	"contextual_text" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"start_line" integer NOT NULL,
	"end_line" integer NOT NULL,
	"tsv" "tsvector"
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repo_id" uuid NOT NULL,
	"path" text NOT NULL,
	"language" text,
	"content_hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repo_id" uuid NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "repos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"default_branch" text DEFAULT 'main',
	"status" text DEFAULT 'queued' NOT NULL,
	"indexed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "symbol_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repo_id" uuid NOT NULL,
	"source_symbol_id" uuid,
	"target_symbol_id" uuid,
	"edge_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "symbols" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"scope" text[],
	"signature" text,
	"start_line" integer NOT NULL,
	"end_line" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "traces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid,
	"query_id" uuid,
	"stages" jsonb NOT NULL,
	"total_ms" integer NOT NULL,
	"cost_usd" text DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chunk_embeddings" ADD CONSTRAINT "chunk_embeddings_chunk_id_code_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."code_chunks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "code_chunks" ADD CONSTRAINT "code_chunks_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "code_chunks" ADD CONSTRAINT "code_chunks_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "code_chunks" ADD CONSTRAINT "code_chunks_symbol_id_symbols_id_fk" FOREIGN KEY ("symbol_id") REFERENCES "public"."symbols"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "files" ADD CONSTRAINT "files_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jobs" ADD CONSTRAINT "jobs_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "symbol_edges" ADD CONSTRAINT "symbol_edges_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "symbol_edges" ADD CONSTRAINT "symbol_edges_source_symbol_id_symbols_id_fk" FOREIGN KEY ("source_symbol_id") REFERENCES "public"."symbols"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "symbol_edges" ADD CONSTRAINT "symbol_edges_target_symbol_id_symbols_id_fk" FOREIGN KEY ("target_symbol_id") REFERENCES "public"."symbols"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "symbols" ADD CONSTRAINT "symbols_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "code_chunks_tsv_idx" ON "code_chunks" USING gin ("tsv");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "files_repo_path_uq" ON "files" USING btree ("repo_id","path");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "repos_owner_name_uq" ON "repos" USING btree ("owner","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "symbol_edges_src_idx" ON "symbol_edges" USING btree ("repo_id","source_symbol_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "symbol_edges_tgt_idx" ON "symbol_edges" USING btree ("repo_id","target_symbol_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "symbols_file_name_line_uq" ON "symbols" USING btree ("file_id","name","start_line");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "symbols_name_idx" ON "symbols" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "traces_job_idx" ON "traces" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "traces_query_idx" ON "traces" USING btree ("query_id");