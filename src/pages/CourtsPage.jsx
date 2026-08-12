import React, { useState, useEffect } from 'react';
import { useCourts } from '@/api/padelService';
import { Link, useSearchParams } from 'react-router-dom';
import { useBookingModal } from '@/context/BookingModalContext';
import { MapPin, Star, ShieldCheck, Search } from 'lucide-react';

export default function CourtsPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [surfaceFilter, setSurfaceFilter] = useState('all');
  const { data: courts = [], isLoading } = useCourts();
  const { open: openBookingModal } = useBookingModal();

  // Si el usuario busca de nuevo desde el header estando ya en esta página,
  // sincronizamos el input con el nuevo query param.
  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) setSearch(q);
  }, [searchParams]);

  const filteredCourts = courts.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(search.toLowerCase()) ||
                          c.address?.toLowerCase().includes(search.toLowerCase()) ||
                          c.city?.toLowerCase().includes(search.toLowerCase());
    const matchesSurface = surfaceFilter === 'all' || c.surface?.toLowerCase().includes(surfaceFilter.toLowerCase());
    return matchesSearch && matchesSurface;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-bold text-2xl text-white tracking-tight">Canchas & Clubes de Pádel</h1>
          <p className="text-xs text-slate-400">Reservá tu turno con confirmación instantánea en los mejores clubes.</p>
        </div>

        {/* Filter / Search controls */}
        <div className="flex gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre o ciudad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={surfaceFilter}
            onChange={(e) => setSurfaceFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Todas las superficies</option>
            <option value="cristal">Cristal Panorámico</option>
            <option value="moqueta">Moqueta Sintética</option>
          </select>
        </div>
      </div>

      {/* Courts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCourts.map(court => (
          <div key={court.id} className="bg-slate-900/80 border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl hover:border-slate-700 transition-all flex flex-col group">
            
            {/* Image */}
            <div className="h-44 relative overflow-hidden">
              <img src={court.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
              <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-xl text-amber-400 font-bold text-xs flex items-center gap-1 border border-slate-800">
                <Star className="w-3.5 h-3.5 fill-current" /> {court.rating}
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                <span className="bg-emerald-500/90 text-slate-950 font-bold text-xs px-2.5 py-1 rounded-lg shadow">
                  ${court.price_per_hour?.toLocaleString()} / hora
                </span>
                <span className="text-[10px] font-semibold bg-slate-900/90 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                  {court.surface}
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-base text-white group-hover:text-emerald-400 transition-colors">{court.name}</h3>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {court.address}
                </p>
                <p className="text-xs text-slate-300 mt-2 line-clamp-2">{court.description}</p>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
                <Link
                  to={`/court/${court.id}`}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs py-2.5 rounded-xl text-center border border-slate-700 transition-colors"
                >
                  Ver Feed del Club
                </Link>
                <button
                  onClick={() => openBookingModal({ courtId: court.id })}
                  disabled={court.is_bookable === false}
                  title={court.is_bookable === false ? 'Cancha de exhibición — no disponible para reservar' : undefined}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 text-slate-950 font-bold text-xs py-2.5 rounded-xl text-center shadow transition-all hover:scale-105 cursor-pointer"
                >
                  {court.is_bookable === false ? 'No reservable' : 'Reservar Turno'}
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
