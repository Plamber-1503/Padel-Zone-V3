import React, { useState } from 'react';
import { X, TrendingUp, DollarSign, Clock, Trophy, Users, ShieldCheck, AlertTriangle, Lock, Calendar, BarChart3, ChevronRight, CheckCircle, Sparkles } from 'lucide-react';

export default function CourtBusinessDashboardModal({ isOpen, onClose, court }) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('month'); // 'week' | 'month' | 'year'

  if (!isOpen || !court) return null;

  // Datos simulados de métricas ejecutivas del negocio
  const businessData = {
    totalRevenue: selectedTimeframe === 'month' ? 1480000 : selectedTimeframe === 'week' ? 385000 : 16200000,
    totalBookedHours: selectedTimeframe === 'month' ? 310 : selectedTimeframe === 'week' ? 78 : 3400,
    occupancyRate: 84,
    mostPopularCourt: 'Cancha 1 (Cristal Panorámico WPT)',
    courtBreakdown: [
      { name: 'Cancha 1 — Cristal Panorámico WPT', bookings: 135, revenue: 648000, occupancy: 92, rating: 4.9 },
      { name: 'Cancha 2 — Moqueta Sintética Indoor', bookings: 102, revenue: 489600, occupancy: 78, rating: 4.7 },
      { name: 'Cancha 3 — Techada Climatizada', bookings: 73, revenue: 342400, occupancy: 64, rating: 4.8 },
    ],
    hourlyDistribution: [
      { slot: '10:00 - 14:00', label: 'Mañana (Hora Valle)', occupancy: 42, price: '$3.500/hs', revenue: 294000 },
      { slot: '14:00 - 18:00', label: 'Tarde (Hora Intermedia)', occupancy: 68, price: '$4.200/hs', revenue: 476000 },
      { slot: '18:00 - 23:00', label: 'Noche (Hora Pico)', occupancy: 94, price: '$4.800/hs', revenue: 710000 },
    ],
    paymentMethods: {
      appPaid: 917600, // 62% cobrado por app
      counterPending: 562400 // 38% a cobrarse en mostrador
    },
    topCustomers: [
      { name: 'Sofía Rossi', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop', bookings: 8, spent: 38400 },
      { name: 'Lucas Benítez', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop', bookings: 6, spent: 28800 },
      { name: 'Martín Gómez', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop', bookings: 5, spent: 24000 }
    ]
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#0b1322] border border-emerald-500/40 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl space-y-6 p-5 sm:p-7 relative my-auto animate-in fade-in zoom-in duration-200">
        
        {/* Header con botón cerrar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-emerald-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
              <BarChart3 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded border border-emerald-500/30">
                  Panel de Gestión B2B
                </span>
                <span className="text-xs text-slate-400">ID: {court.id}</span>
              </div>
              <h2 className="font-bold text-xl text-white tracking-tight">Dashboard Ejecutivo — {court.name}</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeframe Selector Tabs */}
        <div className="flex items-center justify-between bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-slate-300 px-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" /> Período de Análisis:
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setSelectedTimeframe('week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedTimeframe === 'week' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setSelectedTimeframe('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedTimeframe === 'month' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Este Mes
            </button>
            <button
              onClick={() => setSelectedTimeframe('year')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedTimeframe === 'year' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Año 2026
            </button>
          </div>
        </div>

        {/* ── 1. METRICAS CLAVE SUPERIORES (KPI CARDS) ───────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-slate-900/90 border border-emerald-500/30 p-4 rounded-2xl space-y-1 shadow-lg relative overflow-hidden">
            <div className="flex justify-between items-center text-slate-400 text-xs">
              <span>Facturación Total</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="font-black text-2xl text-emerald-400">${businessData.totalRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-emerald-300 flex items-center gap-1 font-semibold">
              <TrendingUp className="w-3 h-3" /> +14.2% respecto al período anterior
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1 shadow-lg">
            <div className="flex justify-between items-center text-slate-400 text-xs">
              <span>Horas Alquiladas</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="font-black text-2xl text-white">{businessData.totalBookedHours} hs</p>
            <p className="text-[10px] text-slate-400 font-medium">Promedio: {(businessData.totalBookedHours / 30).toFixed(1)} hs/día</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1 shadow-lg">
            <div className="flex justify-between items-center text-slate-400 text-xs">
              <span>Tasa de Ocupación</span>
              <BarChart3 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="font-black text-2xl text-amber-400">{businessData.occupancyRate}%</p>
            <p className="text-[10px] text-emerald-400 font-semibold">94% en Horas Pico (Noche)</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1 shadow-lg">
            <div className="flex justify-between items-center text-slate-400 text-xs">
              <span>Cancha Estrella</span>
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            <p className="font-bold text-xs text-white truncate mt-1">Cancha 1 Cristal WPT</p>
            <p className="text-[10px] text-slate-400">42% del total de reservas</p>
          </div>
        </div>

        {/* ── 2. DESGLOSE DE FACTURACIÓN Y RESERVAS POR CANCHA ───────────── */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Rendimiento y Facturación por Cancha
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {businessData.courtBreakdown.map((c, i) => (
              <div key={i} className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-3 hover:border-emerald-500/40 transition-colors">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-xs text-white leading-tight max-w-[80%]">{c.name}</h4>
                  <span className="text-amber-400 text-xs font-bold">★ {c.rating}</span>
                </div>

                <div className="space-y-1 pt-1 border-t border-slate-800 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Reservas confirmadas:</span>
                    <strong className="text-white">{c.bookings} turnos</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Ocupación media:</span>
                    <strong className="text-emerald-400">{c.occupancy}%</strong>
                  </div>
                  <div className="flex justify-between text-slate-400 pt-1 font-bold">
                    <span>Facturación:</span>
                    <span className="text-emerald-400">${c.revenue.toLocaleString()}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full" style={{ width: `${c.occupancy}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3. DISTRIBUCIÓN POR HORARIO (PICO VS VALLE) & METODOS DE PAGO ───── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Horarios Pico vs Valle */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-3">
            <h3 className="font-bold text-xs text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" /> Demanda por Horario y Precio
            </h3>

            <div className="space-y-2.5 text-xs">
              {businessData.hourlyDistribution.map((h, i) => (
                <div key={i} className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white">{h.slot} — <span className="text-emerald-400 font-normal">{h.label}</span></p>
                    <p className="text-[10px] text-slate-400">Tarifa actual: <strong>{h.price}</strong></p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-amber-400 text-sm">{h.occupancy}%</span>
                    <p className="text-[10px] text-slate-400">${h.revenue.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Estado de Pagos & Clientes Top */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-3">
            <h3 className="font-bold text-xs text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" /> Resumen de Cobros & Clientes Frecuentes
            </h3>

            {/* Cobrado por App vs Mostrador */}
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium">💳 Cobrado por App (MercadoPago):</span>
                <span className="font-bold text-emerald-400">${businessData.paymentMethods.appPaid.toLocaleString()} (62%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium">💵 Pendiente Cobro en Mostrador:</span>
                <span className="font-bold text-amber-400">${businessData.paymentMethods.counterPending.toLocaleString()} (38%)</span>
              </div>
            </div>

            {/* Top Clientes */}
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Top 3 Jugadores del Club:</p>
              {businessData.topCustomers.map((cust, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-1.5 bg-slate-800/40 rounded-xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={cust.avatar} alt="" className="w-7 h-7 rounded-lg object-cover" />
                    <span className="font-bold text-white truncate">{cust.name}</span>
                  </div>
                  <span className="text-slate-300 font-semibold">{cust.bookings} reservas (${cust.spent.toLocaleString()})</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── 4. ACCIONES RAPIDAS DE GESTIÓN ───────────────────────────── */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
          <h3 className="font-bold text-xs text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" /> Acciones Rápidas de Operación del Club
          </h3>

          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => alert('Función: Bloquear horario por mantenimiento o clases particulares.')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl border border-slate-700 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" /> Bloquear Turno (Mantenimiento / Clases)
            </button>
            <button
              onClick={() => alert('Función: Ajustar precios por hora pico/valle.')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl border border-slate-700 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Modificar Tarifas (Pico / Valle)
            </button>
            <button
              onClick={() => alert('Función: Enviar aviso promocional masivo a seguidores del club.')}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-4 py-2 rounded-xl border border-emerald-500/40 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Crear Promoción "Last Minute"
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
