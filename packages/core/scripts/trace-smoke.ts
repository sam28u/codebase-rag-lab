import { TraceContext } from "../src/trace.js";

const t = new TraceContext();
t.startStage("test_stage");
await new Promise((r) => setTimeout(r, 120));
t.endStage({ note: "hello" });
await t.flush();
console.log("trace flushed");
process.exit(0);