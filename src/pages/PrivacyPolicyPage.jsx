import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const CONTACT_EMAIL = 'germanlambertucci@gmail.com';
const LAST_UPDATED = '16 de agosto de 2026';

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold text-white">{title}</h2>
      <div className="text-xs text-slate-400 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#080c14] py-10 px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-10 w-full max-w-2xl mx-auto shadow-2xl space-y-6">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver
        </Link>

        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white">Política de Privacidad de PadelZone</h1>
          <p className="text-[11px] text-slate-500">Última actualización: {LAST_UPDATED}</p>
        </div>

        <Section title="1. Quiénes somos">
          <p>
            PadelZone es una app de reservas de canchas de pádel y red social para jugadores. Esta política
            explica qué datos recopilamos cuando usás la app, para qué los usamos y cómo podés pedirnos que los
            eliminemos.
          </p>
        </Section>

        <Section title="2. Qué datos recopilamos">
          <ul className="list-disc pl-4 space-y-1">
            <li>Al registrarte con Google o Facebook: tu nombre, correo electrónico y foto de perfil.</li>
            <li>Datos de tu perfil de jugador: nivel, categoría, partidos jugados y estadísticas.</li>
            <li>Tus reservas: club, cancha, fecha y horario elegidos.</li>
            <li>El contenido que publicás: posts, comentarios, "me gusta" y fotos que subís.</li>
            <li>Los mensajes privados que enviás a otros jugadores dentro de la app.</li>
            <li>Tu ubicación aproximada, solo si se lo permitís al navegador, para mostrarte canchas cercanas.</li>
          </ul>
        </Section>

        <Section title="3. Para qué usamos estos datos">
          <p>
            Para hacer funcionar el servicio: gestionar tus reservas, mostrar tu perfil y tus publicaciones a
            otros jugadores, permitirte chatear con ellos, enviarte notificaciones relevantes (reservas,
            comentarios, etiquetados) y mejorar la app.
          </p>
        </Section>

        <Section title="4. Con quién compartimos datos">
          <ul className="list-disc pl-4 space-y-1">
            <li>Google y Facebook: solo para que puedas iniciar sesión — no les compartimos tu actividad dentro de la app.</li>
            <li>El club donde reservás una cancha ve los datos necesarios de esa reserva (tu nombre y horario).</li>
            <li>No vendemos tus datos a terceros.</li>
          </ul>
        </Section>

        <Section title="5. Dónde se guardan tus datos">
          <p>Tus datos se guardan en la infraestructura en la nube de Supabase, con acceso protegido por contraseña y permisos.</p>
        </Section>

        <Section title="6. Cookies y almacenamiento local">
          <p>
            Usamos el almacenamiento local de tu navegador únicamente para mantener tu sesión iniciada — no lo
            usamos para publicidad ni para seguirte en otros sitios.
          </p>
        </Section>

        <Section title="7. Cómo eliminar tu cuenta y tus datos">
          <p>
            Podés pedirnos la baja de tu cuenta en cualquier momento escribiendo a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-400 hover:underline">{CONTACT_EMAIL}</a>.
            Al confirmar tu pedido, eliminamos tu perfil, tus reservas, publicaciones, comentarios y mensajes
            asociados a tu cuenta en un plazo razonable.
          </p>
        </Section>

        <Section title="8. Tus derechos">
          <p>Podés pedirnos acceder, corregir o eliminar tus datos personales en cualquier momento, escribiéndonos a nuestro contacto.</p>
        </Section>

        <Section title="9. Menores de edad">
          <p>PadelZone no está dirigida a menores de 13 años, y no recopilamos a sabiendas datos de menores de esa edad.</p>
        </Section>

        <Section title="10. Cambios en esta política">
          <p>Podemos actualizar esta política de tanto en tanto. La fecha de "Última actualización" de arriba refleja la versión vigente.</p>
        </Section>

        <Section title="11. Contacto">
          <p>
            Ante cualquier consulta sobre esta política o tus datos, escribinos a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-400 hover:underline">{CONTACT_EMAIL}</a>.
          </p>
        </Section>
      </div>
    </div>
  );
}
