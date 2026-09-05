-- テストデータ追加(商談・案件・フリーランスのバリエーション拡充)。
-- ・既存3ユーザーを部署バラバラに配属(新規ユーザー5名の追加はauth.usersとの
--   外部キー制約上、実際にGoogleログインした実在アカウントでないと登録できない
--   ため、SQLだけでは作成できない。詳細は報告メッセージ側で説明する)。
-- ・商談を6件追加(見積提出済・保留を含め、ステータスのバリエーションを増やす)。
-- ・既存の「株式会社フォレストIT」に案件を3件追加し、同じ企業で複数案件が
--   異なるステータス(進行中/契約済/完了)で動いている状態を再現する。
--   「株式会社みなと印刷」にも案件を1件追加する。
-- ・フリーランスを5名追加し、一部は新規案件にアサインして
--   「進行中案件数」が0件のままにならない例も作る。

do $$
declare
  v_forest_it_id uuid;
  v_minato_id uuid;
  v_aoba_id uuid;
  v_shonan_id uuid;
  v_yuubi_id uuid;
  v_otemachi_id uuid;

  v_yamaguchi_id uuid; -- 山口彩香
  v_yamada_id uuid;    -- 山田太郎
  v_tanaka_id uuid;    -- 田中花子

  v_person_nakajima_id uuid;
  v_person_hashimoto_id uuid;
  v_person_matsuoka_id uuid;
  v_person_endo_id uuid;
  v_person_kondo_id uuid;
  v_person_ishii_id uuid;
  v_person_forest_contact_id uuid;

  v_project_blog_id uuid;
  v_project_recruit_id uuid;
  v_project_maintenance_id uuid;
  v_project_minato_video_id uuid;

  v_role_writer_id uuid;
  v_role_designer_id uuid;

  v_fl_1005_id uuid;
  v_fl_1002_id uuid;
