-- 既存データのクリーンアップ: 同じメールアドレス(大文字小文字を区別しない)の担当者が
-- 複数存在する場合、一番古い(created_at最小)ものを残し、それ以外を削除する。
-- 削除される担当者に紐づく商談(deals.person_id、on delete restrict)・案件の窓口担当者
-- (projects.contact_id、on delete set null)は、先に残す担当者へ付け替えてから削除する
-- (付け替えないとdeals側の削除は失敗する。projectsは付け替えなくても削除自体は成功するが、
-- 窓口担当者の記録が消えてしまうため同様に付け替える)。
-- メール未登録(null・空文字)の担当者は対象外(同一人物とみなす根拠が無いため)。

with ranked as (
  select
    id,
    lower(trim(email)) as email_lower,
    row_number() over (partition by lower(trim(email)) order by created_at asc, id asc) as rn
  from public.people
  where email is not null and trim(email) <> ''
),
duplicates as (
  select r.id as duplicate_id, keeper.id as keep_id
  from ranked r
  join ranked keeper on keeper.email_lower = r.email_lower and keeper.rn = 1
  where r.rn > 1
)
update public.deals d
set person_id = duplicates.keep_id
from duplicates
where d.person_id = duplicates.duplicate_id;

with ranked as (
  select
    id,
    lower(trim(email)) as email_lower,
    row_number() over (partition by lower(trim(email)) order by created_at asc, id asc) as rn
  from public.people
  where email is not null and trim(email) <> ''
),
duplicates as (
  select r.id as duplicate_id, keeper.id as keep_id
  from ranked r
  join ranked keeper on keeper.email_lower = r.email_lower and keeper.rn = 1
  where r.rn > 1
)
update public.projects p
set contact_id = duplicates.keep_id
from duplicates
where p.contact_id = duplicates.duplicate_id;

with ranked as (
  select
    id,
    lower(trim(email)) as email_lower,
    row_number() over (partition by lower(trim(email)) order by created_at asc, id asc) as rn
  from public.people
  where email is not null and trim(email) <> ''
)
delete from public.people
where id in (select id from ranked where rn > 1);
