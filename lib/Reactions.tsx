import { useDataChannel } from '@livekit/components-react';
import * as React from 'react';

// Emoji reactions, sent as data messages on the `reaction` topic. They are
// fleeting by design: someone who joins later does not see earlier ones.
export const REACTIONS = ['👍', '❤️', '😂', '🎉', '👏', '😮'];
const TOPIC = 'reaction';
const SHOWN_MS = 3000;

export type Reaction = { id: number; emoji: string; name: string; left: number };

const encoder = new TextEncoder();
const decoder = new TextDecoder();
let nextId = 0;

export function useReactions() {
  const [reactions, setReactions] = React.useState<Reaction[]>([]);

  const show = React.useCallback((emoji: string, name: string) => {
    const id = nextId++;
    // Keep the overlay bounded if someone taps away.
    setReactions((prev) => [...prev.slice(-20), { id, emoji, name, left: Math.random() * 60 }]);
    setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), SHOWN_MS);
  }, []);

  const { send } = useDataChannel(TOPIC, (msg) => {
    const emoji = decoder.decode(msg.payload);
    // Only the known set: the payload comes from other participants.
    if (REACTIONS.includes(emoji)) {
      show(emoji, msg.from?.name || msg.from?.identity || '');
    }
  });

  const react = React.useCallback(
    (emoji: string) => {
      send(encoder.encode(emoji), { reliable: true }).catch((e) =>
        console.error('could not send reaction', e),
      );
      // Data messages are not echoed back to the sender.
      show(emoji, 'You');
    },
    [send, show],
  );

  return { reactions, react };
}

export function ReactionButton({ onReact }: { onReact: (emoji: string) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="meet-reaction-picker">
      {open && (
        <div className="meet-reaction-menu" role="menu">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              className="lk-button"
              role="menuitem"
              onClick={() => onReact(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      <button
        className="lk-button"
        onClick={() => setOpen(!open)}
        aria-pressed={open}
        aria-haspopup="menu"
        title="Reactions"
      >
        <span aria-hidden="true">😊</span>
        <span className="meet-bar-label">React</span>
      </button>
    </div>
  );
}

export function ReactionOverlay({ reactions }: { reactions: Reaction[] }) {
  return (
    <div className="meet-reactions" aria-hidden="true">
      {reactions.map((r) => (
        <div key={r.id} className="meet-reaction" style={{ left: `${r.left}%` }}>
          <span className="meet-reaction-emoji">{r.emoji}</span>
          {r.name && <span className="meet-reaction-name">{r.name}</span>}
        </div>
      ))}
    </div>
  );
}
