"use client";

import { useActionState } from "react";
import { createToken } from "./actions";

export function TokenForm() {
  const [token, formAction, pending] = useActionState(createToken, null);

  return (
    <div>
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="bg-gray-900 text-white rounded-lg px-4 py-2 hover:bg-gray-700 disabled:opacity-50"
        >
          {pending ? "発行中…" : "トークンを発行"}
        </button>
      </form>

      {token && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-900 mb-2">
            この合言葉は今だけ表示されます。コピーして、拡張機能の設定に貼り付けてください。
          </p>
          <code className="block break-all bg-white border border-amber-200 rounded px-2 py-1 text-sm select-all">
            {token}
          </code>
        </div>
      )}
    </div>
  );
}
