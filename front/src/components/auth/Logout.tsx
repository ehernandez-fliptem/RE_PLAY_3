import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { deleteAuth } from "../../app/features/auth/authSlice";
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Typography,
} from "@mui/material";
import Copyright from "../utils/Copyright";

export default function Logout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const cerrarSesion = async () => {
      navigate("/", { replace: true });
      dispatch(deleteAuth());
    };
    setTimeout(() => {
      cerrarSesion();
    }, 1500);
  }, [dispatch, navigate]);

  return (
    <Box
      component="div"
      sx={{
        height: "100dvh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Card elevation={5}>
        <CardContent
          sx={{
            p: 5,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="h6" sx={{ mb: 3 }}>
              Cerrando sesión
            </Typography>
            <CircularProgress />
            <Copyright sx={{ mt: 3, mb: 4 }} />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
