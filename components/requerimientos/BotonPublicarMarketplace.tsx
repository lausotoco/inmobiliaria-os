'use client';

// components/requerimientos/BotonPublicarMarketplace.tsx
// Insértalo en app/(privada)/requerimientos/[id]/page.tsx:
//   <BotonPublicarMarketplace requerimientoId={req.id} organizationId={req.organization_id} />

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function BotonPublicarMarketplace({
  requerimientoId,
  organizationId,
}: {
  requerimientoId: string;
  organizationId: string;
}) {
  const supabase = createClient();
  const [publicado, setPublicado] = useState<boolean | null>(null);

  useEffect(() => {
    supabase
      .from('requerimiento_shares')
      .select('publicado')
      .eq('requerimiento_id', requerimientoId)
      .maybeSingle()
      .then(({ data }) => setPublicado(data?.publicado ?? false));
  }, [requerimientoId]); // eslint-disable-line

  async function alternar() {
    if (publicado) {
      await supabase.from('requerimiento_shares')
        .update({ publicado: false })
        .eq('requerimiento_id', requerimientoId);
      setPublicado(false);
    } else {
      await supabase.from('requerimiento_shares').upsert(
        { requerimiento_id: requerimientoId, organization_id: organizationId, publicado: true },
        { onConflict: 'requerimiento_id' }
      );
      setPublicado(true);
    }
  }

  if (publicado === null) return null;

  return (
    <button
      onClick={alternar}
      className={`rounded-full text-sm px-5 py-2 transition-all ${
        publicado
          ? 'border border-[#E0DDD2] text-[#5F5E5A] hover:text-[#1A1A18]'
          : 'bg-[#1A1A18] text-[#F1EFE8] hover:opacity-80'
      }`}
    >
      {publicado ? 'Retirar del marketplace' : 'Publicar en marketplace'}
    </button>
  );
}
