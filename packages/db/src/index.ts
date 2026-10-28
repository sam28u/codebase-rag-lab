import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!, { max: 10 });

export const db = drizzle(client, { schema });

export {
  repos,
  files,
  symbols,
  symbolEdges,
  codeChunks,
  chunkEmbeddings,
  jobs,
  traces,
} from "./schema";