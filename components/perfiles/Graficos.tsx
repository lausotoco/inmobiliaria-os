/* ============================================================
   Gráficos animados de cada perfil (SVG + CSS, sin librerías).
   Todos en una caja de 400 × 400, sobre fondo grafito, y en loop.
   ============================================================ */

import type { PerfilId } from "@/lib/perfiles";

const H = "#F1EFE8", K = "#B87333", K2 = "#D9A36A", G = "rgba(241,239,232,.28)";
const txt = { fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, letterSpacing: "0.18em" } as const;

export const ESTILOS_GRAFICOS = `
.gx * { transform-box: fill-box; transform-origin: center; }
@keyframes gxApaga { 0%,22% { opacity: 1 } 32%,84% { opacity: .14 } 94%,100% { opacity: 1 } }
@keyframes gxElige { 0%,28% { stroke: rgba(241,239,232,.45); transform: scale(1) } 36%,84% { stroke: ${K}; transform: scale(1.07) } 94%,100% { stroke: rgba(241,239,232,.45); transform: scale(1) } }
@keyframes gxCheck { 0%,34% { opacity: 0; transform: scale(.3) } 40%,84% { opacity: 1; transform: scale(1) } 92%,100% { opacity: 0; transform: scale(.3) } }
@keyframes gxBarre { 0% { transform: translateY(0); opacity: 0 } 6% { opacity: .9 } 30% { transform: translateY(230px); opacity: .9 } 34%,100% { transform: translateY(230px); opacity: 0 } }
@keyframes gxPasa { 0% { transform: translateX(0); opacity: 0 } 8% { opacity: 1 } 55% { transform: translateX(215px); opacity: 1 } 70%,100% { transform: translateX(215px); opacity: 0 } }
@keyframes gxRebota { 0% { transform: translateX(0); opacity: 0 } 8% { opacity: .8 } 40% { transform: translateX(118px); opacity: .8 } 55%,100% { transform: translateX(92px); opacity: 0 } }
@keyframes gxSube { 0% { transform: translateY(40px); opacity: 0 } 12%,80% { transform: translateY(0); opacity: 1 } 92%,100% { transform: translateY(-14px); opacity: 0 } }
@keyframes gxLatido { 0%,100% { transform: scale(1); opacity: .85 } 50% { transform: scale(1.08); opacity: 1 } }
@keyframes gxTraza { 0%,40% { stroke-dashoffset: 120 } 60%,88% { stroke-dashoffset: 0 } 100% { stroke-dashoffset: 120 } }
@keyframes gxAparece { 0%,48% { opacity: 0; transform: scale(.85) } 58%,88% { opacity: 1; transform: scale(1) } 100% { opacity: 0 } }
@keyframes gxBarra { 0%,40% { transform: scaleY(.15) } 70%,90% { transform: scaleY(1) } 100% { transform: scaleY(.15) } }
@keyframes gxLevanta { 0%,45% { transform: translateY(0) } 55%,88% { transform: translateY(-7px) } 100% { transform: translateY(0) } }
@keyframes gxPiso { 0% { opacity: 0; transform: scaleX(.4) } 6%,88% { opacity: 1; transform: scaleX(1) } 100% { opacity: 0 } }
@keyframes gxCrece { 0%,8% { stroke-dashoffset: 90 } 30%,88% { stroke-dashoffset: 0 } 100% { stroke-dashoffset: 90 } }
@keyframes gxLlena { 0%,6% { fill: transparent } 12%,88% { fill: ${K} } 100% { fill: transparent } }
@media (prefers-reduced-motion: reduce) { .gx * { animation: none !important; } }
`;

function Casita({ x, y, w = 70, h = 58, color = "rgba(241,239,232,.45)" }: { x: number; y: number; w?: number; h?: number; color?: string }) {
  const cx = x + w / 2;
  return (
    <g fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round">
      <path d={`M${x + 14} ${y + h - 12}V${y + 28}L${cx} ${y + 12}L${x + w - 14} ${y + 28}V${y + h - 12}Z`} />
      <path d={`M${cx - 5} ${y + h - 12}v-12h10v12`} />
    </g>
  );
}

