import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { padelService } from '@/api/padelService';
import { Send, MessageCircle, User } from 'lucide-react';

export default function ChatPage() {
  const { user } = useAuth();
  const location = useLocation();
  const allUsers = padelService.getUsers().filter(u => u.id !== user?.id);

  const queryParams = new URLSearchParams(location.search);
  const targetUserId = queryParams.get('userId') || queryParams.get('user');
  const initialMsg = queryParams.get('msg');

  const initialSelectedUser = allUsers.find(u => u.id === targetUserId) || allUsers[0];
  const [selectedUser, setSelectedUser] = useState(initialSelectedUser);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  // Si cambia el parametro de URL o el usuario seleccionado
  useEffect(() => {
    if (targetUserId) {
      const found = allUsers.find(u => u.id === targetUserId);
      if (found) setSelectedUser(found);
    }
  }, [targetUserId]);

  useEffect(() => {
    if (selectedUser) {
      let currentMessages = padelService.getChatMessages(selectedUser.id);

      // Si viene con un mensaje inicial por URL y aún no se envió en esta sesión, enviarlo automáticamente
      if (initialMsg && initialMsg.trim()) {
        const alreadySent = currentMessages.some(m => m.sender_id === user?.id && m.text === initialMsg);
        if (!alreadySent) {
          currentMessages = padelService.sendChatMessage(selectedUser.id, initialMsg);
        }
      }
      setMessages(currentMessages);
    }
  }, [selectedUser, initialMsg]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedUser) return;
    const updated = padelService.sendChatMessage(selectedUser.id, input);
    setMessages(updated);
    setInput('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl h-[calc(100vh-8rem)] flex">
      {/* User Conversations sidebar */}
      <div className="w-64 border-r border-slate-800 p-4 space-y-3 hidden sm:block">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Conversaciones</h3>
        <div className="space-y-1">
          {allUsers.map(u => (
            <div
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                selectedUser?.id === u.id ? 'bg-slate-800 border border-slate-700' : 'hover:bg-slate-800/50'
              }`}
            >
              <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
              <div className="min-w-0">
                <p className="font-bold text-xs text-white truncate">{u.full_name}</p>
                <p className="text-[10px] text-slate-400 truncate">{u.level}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat window */}
      <div className="flex-1 flex flex-col justify-between p-4">
        {/* Chat header */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <img src={selectedUser?.avatar_url} alt="" className="w-9 h-9 rounded-xl object-cover" />
          <div>
            <p className="font-bold text-sm text-white">{selectedUser?.full_name}</p>
            <p className="text-[10px] text-emerald-400">{selectedUser?.level}</p>
          </div>
        </div>

        {/* Message bubble list */}
        <div className="flex-1 py-4 space-y-3 overflow-y-auto">
          {messages.length === 0 && (
            <p className="text-xs text-slate-500 text-center pt-8">
              Todavía no hay mensajes con {selectedUser?.full_name}. ¡Escribí el primero!
            </p>
          )}
          {messages.map(m => {
            const isMine = m.sender_id === user?.id;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-xs sm:max-w-sm rounded-2xl p-3 text-xs leading-relaxed ${
                    isMine
                      ? 'bg-emerald-500 text-slate-950 font-medium'
                      : 'bg-slate-800 text-slate-200 border border-slate-700/60'
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">{m.sender_name}</span>
              </div>
            );
          })}
        </div>

        {/* Input box */}
        <form onSubmit={handleSend} className="flex gap-2 pt-2 border-t border-slate-800">
          <input
            type="text"
            placeholder="Escribí un mensaje..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-2.5 rounded-xl font-bold transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
