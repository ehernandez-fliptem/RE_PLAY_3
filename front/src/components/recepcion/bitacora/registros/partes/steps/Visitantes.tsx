import { Box, Typography } from "@mui/material";
import FormRegistros from "../forms/FormRegistros";
import FormCitas from "../forms/FormCitas";

type Props = {
  name: string;
  label?: string;
  type: number;
};

export default function Visitantes({ name, label, type }: Props) {
  return (
    <Box>
      {label && (
        <Typography variant="h6" component="h6">
          {label}
        </Typography>
      )}
      {type === 1 && <FormCitas name={name} />}
      {type === 2 && <FormRegistros name={name} />}
      {/* {type === 3 && <FormExpress name={name} />} */}
    </Box>
  );
}
