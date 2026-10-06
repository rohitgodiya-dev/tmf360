-- Part 14a — Full-text search inside documents (NAV-09). Plan: docs/part14-plan.md (D49).
--
-- * document_text: the text of each document's current file, extracted on the server, with a
--   generated tsvector (GIN-indexed). Written only by the server (service role). Readable exactly
--   when the document is readable (the documents RLS decides).
-- * search_document_text(): ranked matches with a highlighted snippet, run as the caller so row-level
--   security applies — a search can never reveal a document the caller cannot open.

create table if not exists document_text (
  document_id uuid primary key references documents(id),
  org_id uuid not null references organizations(id),
  file_hash text,
  status text not null check (status in ('indexed', 'no_text', 'unsupported', 'failed')),
  pages integer,
  content text not null default '',
  tsv tsvector generated always as (to_tsvector('simple', left(content, 1000000))) stored,
  extracted_at timestamptz not null default now()
);
create index if not exists document_text_tsv on document_text using gin (tsv);
create index if not exists document_text_org on document_text (org_id);

alter table document_text enable row level security;
revoke insert, update, delete, truncate on document_text from anon, authenticated;
drop policy if exists "readable with the document" on document_text;
create policy "readable with the document" on document_text for select using (exists (select 1 from documents d where d.id = document_id));

create or replace function search_document_text(p_study uuid, p_query text, p_limit integer default 200)
returns table (document_id uuid, rank real, snippet text)
language sql stable security invoker set search_path = public as $$
  with q as (select websearch_to_tsquery('simple', p_query) as query),
       st as (select org_id, study_id from studies where id = p_study)
  select t.document_id, ts_rank(t.tsv, q.query) as rank,
         ts_headline('simple', left(t.content, 200000), q.query, 'StartSel=[[, StopSel=]], MaxWords=30, MinWords=12, MaxFragments=2, FragmentDelimiter= … ')
  from document_text t
  cross join q
  join documents d on d.id = t.document_id
  join st on st.org_id = d.org_id and st.study_id = d.study_id
  where t.tsv @@ q.query and d.deleted_at is null
  order by rank desc
  limit least(greatest(coalesce(p_limit, 200), 1), 500)
$$;
grant execute on function search_document_text(uuid, text, integer) to authenticated;
