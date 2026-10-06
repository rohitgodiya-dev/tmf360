import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { handle, notFound } from "@/lib/api/http";

const FIELDS =
  "id, study_id, artifact_num, artifact_name, zone, version, status, owner, effective_date, expiry_date, " +
  "file_name, file_type, file_size_bytes, file_hash, custom_file_name, comments, created_at, updated_at, signpost, signpost_reference, certified_copy, blinded, " +
  "approved_by, approved_at, submission_reason, rejection_reason, rejected_by, rejected_at, " +
  "archived_by, archived_at, archive_reason, study_country_id, study_site_id, taxonomy_artifact_id, file_path";

// A document's metadata and file history (NAV-08 View Metadata, viewer side panel).
export const GET = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_document");
  const id = idParam((await params).documentId);

  const { data: doc, error } = await ctx.db.from("documents").select(FIELDS).eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw dbError(error);
  if (!doc) throw notFound();
  const { file_path, ...rest } = doc as unknown as Record<string, unknown>;

  const [versions, country, site] = await Promise.all([
    ctx.db.from("document_file_versions")
      .select("version_no, file_name, file_type, file_size_bytes, file_hash, verification_status, verified_at, created_at")
      .eq("document_id", id).order("version_no", { ascending: false }),
    rest.study_country_id ? ctx.db.from("study_countries").select("country_code").eq("id", rest.study_country_id as string).maybeSingle() : null,
    rest.study_site_id ? ctx.db.from("study_sites").select("site_number, display_name").eq("id", rest.study_site_id as string).maybeSingle() : null,
  ]);
  if (versions.error) throw dbError(versions.error);

  return Response.json({
    ...rest,
    has_file: !!file_path,
    country_code: country?.data?.country_code ?? null,
    site_number: site?.data?.site_number ?? null,
    site_name: site?.data?.display_name ?? null,
    tmf_level: rest.study_site_id ? "Site" : rest.study_country_id ? "Country" : "Study",
    file_versions: versions.data ?? [],
  });
});
