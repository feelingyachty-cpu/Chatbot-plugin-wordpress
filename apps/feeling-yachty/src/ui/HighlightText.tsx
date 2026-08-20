import { Text, type TextStyle } from 'react-native';

export function HighlightText({
  text,
  query,
  style,
  highlightStyle,
}: {
  text: string;
  query?: string;
  style?: TextStyle;
  highlightStyle?: TextStyle;
}) {
  const q = (query || '').trim();
  if (!q) {
    return <Text style={style}>{text}</Text>;
  }
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const parts: { str: string; on: boolean }[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const at = lower.indexOf(needle, cursor);
    if (at < 0) {
      parts.push({ str: text.slice(cursor), on: false });
      break;
    }
    if (at > cursor) parts.push({ str: text.slice(cursor, at), on: false });
    parts.push({ str: text.slice(at, at + needle.length), on: true });
    cursor = at + needle.length;
  }
  return (
    <Text style={style}>
      {parts.map((p, i) => (
        <Text key={`${i}-${p.str}`} style={p.on ? highlightStyle : undefined}>
          {p.str}
        </Text>
      ))}
    </Text>
  );
}
