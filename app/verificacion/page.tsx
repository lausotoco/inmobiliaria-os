import type { Metadata } from "next";
import { PaginaTexto, H2 } from "@/components/casas/PaginaTexto";
import Gtm from "@/components/casas/Gtm";

/* ============================================================
   Estándar público de verificación
   ------------------------------------------------------------
   Es la página a la que se apunta cuando alguien pregunta "¿y
   ustedes qué garantizan?". Describe lo que KYRELO hace HOY.
   No menciona preaprobación de crédito porque el aliado
   hipotecario todavía no está firmado (ver mostrarBloqueCredito
   en lib/municipios.ts). Cuando se firme, se agrega aquí.
   ============================================================ */

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kyrelocorp.com";

export const metadata: Metadata = {
  title: "Cómo verificamos a compradores y propiedades | KYRELO",
  description:
    "Nuestro estándar de verificación: qué comprobamos antes de publicar un requerimiento y antes de mostrarte una casa. Sabana Norte de Bogotá.",
  alternates: { canonical: `${BASE}/verificacion` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Cómo verificamos | KYRELO",
    description:
      "Qué comprobamos antes de publicar un requerimiento y antes de mostrarte una casa.",
    url: `${BASE}/verificacion`,
    type: "website",
    locale: "es_CO",
    images: [{ url: `${BASE}/og-casas.jpg`, width: 1200, height: 630 }],
  },
};

export default function Page() {
  return (
    <>
      <Gtm />
      <PaginaTexto
        antetitulo="Nuestro estándar"
        titulo="Cómo verificamos a compradores y propiedades."
      >
        <p>
          KYRELO funciona al revés que un portal. En vez de publicar miles de anuncios y
          esperar a que alguien llame, trabajamos con pocos compradores a la vez y buscamos
          para cada uno. Para que eso funcione, dos cosas tienen que ser ciertas: que el
          comprador sea real y que la casa exista de verdad. Esto es lo que comprobamos.
        </p>

        <p>
          Y antes de nada, lo que casi siempre se pregunta primero:{" "}
          <strong>acompañarte no tiene ningún costo para ti.</strong>
        </p>

        <div>
          <H2>Antes de publicar tu requerimiento</H2>
          <p className="mt-2">
            Un requerimiento no se publica solo por llenar un formulario. Antes hablamos
            contigo unos quince minutos por videollamada y comprobamos tres cosas:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              <strong>Que la búsqueda sea real.</strong> Que estés buscando de verdad y no
              explorando precios, y que la decisión de compra dependa de ti o de personas
              que también están en la conversación.
            </li>
            <li>
              <strong>Que el presupuesto sea consistente.</strong> Hablamos de cuánto tienes
              disponible, cuánto piensas financiar y con qué banco estás hablando. Si el
              presupuesto no alcanza para lo que buscas, te lo decimos en esa llamada, no
              tres meses después.
            </li>
            <li>
              <strong>Que el requerimiento sea específico.</strong> Municipio, zona, tipo de
              vivienda, área, habitaciones y plazo. Un requerimiento vago no le sirve a
              ningún broker y termina desperdiciando el tiempo de todos.
            </li>
          </ul>
        </div>

        <div>
          <H2>Qué se publica y qué no</H2>
          <p className="mt-2">
            Cuando publicamos tu requerimiento en nuestra red, los brokers ven únicamente lo
            que necesitan para saber si tienen algo: municipio, zona, rango de presupuesto,
            tipo de vivienda, habitaciones y plazo.
          </p>
          <p className="mt-2">
            <strong>
              Tu nombre, tu teléfono y tu correo no se publican, no se comparten y no se
              venden.
            </strong>{" "}
            Ningún broker recibe tus datos de contacto. Si alguno tiene algo que encaja, nos
            lo presenta a nosotros y nosotros hablamos contigo.
          </p>
        </div>

        <div>
          <H2>Antes de mostrarte una casa</H2>
          <p className="mt-2">
            No te mandamos a recorrer casas para que descubras allá lo que se podía saber
            antes. De cada propiedad que te presentamos comprobamos:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              <strong>Que el precio sea el de hoy.</strong> Confirmado con quien puede
              venderla, no el del anuncio de hace ocho meses.
            </li>
            <li>
              <strong>Que esté disponible.</strong> Que no esté vendida, con promesa firmada
              ni con oferta aceptada.
            </li>
            <li>
              <strong>Que esté en orden jurídicamente.</strong> Revisamos el certificado de
              tradición y libertad para identificar hipotecas, embargos, limitaciones al
              dominio o problemas de titularidad antes de que salgas de tu casa.
            </li>
          </ul>
          <p className="mt-2">
            Si algo de esto no cuadra, la propiedad no llega a tu lista. Preferimos
            presentarte tres casas que sirvan a treinta que no.
          </p>
        </div>

        <div>
          <H2>Qué no hacemos</H2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong>No te cobramos nada.</strong> Ni por buscar, ni por acompañarte a
              visitar, ni por revisar los papeles. Nuestros honorarios los cubre la parte
              vendedora el día que se cierra el negocio, así que tú no pagas comisión.
            </li>
            <li>No publicamos tus datos ni los entregamos a terceros.</li>
            <li>
              No te presionamos con casas que no encajan solo porque están disponibles.
            </li>
            <li>
              No prometemos cifras de rentabilidad ni valorización. Ese no es nuestro
              trabajo.
            </li>
          </ul>
        </div>

        <div>
          <H2>Cuándo dejamos de acompañar una búsqueda</H2>
          <p className="mt-2">
            Trabajamos con pocos compradores a la vez, así que somos claros cuando algo no
            va a funcionar: si el presupuesto no corresponde con lo que se busca y no hay
            forma de acercarlos, o si pasan semanas sin poder avanzar, lo hablamos de frente
            y cerramos la búsqueda. Es preferible a mantenerte esperando.
          </p>
        </div>

        <div>
          <H2>¿Preguntas?</H2>
          <p className="mt-2">
            Escríbenos por WhatsApp al +57 311 801 8295 y te respondemos hoy mismo.
          </p>
        </div>
      </PaginaTexto>
    </>
  );
}
