export default function Home() {
  const links = [
    { title: "10分でできる簡単パスタ", url: "https://www.youtube.com/" },
    { title: "料理アカウント", url: "https://www.instagram.com/" },
  ];

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Linkbox</h1>
      <ul>
        {links.map((link) => (
          <li key={link.url}>
            <a href={link.url} className="text-blue-600 underline">
              {link.title}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
