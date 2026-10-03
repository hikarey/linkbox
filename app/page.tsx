import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { addLink, deleteLink, restoreLink } from "./actions";
import { logout } from "./login/actions";

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string | string[]; deleted?: string }>;
}) {
  const { tag, deleted } = await searchParams;
  const supabase = await createClient();

  // 選ばれているタグを、必ず配列の形にそろえる
  const selected = tag === undefined ? [] : Array.isArray(tag) ? tag : [tag];

  // タグを押したときの行き先（押したタグを追加 or 外す）
  function toggleHref(name: string) {
    const next = selected.includes(name)
      ? selected.filter((n) => n !== name)
      : [...selected, name];
    if (next.length === 0) return "/";
    const params = new URLSearchParams();
    next.forEach((n) => params.append("tag", n));
    return `/?${params.toString()}`;
  }

  const { data: allTags } = await supabase
    .from("tags")
    .select("name")
    .order("name");

  let query = supabase
    .from("links")
    .select("id, title, url, tags(name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (selected.length > 0) {
    // 1. 選んだタグ名から id を調べる
    const { data: tagRows } = await supabase
      .from("tags")
      .select("id")
      .in("name", selected);
    const tagIds = (tagRows ?? []).map((t) => t.id);

    // 2. それらのタグが付いている行を集める
    const { data: rows } = await supabase
      .from("link_tags")
      .select("link_id")
      .in("tag_id", tagIds);

    // 3. リンクごとに、当てはまったタグの数を数える
    const count = new Map<number, number>();
    for (const r of rows ?? []) {
      count.set(r.link_id, (count.get(r.link_id) ?? 0) + 1);
    }

    // 4. 選んだタグを全部持っているリンクだけ残す
    const ids = [...count]
      .filter(([, c]) => c === selected.length)
      .map(([id]) => id);

    query = query.in("id", ids);
  }

  const { data: links, error } = await query;

  if (error) {
    return <p className="p-8 text-red-600">エラー: {error.message}</p>;
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6"><h1 className="text-2xl font-bold">Linkbox</h1><form action={logout}><button className="text-sm text-gray-600 hover:underline">ログアウト</button></form></div>

        {deleted && (
          <div className="bg-gray-900 text-white rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
            <span className="text-sm">削除しました</span>
            <form action={restoreLink}>
              <input type="hidden" name="id" value={deleted} />
              <button type="submit" className="text-sm font-medium underline">
                元に戻す
              </button>
            </form>
          </div>
        )}

        <form
          action={addLink}
          className="bg-white border border-gray-200 rounded-xl p-4 mb-6 grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]"
        >
          <input
            name="url"
            type="url"
            required
            placeholder="https://..."
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
          <input
            name="title"
            placeholder="名前"
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
          <input
            name="tags"
            placeholder="タグ（料理, 音楽）"
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
          <button
            type="submit"
            className="bg-gray-900 text-white rounded-lg px-4 py-2 hover:bg-gray-700"
          >
            追加
          </button>
        </form>

        <div className="flex flex-wrap gap-2 mb-4">
          <Link
            href="/"
            className={`text-sm rounded-full px-3 py-1 border ${
              selected.length === 0
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white border-gray-300 hover:bg-gray-100"
            }`}
          >
            すべて
          </Link>
          {(allTags ?? []).map((t) => (
            <Link
              key={t.name}
              href={toggleHref(t.name)}
              className={`text-sm rounded-full px-3 py-1 border ${
                selected.includes(t.name)
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white border-gray-300 hover:bg-gray-100"
              }`}
            >
              {t.name}
            </Link>
          ))}
        </div>

        <p className="text-sm text-gray-500 mb-2">
          {selected.length > 0 && `「${selected.join("」と「")}」の両方が付いたリンク：`}
          {links.length} 件
        </p>

        <ul className="space-y-3">
          {links.map((link) => (
            <li
              key={link.id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:underline break-all"
                >
                  {link.title ?? link.url}
                </a>
                <p className="text-xs text-gray-500 mt-0.5">
                  {hostname(link.url)}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {link.tags.map((t) => (
                    <Link
                      key={t.name}
                      href={toggleHref(t.name)}
                      className={`text-xs rounded-full px-2 py-0.5 ${
                        selected.includes(t.name)
                          ? "bg-blue-600 text-white"
                          : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                      }`}
                    >
                      {t.name}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 shrink-0">
                <Link
                  href={`/edit/${link.id}`}
                  className="text-sm text-gray-600 hover:underline"
                >
                  編集
                </Link>
                <form action={deleteLink}>
                  <input type="hidden" name="id" value={link.id} />
                  <button
                    type="submit"
                    className="text-sm text-red-600 hover:underline"
                  >
                    削除
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
