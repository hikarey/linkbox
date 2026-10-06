"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { fetchYoutubeName } from "@/lib/youtube";
import { handleFromUrl } from "@/lib/link-name";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// タグ入力「料理, 音楽、料理」を ["料理", "音楽"] に整える
function parseTags(input: FormDataEntryValue | null): string[] {
  return [
    ...new Set(
      String(input ?? "")
        .split(/[,、]/)
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t !== "")
    ),
  ];
}

// リンクにタグを付ける（すでに付いているタグは無視）
async function attachTags(supabase: Supabase, linkId: number, tagNames: string[]) {
  if (tagNames.length === 0) return;

  const { error: tagError } = await supabase
    .from("tags")
    .upsert(
      tagNames.map((name) => ({ name })),
      { onConflict: "user_id,name", ignoreDuplicates: true }
    );
  if (tagError) console.error("タグ追加に失敗:", tagError.message);

  const { data: tags } = await supabase
    .from("tags")
    .select("id")
    .in("name", tagNames);
  if (!tags) return;

  const { error: ltError } = await supabase
    .from("link_tags")
    .upsert(
      tags.map((tag) => ({ link_id: linkId, tag_id: tag.id })),
      { onConflict: "link_id,tag_id", ignoreDuplicates: true }
    );
  if (ltError) console.error("タグ付けに失敗:", ltError.message);
}

export async function addLink(formData: FormData) {
  const supabase = await createClient();

  const url = String(formData.get("url") ?? "").trim();
  if (!url) return;

  const tagNames = parseTags(formData.get("tags"));

  // すでに登録済みなら、タグだけ足してお知らせ
  const { data: existing } = await supabase
    .from("links")
    .select("id")
    .eq("url", url)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing) {
    await attachTags(supabase, existing.id, tagNames);
    revalidatePath("/");
    redirect(`/?exists=${existing.id}${tagNames.length > 0 ? "&tagged=1" : ""}`);
  }

  // 名前が空なら自動で取得
  let title = String(formData.get("title") ?? "").trim();
  if (!title) {
    title = (await fetchYoutubeName(url)) ?? handleFromUrl(url) ?? "";
  }

  const { data: link, error } = await supabase
    .from("links")
    .insert({ url, title: title || null })
    .select("id")
    .single();

  if (error) {
    console.error("追加に失敗:", error.message);
    return;
  }

  await attachTags(supabase, link.id, tagNames);
  revalidatePath("/");
}

// 削除（論理削除：deleted_at に今の日時を入れる）
export async function deleteLink(formData: FormData) {
  const supabase = await createClient();

  const id = Number(formData.get("id"));
  if (!id) return;

  const { data, error } = await supabase
    .from("links")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("削除に失敗:", error.message);
    return;
  }
  if (!data || data.length === 0) {
    console.error("削除できませんでした（RLSのルールを確認）");
    return;
  }

  revalidatePath("/");
  redirect(`/?deleted=${id}`);
}

// 元に戻す（deleted_at を空に戻す）
export async function restoreLink(formData: FormData) {
  const supabase = await createClient();

  const id = Number(formData.get("id"));
  if (!id) return;

  const { error } = await supabase
    .from("links")
    .update({ deleted_at: null })
    .eq("id", id);

  if (error) {
    console.error("元に戻すのに失敗:", error.message);
    return;
  }

  revalidatePath("/");
  redirect("/");
}
