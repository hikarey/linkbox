import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { addLink, deleteLink } from "./actions";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;

  const { data: allTags } = await supabase
    .from("tags")
    .select("name")
    .order("name");

  let query = supabase
    .from("links")
    .select("id, title, url, tags(name)")
    .order("created_at", { ascending: false });

  if (tag) {
    const { data: tagRow } = await supabase
      .from("tags")
      .select("id")
      .eq("name", tag)
      .maybeSingle();

    const { data: rows } = await supabase
      .from("link_tags")
      .select("link_id")
      .eq("tag_id", tagRow?.id ?? -1);

    const ids = (rows ?? []).map((r) => r.link_id);
    query = query.in("id", ids);
  }

  const { data: links, error } = await query;

  if (error) {
    return <p className="p-8 text-red-600">エラー: {error.message}</p>;
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Linkbox</h1>

      <form action={addLink} className="flex flex-wrap gap-2 mb-6">
        <input
          name="url"
          type="url"
          required
          placeholder="https://..."
          className="border rounded px-2 py-1 flex-1"
        />
        <input
          name="title"
          placeholder="名前"
          className="border rounded px-2 py-1"
        />
        <input
          name="tags"
          placeholder="タグ（料理, あとで見る）"
          className="border rounded px-2 py-1"
        />
        <button type="submit" className="border rounded px-3 py-1">
          追加
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/"
          className={`text-sm rounded px-3 py-1 border ${
            !tag ? "bg-black text-white" : ""
          }`}
        >
          すべて
        </Link>
        {(allTags ?? []).map((t) => (
          <Link
            key={t.name}
            href={`/?tag=${encodeURIComponent(t.name)}`}
            className={`text-sm rounded px-3 py-1 border ${
              tag === t.name ? "bg-black text-white" : ""
            }`}
          >
            {t.name}
          </Link>
        ))}
      </div>

      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.id} className="flex items-start justify-between gap-4">
            <div>
              <a href={link.url} className="text-blue-600 underline">
                {link.title ?? link.url}
              </a>
              <div className="flex gap-1 mt-1">
                {link.tags.map((t) => (
                  <Link
                    key={t.name}
                    href={`/?tag=${encodeURIComponent(t.name)}`}
                    className="text-xs bg-gray-100 text-gray-700 rounded px-2 py-0.5"
                  >
                    {t.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link href={`/edit/${link.id}`} className="text-sm text-gray-600">
                編集
              </Link>
              <form action={deleteLink}>
                <input type="hidden" name="id" value={link.id} />
                <button type="submit" className="text-sm text-red-600">
                  削除
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
