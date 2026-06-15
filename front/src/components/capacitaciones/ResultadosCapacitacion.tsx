import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { clienteAxios, handlingError } from "../../app/config/axios";
import ModalContainer from "../utils/ModalContainer";
import Spinner from "../utils/Spinner";

type Resultado = {
  _id: string;
  nombre?: string;
  correo?: string;
  empresa?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  completado: boolean;
  porcentaje: number;
  tiempo_total_segundos?: number;
};

export default function ResultadosCapacitacion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Resultado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await clienteAxios.get(`/api/capacitaciones/${id}/resultados`);
        if (res.data.estado) setRows(res.data.datos || []);
      } catch (error) {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Card elevation={5} sx={{ borderRadius: 2 }}>
        <CardContent>
          {loading ? (
            <Spinner />
          ) : (
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <BoxTitle />
                <IconButton onClick={() => navigate("/capacitaciones")}>
                  <Close />
                </IconButton>
              </Stack>
              <TableContainer sx={{ maxHeight: "65dvh" }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Persona</TableCell>
                      <TableCell>Correo</TableCell>
                      <TableCell>Empresa</TableCell>
                      <TableCell>Finalizacion</TableCell>
                      <TableCell>Porcentaje</TableCell>
                      <TableCell>Tiempo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          Sin resultados registrados.
                        </TableCell>
                      </TableRow>
                    )}
                    {rows.map((row) => (
                      <TableRow key={row._id}>
                        <TableCell>{row.nombre || "Anonimo"}</TableCell>
                        <TableCell>{row.correo || "--"}</TableCell>
                        <TableCell>{row.empresa || "--"}</TableCell>
                        <TableCell>{row.fecha_fin ? new Date(row.fecha_fin).toLocaleString("es-MX") : "--"}</TableCell>
                        <TableCell>
                          <Chip size="small" color={row.completado ? "success" : "warning"} label={`${row.porcentaje || 0}%`} />
                        </TableCell>
                        <TableCell>{Math.round((row.tiempo_total_segundos || 0) / 60)} min</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </CardContent>
      </Card>
    </ModalContainer>
  );
}

function BoxTitle() {
  return (
    <Stack>
      <Typography variant="h5" fontWeight={800}>
        Resultados de capacitacion
      </Typography>
      <Typography color="text.secondary">Seguimiento de personas que completaron el flujo publico.</Typography>
    </Stack>
  );
}
