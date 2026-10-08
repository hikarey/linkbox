"use server";

import { randomBytes, createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";

// トークンを発行して、合言葉そのものを返す（DBにはハッシュだけ保存）
export async function createToken(_prev: string | null): Promise<string | null> {
  const supabase = await createClient();

  const token = "lb_" + randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const { error } = await supabase
    .from("api_tokens")
    .insert({ token_hash: tokenHash });

  if (error) {
    console.error("トークン発行に失敗:", error.message);
    return null;
  }

  revalidatePath("/settings");
  return token;
}

export async function deleteToken(formData: FormData) {
  const supabase = await createClient();
  const id = Number(formData.get("id"));
  if (!id) return;

  await supabase.from("api_tokens").delete().eq("id", id);
  revalidatePath("/settings");
}
