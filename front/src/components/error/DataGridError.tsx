import {
  alpha,
  Button,
  darken,
  lighten,
  Stack,
  styled,
  Typography,
} from "@mui/material";
import type { GridDataSourceApiBase } from "@mui/x-data-grid";
import { messages } from "../../app/config/axios";
import { Cached } from "@mui/icons-material";

const StyledDiv = styled("div")(({ theme: t }) => ({
  position: "absolute",
  zIndex: 10,
  fontSize: "0.875em",
  bottom: 0,
  height: "100%",
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "4px",
  border: `1px solid ${lighten(alpha(t.palette.divider, 1), 0.88)}`,
  backgroundColor: t.palette.background.default,
  ...t.applyStyles("dark", {
    borderColor: darken(alpha(t.palette.divider, 1), 0.68),
  }),
}));

type Props = {
  error: string;
  gridDataRef?: GridDataSourceApiBase;
  onClick?: () => void;
};
export default function ErrorOverlay({ error, gridDataRef, onClick }: Props) {
  if (!error) {
    return null;
  }
  return (
    <StyledDiv>
      <Stack
        direction="column"
        spacing={0.5}
        sx={{
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography variant="subtitle1" component="span">
          {messages[error]}
        </Typography>
        {gridDataRef && (
          <Button
            variant="contained"
            onClick={() => gridDataRef.fetchRows()}
            startIcon={<Cached />}
          >
            Recargar
          </Button>
        )}
         {onClick && (
          <Button
            variant="contained"
            onClick={onClick}
            startIcon={<Cached />}
          >
            Recargar
          </Button>
        )}
      </Stack>
    </StyledDiv>
  );
}
