import { Box, Card } from "@mui/material";
import BG_LOGIN from "../../../src/assets/img/background-login.jpg";

type Props = {
  children?: React.ReactNode;
};

export default function AuthContainer({ children }: Props) {
  return (
    <Box
      component="main"
      sx={{
        height: "100dvh",
        width: "100dvw",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        backgroundImage: `
      linear-gradient(to top, rgba(48, 207, 208, 0.6), rgba(51, 8, 103, 0.6)),
      url(${BG_LOGIN})
    `,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Card
        elevation={10}
        sx={{
          borderRadius: 5,
          width: { xs: "90%", sm: "60%", md: "40%", xl: "30%" },
        }}
      >
        {children}
      </Card>
    </Box>
  );
}
