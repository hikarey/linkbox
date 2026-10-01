"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function addLink(formData: FormData) {
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

// 削除（論理削除：deleted_at に今の日時を入れる）
export async function deleteLink(formData: FormData) {
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
