// Compartido entre el panel de dueño de club y el panel privado de
// PadelZone (clubes virtuales) — mismas opciones en los dos lugares donde
// se carga/edita una cancha, para que no diverjan con el tiempo.
export const SURFACE_OPTIONS = ['Cristal Panorámico WPT', 'Moqueta Sintética Indoor', 'Techada Climatizada', 'Muro Clásico'];

// Diferenciales que más buscan los jugadores al elegir cancha. Los primeros
// 4 son los mismos strings que ya trae sembrada la base (courts.amenities)
// para no romper continuidad con canchas existentes.
export const AMENITY_OPTIONS = [
  'Iluminación LED', 'Vestuarios', 'Estacionamiento', 'Bar & Resto',
  'Paredes de vidrio', 'Techada / Climatizada', 'Aire acondicionado', 'Wifi gratis',
  'Alquiler de paletas', 'Cámara de grabación', 'Acceso accesible', 'Superficie premium'
];
