import { useEffect, useState } from "react";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { NetworkCheck, Sync } from "@mui/icons-material";
import Swal from "sweetalert2";
import { clienteAxios, handlingError } from "../../../app/config/axios";

type ConexionGlobal = {
  direccion_ip: string;
  puerto: number;
  usuario: string;
  session_activa: boolean;
};

export default function BiostararConexion() {
  const [conexionGlobal, setConexionGlobal] = useState<ConexionGlobal | null>(null);

  const cargarConexionGlobal = async () => {
    try {
      const res = await clienteAxios.get("/api/dispositivos-biostar/conexion-global");
      if (res.data.estado) setConexionGlobal(res.data.datos);
    } catch (error) {
      handlingError(error);
    }
  };

  const configurarConexionGlobal = async () => {
    const actual = conexionGlobal;
    const result = await Swal.fire({
      title: "Conexion Global BioStar",
      html: `
        <input id="bio-ip" class="swal2-input" placeholder="Direccion IP" value="${actual?.direccion_ip || ""}">
        <input id="bio-port" class="swal2-input" placeholder="Puerto" value="${actual?.puerto || 443}">
        <input id="bio-user" class="swal2-input" placeholder="Usuario" value="${actual?.usuario || ""}">
        <input id="bio-pass" class="swal2-input" placeholder="Contrasena" type="password">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const direccion_ip = (document.getElementById("bio-ip") as HTMLInputElement)?.value?.trim();
        const puerto = Number((document.getElementById("bio-port") as HTMLInputElement)?.value || 443);
        const usuario = (document.getElementById("bio-user") as HTMLInputElement)?.value?.trim();
        const contrasena = (document.getElementById("bio-pass") as HTMLInputElement)?.value || "";
        if (!direccion_ip || !usuario) {
          Swal.showValidationMessage("IP y usuario son obligatorios.");
          return null;
        }
        return { direccion_ip, puerto, usuario, contrasena };
      },
    });
    if (!result.isConfirmed || !result.value) return;

    Swal.fire({
      title: "Validando conexion...",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });
    try {
      const saveRes = await clienteAxios.put("/api/dispositivos-biostar/conexion-global", result.value);
      if (!saveRes.data.estado) {
        Swal.close();
        await Swal.fire({ icon: "error", title: "No se pudo guardar", text: saveRes.data.mensaje || "" });
        return;
      }
      const testRes = await clienteAxios.post("/api/dispositivos-biostar/conexion-global/probar", {});
      Swal.close();
      if (!testRes.data.estado) {
        await Swal.fire({ icon: "error", title: "Sin conexion", text: testRes.data.mensaje || "No se pudo conectar." });
        return;
      }
      await Swal.fire({ icon: "success", title: "Guardado", text: "Conexion global activa." });
      await cargarConexionGlobal();
    } catch (error) {
      Swal.close();
      handlingError(error);
    }
  };

  const sincronizarDispositivos = async () => {
    Swal.fire({
      title: "Sincronizando dispositivos...",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });
    try {
      const res = await clienteAxios.post("/api/dispositivos-biostar/sincronizar-dispositivos", {});
      Swal.close();
      if (res.data.estado) {
        await Swal.fire({ icon: "success", title: "Sincronizacion completa", text: res.data.mensaje || "" });
        await cargarConexionGlobal();
      } else {
        await Swal.fire({ icon: "error", title: "No se pudo sincronizar", text: res.data.mensaje || "" });
      }
    } catch (error) {
      Swal.close();
      handlingError(error);
    }
  };

  useEffect(() => {
    cargarConexionGlobal();
  }, []);

  return (
    <Box sx={{ p: 2, border: "1px solid #e6e6e6", borderRadius: 1, bgcolor: "background.paper" }}>
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "start", sm: "center" }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h6"><strong>Gestion de Conexiones BioStar</strong></Typography>
          <Typography variant="body2">
            {conexionGlobal
              ? `${conexionGlobal.direccion_ip}:${conexionGlobal.puerto} - ${conexionGlobal.usuario}`
              : "Sin configurar"}
          </Typography>
          <Chip
            label={conexionGlobal?.session_activa ? "Sesion activa" : "Sin sesion"}
            color={conexionGlobal?.session_activa ? "success" : "default"}
            size="small"
            sx={{ mt: 1 }}
          />
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={configurarConexionGlobal} startIcon={<NetworkCheck />}>
            Configurar conexion
          </Button>
          <Button variant="contained" onClick={sincronizarDispositivos} startIcon={<Sync />}>
            Sincronizar dispositivos
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