begin
  -- 既存ユーザーを部署バラバラに配属(部署テーブル自体は既存のCS部/営業部/経理部を使う)
  select id into v_yamaguchi_id from public.users where email = 'mihiro.dev.test@gmail.com';
  select id into v_yamada_id from public.users where email = 'mihiro.create@gmail.com';
  select id into v_tanaka_id from public.users where email = 'rythm.che.r.ry@gmail.com';

  update public.users set department_id = (select id from public.departments where name = 'CS部') where id = v_yamaguchi_id;
  update public.users set department_id = (select id from public.departments where name = '営業部') where id = v_yamada_id;
  update public.users set department_id = (select id from public.departments where name = '経理部') where id = v_tanaka_id;

  -- 既存企業のidを引いておく
  select id into v_forest_it_id from public.companies where name = '株式会社フォレストIT';
  select id into v_minato_id from public.companies where name = '株式会社みなと印刷';
  select id into v_aoba_id from public.companies where name = '青葉商事';
  select id into v_shonan_id from public.companies where name = '湘南アパレル株式会社';

  -- 新規企業を2社追加
  insert into public.companies (name, industry) values ('ゆうび出版株式会社', '出版') returning id into v_yuubi_id;
  insert into public.companies (name, industry) values ('大手町フィットネス株式会社', 'フィットネス') returning id into v_otemachi_id;

  -- 商談用の新規担当者(people)
  insert into public.people (company_id, name, email, phone) values (v_forest_it_id, '中島遥', 'nakajima.haruka@example.com', '090-1111-2001') returning id into v_person_nakajima_id;
  insert into public.people (company_id, name, email, phone) values (v_aoba_id, '橋本直樹', 'hashimoto.naoki@example.com', '090-1111-2002') returning id into v_person_hashimoto_id;
  insert into public.people (company_id, name, email, phone) values (v_yuubi_id, '松岡里奈', 'matsuoka.rina@example.com', '090-1111-2003') returning id into v_person_matsuoka_id;
  insert into public.people (company_id, name, email, phone) values (v_otemachi_id, '遠藤健二', 'endo.kenji@example.com', '090-1111-2004') returning id into v_person_endo_id;
  insert into public.people (company_id, name, email, phone) values (v_minato_id, '近藤沙織', 'kondo.saori@example.com', '090-1111-2005') returning id into v_person_kondo_id;
  insert into public.people (company_id, name, email, phone) values (v_shonan_id, '石井大樹', 'ishii.daiki@example.com', '090-1111-2006') returning id into v_person_ishii_id;

  -- 商談を6件追加(ステータスのバリエーション: 保留・見積提出済・対応中・商談中)
  insert into public.deals (person_id, source, job_categories, inquiry_body, status, assigned_user_id)
    values (v_person_nakajima_id, 'referral', array['designer']::text[], '既存サイトの保守運用について相談したい。', 'on_hold', v_yamaguchi_id);

  insert into public.deals (person_id, source, job_categories, inquiry_body, status, assigned_user_id, estimate_submitted_at)
    values (v_person_hashimoto_id, 'form', array['writer']::text[], '会社案内パンフレットの増刷+内容更新を検討中。', 'estimate_submitted', v_yamada_id, now() - interval '10 days');

  insert into public.deals (person_id, source, job_categories, inquiry_body, status, assigned_user_id)
    values (v_person_matsuoka_id, 'referral', array['writer','marketer']::text[], '季刊誌の新連載企画について相談したい。', 'in_progress', v_tanaka_id);

  insert into public.deals (person_id, source, job_categories, inquiry_body, status)
    values (v_person_endo_id, 'form', array['photographer','marketer']::text[], '新店舗オープンに向けたSNS施策を相談したい。', 'negotiating');

  insert into public.deals (person_id, source, job_categories, inquiry_body, status)
    values (v_person_kondo_id, 'other', array['designer']::text[], '名刺デザインのリニューアルを検討中。', 'on_hold');

  insert into public.deals (person_id, source, job_categories, inquiry_body, status, estimate_submitted_at)
    values (v_person_ishii_id, 'referral', array['photographer']::text[], '来期カタログの商品撮影について。', 'estimate_submitted', now() - interval '3 days');

  -- 株式会社フォレストITの既存担当者(加藤麻衣)を新規案件のcontact_idに使う
  select p.id into v_person_forest_contact_id
  from public.people p
  where p.company_id = v_forest_it_id and p.name = '加藤麻衣'
  limit 1;

  -- 同じ企業(株式会社フォレストIT)に、異なるステータスの案件を3件追加
  insert into public.projects (company_id, contact_id, title, budget, start_date, end_date, status)
    values (v_forest_it_id, v_person_forest_contact_id, '自社ブログSEOリライト', 800000, '2026-09-01', '2026-11-30', 'in_progress')
    returning id into v_project_blog_id;

  insert into public.projects (company_id, contact_id, title, budget, start_date, end_date, status)
    values (v_forest_it_id, v_person_forest_contact_id, '採用ページリニューアル', 1200000, '2026-10-01', '2027-01-31', 'contracted')
    returning id into v_project_recruit_id;

  insert into public.projects (company_id, contact_id, title, budget, start_date, end_date, status)
    values (v_forest_it_id, v_person_forest_contact_id, '社内システム保守(月額)', 300000, '2026-04-01', '2026-08-31', 'completed')
    returning id into v_project_maintenance_id;

  -- 株式会社みなと印刷にも案件を1件追加
  insert into public.projects (company_id, title, budget, start_date, end_date, status)
    values (v_minato_id, '会社案内動画制作', 950000, '2026-09-15', '2026-12-20', 'in_progress')
    returning id into v_project_minato_video_id;

  -- フリーランスを5名追加
  insert into public.freelancers (platform_freelancer_id, name, email, job_categories, last_imported_at) values
    ('FL-1021', '中野彩', 'nakano.aya@example.com', array['writer']::text[], now()),
    ('FL-1022', '藤田翼', 'fujita.tsubasa@example.com', array['photographer']::text[], now()),
    ('FL-1023', '岡田美月', 'okada.mizuki@example.com', array['marketer']::text[], now()),
    ('FL-1024', '石田健', 'ishida.ken@example.com', array['designer']::text[], now()),
    ('FL-1025', '村上さくら', 'murakami.sakura@example.com', array['writer','marketer']::text[], now());

  -- 既存フリーランスを新規案件にアサインし、「進行中案件数」が0件のままにならない例を作る
  select id into v_fl_1005_id from public.freelancers where platform_freelancer_id = 'FL-1005';
  select id into v_fl_1002_id from public.freelancers where platform_freelancer_id = 'FL-1002';

  insert into public.project_roles (project_id, job_category, headcount) values (v_project_blog_id, 'writer', 1) returning id into v_role_writer_id;
  insert into public.project_roles (project_id, job_category, headcount) values (v_project_recruit_id, 'designer', 1) returning id into v_role_designer_id;

  insert into public.project_role_assignments (project_role_id, freelancer_id, assigned_at) values (v_role_writer_id, v_fl_1005_id, now());
  insert into public.project_role_assignments (project_role_id, freelancer_id, assigned_at) values (v_role_designer_id, v_fl_1002_id, now());
end $$;
