import axios, { AxiosError } from "axios";
import { enqueueSnackbar } from "notistack";

export const clienteAxios = axios.create({
  baseURL:  "https://recepcionelectronica.tailf96b8e.ts.net/", 
});

clienteAxios.defaults.headers.common["ngrok-skip-browser-warning"] = "69420"

export const messages: Record<string, string>= {
  ERR_NETWORK: "No se estableció conexión con el servidor.",
};

const codeStatusMessage = {
  404: "Recurso no encontrado.",
  429: "Demasiadas solicitudes. Inténtalo de nuevo más tarde.",
  419: "La sesión ha expirado.",
  401: "No autorizado.",
};

export const handlingError = (error: Error | AxiosError | unknown) => {
  let restartSession = false;
  let erroresForm = null;
  if (axios.isAxiosError(error)) {
    const status = error.response?.status || 0;
    const code = error?.code;
    const { response } = error;
    if (messages[code as keyof typeof messages]) {
      enqueueSnackbar(`${code}: ${messages[code as keyof typeof messages]}`, {
        persist: true,
        variant: "warning",
      });
    } else if (status === 400) {
      enqueueSnackbar(`${status}: ${response?.data?.mensaje}`, {
        persist: true,
        variant: "error",
      });
      erroresForm = response?.data?.mensajes;
    } else if (status === 419) {
      enqueueSnackbar(`${status}: ${response?.data?.mensaje}`, {
        persist: true,
        variant: "error",
      });
      restartSession = true;
    } else if (status === 500) {
      enqueueSnackbar(`${status}: ${response?.data?.mensaje}`, {
        persist: true,
        variant: "error",
      });
    } else if (status >= 400 && status <= 599) {
      enqueueSnackbar(
        `${status}: ${
          codeStatusMessage[status as keyof typeof codeStatusMessage]
        }`,
        {
          persist: true,
          variant: "error",
        }
      );
    } else {
      const { mensaje } = error.response?.data || "";
      enqueueSnackbar(mensaje, {
        persist: true,
        variant: "error",
      });
    }
  } else if (error instanceof Error) {
    enqueueSnackbar(error.message, {
      persist: true,
      variant: "error",
    });
  } else {
    enqueueSnackbar("Un error desconocido se ha presentado.", {
      persist: true,
      variant: "error",
    });
  }
  return { restartSession, erroresForm };
};
