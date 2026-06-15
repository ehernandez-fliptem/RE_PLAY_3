import { useEffect, useState } from "react";
import { Card, CardContent } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { clienteAxios, handlingError } from "../../app/config/axios";
import ModalContainer from "../utils/ModalContainer";
import Spinner from "../utils/Spinner";
import type { Capacitacion } from "./types";
import TrainingPublicView from "./TrainingPublicView";

export default function VistaPreviaCapacitacion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Capacitacion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await clienteAxios.get(`/api/capacitaciones/${id}`);
        if (res.data.estado) setData(res.data.datos);
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
    <ModalContainer containerProps={{ maxWidth: "xl" }}>
      <Card elevation={5} sx={{ borderRadius: 2, overflow: "hidden" }}>
        <CardContent sx={{ p: 0 }}>{loading || !data ? <Spinner /> : <TrainingPublicView capacitacion={data} preview />}</CardContent>
      </Card>
    </ModalContainer>
  );
}
