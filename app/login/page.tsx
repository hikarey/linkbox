import { login, signup } from "./actions";

const errorMessages: Record<string, string> = {
  login: "メールアドレスかパスワードが違います",
  signup: "登録できませんでした（パスワードは6文字以上）",
  confirm: "確認リンクが無効か、期限が切れています",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center px-4">
      <form className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-sm flex flex-col gap-3">
        <h1 className="text-xl font-bold mb-2">Linkbox</h1>

        {error && (
          <p className="text-sm text-red-600">
            {errorMessages[error] ?? "エラーが発生しました"}
          </p>
        )}
        {message === "check-email" && (
          <p className="text-sm text-green-700">
            確認メールを送りました。メールのリンクを押して登録を完了してください。
          </p>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">メールアドレス</span>
          <input
            name="email"
            type="email"
            required
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">パスワード</span>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
        </label>

        <button
          formAction={login}
          className="bg-gray-900 text-white rounded-lg px-4 py-2 mt-2 hover:bg-gray-700"
        >
          ログイン
        </button>
        <button
          formAction={signup}
          className="border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-100"
        >
          新規登録
        </button>
      </form>
    </main>
  );
}
