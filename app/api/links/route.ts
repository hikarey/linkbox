import { createHash } from "crypto";
import { type NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase-admin";
import { fetchYoutubeName } from "@/lib/youtube";
import { handleFromUrl } from "@/lib/link-name";

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  // ① 合言葉から持ち主を調べる
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return NextResponse.json({ error: "トークンがありません" }, { status: 401 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: tokenRow } = await supabase
    .from("api_tokens")
    .select("user_id")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!tokenRow) {
    return NextResponse.json({ error: "トークンが正しくありません" }, { status: 401 });
  }
  const userId = tokenRow.user_id;

  // ② 送られてきた中身を読む
  let body: { url?: string; title?: string; tags?: string | string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "中身が読めません" }, { status: 400 });
  }

  const url = String(body.url ?? "").trim();
  if (!url) {
    return NextResponse.json({ error: "URLがありません" }, { status: 400 });
  }

  const rawTags = Array.isArray(body.tags) ? body.tags.join(",") : String(body.tags ?? "");
  const tagNames = [
    ...new Set(
      rawTags
        .split(/[,、]/)
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t !== "")
    ),
  ];

  // ③ 登録済みか調べる（RLSが効かないので、user_id で必ず絞る）
  const { data: existing } = await supabase
    .from("links")
    .select("id")
    .eq("user_id", userId)
    .eq("url", url)
    .is("deleted_at", null)
    .maybeSingle();

  let linkId: number;
  let status: "created" | "exists";

  if (existing) {
    linkId = existing.id;
    status = "exists";
  } else {
    // 名前：YouTube → 拡張機能から届いたページのタイトル → URLのユーザー名
    let title = (await fetchYoutubeName(url)) ?? "";
    if (!title) title = String(body.title ?? "").trim();
    if (!title) title = handleFromUrl(url) ?? "";

    const { data: link, error } = await supabase
      .from("links")
      .insert({ url, title: title || null, user_id: userId })
      .select("id")
      .single();

    if (error || !link) {
      console.error("API 追加に失敗:", error?.message);
      return NextResponse.json({ error: "保存できませんでした" }, { status: 500 });
    }
    linkId = link.id;
    status = "created";
  }

  // ④ タグを付ける（ここも user_id を必ず指定）
  if (tagNames.length > 0) {
    await supabase
      .from("tags")
      .upsert(
        tagNames.map((name) => ({ name, user_id: userId })),
        { onConflict: "user_id,name", ignoreDuplicates: true }
      );

    const { data: tags } = await supabase
      .from("tags")
      .select("id")
      .eq("user_id", userId)
      .in("name", tagNames);

    if (tags) {
      await supabase
        .from("link_tags")
        .upsert(
          tags.map((t) => ({ link_id: linkId, tag_id: t.id })),
          { onConflict: "link_id,tag_id", ignoreDuplicates: true }
        );
    }
  }

  revalidatePath("/");
  return NextResponse.json({ ok: true, status });
}
