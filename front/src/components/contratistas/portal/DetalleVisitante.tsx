import { ChevronLeft } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import Spinner from "../../utils/Spinner";
import ModalContainer from "../../utils/ModalContainer";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

type DocChecks = {
  identificacion_oficial: boolean;
  sua: boolean;
  permiso_entrada: boolean;
  lista_articulos: boolean;
  repse: boolean;
  soporte_pago_actualizado: boolean;
  constancia_vigencia_imss: boolean;
  constancias_habilidades: boolean;
};

type FormValues = {
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;
  correo: string;
  telefono?: string;
  documentos_checks: DocChecks;
};

const initialValue: FormValues = {
  nombre: "",
  apellido_pat: "",
  apellido_mat: "",
  correo: "",
  telefono: "",
  documentos_checks: {
    identificacion_oficial: false,
    sua: false,
    permiso_entrada: false,
    lista_articulos: false,
    repse: false,
    soporte_pago_actualizado: false,
    constancia_vigencia_imss: false,
    constancias_habilidades: false,
  },
};

const DOC_LABELS: Record<keyof DocChecks, string> = {
  identificacion_oficial: "Identificación oficial",
  sua: "SUA",
  permiso_entrada: "Permiso de entrada",
  lista_articulos: "Lista de artículos",
  repse: "REPSE",
  soporte_pago_actualizado: "Soporte de pago actualizado",
  constancia_vigencia_imss: "Constancia de Vigencia IMSS",
  constancias_habilidades: "Constancias de Habilidades",
};

const DOC_KEYS: (keyof DocChecks)[] = [
  "identificacion_oficial",
  "sua",
  "permiso_entrada",
  "lista_articulos",
  "repse",
  "soporte_pago_actualizado",
  "constancia_vigencia_imss",
  "constancias_habilidades",
];

export default function DetallePortalVisitante() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [datos, setDatos] = useState<FormValues>(initialValue);

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(`/api/contratistas-visitantes/${id}`);
        if (res.data.estado) {
          setDatos(res.data.datos);
          setIsLoading(false);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error: unknown) {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      }
    };
    obtenerRegistro();
  }, [id, navigate]);

  const regresar = () => {
    navigate("/portal-contratistas/visitantes");
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
                  Detalle de Visitante
                </Typography>
                <Box sx={{ mt: 2, display: "grid", gap: 1 }}>
                  <Typography>
                    <strong>Nombre:</strong> {datos.nombre}
                  </Typography>
                  <Typography>
                    <strong>Apellido paterno:</strong> {datos.apellido_pat}
                  </Typography>
                  <Typography>
                    <strong>Apellido materno:</strong> {datos.apellido_mat || "-"}
                  </Typography>
                  <Typography>
                    <strong>Correo:</strong> {datos.correo}
                  </Typography>
                  <Typography>
                    <strong>Teléfono:</strong> {datos.telefono || "-"}
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" component="h3">
                  Documentos
                </Typography>
                {DOC_KEYS.map((key) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={Boolean(datos.documentos_checks?.[key])}
                        disabled
                      />
                    }
                    label={DOC_LABELS[key] || key}
                  />
                ))}
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
