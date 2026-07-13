/** Render a ```demo-terminal block: `$ ...` lines are commands, rest is output. */
export function DemoTerminal({ text }) {
  const lines = text.split("\n");
  return (
    <div className="demo-terminal">
      <div className="term-bar">
        <span /><span /><span />
      </div>
      <pre className="term-body">
        {lines.map((line, i) => {
          const isCmd = line.trimStart().startsWith("$");
          return (
            <div key={i} className={isCmd ? "term-cmd" : "term-out"}>
              {line || " "}
            </div>
          );
        })}
      </pre>
    </div>
  );
}

const ROLE_RE = /^(user|agent|result)\s*:\s*(.*)$/i;

/** Render a ```demo-conversation block: user:/agent:/result: -> chat bubbles. */
export function DemoConversation({ text }) {
  const lines = text.split("\n");
  const turns = [];
  for (const line of lines) {
    const m = line.match(ROLE_RE);
    if (m) {
      turns.push({ role: m[1].toLowerCase(), text: m[2] });
    } else if (turns.length && line.trim()) {
      // continuation line for the previous turn
      turns[turns.length - 1].text += "\n" + line;
    }
  }
  return (
    <div className="demo-conversation">
      {turns.map((t, i) => (
        <div key={i} className={`bubble ${t.role}`}>
          <span className="who">{t.role}</span>
          {t.text}
        </div>
      ))}
    </div>
  );
}
