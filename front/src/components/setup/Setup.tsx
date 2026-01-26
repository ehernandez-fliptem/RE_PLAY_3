// import NuevaConfiguracion from "./partes/NuevaConfiguracion";
import NuevaConfiguracion from "./partes/NuevaConfiguracion";
import NuevaEmpresa from "./partes/NuevaEmpresa";
import NuevoUsuario from "./partes/NuevoUsuario";
import NuevosAccesos from "./partes/NuevosAccesos";
import NuevosPisos from "./partes/NuevosPisos";

type Props = {
  empresas: number;
  pisos: number;
  accesos: number;
  usuarios: number;
  configuracion: number;
  setEmpresas: React.Dispatch<React.SetStateAction<number>>;
  setPisos: React.Dispatch<React.SetStateAction<number>>;
  setAccesos: React.Dispatch<React.SetStateAction<number>>;
  setConfiguracion: React.Dispatch<React.SetStateAction<number>>;
  setUsuarios: React.Dispatch<React.SetStateAction<number>>;
};

export default function Setup({
  empresas = 0,
  pisos = 0,
  accesos = 0,
  usuarios = 0,
  configuracion = 0,
  setEmpresas,
  setPisos,
  setAccesos,
  setConfiguracion,
  setUsuarios,
}: Props) {
  if (configuracion === 0) {
    return <NuevaConfiguracion setConfiguracion={setConfiguracion} />;
  } else if (pisos === 0) {
    return <NuevosPisos setPisos={setPisos} />;
  } else if (accesos === 0) {
    return <NuevosAccesos setAccesos={setAccesos} />;
  } else if (empresas === 0) {
    return <NuevaEmpresa setEmpresas={setEmpresas} />;
  } else if (usuarios === 0) {
    return <NuevoUsuario setUsuarios={setUsuarios} />;
  } else {
    return <></>;
  }
}
