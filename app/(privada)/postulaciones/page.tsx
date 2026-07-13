'use client';

// app/(privada)/postulaciones/page.tsx
// Vista de TU organización: pipeline de 8 estados de las postulaciones
// que los brokers hacen a tus compradores.

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const PIPELINE = [
  'postulado', 'validado', 'acuerdo_firmado', 'presentado',
  'visita', 'negociacion', 'cierre', 'comision_repartida',
] as const;

const NOMBRES: Record<string, string> = {
  postulado: 'Postulado',
  validado: 'Validado',
  acuerdo_firmado: 'Acuerdo firmado',
  presentado: 'Presentado',
  visita: 'Visita',
  negociacion: 'Negociación',
  cierre: 'Cierre',
  comision_repartida: 'Comisión repartida',
};

const formatoCOP = (n?: number | null) =>
  n == null ? '—' : '$' + Math.round(n / 1000000) + 'M';

export default function Postulaciones() {
  const supabase = createClient();
  const [items, setItems] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    // Trae postulaciones + código del requerimiento
    const { data } = await supabase
      .from('marketplace_postulaciones')
      .select('*, requerimientos(codigo)')
      .order('updated_at', { ascending: false });
    setItems(data ?? []);
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []); // eslint-disable-line

  async function moverEstado(p: any, direccion: 1 | -1) {
    const i = PIPELINE.indexOf(p.estado);
    const nuevo = PIPELINE[i + direccion];
    if (!nuevo) return;

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('marketplace_postulaciones')
      .update({ estado: nuevo, updated_at: new Date().toISOString() })
      .eq('id', p.id);
    if (error) return;

    await supabase.from('marketplace_eventos').insert({
      postulacion_id: p.id,
      estado_anterior: p.estado,
      estado_nuevo: nuevo,
      profile_id: user?.id,
    });
    cargar();
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] px-8 py-10">
      <p className="text-[9px] uppercase tracking-[0.2em] text-[#8C8C86] mb-2">Marketplace</p>
      <h1 className="text-2xl tracking-tight text-[#141414] mb-8">Flujo del marketplace</h1>

      {cargando ? (
        <p className="text-sm text-[#8C8C86]">Cargando…</p>
      ) : (
        <div className="flex gap-px overflow-x-auto pb-4 border-t border-[#E6E6E1] pt-6">
          {PIPELINE.map((estado, idx) => {
            const cols = items.filter((p) => p.estado === estado);
            return (
              <div key={estado} className="min-w-[230px] flex-1">
                <div className="flex items-baseline gap-2 mb-4 px-3">
                  <span className="text-[9px] uppercase tracking-[0.15em] text-[#8C8C86]">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.12em] text-[#141414]">
                    {NOMBRES[estado]}
                  </span>
                  <span className="text-[11px] text-[#B9B9B3]">{cols.length}</span>
                </div>

                <div className="space-y-px">
                  {cols.map((p) => (
                    <div key={p.id} className="bg-white border border-[#E6E6E1] p-4 mx-1">
                      <p className="text-[9px] uppercase tracking-[0.15em] text-[#8C8C86] mb-1">
                        Comprador #{p.requerimientos?.codigo ?? '—'}
                      </p>
                      <p className="text-sm text-[#141414] tracking-tight mb-1 leading-snug">{p.titulo}</p>
                      <p className="text-xs text-[#8C8C86] mb-3">
                        {[p.ubicacion, p.alcobas && `${p.alcobas} alc.`, formatoCOP(p.precio)]
                          .filter(Boolean).join(' · ')}
                      </p>
                      {p.fotos_url && (
                        <a href={p.fotos_url} target="_blank" rel="noreferrer"
                          className="text-xs text-[#8C8C86] underline underline-offset-4 block mb-3">
                          Ver fotos
                        </a>
                      )}
                      <div className="flex justify-between border-t border-[#E6E6E1] pt-2">
                        <button onClick={() => moverEstado(p, -1)} disabled={estado === PIPELINE[0]}
                          className="text-xs text-[#8C8C86] disabled:opacity-20 hover:text-[#141414] transition-colors">
                          ← Atrás
                        </button>
                        <button onClick={() => moverEstado(p, 1)} disabled={estado === PIPELINE[PIPELINE.length - 1]}
                          className="text-xs text-[#141414] disabled:opacity-20 hover:opacity-70 transition-opacity">
                          Avanzar →
                        </button>
                      </div>
                    </div>
                  ))}
                  {cols.length === 0 && (
                    <p className="text-xs text-[#B9B9B3] px-3">—</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
