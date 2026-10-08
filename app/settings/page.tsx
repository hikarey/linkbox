import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { deleteToken } from "./actions";
import { TokenForm } from "./token-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: tokens } = await supabase
    .from("api_tokens")
    .select("id, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">設定</h1>
          <Link href="/" className="text-sm text-gray-600 hover:underline">
            一覧に戻る
          </Link>
        </div>

        <section className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="font-medium mb-1">Chrome 拡張機能のトークン</h2>
          <p className="text-sm text-gray-500 mb-4">
            拡張機能から Linkbox に保存するための合言葉です。
          </p>

          <TokenForm />

          <ul className="mt-6 space-y-2">
            {(tokens ?? []).map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between text-sm border-t border-gray-100 pt-2"
              >
                <span>
                  発行日時：
                  {new Date(t.created_at).toLocaleString("ja-JP", {
                    timeZone: "Asia/Tokyo",
                  })}
                </span>
                <form action={deleteToken}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className="text-red-600 hover:underline">
                    削除
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
