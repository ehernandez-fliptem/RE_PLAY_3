import { Alert } from "@mui/material";

type Props = {
  mensaje?: string;
  tipo: "error" | "info" | "success" | "warning";
};

export default function Mensaje({ mensaje, tipo }: Props) {
  return (
    <Alert autoFocus variant="outlined" severity={tipo} sx={{ my: 2 }}>
      {mensaje}
    </Alert>
  );
}
