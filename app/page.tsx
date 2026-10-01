import Link from "next/link";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

async function addLink(formData: FormData) {
  "use server";

  const url = String(formData.get("url") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!url) return;

  const tagNames = [
    ...new Set(
      String(formData.get("tags") ?? "")
        .split(/[,、]/)
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t !== "")
    ),
  ];

  const { data: link, error } = await supabase
    .from("links")
    .insert({ url, title: title || null })
    .select("id")
    .single();

  if (error) {
    console.error("追加に失敗:", error.message);
    return;
  }

  if (tagNames.length > 0) {
    const { error: tagError } = await supabase
      .from("tags")
      .upsert(
        tagNames.map((name) => ({ name })),
        { onConflict: "name", ignoreDuplicates: true }
      );
    if (tagError) console.error("タグ追加に失敗:", tagError.message);

    const { data: tags } = await supabase
      .from("tags")
      .select("id")
      .in("name", tagNames);

    if (tags) {
      const { error: ltError } = await supabase
        .from("link_tags")
        .insert(tags.map((tag) => ({ link_id: link.id, tag_id: tag.id })));
      if (ltError) console.error("タグ付けに失敗:", ltError.message);
    }
  }

  revalidatePath("/");
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;

  // タグの一覧（絞り込みボタン用）
  const { data: allTags } = await supabase
    .from("tags")
    .select("name")
    .order("name");

  // リンクの一覧を取る準備
  let query = supabase
    .from("links")
    .select("id, title, url, tags(name)")
    .order("created_at", { ascending: false });

  // タグが指定されていたら絞り込む
  if (tag) {
    // 1. タグ名から id を調べる
    const { data: tagRow } = await supabase
      .from("tags")
      .select("id")
      .eq("name", tag)
      .maybeSingle();

    // 2. そのタグが付いている link_id を集める
    const { data: rows } = await supabase
      .from("link_tags")
      .select("link_id")
      .eq("tag_id", tagRow?.id ?? -1);

    // 3. その id のリンクだけに絞る
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
          <li key={link.id}>
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
          </li>
        ))}
      </ul>
    </main>
  );
}
