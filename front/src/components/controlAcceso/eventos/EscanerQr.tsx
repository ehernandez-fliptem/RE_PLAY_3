import { useMemo, useState } from "react";
import { Box } from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { FormProvider, useForm } from "react-hook-form";
import LectorQrVisitantes from "../../recepcion/visitantes/LectorQrVisitantes";
import { clienteAxios, handlingError } from "../../../app/config/axios";

type ResultState = { ok: boolean; message: string; img_ine?: string; nombre?: string };

export default function EscanerQr() {
  const formContext = useForm({ defaultValues: { qr: "" } });
  const [showQRScanner, setShowQRScanner] = useState(true);

  const onQrValidate = useMemo(
    () => async (qr: string): Promise<ResultState> => {
      const regexEmpleado = /^[0-9]+$/;
      const regexCardCode = /^VST[A-Z0-9]{16}$/;
      if (!regexCardCode.test(qr) && !regexEmpleado.test(qr)) {
        const message = "QR invalido o no corresponde a un empleado/visitante.";
        enqueueSnackbar(message, { variant: "error" });
        return { ok: false, message };
      }
      try {
        const res = await clienteAxios.post("/api/eventos/validar-qr", { qr, lector: 0 });
        if (!res.data.estado) {
          const message = res.data.mensaje || "No se pudo validar el QR.";
          enqueueSnackbar(message, { variant: "error" });
          return { ok: false, message };
        }
        const puedeAcceder = res.data.datos?.puedeAcceder;
        const nombre = res.data.datos?.nombre;
        const tipoCheck = res.data.datos?.tipo_check;
        if (puedeAcceder === false) {
          const message = nombre
            ? `Acceso pendiente para ${nombre}. Requiere validacion.`
            : "Acceso pendiente de autorizacion. Requiere validacion.";
          enqueueSnackbar(message, { variant: "warning" });
          return { ok: false, message };
        }
        const esEntrada = tipoCheck === 6 ? false : true;
        const esVisitanteQr = regexCardCode.test(qr);
        const ineRaw = String(res.data?.datos?.img_ine || "").trim();
        const message = nombre
          ? `Acceso a ${nombre}. ${esEntrada ? "Bienvenido." : "Hasta luego."}`
          : esEntrada
            ? "Acceso permitido. Bienvenido."
            : "Salida registrada. Hasta luego.";
        enqueueSnackbar(message, { variant: "success" });
        return {
          ok: true,
          message,
          img_ine: esVisitanteQr ? ineRaw || "" : undefined,
          nombre,
        };
      } catch (error) {
        handlingError(error);
        return { ok: false, message: "Error al validar el QR. Intenta de nuevo." };
      }
    },
    []
  );

  return (
    <Box sx={{ minHeight: 300 }}>
      {showQRScanner && (
        <FormProvider {...formContext}>
          <LectorQrVisitantes
            name="qr"
            setShow={setShowQRScanner}
            onQrValidate={onQrValidate}
            hideBackdrop
            hideActions
            allowEscapeClose={false}
          />
        </FormProvider>
      )}
    </Box>
  );
}
