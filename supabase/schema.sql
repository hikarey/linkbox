-- テーブル作成
create table links (
  id bigint generated always as identity primary key,
  url text not null unique,
  platform text,
  kind text,
  title text,
  memo text,
  created_at timestamptz default now()
);

create table tags (
  id bigint generated always as identity primary key,
  name text not null unique
);

create table link_tags (
  link_id bigint references links(id) on delete cascade,
  tag_id bigint references tags(id) on delete cascade,
  primary key (link_id, tag_id)
);

-- RLS を有効化
alter table links     enable row level security;
alter table tags      enable row level security;
alter table link_tags enable row level security;

-- ポリシー：links は誰でも読める
create policy "links は誰でも読める"
  on links for select
  to anon
  using (true);

-- ポリシー：links は誰でも追加できる（公開前にログイン制限に変える）
create policy "links は誰でも追加できる"
  on links for insert
  to anon
  with check (true);

-- ポリシー：tags / link_tags の読み取りと追加（公開前にログイン制限に変える）
create policy "tags は誰でも読める"
  on tags for select to anon using (true);
create policy "tags は誰でも追加できる"
  on tags for insert to anon with check (true);
create policy "link_tags は誰でも読める"
  on link_tags for select to anon using (true);
create policy "link_tags は誰でも追加できる"
  on link_tags for insert to anon with check (true);

-- ポリシー：links は誰でも削除できる（公開前にログイン制限に変える）
create policy "links は誰でも削除できる"
  on links for delete to anon using (true);

-- ポリシー：編集用（公開前にログイン制限に変える）
create policy "links は誰でも更新できる"
  on links for update to anon
  using (true) with check (true);
create policy "link_tags は誰でも削除できる"
  on link_tags for delete to anon
  using (true);

-- 論理削除のための列と、URL重複禁止の作り直し
alter table links add column deleted_at timestamptz;
alter table links drop constraint links_url_key;
create unique index links_url_active on links (url) where deleted_at is null;
