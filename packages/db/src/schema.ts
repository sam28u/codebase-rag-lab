import {
  pgTable, uuid, text, integer, timestamp, jsonb,
  uniqueIndex, index, vector, customType,
} from "drizzle-orm/pg-core";

// tsvector helper — drizzle doesn't ship one
const tsvector = customType<{ data: string }>({
  dataType() { return "tsvector"; },
});

export const repos = pgTable("repos", {
  id:            uuid("id").primaryKey().defaultRandom(),
  owner:         text("owner").notNull(),
  name:          text("name").notNull(),
  defaultBranch: text("default_branch").default("main"),
  status:        text("status").default("queued").notNull(), // queued|indexing|ready|failed
  indexedAt:     timestamp("indexed_at", { withTimezone: true }),
  createdAt:     timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  ownerNameUq: uniqueIndex("repos_owner_name_uq").on(t.owner, t.name),
}));

export const files = pgTable("files", {
  id:          uuid("id").primaryKey().defaultRandom(),
  repoId:      uuid("repo_id").notNull().references(() => repos.id, { onDelete: "cascade" }),
  path:        text("path").notNull(),
  language:    text("language"),
  contentHash: text("content_hash").notNull(),
}, (t) => ({
  repoPathUq: uniqueIndex("files_repo_path_uq").on(t.repoId, t.path),
}));

export const symbols = pgTable("symbols", {
  id:         uuid("id").primaryKey().defaultRandom(),
  fileId:     uuid("file_id").notNull().references(() => files.id, { onDelete: "cascade" }),
  name:       text("name").notNull(),
  kind:       text("kind").notNull(),
  scope:      text("scope").array(),
  signature:  text("signature"),
  startLine:  integer("start_line").notNull(),
  endLine:    integer("end_line").notNull(),
}, (t) => ({
  fileSymbolUq: uniqueIndex("symbols_file_name_line_uq").on(t.fileId, t.name, t.startLine),
  repoNameIdx:  index("symbols_name_idx").on(t.name),
}));

export const symbolEdges = pgTable("symbol_edges", {
  id:             uuid("id").primaryKey().defaultRandom(),
  repoId:         uuid("repo_id").notNull().references(() => repos.id, { onDelete: "cascade" }),
  sourceSymbolId: uuid("source_symbol_id").references(() => symbols.id, { onDelete: "cascade" }),
  targetSymbolId: uuid("target_symbol_id").references(() => symbols.id, { onDelete: "cascade" }),
  edgeType:       text("edge_type").notNull(), // calls|imports|extends|implements
}, (t) => ({
  srcIdx: index("symbol_edges_src_idx").on(t.repoId, t.sourceSymbolId),
  tgtIdx: index("symbol_edges_tgt_idx").on(t.repoId, t.targetSymbolId),
}));

export const codeChunks = pgTable("code_chunks", {
  id:             uuid("id").primaryKey().defaultRandom(),
  repoId:         uuid("repo_id").notNull().references(() => repos.id, { onDelete: "cascade" }),
  fileId:         uuid("file_id").notNull().references(() => files.id, { onDelete: "cascade" }),
  symbolId:       uuid("symbol_id").references(() => symbols.id, { onDelete: "set null" }),
  content:        text("content").notNull(),
  contextualText: text("contextual_text").notNull(),
  chunkIndex:     integer("chunk_index").notNull(),
  startLine:      integer("start_line").notNull(),
  endLine:        integer("end_line").notNull(),
  tsv:            tsvector("tsv"),
}, (t) => ({
  tsvIdx: index("code_chunks_tsv_idx").using("gin", t.tsv),
}));

export const chunkEmbeddings = pgTable("chunk_embeddings", {
  chunkId:    uuid("chunk_id").primaryKey().references(() => codeChunks.id, { onDelete: "cascade" }),
  modelName:  text("model_name").notNull().default("text-embedding-3-small"),
  embedding:  vector("embedding", { dimensions: 1536 }).notNull(),
});

export const jobs = pgTable("jobs", {
  id:         uuid("id").primaryKey().defaultRandom(),
  repoId:     uuid("repo_id").notNull().references(() => repos.id, { onDelete: "cascade" }),
  type:       text("type").notNull(),                    // index|reindex
  status:     text("status").default("queued").notNull(),// queued|running|done|failed
  progress:   integer("progress").default(0).notNull(),
  error:      text("error"),
  createdAt:  timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

// ← the Option-C differentiator
export const traces = pgTable("traces", {
  id:        uuid("id").primaryKey().defaultRandom(),
  jobId:     uuid("job_id"),
  queryId:   uuid("query_id"),
  stages:    jsonb("stages").notNull(), // [{ name, ms, meta }]
  totalMs:   integer("total_ms").notNull(),
  costUsd:   text("cost_usd").notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  jobIdx:   index("traces_job_idx").on(t.jobId),
  queryIdx: index("traces_query_idx").on(t.queryId),
}));