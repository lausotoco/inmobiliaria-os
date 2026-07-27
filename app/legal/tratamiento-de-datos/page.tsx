// Política de Tratamiento de Datos Personales — KYRELO / Kyrelocorp
// Cumple lo exigido por la Ley 1581 de 2012 (Colombia) y por las políticas
// de anuncios de Meta y Google. Actualiza los datos legales cuando formalices.
import { LegalShell, H2 } from '../_ui';

export const metadata = { title: 'Tratamiento de datos · KYRELO' };

export default function TratamientoDatos() {
  return (
    <LegalShell titulo="Política de tratamiento de datos personales" actualizado="julio de 2026">
      <p>
        En Kyrelocorp (en adelante “KYRELO”) respetamos tu privacidad y protegemos los datos
        personales que nos compartes. Esta política explica qué datos recogemos, con qué fin y
        cuáles son tus derechos, en cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013
        de Colombia.
      </p>

      <div>
        <H2>1. Responsable del tratamiento</H2>
        <p className="mt-2">
          El responsable es Kyrelocorp, marca a través de la cual operamos la plataforma KYRELO.
          Puedes contactarnos por WhatsApp al +57 311 801 8295 para cualquier asunto relacionado
          con tus datos.
        </p>
      </div>

      <div>
        <H2>2. Datos que recogemos</H2>
        <p className="mt-2">
          Recogemos los datos que nos entregas al registrarte o usar la plataforma: nombre,
          número de celular o WhatsApp, correo electrónico, nombre de tu inmobiliaria o marca (si
          aplica) y la información de los inmuebles que decides postular. También recogemos datos
          técnicos básicos de navegación (como cookies y píxeles de medición) para entender el uso
          del sitio y medir nuestras campañas publicitarias.
        </p>
      </div>

      <div>
        <H2>3. Finalidad</H2>
        <p className="mt-2">
          Usamos tus datos para: crear y administrar tu cuenta de broker; conectar los inmuebles
          que postulas con los requerimientos de compradores dentro de KYRELO; comunicarnos
          contigo sobre tus postulaciones y oportunidades; y mejorar y medir el desempeño de la
          plataforma y de nuestra publicidad. No vendemos tus datos personales a terceros.
        </p>
      </div>

      <div>
        <H2>4. Sobre los inmuebles que postulas</H2>
        <p className="mt-2">
          La información de los inmuebles que compartes se usa únicamente dentro de KYRELO para
          cruzarla con requerimientos de compradores. Al momento de postular, tú decides el
          alcance: si autorizas que el inmueble se considere para futuros requerimientos de KYRELO,
          o solo para el requerimiento puntual al que postulas. En ningún caso comercializamos tu
          inmueble por fuera de KYRELO ni en plataformas de terceros.
        </p>
      </div>

      <div>
        <H2>5. Herramientas de terceros</H2>
        <p className="mt-2">
          Usamos servicios de terceros para operar y medir la plataforma, entre ellos proveedores
          de infraestructura y las herramientas publicitarias de Meta (Facebook e Instagram) y
          Google. Estas herramientas pueden usar cookies o píxeles para atribuir visitas y
          registros a nuestras campañas.
        </p>
      </div>

      <div>
        <H2>6. Tus derechos</H2>
        <p className="mt-2">
          Como titular de los datos tienes derecho a conocer, actualizar, rectificar y suprimir tu
          información, así como a revocar la autorización otorgada. Para ejercer cualquiera de estos
          derechos, escríbenos por WhatsApp al +57 311 801 8295 y atenderemos tu solicitud.
        </p>
      </div>

      <div>
        <H2>7. Autorización</H2>
        <p className="mt-2">
          Al registrarte y marcar la casilla de autorización, aceptas de manera libre, previa,
          expresa e informada que Kyrelocorp trate tus datos personales conforme a esta política.
        </p>
      </div>

      <div>
        <H2>8. Vigencia y cambios</H2>
        <p className="mt-2">
          Esta política rige desde su publicación y puede actualizarse. Cuando formalicemos la
          constitución legal de la empresa, actualizaremos los datos de identificación
          correspondientes. Publicaremos cualquier cambio en esta misma página.
        </p>
      </div>
    </LegalShell>
  );
}
