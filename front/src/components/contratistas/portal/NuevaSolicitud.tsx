import { ChevronLeft, Save } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import Swal from "sweetalert2";
import type { SweetAlertOptions } from "sweetalert2";
import { enqueueSnackbar } from "notistack";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import Spinner from "../../utils/Spinner";
import ModalContainer from "../../utils/ModalContainer";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { GridDataSourceApiBase } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

type Visitante = {
  _id: string;
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;
  correo: string;
};

type Anfitrion = {
  _id: string;
  nombre: string;
};

export default function NuevaPortalSolicitud() {
  const navigate = useNavigate();
  const parentGridDataRef = useOutletContext<GridDataSourceApiBase>();
  const [isLoading, setIsLoading] = useState(true);
  const [visitantes, setVisitantes] = useState<Visitante[]>([]);
  const [selected, setSelected] = useState<Visitante[]>([]);
  const [anfitriones, setAnfitriones] = useState<Anfitrion[]>([]);
  const [selectedAnfitriones, setSelectedAnfitriones] = useState<Anfitrion[]>([]);
  const [fecha, setFecha] = useState<Dayjs | null>(dayjs());
  const [comentario, setComentario] = useState("");
  const [swalOpen, setSwalOpen] = useState(false);
  const [ocupadosIds, setOcupadosIds] = useState<string[]>([]);

  const opcionesDisponibles = visitantes.filter(
    (option) =>
      !selected.some((v) => v._id === option._id) && !ocupadosIds.includes(option._id)
  );
  const noOptionsText =
    visitantes.length === 0
      ? "No hay visitantes registrados."
      : opcionesDisponibles.length === 0
        ? "Todos los visitantes ya estan registrados para ese dia."
        : "Sin opciones";

  const anfitrionesDisponibles = anfitriones.filter(
    (option) => !selectedAnfitriones.some((v) => v._id === option._id)
  );
  const noOptionsTextAnfitriones =
    anfitriones.length === 0
      ? "No hay empleados activos."
      : anfitrionesDisponibles.length === 0
        ? "Todos los empleados ya fueron seleccionados."
        : "Sin opciones";

  const bringSwalToFront = () => {
    const container = Swal.getContainer();
    if (container) container.style.zIndex = "2000";
  };

  const showSwal = async (options: SweetAlertOptions) => {
    setSwalOpen(true);
    const result = await Swal.fire({
      ...options,
      didOpen: () => {
        bringSwalToFront();
        options.didOpen?.(Swal.getPopup() as HTMLElement);
      },
      didClose: () => {
        setSwalOpen(false);
        options.didClose?.();
      },
    });
    return result;
  };

  useEffect(() => {
    const obtenerDatosIniciales = async () => {
      try {
        const urlParams = new URLSearchParams({
          filter: JSON.stringify([]),
          pagination: JSON.stringify({ page: 0, pageSize: 1000 }),
          sort: JSON.stringify([]),
        });

        const resVisitantes = await clienteAxios.get(
          "/api/contratistas-visitantes?" + urlParams.toString()
        );
        if (resVisitantes.data.estado) {
          setVisitantes(resVisitantes.data.datos.paginatedResults || []);
        } else {
          enqueueSnackbar(resVisitantes.data.mensaje, { variant: "warning" });
        }

        const resAnfitriones = await clienteAxios.get(
          "/api/empleados/anfitriones?" + urlParams.toString()
        );
        if (resAnfitriones.data.estado) {
          setAnfitriones(resAnfitriones.data.datos.paginatedResults || []);
        } else {
          enqueueSnackbar(resAnfitriones.data.mensaje, { variant: "warning" });
        }
      } catch (error: unknown) {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      } finally {
        setIsLoading(false);
      }
    };
    obtenerDatosIniciales();
  }, [navigate]);

  useEffect(() => {
    const obtenerOcupados = async () => {
      if (!fecha) return;
      try {
        const res = await clienteAxios.get(
          `/api/contratistas-solicitudes/ocupados?fecha_visita=${fecha.toISOString()}`
        );
        if (res.data.estado) {
          const ids = (res.data.datos?.ocupados || []).map((id: string) => String(id));
          setOcupadosIds(ids);
          setSelected((prev) => {
            const filtered = prev.filter((v) => !ids.includes(v._id));
            if (filtered.length !== prev.length) {
              enqueueSnackbar("Algunos visitantes ya estan registrados ese dia.", {
                variant: "warning",
              });
            }
            return filtered;
          });
        }
      } catch (error: unknown) {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      }
    };

    obtenerOcupados();
  }, [fecha, navigate]);

  const onSubmit = async () => {
    try {
      if (!fecha || selected.length === 0) {
        enqueueSnackbar("Selecciona fecha y visitantes.", { variant: "warning" });
        return;
      }
      if (comentario.trim().length < 10) {
        enqueueSnackbar("La razon de visita debe tener al menos 10 caracteres.", {
          variant: "warning",
        });
        return;
      }
      const validar = await clienteAxios.post("/api/contratistas-solicitudes/validar", {
        fecha_visita: fecha.toISOString(),
        visitantes_count: selected.length,
        visitantes: selected.map((v) => v._id),
      });
      if (!validar.data.estado && validar.data.duplicado) {
        await showSwal({
          icon: "error",
          title: "Solicitud existente",
          text: "Ya se encuentra una solicitud de visita con esas personas ese dia.",
          allowOutsideClick: false,
          showConfirmButton: true,
          confirmButtonText: "OK",
          showCloseButton: true,
          showClass: { popup: "swal2-show" },
          hideClass: { popup: "swal2-hide" },
        });
        return;
      }
      const payload = {
        fecha_visita: fecha.toISOString(),
        comentario,
        visitantes: selected.map((v) => v._id),
        anfitriones: selectedAnfitriones.map((v) => v._id),
      };
      const res = await clienteAxios.post("/api/contratistas-solicitudes", payload);
      if (res.data.estado) {
        parentGridDataRef.fetchRows();
        const visitantesLabel = selected.length === 1 ? "visitante" : "visitantes";
        await showSwal({
          icon: "success",
          title: "Solicitud creada",
          html: `Se creo su solicitud correctamente.<br/>Fecha de visita: ${dayjs(fecha).format("DD/MM/YYYY")}<br/>${visitantesLabel} registrados: ${selected.length}`,
          showConfirmButton: true,
          confirmButtonText: "OK",
          allowOutsideClick: false,
          showClass: { popup: "swal2-show" },
          hideClass: { popup: "swal2-hide" },
        });
        navigate("/portal-contratistas/solicitudes");
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error: unknown) {
      handlingError(error);
    }
  };

  const regresar = () => {
    navigate("/portal-contratistas/solicitudes");
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Box
        component="section"
        sx={{
          opacity: swalOpen ? 0 : 1,
          pointerEvents: swalOpen ? "none" : "auto",
        }}
      >
        <Card elevation={5}>
          <CardContent>
            {isLoading ? (
              <Spinner />
            ) : (
              <>
                <Typography variant="h4" component="h2" textAlign="center">
                  Nueva Solicitud
                </Typography>
                <DatePicker
                  label="Fecha de visita"
                  value={fecha}
                  onChange={(value) => setFecha(value)}
                  sx={{ width: "100%", mt: 2 }}
                />
                <TextField
                  label="Razon de visita"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  fullWidth
                  margin="normal"
                  helperText="Minimo 10 caracteres"
                  error={comentario.length > 0 && comentario.trim().length < 10}
                />
                <Autocomplete
                  multiple
                  options={opcionesDisponibles}
                  isOptionEqualToValue={(option, value) => option._id === value._id}
                  getOptionLabel={(option) =>
                    `${option.nombre} ${option.apellido_pat || ""} ${
                      option.apellido_mat || ""
                    }`
                  }
                  value={selected}
                  onChange={(_, value) => setSelected(value)}
                  noOptionsText={noOptionsText}
                  renderInput={(params) => (
                    <TextField {...params} label="Selecciona visitantes" />
                  )}
                />
                <Autocomplete
                  multiple
                  options={anfitrionesDisponibles}
                  isOptionEqualToValue={(option, value) => option._id === value._id}
                  getOptionLabel={(option) => option.nombre}
                  value={selectedAnfitriones}
                  onChange={(_, value) => setSelectedAnfitriones(value)}
                  noOptionsText={noOptionsTextAnfitriones}
                  sx={{ mt: 2 }}
                  renderInput={(params) => (
                    <TextField {...params} label="A quien visita" />
                  )}
                />
                <Divider sx={{ my: 2 }} />
                <Box
                  component="footer"
                  sx={{
                    display: "flex",
                    justifyContent: "end",
                    mt: 3,
                    mb: 0.5,
                  }}
                >
                  <Stack
                    spacing={2}
                    direction={{ xs: "column-reverse", sm: "row" }}
                    justifyContent="end"
                    sx={{ width: "100%" }}
                  >
                    <Button
                      type="button"
                      size="medium"
                      variant="contained"
                      color="secondary"
                      onClick={regresar}
                    >
                      <ChevronLeft /> Regresar
                    </Button>
                    <Button type="button" size="medium" variant="contained" onClick={onSubmit}>
                      <Save /> Guardar
                    </Button>
                  </Stack>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </ModalContainer>
  );
}
