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

export default function NuevaPortalSolicitud() {
  const navigate = useNavigate();
  const parentGridDataRef = useOutletContext<GridDataSourceApiBase>();
  const [isLoading, setIsLoading] = useState(true);
  const [visitantes, setVisitantes] = useState<Visitante[]>([]);
  const [selected, setSelected] = useState<Visitante[]>([]);
  const [fecha, setFecha] = useState<Dayjs | null>(dayjs());
  const [comentario, setComentario] = useState("");

  useEffect(() => {
    const obtenerVisitantes = async () => {
      try {
        const urlParams = new URLSearchParams({
          filter: JSON.stringify([]),
          pagination: JSON.stringify({ page: 0, pageSize: 1000 }),
          sort: JSON.stringify([]),
        });
        const res = await clienteAxios.get(
          "/api/contratistas-visitantes?" + urlParams.toString()
        );
        if (res.data.estado) {
          setVisitantes(res.data.datos.paginatedResults || []);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error: unknown) {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      } finally {
        setIsLoading(false);
      }
    };
    obtenerVisitantes();
  }, [navigate]);

  const onSubmit = async () => {
    try {
      if (!fecha || selected.length === 0) {
        enqueueSnackbar("Selecciona fecha y visitantes.", { variant: "warning" });
        return;
      }
      const payload = {
        fecha_visita: fecha.toISOString(),
        comentario,
        visitantes: selected.map((v) => v._id),
      };
      const res = await clienteAxios.post("/api/contratistas-solicitudes", payload);
      if (res.data.estado) {
        enqueueSnackbar("Solicitud creada correctamente.", {
          variant: "success",
        });
        parentGridDataRef.fetchRows();
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
      <Box component="section">
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
                  label="Comentario"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  fullWidth
                  margin="normal"
                />
                <Autocomplete
                  multiple
                  options={visitantes}
                  getOptionLabel={(option) =>
                    `${option.nombre} ${option.apellido_pat || ""} ${
                      option.apellido_mat || ""
                    }`
                  }
                  value={selected}
                  onChange={(_, value) => setSelected(value)}
                  renderInput={(params) => (
                    <TextField {...params} label="Selecciona visitantes" />
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
