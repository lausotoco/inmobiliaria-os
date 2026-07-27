// Términos y Condiciones — KYRELO / Kyrelocorp
import { LegalShell, H2 } from '../_ui';

export const metadata = { title: 'Términos y condiciones · KYRELO' };

export default function Terminos() {
  return (
    <LegalShell titulo="Términos y condiciones" actualizado="julio de 2026">
      <p>
        Estos términos regulan el uso de la plataforma KYRELO, operada por Kyrelocorp. Al
        registrarte y usar la plataforma como broker o inmobiliaria aliada, aceptas estas
        condiciones.
      </p>

      <div>
        <H2>1. Qué es KYRELO</H2>
        <p className="mt-2">
          KYRELO es una plataforma que conecta a brokers e inmobiliarias con requerimientos de
          compradores verificados en la Sabana de Bogotá y zonas aledañas. KYRELO facilita el
          encuentro entre la oferta de inmuebles y la demanda de compradores; no es propietaria de
          los inmuebles ni parte de la compraventa entre las partes.
        </p>
      </div>

      <div>
        <H2>2. Registro gratuito</H2>
        <p className="mt-2">
          Registrarse y usar KYRELO no tiene costo para el broker. No cobramos cuotas de
          inscripción, mensualidades ni pago por acceder a los requerimientos. El broker únicamente
          comparte comisión cuando se cierra un negocio a partir de un requerimiento traído de
          KYRELO.
        </p>
      </div>

      <div>
        <H2>3. Comisiones</H2>
        <p className="mt-2">
          La comisión aplica solo cuando se concreta un cierre con un comprador presentado a través
          de KYRELO. Las condiciones específicas de reparto se acuerdan con el broker antes de
          presentar el inmueble al comprador, mediante el acuerdo correspondiente.
        </p>
      </div>

      <div>
        <H2>4. Inmuebles postulados y su alcance</H2>
        <p className="mt-2">
          Al postular un inmueble, el broker decide expresamente si autoriza que este se considere
          para futuros requerimientos dentro de KYRELO o únicamente para el requerimiento puntual al
          que postula. KYRELO se compromete a usar los inmuebles solo dentro de su plataforma y a no
          comercializarlos por fuera ni en plataformas de terceros.
        </p>
      </div>

      <div>
        <H2>5. Responsabilidad del broker</H2>
        <p className="mt-2">
          El broker declara que la información y las fotos de los inmuebles que postula son veraces
          y que cuenta con las autorizaciones necesarias para ofrecerlos. El broker es responsable
          por la exactitud de dicha información.
        </p>
      </div>

      <div>
        <H2>6. Buen uso de la plataforma</H2>
        <p className="mt-2">
          El broker se compromete a usar KYRELO de buena fe, a no suplantar identidades, a no
          publicar información falsa y a respetar la confidencialidad de los compradores y de las
          oportunidades a las que accede.
        </p>
      </div>

      <div>
        <H2>7. Cambios y contacto</H2>
        <p className="mt-2">
          Podemos actualizar estos términos y publicaremos los cambios en esta página. Para
          cualquier duda, escríbenos por WhatsApp al +57 311 801 8295.
        </p>
      </div>
    </LegalShell>
  );
}
