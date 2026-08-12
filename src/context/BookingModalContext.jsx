import React, { createContext, useContext, useState, useCallback } from 'react';

const BookingModalContext = createContext(null);

// Popup global de reserva/modificación de turno, montado una sola vez en
// AppLayout — cualquier botón "Reservar Turno" de la app llama a open()
// en vez de navegar a una página de cancha específica. courtId lo deja
// precargado y bloqueado (no se puede elegir otro club); si viene vacío,
// el popup deja elegir el club libremente.
export function BookingModalProvider({ children }) {
  const [state, setState] = useState(null); // { courtId, modifyBooking, isRecurring } | null

  const open = useCallback((opts = {}) => {
    setState({ courtId: opts.courtId || null, modifyBooking: opts.modifyBooking || null, isRecurring: !!opts.isRecurring });
  }, []);
  const close = useCallback(() => setState(null), []);

  return (
    <BookingModalContext.Provider value={{ state, open, close }}>
      {children}
    </BookingModalContext.Provider>
  );
}

export function useBookingModal() {
  const ctx = useContext(BookingModalContext);
  if (!ctx) throw new Error('useBookingModal debe usarse dentro de <BookingModalProvider>');
  return ctx;
}
