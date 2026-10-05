// Trial360 OS — PreToolUse guard for Bash and PowerShell commands.
// Claude Code passes the tool call as JSON on stdin. Exit code 2 blocks the call and the
// message on stderr goes back to Claude; exit 0 lets it run.
import { readFileSync } from "node:fs";

const DEV_REF = "ikjusswwskrkjwxovgza";
let call;
try { call = JSON.parse(readFileSync(0, "utf8")); } catch { process.exit(0); }
const cmd = String(call?.tool_input?.command ?? "");
const block = (why) => { process.stderr.write(`BLOCKED by .claude/hooks/pre-tool-check.mjs: ${why}\n`); process.exit(2); };

if (/\bgit\s+push\b[^\n]*(\s--force\b|\s-f\b|\s--force-with-lease\b)/.test(cmd)) block("force push is not allowed. Use git push origin main.");
if (/\bgit\s+reset\s+--hard\b/.test(cmd)) block("git reset --hard discards work. Use git stash or git reset --soft, after checking git log.");
if (/\brm\s+-[a-z]*r[a-z]*f?[a-z]*\s+[^\n]*\b(app|lib|components|scripts|supabase|tests|public|docs)\b/i.test(cmd)
    || /Remove-Item[^\n]*-Recurse[^\n]*\b(app|lib|components|scripts|supabase|tests|public|docs)\b/i.test(cmd)) {
  block("recursive delete of a source directory.");
}
// Only an actual invocation (npx …, or at the start of a command), not the words inside a commit message.
if (/(\bnpx\s+|(^|[;&|]\s*))supabase\s+db\s+(reset|push)\b/m.test(cmd)) block("supabase db reset/push are not used here. Apply migrations with db query: DEV first (--project-ref " + DEV_REF + "), then PROD after a rolled-back dry-run.");

// PROD queries (--linked without the DEV project ref): refuse destructive SQL in the file or inline.
if (/\bsupabase\s+db\s+query\b/.test(cmd) && /--linked\b/.test(cmd) && !cmd.includes(DEV_REF)) {
  let sql = cmd;
  const file = cmd.match(/-f\s+"([^"]+)"|-f\s+(\S+)/);
  if (file) { try { sql += "\n" + readFileSync(file[1] ?? file[2], "utf8"); } catch { /* file unreadable: check the command only */ } }
  if (/\bdrop\s+table\b/i.test(sql)) block("DROP TABLE on PROD. GxP data is never dropped; run it on DEV and ask the user first.");
  // A TRUNCATE statement — not "before truncate on <table>" triggers or "revoke ..., truncate on" grants.
  if (/(^|[;"'\s])truncate\s+(table\s+)?[\w."]+\s*(;|"|'|$)/im.test(sql)) block("TRUNCATE on PROD. GxP data is never truncated.");
  if (/\bdelete\s+from\s+(documents|audit_trail|isf_documents|isf_audit_trail|signature_events|qc_decisions|document_file_versions|document_metadata_versions)\b/i.test(sql)
      && !/create\s+(or\s+replace\s+)?function/i.test(sql)) {
    block("hard DELETE from a GxP table on PROD. Use soft delete (delete_document / deleted_at).");
  }
}
process.exit(0);
