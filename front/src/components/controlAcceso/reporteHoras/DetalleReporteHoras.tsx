import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import { enqueueSnackbar } from "notistack";
import ModalContainer from "../../utils/ModalContainer";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import Spinner from "../../utils/Spinner";
import { ChevronLeft } from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import dayjs from "dayjs";

const pageSizeOptions = [10, 25, 50];

type Eventos = {
  alertas: string[];
  detalle: number;
  entrada: string;
  salida: string;
  fecha: string;
  fecha_full: string;
};

export default function DetalleReporteHoras() {
  const { id } = useParams();
  const [searchParams] = useSearchParams({
    inicio: "",
    final: "",
  });
  const INICIO = searchParams.get("inicio");
  const FINAL = searchParams.get("final");
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [eventos, setEventos] = useState<Eventos[]>([]);

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.post(
          `/api/eventos/reporte-horas/individual/${id}`,
          {
            inicio: INICIO,
            final: FINAL,
          }
        );
        if (res.data.estado) {
          setEventos(res.data.datos);
          setIsLoading(false);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error) {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      }
    };
    obtenerRegistro();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const regresar = () => {
    navigate(`/reporte-horas`);
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Card elevation={5}>
        <CardContent>
          <Typography variant="h5" component="h5" textAlign="center">
            Reporte individual
          </Typography>
          {isLoading ? (
            <Spinner />
          ) : (
            <Box
              sx={(theme) => ({
                width: "100%",
                "& .cell-false": {
                  backgroundColor: theme.palette.error.main,
                  color: theme.palette.error.contrastText,
                  fontWeight: "600",
                },
                "& .cell-warning": {
                  backgroundColor: theme.palette.warning.main,
                  color: theme.palette.warning.contrastText,
                  fontWeight: "600",
                },
              })}
            >
              <DataGrid
                sx={{ my: 2 }}
                getRowId={(row) => row.fecha}
                getRowHeight={() => "auto"}
                rows={eventos}
                columns={[
                  {
                    headerName: "Fecha",
                    field: "fecha",
                    flex: 1,
                    display: "flex",
                    minWidth: 150,
                  },
                  {
                    headerName: "Día",
                    field: "fecha_full",
                    flex: 1,
                    display: "flex",
                    minWidth: 150,
                  },
                  {
                    headerName: "Entrada",
                    field: "entrada",
                    flex: 1,
                    display: "flex",
                    minWidth: 150,
                  },
                  {
                    headerName: "Salida",
                    field: "salida",
                    flex: 1,
                    display: "flex",
                    minWidth: 150,
                  },
                  {
                    headerName: "Detalle",
                    field: "detalle",
                    flex: 1,
                    display: "flex",
                    minWidth: 150,
                    valueGetter: (value) =>
                      dayjs.duration(value).format("HH:mm:ss") + " hrs.",
                  },
                  {
                    headerName: "Alertas",
                    field: "alertas",
                    flex: 1,
                    display: "flex",
                    minWidth: 150,
                    renderCell: ({ value }) => (
                      <Grid container spacing={1} sx={{ width: "100%", my: 1 }}>
                        {value.map((item: { alerta: string }, idx: number) => (
                          <Chip label={item.alerta} key={idx} />
                        ))}
                      </Grid>
                    ),
                  },
                ]}
                getRowClassName={(params) => {
                  if (params.row.detalle < 60000) {
                    return `cell-false`;
                  }
                  if (params.row.alertas.length) {
                    return `cell-warning`;
                  }
                  return "";
                }}
                initialState={{
                  pagination: {
                    paginationModel: {
                      pageSize: 7,
                    },
                  },
                }}
                disableRowSelectionOnClick
                pagination
                pageSizeOptions={pageSizeOptions}
                localeText={{
                  ...esES.components.MuiDataGrid.defaultProps.localeText,
                  toolbarColumns: "",
                  toolbarFilters: "",
                  toolbarDensity: "",
                  toolbarExport: "",
                  noRowsLabel: "Sin registros",
                }}
              />
            </Box>
          )}
          <Box
            component="footer"
            sx={{
              display: "flex",
              justifyContent: "end",
            }}
          >
            <Stack
              spacing={2}
              direction={{ xs: "column-reverse", sm: "row" }}
              justifyContent="end"
              sx={{ width: "100%" }}
            >
              <Button
                sx={{ width: { xs: "100%", sm: "auto" } }}
                type="button"
                size="medium"
                variant="contained"
                color="secondary"
                onClick={regresar}
                startIcon={<ChevronLeft />}
              >
                Regresar
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </ModalContainer>
  );
}
