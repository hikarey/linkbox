import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { updateLink } from "./actions";

export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: link } = await supabase
    .from("links")
    .select("id, title, url, tags(name)")
    .eq("id", Number(id))
    .maybeSingle();

  if (!link) notFound();

  const tagText = link.tags.map((t) => t.name).join(", ");

  return (
    <main className="p-8 max-w-xl">
      <h1 className="text-2xl font-bold mb-4">リンクを編集</h1>

      <form action={updateLink} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={link.id} />

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">URL</span>
          <input
            name="url"
            type="url"
            required
            defaultValue={link.url}
            className="border rounded px-2 py-1"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">名前</span>
          <input
            name="title"
            defaultValue={link.title ?? ""}
            className="border rounded px-2 py-1"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">タグ（カンマ区切り）</span>
          <input
            name="tags"
            defaultValue={tagText}
            className="border rounded px-2 py-1"
          />
        </label>

        <div className="flex gap-2">
          <button type="submit" className="border rounded px-3 py-1">
            保存
          </button>
          <Link href="/" className="px-3 py-1 text-gray-600">
            キャンセル
          </Link>
        </div>
      </form>
    </main>
  );
}
