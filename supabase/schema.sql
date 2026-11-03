-- Linkbox のデータベース定義（本番の Supabase と同じ構成）
-- Supabase の SQL Editor で上から順に実行すると、空のプロジェクトに同じ構成を作れます。

-- =========================================================
-- テーブル
-- =========================================================

-- リンク
create table links (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  url        text not null,
  platform   text,
  kind       text,
  title      text,
  memo       text,
  created_at timestamptz default now(),
  deleted_at timestamptz            -- 論理削除：消した日時。null なら有効
);

-- URL の重複禁止は「同じユーザー」の「削除されていない行」の中だけ
-- （削除済みの行があっても同じ URL を登録し直せる / 別のユーザーは同じ URL を登録できる）
create unique index links_url_active
  on links (user_id, url)
  where deleted_at is null;

-- タグ（タグ名はユーザーごとに重複しない）
create table tags (
  id      bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name    text not null,
  constraint tags_user_name_key unique (user_id, name)
);

-- リンクとタグの対応表（多対多）
create table link_tags (
  link_id bigint not null references links(id) on delete cascade,
  tag_id  bigint not null references tags(id) on delete cascade,
  primary key (link_id, tag_id)
);

-- Chrome 拡張機能用の API トークン（トークンそのものは保存せず、SHA-256 のハッシュだけ持つ）
create table api_tokens (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz default now()
);

-- =========================================================
-- Row Level Security（持ち主だけが自分の行を読み書きできる）
-- =========================================================

alter table links      enable row level security;
alter table tags       enable row level security;
alter table link_tags  enable row level security;
alter table api_tokens enable row level security;

create policy "links は自分のものだけ"
  on links for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "tags は自分のものだけ"
  on tags for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- link_tags は user_id を持たないので、つながっているリンクの持ち主で判定する。
-- 追加・更新のときは、タグも自分のものであることを確かめる（他人のタグを付けられないように）
create policy "link_tags は自分のものだけ"
  on link_tags for all to authenticated
  using (
    exists (select 1 from links
            where links.id = link_tags.link_id and links.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from links
            where links.id = link_tags.link_id and links.user_id = (select auth.uid()))
    and exists (select 1 from tags
                where tags.id = link_tags.tag_id and tags.user_id = (select auth.uid()))
  );

-- API ルートでの照合は RLS を通らない管理者キーで行い、コード側で user_id を必ず絞っている
create policy "api_tokens は自分のものだけ"
  on api_tokens for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
