-- Linkbox のデータベース定義
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
  created_at timestamptz not null default now(),
  deleted_at timestamptz            -- 論理削除：消した日時。null なら有効
);

-- URL の重複禁止は「同じユーザー」の「削除されていない行」の中だけ
-- （削除済みの行があっても同じ URL を登録し直せる / 別のユーザーは同じ URL を登録できる）
create unique index links_user_url_active
  on links (user_id, url)
  where deleted_at is null;

-- タグ
create table tags (
  id      bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name    text not null,
  unique (user_id, name)            -- タグ名はユーザーごとに重複しない
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
  created_at timestamptz not null default now()
);

-- =========================================================
-- Row Level Security（持ち主だけが自分の行を読み書きできる）
-- =========================================================

alter table links      enable row level security;
alter table tags       enable row level security;
alter table link_tags  enable row level security;
alter table api_tokens enable row level security;

-- links / tags：user_id が自分の行だけ
create policy "自分のリンクだけ操作できる"
  on links for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "自分のタグだけ操作できる"
  on tags for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- link_tags：user_id を持たないので、つながっているリンクとタグが両方とも自分のものかで判定する
create policy "自分のリンクとタグの対応だけ操作できる"
  on link_tags for all to authenticated
  using (
    exists (select 1 from links where links.id = link_id and links.user_id = (select auth.uid()))
    and exists (select 1 from tags where tags.id = tag_id and tags.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from links where links.id = link_id and links.user_id = (select auth.uid()))
    and exists (select 1 from tags where tags.id = tag_id and tags.user_id = (select auth.uid()))
  );

-- api_tokens：自分のトークンの発行・一覧・削除だけ
-- （API ルートでの照合は RLS を通らない管理者キーで行い、コード側で user_id を絞っている）
create policy "自分のトークンだけ操作できる"
  on api_tokens for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
