// URL に含まれるユーザー名から、表示用の名前を作る（通信なし）
export function handleFromUrl(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^(www\.|m\.|mobile\.)/, "");
  const parts = u.pathname.split("/").filter((p) => p !== "");
  if (parts.length === 0) return null;
  const first = decodeURIComponent(parts[0]);

  // X（旧Twitter）
  if (host === "x.com" || host === "twitter.com") {
    const notUser = ["home", "explore", "search", "i", "intent", "share",
                     "hashtag", "settings", "messages", "notifications"];
    if (notUser.includes(first)) return null;
    if (parts[1] === "status") return `@${first} のポスト`;
    return `@${first}`;
  }

  // Instagram
  if (host === "instagram.com") {
    const notUser = ["p", "reel", "reels", "stories", "explore",
                     "accounts", "direct", "tv"];
    if (notUser.includes(first)) return null;
    return `@${first}`;
  }

  // TikTok（tiktok.com/@ユーザー名）
  if (host === "tiktok.com" && first.startsWith("@")) return first;

  // YouTube のハンドル（API で取れなかったときの予備）
  if (host === "youtube.com" && first.startsWith("@")) return first;

  return null;
}
