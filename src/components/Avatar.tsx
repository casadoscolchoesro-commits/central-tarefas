export function Avatar({
  url,
  name,
  size = 22,
}: {
  url?: string | null;
  name: string;
  size?: number;
}) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className="flex shrink-0 items-center justify-center rounded-full bg-(--color-gray-200) font-medium text-(--color-graphite-700)"
    >
      {initials}
    </span>
  );
}
