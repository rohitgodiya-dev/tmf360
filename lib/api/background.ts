// Work that should finish after the response is sent (export jobs, EXP-04). Outside a request
// (scripts, integration tests) `after` is unavailable, so the work runs before returning instead.
import { after } from "next/server";

export async function inBackground(task: () => Promise<void>): Promise<void> {
  try {
    after(task);
  } catch {
    await task();
  }
}
