import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { ChatMessage } from '../types';
import { sendChatMessage, fetchChatMessages } from '../services/multiplayer';

interface ChatProps {
  roomId: string;
  playerId: string;
  username: string;
}

const Chat: React.FC<ChatProps> = ({ roomId, playerId, username }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [collapsed, setCollapsed] = useState(true); // Свёрнут по умолчанию
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChatMessages(roomId).then(setMessages);

    const channel = supabase
      .channel(`chat:${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        const msg = payload.new as ChatMessage;
        setMessages(prev => {
          const optIdx = prev.findIndex(m =>
            m.id.startsWith('opt-') && m.player_id === msg.player_id && m.message === msg.message
          );
          if (optIdx !== -1) {
            const updated = [...prev];
            updated[optIdx] = msg;
            return updated;
          }
          return [...prev, msg];
        });
        if (collapsed) setUnread(prev => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, collapsed]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const optimistic: ChatMessage = {
      id: `opt-${Date.now()}`,
      room_id: roomId,
      player_id: playerId,
      username,
      message: text,
      type: 'user',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    await sendChatMessage(roomId, playerId, username, text);
  };

  if (collapsed) {
    return (
      <button
        onClick={() => { setCollapsed(false); setUnread(0); }}
        className="fixed bottom-4 right-4 z-50 px-4 py-2.5 text-[9px]"
        style={{
          backgroundColor: '#1a1a2e',
          border: '2px solid #5555ff',
          color: '#5555ff',
          fontFamily: "'Press Start 2P', monospace",
          boxShadow: '3px 3px 0 #000',
        }}
      >
        💬 ЧАТ {unread > 0 && <span className="text-[#ff4444] ml-1">({unread})</span>}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col"
      style={{ width: '380px', height: '480px', backgroundColor: '#0d0d20', border: '2px solid #5555ff', boxShadow: '4px 4px 0 #000' }}>
      {/* Header */}
      <div className="flex justify-between items-center px-3 py-2 border-b border-[#333]"
        style={{ backgroundColor: '#111' }}>
        <span className="text-[9px] text-[#5555ff]">💬 ЧАТ</span>
        <button onClick={() => setCollapsed(true)} className="text-[10px] text-[#555] hover:text-[#aaa] px-1">✕</button>
      </div>

      {/* Messages */}
      <div className="flex-grow overflow-y-auto px-3 py-2" style={{ fontSize: '9px' }}>
        {messages.map((msg) => (
          <div key={msg.id} className="mb-1.5">
            {msg.type === 'system' ? (
              <div className="text-[#555] italic">⚙ {msg.message}</div>
            ) : (
              <div>
                <span style={{ color: msg.player_id === playerId ? '#5555ff' : '#ffaa00' }}>
                  {msg.username}:
                </span>{' '}
                <span className="text-[#ccc]">{msg.message}</span>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex border-t border-[#333]">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Сообщение..."
          className="flex-grow bg-[#111] text-[#ccc] text-[9px] px-3 py-2 outline-none"
          style={{ fontFamily: "'Press Start 2P', monospace" }}
        />
        <button onClick={handleSend} className="px-3 text-[10px] text-[#5555ff] hover:text-[#7777ff]"
          style={{ backgroundColor: '#111' }}>
          ▶
        </button>
      </div>
    </div>
  );
};

export default Chat;
