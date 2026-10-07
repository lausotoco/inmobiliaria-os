'use client';

// Página pública para agentes (/video-inmueble): qué es el video por inmueble,
// cómo funciona y crear la cuenta. Corta a propósito: portada, 3 pasos,
// 4 preguntas y cierre. Sin precios públicos (se ven dentro de la plataforma)
// y sin prometer ventas.

import Link from 'next/link';
import { enlaceWhatsApp } from '@/lib/mensaje-whatsapp';
import DemoTelefono from '@/components/videos/DemoTelefono';
import { Icono, botonPrimario, botonSecundario } from '@/components/videos/ui';

const REGISTRO = '/registro-broker?siguiente=%2Fbroker%2Fvideos';
const ENTRAR = '/login?siguiente=%2Fbroker%2Fvideos';
const WHATSAPP = enlaceWhatsApp('Hola KYRELO, quiero saber más del video por inmueble.');

const PASOS = [
  { icono: 'camara', titulo: 'Graba y sube', texto: 'Un solo video recorriendo tu inmueble con el celular. No tienes que cortar nada.' },
  { icono: 'varita', titulo: 'Nosotros editamos', texto: 'Sacamos las mejores tomas y ponemos textos, música y tu marca. Listo en menos de 40 minutos.' },
  { icono: 'ojo', titulo: 'Lo ves y lo publicas', texto: 'Ves la vista previa antes de pagar. Si te gusta, lo descargas sin marcas.' },
];

const RECIBES = [
  ['video', 'Video vertical'],
  ['video', 'Versión para anuncios'],
  ['imagen', 'Dos portadas'],
  ['texto', 'Texto de la publicación'],
];

const PREGUNTAS = [
  {
    p: '¿Cuánto cuesta?',
    r: 'Crear la cuenta y subir tus tomas no cuesta nada. El precio de cada video lo ves en la plataforma antes de pagar, y pagas solo si te gusta la vista previa.',
  },
  { p: '¿Cuánto se demora?', r: 'Menos de 40 minutos, entre 7 a. m. y 8 p. m. Lo que llega de noche sale a primera hora.' },
  { p: '¿Tengo que cortar o editar algo?', r: 'No. Subes un solo video caminando por el inmueble y nosotros sacamos las tomas. La plataforma lo revisa al subirlo y te avisa si está horizontal, oscuro o muy movido, para que lo repitas antes de irte.' },
  { p: '¿El video lleva la marca de KYRELO?', r: 'No. Cierra con tu logo, tu nombre y tu WhatsApp. Las personas interesadas te escriben a ti.' },
];

export default function LandingVideos() {
  return (
    <div className="app-videos min-h-screen overflow-x-hidden bg-[#F6F6F3] text-zinc-900 antialiased">
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/video-inmueble" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white">
              <Icono nombre="video" className="h-[18px] w-[18px]" />
            </span>
            <span className="hidden leading-tight min-[400px]:block">
              <span className="block whitespace-nowrap text-[14px] font-semibold sm:text-[15px]">Video por inmueble</span>
              <span className="hidden text-[11px] text-zinc-500 sm:block">por KYRELO</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href={ENTRAR} className="whitespace-nowrap rounded-lg px-2.5 py-2 text-[14px] font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 sm:px-3">
              Entrar
            </Link>
            <Link href={REGISTRO} className={`${botonPrimario} whitespace-nowrap px-3.5 py-2 text-[13px] sm:px-4 sm:py-2.5 sm:text-[14px]`}>
              Crear cuenta
            </Link>
          </nav>
        </div>
      </header>

      {/* Portada */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16 lg:pb-20 lg:pt-16">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-zinc-700 ring-1 ring-black/[0.06]">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            Para agentes y oficinas inmobiliarias
          </p>
          <h1 className="mt-5 text-[34px] font-semibold leading-[1.06] sm:text-[52px] lg:text-[58px]">
            Los agentes que más venden
            <span className="block text-orange-600">presentan mejor sus inmuebles.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-zinc-600 sm:text-[18px]">
            <strong className="font-semibold text-zinc-900">Graba tu inmueble con el celular. Nosotros lo convertimos en video.</strong> Subes un solo
            video y en menos de 40 minutos lo tienes listo para publicar, con tu logo y tu WhatsApp. Lo ves antes de pagar.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href={REGISTRO} className={`${botonPrimario} px-7 py-4 text-[16px]`}>
              Crear mi cuenta gratis
              <Icono nombre="flechaDer" className="h-4 w-4" grosor={2.2} />
            </Link>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className={`${botonSecundario} px-6 py-4 text-[15px]`}>
              <Icono nombre="chat" className="h-4 w-4" />
              Pregúntanos por WhatsApp
            </a>
          </div>
        </div>
        <DemoTelefono />
      </section>

      {/* Cómo funciona + qué recibes */}
      <section className="border-y border-black/[0.06] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <h2 className="max-w-2xl text-[28px] font-semibold leading-tight sm:text-[38px]">Así de simple.</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3 sm:gap-8">
            {PASOS.map((p, i) => (
              <li key={p.titulo} className="flex gap-4 sm:block">
                <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                  <Icono nombre={p.icono} className="h-6 w-6" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white">{i + 1}</span>
                </span>
                <div>
                  <p className="text-[17px] font-semibold sm:mt-4">{p.titulo}</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-zinc-500">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap items-center gap-2.5 border-t border-zinc-100 pt-8">
            <span className="mr-1 text-[14px] font-semibold text-zinc-900">Recibes:</span>
            {RECIBES.map(([i, t]) => (
              <span key={t} className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3.5 py-2 text-[14px] font-medium text-zinc-700">
                <Icono nombre={i} className="h-4 w-4 text-zinc-500" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Preguntas */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <h2 className="text-[28px] font-semibold leading-tight sm:text-[38px]">Preguntas</h2>
        <div className="mt-8 grid gap-x-10 gap-y-6 md:grid-cols-2">
          {PREGUNTAS.map((q) => (
            <div key={q.p}>
              <p className="text-[16px] font-semibold">{q.p}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-zinc-600">{q.r}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cierre */}
      <section className="px-4 pb-14 sm:px-6 lg:pb-20">
        <div className="mx-auto max-w-6xl rounded-[2rem] bg-zinc-900 px-6 py-12 text-center text-white sm:px-12 sm:py-14">
          <h2 className="mx-auto max-w-3xl text-[26px] font-semibold leading-tight sm:text-[36px]">
            Tu próximo inmueble, <span className="text-orange-400">en video hoy mismo.</span>
          </h2>
          <Link href={REGISTRO} className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-7 py-4 text-[16px] font-semibold text-white transition hover:bg-orange-500">
            Crear mi cuenta gratis
            <Icono nombre="flechaDer" className="h-4 w-4" grosor={2.2} />
          </Link>
          <p className="mt-4 text-[13px] text-white/50">
            ¿Ya tienes cuenta?{' '}
            <Link href={ENTRAR} className="underline underline-offset-2">
              Entra aquí
            </Link>
          </p>
        </div>
      </section>

      <footer className="border-t border-black/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-[13px] text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Video por inmueble · un servicio de KYRELO</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/politica-de-datos" className="hover:text-zinc-900">
              Política de datos
            </Link>
            <Link href="/legal/terminos" className="hover:text-zinc-900">
              Términos
            </Link>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900">
              WhatsApp
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
