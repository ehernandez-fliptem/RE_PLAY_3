import {
  Grid,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from "@mui/material";
import { Controller, useFormContext } from "react-hook-form";
import {
  HASLOWERCASE,
  HASNUMBER,
  HASSYMBOLE,
  HASUPPERCASE,
} from "../../app/constants/CommonRegex";
import { Check, Close, Help } from "@mui/icons-material";

type Props = {
  name: string;
};

const symbols =
  "! \" # $ % & ' ( ) * + , - . / : ; < = > ? @ [ ] ^ _ ` { | } ~";
const validationLabels = [
  { id: 1, label: "Al menos una minúscula", validation: HASLOWERCASE },
  { id: 2, label: "Al menos una mayúscula", validation: HASUPPERCASE },
  { id: 3, label: "Al menos un número", validation: HASNUMBER },
  { id: 4, label: "Al menos un símbolo", validation: HASSYMBOLE },
];

export default function PasswordValidAdornment({ name }: Props) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Grid
          container
          spacing={1}
          sx={{
            bgcolor: "transparent",
          }}
        >
          {validationLabels.map((value) => (
            <Grid key={value.id} size={{ xs: 12, md: 6, lg: 6 }}>
              <ListItem key={value.label} disableGutters disablePadding>
                <ListItemIcon sx={{ minWidth: 30 }}>
                  {field.value && value.validation.test(field.value) ? (
                    <Check color="success" fontSize="small" />
                  ) : (
                    <Close color="error" fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography component="span" variant="subtitle2">
                      {value.label}
                    </Typography>
                  }
                />
                {value.id === 4 && (
                  <ListItemIcon
                    sx={{ display: "flex", justifyContent: "center" }}
                  >
                    <Tooltip title={symbols}>
                      <Help fontSize="small" />
                    </Tooltip>
                  </ListItemIcon>
                )}
              </ListItem>
            </Grid>
          ))}
        </Grid>
      )}
    />
  );
}
