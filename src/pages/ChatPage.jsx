import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { padelService } from '@/api/padelService';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { Send, MessageCircle, User } from 'lucide-react';

export default function ChatPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const queryParams = new URLSearchParams(location.search);
  const targetUserId = queryParams.get('userId') || queryParams.get('user');
  const initialMsg = queryParams.get('msg');

  // Auto-scroll al final del chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Cargar lista de usuarios registrados
  useEffect(() => {
    async function loadUsers() {
      const usersList = await padelService.getUsers();
      const filtered = usersList.filter(u => u.id !== user?.id);
      setAllUsers(filtered);

      let targetUser = null;
      if (targetUserId) {
        targetUser = filtered.find(u => u.id === targetUserId || u.email === targetUserId || u.full_name?.toLowerCase().includes(targetUserId.toLowerCase()));
      }
      setSelectedUser(targetUser || filtered[0] || null);
    }
    loadUsers();
  }, [targetUserId, user?.id]);

  // 2. Cargar mensajes, refrescar periódicamente y suscribirse a Realtime
  useEffect(() => {
    if (!selectedUser || !user?.id) return;

    let isMounted = true;

    async function fetchMessages() {
      const msgs = await padelService.getChatMessages(selectedUser.id);
      if (isMounted) {
        setMessages(msgs || []);

        // Si vino un mensaje inicial por URL y aún no se envió
        if (initialMsg && initialMsg.trim()) {
          const alreadySent = msgs.some(m => m.sender_id === user.id && m.text === initialMsg);
          if (!alreadySent) {
            try {
              const newMsg = await padelService.sendChatMessage(selectedUser.id, initialMsg);
              if (isMounted && newMsg) {
                setMessages(prev => [...prev, newMsg]);
              }
            } catch (e) {
              console.error('Error enviando mensaje inicial:', e);
            }
          }
        }
      }
    }

    fetchMessages();

    // Refresco periódico cada 3 segundos como fallback
    const interval = setInterval(fetchMessages, 3000);

    // Suscripción Realtime a Supabase
    let channel;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel(`chat_${user.id}_${selectedUser.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
          },
          (payload) => {
            const newMsg = payload.new;
            if (
              (newMsg.sender_id === user.id && newMsg.receiver_id === selectedUser.id) ||
              (newMsg.sender_id === selectedUser.id && newMsg.receiver_id === user.id)
            ) {
              setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
            }
          }
        )
        .subscribe();
    }

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [selectedUser?.id, user?.id, initialMsg]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedUser || loading) return;

    const textToSend = input.trim();
    setInput('');
    setLoading(true);

    try {
      const sentMsg = await padelService.sendChatMessage(selectedUser.id, textToSend);
      if (sentMsg) {
        setMessages(prev => {
          if (Array.isArray(sentMsg)) return [...prev, ...sentMsg];
          if (prev.some(m => m.id === sentMsg.id)) return prev;
          return [...prev, sentMsg];
        });
      }
    } catch (err) {
      alert(`Error al enviar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl h-[calc(100vh-8rem)] flex">
      {/* Sidebar de conversaciones */}
      <div className="w-64 border-r border-slate-800 p-4 space-y-3 hidden sm:block overflow-y-auto">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Conversaciones</h3>
        <div className="space-y-1">
          {allUsers.length === 0 && (
            <p className="text-xs text-slate-500 py-4 text-center">Buscando usuarios...</p>
          )}
          {allUsers.map(u => (
            <div
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                selectedUser?.id === u.id ? 'bg-slate-800 border border-slate-700' : 'hover:bg-slate-800/50'
              }`}
            >
              <img src={u.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop"} alt="" className="w-8 h-8 rounded-lg object-cover" />
              <div className="min-w-0">
                <p className="font-bold text-xs text-white truncate">{u.full_name}</p>
                <p className="text-[10px] text-slate-400 truncate">{u.level || 'Jugador'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ventana Principal de Chat */}
      <div className="flex-1 flex flex-col justify-between p-4 bg-[#0a101d]">
        {/* Chat header */}
        {selectedUser ? (
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <img src={selectedUser.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop"} alt="" className="w-9 h-9 rounded-xl object-cover" />
            <div>
              <p className="font-bold text-sm text-white">{selectedUser.full_name}</p>
              <p className="text-[10px] text-emerald-400">{selectedUser.level || 'Jugador PadelZone'}</p>
            </div>
          </div>
        ) : (
          <div className="pb-3 border-b border-slate-800">
            <p className="text-xs text-slate-400">Seleccioná un usuario para chatear</p>
          </div>
        )}

        {/* Lista de burbujas de mensajes */}
        <div className="flex-1 py-4 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && selectedUser && (
            <div className="text-center pt-12 space-y-2">
              <MessageCircle className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500">
                Todavía no hay mensajes en la conversación con <strong className="text-slate-300">{selectedUser.full_name}</strong>.<br />
                ¡Escribile el primer mensaje!
              </p>
            </div>
          )}

          {messages.map((m, idx) => {
            const isMine = m.sender_id === user?.id;
            return (
              <div
                key={m.id || `msg-${idx}`}
                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-xs sm:max-w-md rounded-2xl p-3 text-xs leading-relaxed shadow-md ${
                    isMine
                      ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none'
                      : 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-tl-none'
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">
                  {isMine ? 'Vos' : (selectedUser?.full_name || 'Remitente')}
                </span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <form onSubmit={handleSend} className="flex gap-2 pt-2 border-t border-slate-800">
          <input
            type="text"
            placeholder={selectedUser ? `Enviar mensaje a ${selectedUser.full_name}...` : 'Escribí un mensaje...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!selectedUser || loading}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || !selectedUser || loading}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 px-4 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
