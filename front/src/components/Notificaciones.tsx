import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useSnackbar } from "notistack";
import PopUp from "../assets/sounds/pop-up.wav";
import type { IRootState } from "../app/store";

export default function Notificaciones() {
  const { enqueueSnackbar } = useSnackbar();
  const socket = useSelector((state: IRootState) => state.ws.data);

  useEffect(() => {
    const notificarNuevos = (args: { datos: number }) => {
      const { datos } = args;
      const mensaje =
        datos === 1
          ? "Se creó un nuevo registro."
          : `Se crearon (${datos}) registros.`;
      new Audio(PopUp).play();
      enqueueSnackbar(mensaje, { variant: "info" });
    };
    if (socket) {
      socket.on("registros:notificar-nuevos", notificarNuevos);
      return () => {
        socket.off("registros:notificar-nuevos", notificarNuevos);
      };
    }
  }, [enqueueSnackbar, socket]);

  return <audio typeof="audio/wav" src={PopUp} />;
}
