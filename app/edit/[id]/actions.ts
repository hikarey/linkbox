"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function updateLink(formData: FormData) {
  const id = Number(formData.get("id"));
  const url = String(formData.get("url") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!id || !url) return;

  const tagNames = [
    ...new Set(
      String(formData.get("tags") ?? "")
        .split(/[,、]/)
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t !== "")
    ),
  ];

  // 1. links を更新
  const { data, error } = await supabase
    .from("links")
    .update({ url, title: title || null })
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("更新に失敗:", error.message);
    return;
  }
  if (!data || data.length === 0) {
    console.error("更新できませんでした（RLSのルールを確認）");
    return;
  }

  // 2. 今のタグ付けを全部外す
  const { error: delError } = await supabase
    .from("link_tags")
    .delete()
    .eq("link_id", id);
  if (delError) console.error("タグの解除に失敗:", delError.message);

  // 3. 入力されたタグで付け直す（追加のときと同じ手順）
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
        .insert(tags.map((tag) => ({ link_id: id, tag_id: tag.id })));
      if (ltError) console.error("タグ付けに失敗:", ltError.message);
    }
  }

  revalidatePath("/");
  redirect("/");
}
