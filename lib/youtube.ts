// YouTube のURLから、動画タイトルかチャンネル名を取ってくる
export async function fetchYoutubeName(url: string): Promise<string | null> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^(www\.|m\.)/, "");
  const parts = u.pathname.split("/").filter((p) => p !== "");

  // ---- 動画のURLかどうか調べて、動画IDを取り出す ----
  let videoId: string | null = null;
  if (host === "youtu.be") {
    videoId = parts[0] ?? null;
  } else if (host === "youtube.com") {
    if (parts[0] === "watch") videoId = u.searchParams.get("v");
    if (parts[0] === "shorts") videoId = parts[1] ?? null;
  }

  if (videoId) {
    return fetchVideoTitle(videoId);
  }

  // ---- チャンネルのURLかどうか調べる ----
  if (host === "youtube.com" && parts[0]) {
    if (parts[0].startsWith("@")) {
      return fetchChannelTitle({ forHandle: decodeURIComponent(parts[0]) });
    }
    if (parts[0] === "channel" && parts[1]) {
      return fetchChannelTitle({ id: parts[1] });
    }
  }

  return null;
}

// 動画タイトル：oEmbed（APIキー不要）
async function fetchVideoTitle(videoId: string): Promise<string | null> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.title ?? null;
  } catch {
    return null;
  }
}

// チャンネル名：YouTube Data API（APIキーが必要）
async function fetchChannelTitle(
  query: { forHandle: string } | { id: string }
): Promise<string | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    console.error("YOUTUBE_API_KEY が設定されていません");
    return null;
  }

  const params = new URLSearchParams({ part: "snippet", key, ...query });
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`
    );
    if (!res.ok) {
      console.error("YouTube API エラー:", res.status);
      return null;
    }
    const json = await res.json();
    return json.items?.[0]?.snippet?.title ?? null;
  } catch {
    return null;
  }
}
