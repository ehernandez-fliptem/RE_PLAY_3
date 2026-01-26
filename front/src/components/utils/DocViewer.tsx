import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  Grid,
  Typography,
} from "@mui/material";
import PdfVierwer from "./PdfVierwer";
import { ChevronLeft } from "@mui/icons-material";
import { clienteAxios, handlingError } from "../../app/config/axios";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { IRootState } from "../../app/store";
import { enqueueSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";

type Props = {
  idDoc: string;
  open: boolean;
  handleClose: () => void;
};

const IDENAMES = ["Frontal", "Reverso"];

export default function DocViewer({ idDoc, open, handleClose }: Props) {
  const { tipos_documentos } = useSelector(
    (state: IRootState) => state.config.data
  );
  const [doc, setDoc] = useState({
    type: "",
    doc: "",
    imgs: [],
  });
  const navigate = useNavigate();

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(
          `api/documentos/solo-documento/${idDoc}`
        );
        if (res.data.estado) {
          const { tipo } = res.data.datos;
          const ext = tipos_documentos[tipo].extensiones;
          if (ext.includes("webp")) {
            setDoc({ type: "img", doc: "", imgs: res.data.datos.imagenes });
          }
          if (ext.includes("pdf")) {
            setDoc({ type: "pdf", doc: res.data.datos.documento, imgs: [] });
          }
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
  }, [idDoc]);

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={handleClose}
      aria-labelledby="responsive-dialog-title"
    >
      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          my: 2,
        }}
      >
        {doc.type === "pdf" && doc.doc && <PdfVierwer doc={doc.doc} />}
        {doc.type === "img" && doc.imgs.length > 0 && (
          <Grid container spacing={2} sx={{ width: "100%" }}>
            {doc.imgs.map((item, i) => (
              <Grid
                size={{ xs: 12, md: 6 }}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Typography fontWeight={700} sx={{ mb: 2 }}>
                  Identificación {IDENAMES[i]}
                </Typography>
                <Avatar
                  variant="square"
                  src={item}
                  sx={{
                    width: "80%",
                    height: "80%",
                  }}
                  slotProps={{
                    img: {
                      style: {
                        objectFit: "contain",
                      },
                    },
                  }}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </DialogContent>
      <Divider sx={{ my: 1 }} />
      <DialogActions>
        <Button
          variant="contained"
          color="secondary"
          autoFocus
          onClick={handleClose}
          startIcon={<ChevronLeft />}
        >
          Regresar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
