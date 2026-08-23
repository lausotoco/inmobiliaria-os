import type { Metadata } from "next";
import { PaginaTexto, H2 } from "@/components/casas/PaginaTexto";
import Gtm from "@/components/casas/Gtm";
import { VERSION_AUTORIZACION, politicaAprobadaPorAbogado } from "@/lib/municipios";

/* ============================================================
   Política de Tratamiento de Datos Personales — KYRELO
   Ley 1581 de 2012 y Decreto 1377 de 2013 (Colombia)
   ------------------------------------------------------------
   Destinada a reemplazar a /legal/tratamiento-de-datos. Cubre a
   las tres audiencias: compradores, brokers y propietarios.
   La redirección de la política vieja a esta NO está puesta
   todavía: se activa el día que el abogado apruebe este texto.

   ⚠️  BORRADOR PENDIENTE DE REVISIÓN DE ABOGADO.
   La bandera vive en lib/municipios.ts (politicaAprobadaPorAbogado):
   mientras sea false esta página funciona y es legible, pero no se
   indexa en Google. Cuando el abogado la apruebe: poner true.
   ============================================================ */

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kyrelocorp.com";

export const metadata: Metadata = {
  title: "Política de tratamiento de datos personales | KYRELO",
  description:
    "Qué datos recogemos, con qué fin los usamos y cuáles son tus derechos. Ley 1581 de 2012.",
  alternates: { canonical: `${BASE}/politica-de-datos` },
  robots: politicaAprobadaPorAbogado
    ? { index: true, follow: true }
    : { index: false, follow: true },
};

