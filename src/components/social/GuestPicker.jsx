import React, { useState } from 'react';
import { Search, UserPlus, Phone, X } from 'lucide-react';
import { useUsers } from '@/api/padelService';

const emptySlot = { mode: null, user: null, name: '', phone: '' }; // mode: null | 'app' | 'external'

// Hasta 2 jugadores más (además de la pareja automática), cada uno de la app
// (se busca y se elige) o externo sin cuenta (nombre + teléfono, se invita
// después por WhatsApp). onChange recibe { guestUserIds, externalGuests }.
export default function GuestPicker({ currentUserId, partnerName, onChange }) {
  const [slots, setSlots] = useState([emptySlot, emptySlot]);
  const { data: users = [] } = useUsers();
  const [searchIndex, setSearchIndex] = useState(null);
  const [search, setSearch] = useState('');

  const emit = (next) => {
    setSlots(next);
    onChange({
      guestUserIds: next.filter((s) => s.mode === 'app' && s.user).map((s) => s.user.id),
      externalGuests: next.filter((s) => s.mode === 'external' && s.name && s.phone).map((s) => ({ name: s.name, phone: s.phone }))
    });
  };

  const setSlot = (i, patch) => {
    const next = slots.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    emit(next);
  };

  const results = search.trim()
    ? users.filter((u) => u.id !== currentUserId && u.full_name?.toLowerCase().includes(search.toLowerCase())).slice(0, 5)
    : [];

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Otros jugadores (opcional)</p>
      {partnerName && <p className="text-[11px] text-slate-400">Tu pareja ({partnerName}) ya queda incluida sola.</p>}

      {slots.map((slot, i) => (
        <div key={i} className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 space-y-2">
          {slot.mode === null && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setSlot(i, { mode: 'app' }); setSearchIndex(i); }}
                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold py-2 rounded-lg border border-slate-700"
              >
                <Search className="w-3 h-3" /> Jugador de la app
              </button>
              <button
                type="button"
                onClick={() => setSlot(i, { mode: 'external' })}
                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold py-2 rounded-lg border border-slate-700"
              >
                <UserPlus className="w-3 h-3" /> Jugador externo
              </button>
            </div>
          )}

          {slot.mode === 'app' && !slot.user && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSearchIndex(i); }}
                  placeholder="Buscar por nombre..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-slate-500"
                />
                <button type="button" onClick={() => setSlot(i, { mode: null })} className="text-slate-500 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {searchIndex === i && results.length > 0 && (
                <div className="space-y-1">
                  {results.map((u) => (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => { setSlot(i, { user: u }); setSearch(''); }}
                      className="w-full text-left text-[11px] text-slate-200 hover:bg-slate-800 px-2 py-1.5 rounded-lg"
                    >
                      {u.full_name} <span className="text-slate-500">· {u.level}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {slot.mode === 'app' && slot.user && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-200 font-semibold">{slot.user.full_name}</span>
              <button type="button" onClick={() => setSlot(i, { mode: null, user: null })} className="text-slate-500 hover:text-red-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {slot.mode === 'external' && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={slot.name}
                  onChange={(e) => setSlot(i, { name: e.target.value })}
                  placeholder="Nombre"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-slate-500"
                />
                <button type="button" onClick={() => setSlot(i, { mode: null, name: '', phone: '' })} className="text-slate-500 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5">
                <Phone className="w-3 h-3 text-slate-500" />
                <input
                  value={slot.phone}
                  onChange={(e) => setSlot(i, { phone: e.target.value })}
                  placeholder="Teléfono (con código de país, ej. 5491122334455)"
                  className="flex-1 bg-transparent text-[11px] text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-500">No tiene la app — le vas a poder mandar una invitación por WhatsApp al confirmar.</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
