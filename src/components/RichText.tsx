// 問題文の表示。空行で段落を分け、"|" で始まる行のかたまりは表として描く

type Block = { kind: 'text'; text: string } | { kind: 'table'; rows: string[][] };

function parse(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  let buf: string[] = [];
  let table: string[][] | null = null;

  const flushText = () => {
    const text = buf.join('\n').trim();
    if (text) blocks.push({ kind: 'text', text });
    buf = [];
  };
  const flushTable = () => {
    if (table && table.length) blocks.push({ kind: 'table', rows: table });
    table = null;
  };

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('|')) {
      flushText();
      if (/^\|[\s|:-]+\|?$/.test(t) && t.includes('-')) continue; // 区切り行 |---|---|
      const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      (table ??= []).push(cells);
    } else {
      flushTable();
      buf.push(line);
    }
  }
  flushTable();
  flushText();
  return blocks;
}

export function RichText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {parse(text).map((b, i) =>
        b.kind === 'text' ? (
          <p key={i} className="whitespace-pre-wrap break-words">
            {b.text}
          </p>
        ) : (
          <div key={i} className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <tbody>
                {b.rows.map((row, r) => (
                  <tr key={r} className={r === 0 ? 'bg-slate-100 dark:bg-slate-800' : ''}>
                    {row.map((cell, c) => (
                      <td key={c} className="border border-slate-300 px-2 py-1 align-top whitespace-pre-wrap dark:border-slate-600">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      )}
    </div>
  );
}