export default function Page() {
  return (
    <>
      <Gtm />
      <PaginaTexto
        antetitulo="Kyrelocorp"
        titulo="Política de tratamiento de datos personales"
        actualizado="agosto de 2026"
      >
        <p>
          En Kyrelocorp (en adelante “KYRELO”) respetamos tu privacidad y protegemos los
          datos personales que nos compartes. Esta política explica qué datos recogemos,
          con qué fin los usamos y cuáles son tus derechos, en cumplimiento de la Ley 1581
          de 2012 y el Decreto 1377 de 2013 de Colombia.
        </p>

        <div>
          <H2>1. Responsable del tratamiento</H2>
          <p className="mt-2">
            El responsable es Kyrelocorp, marca a través de la cual operamos KYRELO. Puedes
            contactarnos por WhatsApp al +57 311 801 8295 para cualquier asunto relacionado
            con tus datos. Cuando formalicemos la constitución legal de la empresa,
            actualizaremos en esta misma página los datos de identificación
            correspondientes.
          </p>
        </div>

        <div>
          <H2>2. Datos que recogemos</H2>
          <p className="mt-2">
            <strong>Si buscas casa:</strong> el municipio donde buscas, tu rango de
            presupuesto, el tipo de vivienda que quieres, para cuándo quieres mudarte y tu
            número de WhatsApp. No te pedimos nombre ni correo en el formulario; si los
            necesitamos, te los pedimos después en la conversación.
          </p>
          <p className="mt-2">
            <strong>Si eres broker o inmobiliaria:</strong> nombre, celular o WhatsApp,
            correo electrónico, nombre de tu inmobiliaria o marca, y la información de los
            inmuebles que decides postular.
          </p>
          <p className="mt-2">
            <strong>En todos los casos:</strong> datos técnicos básicos de navegación —
            dirección IP, navegador, página desde la que llegaste e identificadores de
            campaña publicitaria como <em>gclid</em> o parámetros UTM — para saber qué
            anuncios funcionan y medir nuestras campañas.
          </p>
        </div>

        <div>
          <H2>3. Para qué usamos tus datos</H2>
          <p className="mt-2">Si nos dejas tu requerimiento de vivienda, usamos tus datos para:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Contactarte por WhatsApp, teléfono o correo.</li>
            <li>Entender en detalle qué vivienda necesitas y con qué presupuesto.</li>
            <li>
              <strong>
                Publicar tu requerimiento de forma anónima ante brokers, inmobiliarias y
                constructoras aliadas
              </strong>{" "}
              con el fin de que nos presenten propiedades que se ajusten a lo que buscas.
            </li>
            <li>Acompañarte durante el proceso de compra hasta la firma de la escritura.</li>
          </ul>
          <p className="mt-2">
            Si eres broker, usamos tus datos para crear y administrar tu cuenta, conectar
            los inmuebles que postulas con requerimientos de compradores, y comunicarnos
            contigo sobre tus postulaciones.
          </p>
          <p className="mt-2">
            En ningún caso vendemos tus datos personales a terceros.
          </p>
        </div>

        <div>
          <H2>4. Qué significa “de forma anónima”</H2>
          <p className="mt-2">
            Cuando publicamos tu requerimiento en nuestra red, los brokers ven únicamente
            las características de lo que buscas: municipio, zona, rango de presupuesto,
            tipo de vivienda, número de habitaciones y plazo. <strong>Tu nombre, tu número
            de teléfono y tu correo nunca se publican</strong> ni se entregan a ningún
            broker. El contacto contigo lo hacemos siempre nosotros.
          </p>
        </div>

        <div>
          <H2>5. Tu autorización</H2>
          <p className="mt-2">
            Solo tratamos tus datos si marcas la casilla de autorización, que es libre,
            previa, expresa e informada, y que nunca viene marcada por defecto. Guardamos
            junto a tu registro la fecha y hora exactas en que la aceptaste y la versión
            del texto que viste (actualmente{" "}
            <span className="font-mono text-[13px]">{VERSION_AUTORIZACION}</span>), para
            poder demostrar qué autorizaste exactamente.
          </p>
          <p className="mt-2">
            Si en el futuro cambiamos las finalidades de esta política,{" "}
            <strong>esos cambios no se aplican hacia atrás</strong>: para usar tus datos
            con una finalidad nueva tendríamos que pedirte una autorización nueva.
          </p>
        </div>

        <div>
          <H2>6. Herramientas de terceros</H2>
          <p className="mt-2">
            Usamos servicios de terceros para operar y medir el sitio, entre ellos
            proveedores de infraestructura y las herramientas publicitarias de Google
            (Google Ads y Google Tag Manager) y de Meta (Facebook e Instagram). Estas
            herramientas pueden usar cookies o píxeles para atribuir visitas y registros a
            nuestras campañas. La conversación posterior ocurre por WhatsApp, cuyo
            tratamiento de datos se rige por las políticas de su propio proveedor.
          </p>
        </div>

        <div>
          <H2>7. Por cuánto tiempo los guardamos</H2>
          <p className="mt-2">
            Conservamos tus datos mientras tu búsqueda esté activa y durante el tiempo
            necesario para cumplir obligaciones legales y contables. Si nos pides que los
            eliminemos, lo hacemos salvo que una norma nos obligue a conservarlos.
          </p>
        </div>

        <div>
          <H2>8. Tus derechos</H2>
          <p className="mt-2">
            Como titular de los datos tienes derecho a conocer, actualizar, rectificar y
            suprimir tu información, a solicitar prueba de la autorización que otorgaste, a
            ser informado sobre el uso que le hemos dado, y a revocar la autorización en
            cualquier momento. Para ejercer cualquiera de estos derechos escríbenos por
            WhatsApp al +57 311 801 8295 y atenderemos tu solicitud.
          </p>
        </div>

        <div>
          <H2>9. Vigencia y cambios</H2>
          <p className="mt-2">
            Esta política rige desde su publicación y puede actualizarse. Publicaremos
            cualquier cambio en esta misma página, indicando la fecha de la última
            actualización.
          </p>
        </div>
      </PaginaTexto>
    </>
  );
}
