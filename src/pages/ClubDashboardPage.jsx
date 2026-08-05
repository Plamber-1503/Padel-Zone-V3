import React, { useState } from 'react';
import { padelService, useCourts, useBookings } from '@/api/padelService';
import {
  Building2,
  Plus,
  Trash2,
  Power,
  BarChart3,
  DollarSign,
  Clock,
  Trophy,
  Users,
  Lock,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Calendar,
  X,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ClubDashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'metrics' | 'locks'
  const { data: fetchedCourts = [] } = useCourts();
  const { data: allBookings = [] } = useBookings();
  const [courtsList, setCourtsList] = useState([]);

  const displayCourts = courtsList.length > 0 ? courtsList : fetchedCourts;
  const [isAddCourtModalOpen, setIsAddCourtModalOpen] = useState(false);

  // Formulario para Agregar Nueva Cancha
  const [newCourtName, setNewCourtName] = useState('');
  const [newCourtType, setNewCourtType] = useState('Cristal Panorámico WPT');
  const [newCourtPrice, setNewCourtPrice] = useState('4800');

  // Alternar estado de cancha (Activar / Quitar Cancha)
  const handleToggleCourtStatus = (courtId) => {
    setCourtsList(prev =>
      prev.map(c => {
        if (c.id === courtId) {
          const isCurrentlyActive = c.status !== 'inactive';
          return {
            ...c,
            status: isCurrentlyActive ? 'inactive' : 'active'
          };
        }
        return c;
      })
    );
  };

  // Agregar Nueva Cancha
  const handleAddCourt = (e) => {
    e.preventDefault();
    if (!newCourtName.trim()) return;

    const createdCourt = {
      id: `court-${Date.now()}`,
      name: newCourtName,
      type: newCourtType,
      price: `$${parseInt(newCourtPrice).toLocaleString()}/hs`,
      rating: 5.0,
      reviews_count: 0,
      status: 'active',
      image_url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&h=500&fit=crop'
    };

    setCourtsList(prev => [createdCourt, ...prev]);
    setNewCourtName('');
    setIsAddCourtModalOpen(false);
    alert(`¡Cancha "${createdCourt.name}" agregada con éxito a la oferta del club!`);
  };

  // Salir de la sesión de socio
  const handleLogoutSocio = () => {
    localStorage.removeItem('pz3_club_owner_auth');
    navigate('/');
  };

  return (
    <div className="space-y-6">
      
      {/* ── HEADER DEL SOCIO CLUB B2B ───────────────────────────────────── */}
      <div className="bg-[#0e1738] border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/20 shrink-0">
              <Building2 className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded border border-amber-500/30">
                  Socio Club Verificado
                </span>
                <span className="text-xs text-slate-400">PadelClub Norte</span>
              </div>
              <h1 className="font-extrabold text-2xl text-white tracking-tight mt-0.5">Portal de Administración de Canchas</h1>
            </div>
          </div>

          {/* Acciones principales del encabezado */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={() => setIsAddCourtModalOpen(true)}
              className="flex-1 md:flex-none bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all hover:scale-105 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Agregar Nueva Cancha</span>
            </button>

            <button
              onClick={handleLogoutSocio}
              className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              Salir de Socio
            </button>
          </div>
        </div>

        {/* Pestanas de Navegacion del Panel B2B */}
        <div className="flex items-center gap-2 pt-4 border-t border-slate-800/80 overflow-x-auto">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Gestión de Canchas ({courtsList.filter(c => c.status !== 'inactive').length} Activas)</span>
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'metrics'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Métricas & Facturación</span>
          </button>

          <button
            onClick={() => setActiveTab('locks')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'locks'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Bloqueo de Turnos</span>
          </button>
        </div>
      </div>

      {/* ── SOLAPA 1: GESTIÓN DE CANCHAS (INVENTARIO B2B) ────────────────── */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
            <div>
              <h2 className="font-bold text-base text-white">Inventario de Canchas del Club</h2>
              <p className="text-xs text-slate-400">Administrá las canchas disponibles para los jugadores de la aplicación.</p>
            </div>
            <button
              onClick={() => setIsAddCourtModalOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Agregar Cancha</span>
            </button>
          </div>

          {/* Tarjetas de Canchas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courtsList.map((c) => {
              const isActive = c.status !== 'inactive';
              return (
                <div
                  key={c.id}
                  className={`bg-slate-900/90 border rounded-3xl p-5 space-y-4 transition-all relative overflow-hidden ${
                    isActive ? 'border-slate-800 shadow-lg' : 'border-red-500/30 opacity-75 bg-slate-950/60'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}>
                        {isActive ? '✓ Disponible para Reservas' : '⛔ Quitada / Fuera de Servicio'}
                      </span>
                      <h3 className="font-bold text-base text-white pt-1">{c.name}</h3>
                      <p className="text-xs text-slate-400">{c.type || 'Superficie de Césped Sintético WPT'}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800">
                    <span className="text-slate-400">Tarifa por hora:</span>
                    <strong className="text-emerald-400 text-sm">{c.price || '$4.800/hs'}</strong>
                  </div>

                  {/* Acciones de la Cancha */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={() => handleToggleCourtStatus(c.id)}
                      className={`flex-1 font-bold text-xs py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{isActive ? 'Quitar de Disponibles' : 'Activar Cancha'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SOLAPA 2: METRICAS Y FACTURACION ────────────────────────────── */}
      {activeTab === 'metrics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-slate-900 p-4 rounded-2xl border border-emerald-500/30 space-y-1">
              <span className="text-slate-400 text-xs">Facturación Este Mes</span>
              <p className="font-black text-2xl text-emerald-400">$1.480.000</p>
              <p className="text-[10px] text-emerald-300 font-semibold">+14% vs mes anterior</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-xs">Horas Alquiladas</span>
              <p className="font-black text-2xl text-white">310 hs</p>
              <p className="text-[10px] text-slate-400">Promedio 24hs/día</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-xs">Ocupación Noche (Pico)</span>
              <p className="font-black text-2xl text-amber-400">94%</p>
              <p className="text-[10px] text-emerald-400 font-semibold">Máxima demanda</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-xs">Cancha Más Alquilada</span>
              <p className="font-bold text-sm text-white truncate mt-1">Cancha 1 Cristal WPT</p>
              <p className="text-[10px] text-slate-400">42% del total</p>
            </div>
          </div>
        </div>
      )}

      {/* ── SOLAPA 3: BLOQUEO DE TURNOS ─────────────────────────────────── */}
      {activeTab === 'locks' && (
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-3 text-center">
          <Lock className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="font-bold text-white text-base">Bloqueo de Turnos por Mantenimiento o Clases</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Seleccioná una cancha y bloqueá un rango horario para que no pueda ser reservado por jugadores externos.
          </p>
          <button
            onClick={() => alert('Turno bloqueado para mantenimiento.')}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/20 inline-flex items-center gap-2"
          >
            <Lock className="w-4 h-4" /> Bloquear Horario Específico
          </button>
        </div>
      )}

      {/* ── MODAL PARA AGREGAR NUEVA CANCHA ──────────────────────────────── */}
      {isAddCourtModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e1738] border border-emerald-500/40 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl relative my-auto animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400 stroke-[3]" /> Agregar Nueva Cancha
              </h3>
              <button
                onClick={() => setIsAddCourtModalOpen(false)}
                className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCourt} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Nombre de la Cancha:</label>
                <input
                  type="text"
                  placeholder="ej. Cancha 4 — Panorámica Cristal WPT"
                  value={newCourtName}
                  onChange={(e) => setNewCourtName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Tipo de Superficie / Estructura:</label>
                <select
                  value={newCourtType}
                  onChange={(e) => setNewCourtType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Cristal Panorámico WPT">Cristal Panorámico WPT</option>
                  <option value="Moqueta Sintética Indoor">Moqueta Sintética Indoor</option>
                  <option value="Techada Climatizada">Techada Climatizada</option>
                  <option value="Muro Clásico">Muro Clásico</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Precio por Hora ($):</label>
                <input
                  type="number"
                  placeholder="4800"
                  value={newCourtPrice}
                  onChange={(e) => setNewCourtPrice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                Confirmar y Agregar Cancha
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