/* Comprador: de muchos anuncios a la selección que sí sirve */
function Comprador() {
  const tiles: [number, number][] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) tiles.push([36 + c * 84, 150 + r * 76]);
  const elegidas = [1, 6, 8];
  return (
    <g>
      <rect x={40} y={34} width={320} height={78} rx={14} fill="rgba(241,239,232,.06)" stroke={K} strokeWidth={1.5} />
      <text x={60} y={62} fill={K} fontSize={10} style={txt}>TU BÚSQUEDA</text>
      <text x={60} y={92} fill={H} fontSize={17} fontFamily="Fraunces, Georgia, serif">Chía · Casa · 3 hab · 6 meses</text>
      <rect x={36} y={146} width={328} height={2} fill={K2} style={{ animation: "gxBarre 6s ease-in-out infinite" }} />
      {tiles.map(([x, y], i) => {
        const sel = elegidas.includes(i);
        return (
          <g key={i} style={sel ? undefined : { animation: `gxApaga 6s ease-in-out infinite`, animationDelay: `${(i % 4) * 0.05}s` }}>
            <rect x={x} y={y} width={72} height={64} rx={10} fill="rgba(241,239,232,.04)" stroke="rgba(241,239,232,.45)" strokeWidth={1.5}
              style={sel ? { animation: "gxElige 6s ease-in-out infinite" } : undefined} />
            <Casita x={x + 1} y={y + 3} color={sel ? H : "rgba(241,239,232,.45)"} />
            {sel && (
              <g style={{ animation: "gxCheck 6s ease-in-out infinite" }}>
                <circle cx={x + 66} cy={y + 6} r={11} fill={K} />
                <path d={`M${x + 60} ${y + 6}l4 4l7-8`} stroke="#fff" strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

/* Propietario: los curiosos se quedan en el filtro; los compradores verificados llegan a la casa */
function Propietario() {
  const filas = [120, 170, 220, 270];
  return (
    <g>
      <text x={30} y={60} fill={G} fontSize={10} style={txt}>INTERESADOS</text>
      <line x1={190} y1={90} x2={190} y2={320} stroke={K} strokeWidth={2} strokeDasharray="6 8" />
      <text x={190} y={346} fill={K} fontSize={9} textAnchor="middle" style={txt}>VERIFICACIÓN</text>
      <g fill="none" stroke={H} strokeWidth={3} strokeLinejoin="round">
        <path d="M262 290V200L318 150L374 200V290Z" />
        <path d="M306 290v-34h24v34" />
      </g>
      <circle cx={342} cy={226} r={6} fill={K} />
      <text x={318} y={322} fill={H} fontSize={10} textAnchor="middle" style={txt}>TU INMUEBLE</text>
      {filas.map((y, i) => {
        const ok = i % 2 === 0;
        return (
          <g key={y} style={{ animation: `${ok ? "gxPasa" : "gxRebota"} 4.8s ease-in-out infinite`, animationDelay: `${i * 0.6}s` }}>
            <circle cx={36} cy={y - 9} r={7} fill={ok ? K : "rgba(241,239,232,.35)"} />
            <path d={`M24 ${y + 12}a12 12 0 0 1 24 0`} fill={ok ? K : "rgba(241,239,232,.35)"} />
            {ok && <path d={`M52 ${y - 8}l4 4l7-8`} stroke={K2} strokeWidth={2.4} fill="none" strokeLinecap="round" />}
          </g>
        );
      })}
    </g>
  );
}

/* Agente: llegan requerimientos verificados al celular y uno hace match con su inmueble */
function Agente() {
  const cards = [0, 1, 2];
  return (
    <g>
      <rect x={70} y={30} width={170} height={340} rx={26} fill="rgba(241,239,232,.04)" stroke={H} strokeWidth={3} />
      <rect x={130} y={42} width={50} height={6} rx={3} fill={G} />
      {cards.map((i) => (
        <g key={i} style={{ animation: "gxSube 6s ease-out infinite", animationDelay: `${i * 0.35}s` }}>
          <rect x={86} y={70 + i * 92} width={138} height={78} rx={12} fill={i === 1 ? "rgba(184,115,51,.18)" : "rgba(241,239,232,.07)"} stroke={i === 1 ? K : "rgba(241,239,232,.25)"} strokeWidth={1.5} />
          <text x={98} y={92 + i * 92} fill={K} fontSize={7.5} style={txt}>COMPRADOR VERIFICADO</text>
          <text x={98} y={114 + i * 92} fill={H} fontSize={13} fontFamily="Fraunces, Georgia, serif">{["Chía · Casa", "Cajicá · Casa", "Cota · Apto"][i]}</text>
          <rect x={98} y={124 + i * 92} width={70} height={5} rx={2.5} fill={G} />
          <rect x={98} y={134 + i * 92} width={48} height={5} rx={2.5} fill={G} />
        </g>
      ))}
      <path d="M224 210H300" stroke={K} strokeWidth={2.5} strokeDasharray="120" style={{ animation: "gxTraza 6s ease-in-out infinite" }} />
      <g style={{ animation: "gxAparece 6s ease-in-out infinite" }}>
        <rect x={296} y={160} width={88} height={100} rx={14} fill="rgba(241,239,232,.06)" stroke={H} strokeWidth={2} />
        <Casita x={305} y={176} w={70} h={64} color={H} />
        <rect x={300} y={276} width={80} height={26} rx={13} fill={K} />
        <text x={340} y={293} fill="#fff" fontSize={9} textAnchor="middle" style={txt}>MATCH</text>
      </g>
    </g>
  );
}

/* Oficina: del inventario completo, eliges tres; se vuelven reels y suben las conversaciones */
function Oficina() {
  const tiles: [number, number][] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) tiles.push([30 + c * 70, 40 + r * 66]);
  const elegidas = [2, 5, 13];
  return (
    <g>
      <text x={30} y={28} fill={G} fontSize={9} style={txt}>TU INVENTARIO</text>
      {tiles.map(([x, y], i) => {
        const sel = elegidas.includes(i);
        return (
          <g key={i} style={sel ? { animation: "gxLevanta 6s ease-in-out infinite" } : { animation: "gxApaga 6s ease-in-out infinite" }}>
            <rect x={x} y={y} width={60} height={56} rx={9} fill="rgba(241,239,232,.05)" stroke="rgba(241,239,232,.4)" strokeWidth={1.5}
              style={sel ? { animation: "gxElige 6s ease-in-out infinite" } : undefined} />
            <Casita x={x - 5} y={y} w={70} h={56} />
            {sel && (
              <g style={{ animation: "gxCheck 6s ease-in-out infinite" }}>
                <circle cx={x + 30} cy={y + 30} r={13} fill={K} />
                <path d={`M${x + 26} ${y + 23}v14l11-7z`} fill="#fff" />
              </g>
            )}
          </g>
        );
      })}
      <text x={30} y={268} fill={K} fontSize={9} style={txt}>POTENCIAR · 3 INMUEBLES</text>
      <line x1={30} y1={360} x2={370} y2={360} stroke={G} strokeWidth={1.5} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={i} x={36 + i * 42} y={290} width={26} height={68} rx={4} fill={i > 4 ? K : "rgba(241,239,232,.35)"}
          style={{ animation: "gxBarra 6s ease-in-out infinite", animationDelay: `${i * 0.06}s`, transformOrigin: "bottom" }} />
      ))}
      <text x={370} y={384} fill={G} fontSize={8.5} textAnchor="end" style={txt}>CONVERSACIONES</text>
    </g>
  );
}

/* Constructora: la línea de tiempo del proyecto y la torre que crece; el lanzamiento va al principio */
function Constructora() {
  const hitos = ["PLANO", "PREVENTA", "PRIMERA PIEDRA", "OBRA", "ENTREGA"];
  const pisos = Array.from({ length: 9 }, (_, i) => i);
  return (
    <g>
      <line x1={70} y1={60} x2={70} y2={340} stroke={G} strokeWidth={2} />
      <line x1={70} y1={60} x2={70} y2={130} stroke={K} strokeWidth={5} strokeDasharray="90" style={{ animation: "gxCrece 6s ease-in-out infinite" }} />
      {hitos.map((h, i) => (
        <g key={h}>
          <circle cx={70} cy={60 + i * 70} r={9} stroke={H} strokeWidth={2} fill="transparent"
            style={i < 2 ? { animation: "gxLlena 6s ease-in-out infinite", animationDelay: `${i * 0.5}s` } : undefined} />
          <text x={92} y={64 + i * 70} fill={i < 2 ? H : G} fontSize={10} style={txt}>{h}</text>
        </g>
      ))}
      <text x={92} y={100} fill={K} fontSize={8} style={txt}>LANZAMIENTO</text>
      <line x1={230} y1={340} x2={380} y2={340} stroke={H} strokeWidth={2} />
      {pisos.map((i) => (
        <rect key={i} x={262} y={312 - i * 30} width={90} height={24} rx={3} fill={i === 8 ? K : "rgba(241,239,232,.12)"} stroke={H} strokeWidth={1.5}
          style={{ animation: "gxPiso 6s ease-out infinite", animationDelay: `${0.3 + i * 0.28}s`, opacity: 0 }} />
      ))}
      <path d="M240 60V340M240 64H372M352 64v26" stroke={G} strokeWidth={2} fill="none" />
    </g>
  );
}

export function GraficoPerfil({ id, className = "" }: { id: PerfilId; className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={`gx ${className}`} role="img" aria-hidden="true">
      {id === "compradores" && <Comprador />}
      {id === "propietarios" && <Propietario />}
      {id === "agentes" && <Agente />}
      {id === "oficinas" && <Oficina />}
      {id === "constructoras" && <Constructora />}
    </svg>
  );
}
