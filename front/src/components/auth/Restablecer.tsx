import { Fragment, useState } from "react";

import ActualizarPass from "./restablecer/ActualizarPass";
import VerificarCorreo from "./restablecer/VerificarCorreo";
import VerificarCodigo from "./restablecer/VerificarCodigo";
import AuthContainer from "./AuthContainer";

export default function Restablecer() {
  const [token, setToken] = useState("");
  const [correoEnviado, setCorreoEnviado] = useState(false);
  const [codigoValido, setCodigoValido] = useState(false);

  return (
    <AuthContainer>
      {token && correoEnviado && codigoValido ? (
        <ActualizarPass token={token} />
      ) : (
        <Fragment>
          {!correoEnviado && !codigoValido && (
            <VerificarCorreo setCorreoEnviado={setCorreoEnviado} />
          )}
          {correoEnviado && !codigoValido && (
            <VerificarCodigo
              setCodigoValido={setCodigoValido}
              setToken={setToken}
            />
          )}
        </Fragment>
      )}
    </AuthContainer>
  );
}
