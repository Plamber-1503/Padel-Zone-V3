import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { padelService } from '@/api/padelService';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { toast } from '@/lib/toast';
import { Send, MessageCircle, Search, ArrowLeft, Check, CheckCheck } from 'lucide-react';

const cx = (isDark, dark, light) => (isDark ? dark : light);

export default function ChatPage() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const location = useLocation();
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMobileList, setShowMobileList] = useState(true);
  const messagesEndRef = useRef(null);

  const queryParams = new URLSearchParams(location.search);
  const targetUserId = queryParams.get('userId') || queryParams.get('user');
  const initialMsg = queryParams.get('msg');

  // Auto-scroll al final del chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Cargar lista de usuarios registrados desde Supabase
  useEffect(() => {
    async function loadUsers() {
      const usersList = await padelService.getUsers();
      const filtered = usersList.filter(u => u.id !== user?.id && u.is_visible !== false);
      setAllUsers(filtered);

      let targetUser = null;
      if (targetUserId) {
        targetUser = filtered.find(u =>
          u.id === targetUserId ||
          u.full_name?.toLowerCase().includes(targetUserId.toLowerCase())
        );
      }

      if (targetUser) {
        setSelectedUser(targetUser);
        setShowMobileList(false);
      } else if (filtered.length > 0 && !selectedUser) {
        setSelectedUser(filtered[0]);
      }
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

        // Marcar como leídos los mensajes que el otro usuario nos envió, ya que estamos viendo esta conversación
        const hasUnread = (msgs || []).some(m => m.sender_id === selectedUser.id && m.receiver_id === user.id && !m.is_read);
        if (hasUnread) {
          padelService.markMessagesAsRead(selectedUser.id);
        }

        // Si vino un mensaje inicial por URL (ej: al sumar a un partido) y aún no se envió
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
          const added = Array.isArray(sentMsg) ? sentMsg[0] : sentMsg;
          if (!added || prev.some(m => m.id === added.id)) return prev;
          return [...prev, added];
        });
      }
    } catch (err) {
      toast.error(`Error al enviar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (u) => {
    setSelectedUser(u);
    setShowMobileList(false);
  };

  // Filtrado de usuarios en el buscador
  const filteredUsers = searchQuery.trim()
    ? allUsers.filter(u =>
        (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.level || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allUsers;

  return (
    <div className={cx(isDark, 'bg-slate-900 border-slate-800', 'bg-white border-slate-200') + ' border rounded-3xl overflow-hidden shadow-lg h-[calc(100vh-8.5rem)] flex flex-col md:flex-row'}>

      {/* ── SIDEBAR DE CONVERSACIONES & BÚSQUEDA ───────────────────────── */}
      <div
        className={`w-full md:w-80 border-r p-4 space-y-3 flex-col ${cx(isDark, 'border-slate-800', 'border-slate-200')} ${
          showMobileList ? 'flex' : 'hidden md:flex'
        }`}
      >
        <div className="flex items-center justify-between">
          <h3 className={cx(isDark, 'text-slate-300', 'text-slate-500') + ' font-bold text-xs uppercase tracking-wider flex items-center gap-2'}>
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            Conversaciones ({allUsers.length})
          </h3>
        </div>

        {/* Buscador de usuarios */}
        <div className="relative">
          <Search className={cx(isDark, 'text-slate-400', 'text-slate-400') + ' w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2'} />
          <input
            type="text"
            placeholder="Buscar jugador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cx(isDark, 'bg-slate-800 border-slate-700/80 text-white', 'bg-slate-100 border-slate-300 text-slate-900') + ' w-full border rounded-xl pl-8 pr-3 py-2 text-xs placeholder-slate-400 focus:outline-none focus:border-emerald-500'}
          />
        </div>

        {/* Lista de Jugadores */}
        <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {filteredUsers.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              {searchQuery ? 'No se encontraron jugadores' : 'Cargando usuarios...'}
            </p>
          ) : (
            filteredUsers.map(u => {
              const isSelected = selectedUser?.id === u.id;
              return (
                <div
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-500/15 border border-emerald-500/40'
                      : cx(isDark, 'hover:bg-slate-800/60 border border-transparent', 'hover:bg-slate-100 border border-transparent')
                  }`}
                >
                  <Link
                    to={`/profile/${u.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="relative shrink-0"
                  >
                    <img
                      src={u.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop"}
                      alt=""
                      className={cx(isDark, 'border-slate-700', 'border-slate-300') + ' w-10 h-10 rounded-xl object-cover border hover:opacity-80 transition-opacity'}
                    />
                    <span className={cx(isDark, 'border-slate-900', 'border-white') + ' w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 absolute -bottom-0.5 -right-0.5'} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className={`font-bold text-xs truncate ${isSelected ? 'text-emerald-400' : cx(isDark, 'text-white', 'text-slate-900')}`}>
                      {u.full_name}
                    </p>
                    <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-[10px] truncate mt-0.5'}>
                      {u.level || 'Jugador PadelZone'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── VENTANA PRINCIPAL DE CHAT ──────────────────────────────────── */}
      <div
        className={`flex-1 flex-col justify-between p-4 ${cx(isDark, 'bg-[#090f1b]', 'bg-slate-50')} ${
          !showMobileList ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Chat header */}
        {selectedUser ? (
          <div className={cx(isDark, 'border-slate-800', 'border-slate-200') + ' flex items-center justify-between pb-3 border-b'}>
            <div className="flex items-center gap-3">
              {/* Botón Volver a Lista en vista Móvil */}
              <button
                onClick={() => setShowMobileList(true)}
                className={cx(isDark, 'bg-slate-800 text-slate-300 hover:text-white', 'bg-slate-100 text-slate-600 hover:text-slate-900') + ' md:hidden p-2 rounded-xl'}
                title="Volver a lista"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <Link to={`/profile/${selectedUser.id}`} className="shrink-0">
                <img
                  src={selectedUser.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop"}
                  alt=""
                  className={cx(isDark, 'border-slate-700', 'border-slate-300') + ' w-10 h-10 rounded-xl object-cover border hover:opacity-80 transition-opacity'}
                />
              </Link>
              <Link to={`/profile/${selectedUser.id}`}>
                <p className={cx(isDark, 'text-white', 'text-slate-900') + ' font-bold text-sm flex items-center gap-1.5 hover:text-emerald-400 transition-colors'}>
                  {selectedUser.full_name}
                </p>
                <p className="text-[10px] text-emerald-500 font-semibold">{selectedUser.level || 'Jugador PadelZone'}</p>
              </Link>
            </div>
          </div>
        ) : (
          <div className={cx(isDark, 'border-slate-800', 'border-slate-200') + ' pb-3 border-b'}>
            <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs'}>Seleccioná un usuario para chatear</p>
          </div>
        )}

        {/* Lista de mensajes */}
        <div className="flex-1 py-4 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && selectedUser && (
            <div className="text-center pt-16 space-y-2">
              <div className={cx(isDark, 'bg-slate-800/80 border-slate-700/60', 'bg-slate-100 border-slate-200') + ' w-12 h-12 rounded-2xl border mx-auto flex items-center justify-center'}>
                <MessageCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <p className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-xs max-w-sm mx-auto'}>
                Sin mensajes previos con <strong className={cx(isDark, 'text-white', 'text-slate-900')}>{selectedUser.full_name}</strong>.<br />
                ¡Escribile un mensaje para coordinar tu partido!
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
                  className={`max-w-[85%] sm:max-w-md rounded-2xl p-3 text-xs leading-relaxed shadow-md ${
                    isMine
                      ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none'
                      : cx(isDark, 'bg-slate-800 text-slate-100 border border-slate-700/60', 'bg-slate-100 text-slate-800 border border-slate-200') + ' rounded-tl-none'
                  }`}
                >
                  {m.text}
                </div>
                <span className={cx(isDark, 'text-slate-400', 'text-slate-500') + ' text-[9px] mt-1 px-1 flex items-center gap-1'}>
                  {isMine ? 'Vos' : (selectedUser?.full_name || 'Remitente')}
                  {isMine && (
                    m.is_read ? (
                      <CheckCheck className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Check className="w-3 h-3 text-slate-500" />
                    )
                  )}
                </span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Formulario de envío */}
        <form onSubmit={handleSend} className={cx(isDark, 'border-slate-800', 'border-slate-200') + ' flex gap-2 pt-3 border-t'}>
          <input
            type="text"
            placeholder={selectedUser ? `Enviar mensaje a ${selectedUser.full_name}...` : 'Escribí un mensaje...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!selectedUser || loading}
            className={cx(isDark, 'bg-slate-800 border-slate-700/80 text-white', 'bg-white border-slate-300 text-slate-900') + ' flex-1 border rounded-xl px-4 py-2.5 text-xs placeholder-slate-400 focus:outline-none focus:border-emerald-500 disabled:opacity-50'}
          />
          <button
            type="submit"
            disabled={!input.trim() || !selectedUser || loading}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 px-4 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
