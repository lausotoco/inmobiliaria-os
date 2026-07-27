// Componentes compartidos para las páginas legales de KYRELO.
import Link from 'next/link';
import { APP } from '@/lib/config';

export function LegalShell({
  titulo,
  actualizado,
  children,
}: {
  titulo: string;
  actualizado: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F1EFE8]">
      <header className="border-b border-[#E0DDD2]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/broker" className="text-[15px] font-semibold tracking-tight text-[#1A1A18]" style={{ fontFamily: 'Fraunces, serif' }}>
            {APP.marca}
          </Link>
          <Link href="/broker" className="text-[12px] text-[#5F5E5A] underline underline-offset-4 hover:text-[#1A1A18]">
            Volver
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#B87333]">Kyrelocorp</p>
        <h1 className="mt-3 text-[30px] leading-tight tracking-tight text-[#1A1A18]" style={{ fontFamily: 'Fraunces, serif' }}>
          {titulo}
        </h1>
        <p className="mt-2 text-[12px] text-[#A8A69E]">Última actualización: {actualizado}</p>
        <div className="legal-body mt-10 space-y-7 text-[14px] leading-relaxed text-[#3A3A36]">
          {children}
        </div>
      </main>

      <footer className="border-t border-[#E0DDD2]">
        <div className="mx-auto max-w-3xl px-6 py-8 text-[12px] text-[#5F5E5A]">
          <p className="font-medium text-[#1A1A18]">Kyrelocorp · {APP.eslogan}</p>
          <p className="mt-2">
            Contacto:{' '}
            <a
              href={`https://wa.me/${APP.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-[#1A1A18]"
            >
              WhatsApp +57 311 801 8295
            </a>
          </p>
          <div className="mt-4 flex gap-5">
            <Link href="/legal/tratamiento-de-datos" className="underline underline-offset-4 hover:text-[#1A1A18]">Tratamiento de datos</Link>
            <Link href="/legal/terminos" className="underline underline-offset-4 hover:text-[#1A1A18]">Términos y condiciones</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[16px] font-semibold tracking-tight text-[#1A1A18]">{children}</h2>;
}
