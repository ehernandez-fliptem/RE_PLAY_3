import {
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  useMediaQuery,
  useTheme,
  type SelectChangeEvent,
} from "@mui/material";
import { Controller, useFormContext } from "react-hook-form";

type Props = {
  name: string;
  label?: string;
  required?: boolean;
};

export default function SelectTime({ name, label, required }: Props) {
  const { control, setValue, watch } = useFormContext();
  const theme = useTheme();
  const isTinyMobile = useMediaQuery(theme.breakpoints.down("md"));

  const handleChangeTime = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = watch(name);
    setValue(name, `${e.target.value}/${value.split("/")[1]}`);
  };

  const handleChangeTimeOption = (e: SelectChangeEvent) => {
    const value = watch(name);
    setValue(name, `${value.split("/")[0]}/${e.target.value}`);
  };

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Grid container spacing={2} sx={{ mb: {xs: 4, sm: 4, md: 1} }}>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              label={isTinyMobile ? `${label} - (${field.value})` : ""}
              margin={!isTinyMobile ? "normal" : "none"}
              fullWidth
              required={required}
              type="number"
              value={field.value.split("/")[0]}
              onChange={handleChangeTime}
              error={!!fieldState.error}
              slotProps={{
                input: {
                  inputProps: {
                    inputMode: "numeric",
                    min: 1,
                    max: 60,
                  },
                },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 10 }}>
            <FormControl
              margin={!isTinyMobile ? "normal" : "none"}
              required={required}
              fullWidth
              size="small"
              error={!!fieldState.error}
            >
              {!isTinyMobile && (
                <InputLabel>
                  {label} - {field.value}
                </InputLabel>
              )}
              <Select
                value={field.value.split("/")[1]}
                label={!isTinyMobile ? `${label} - (${field.value})` : ""}
                onChange={handleChangeTimeOption}
              >
                <MenuItem value="m">Minutos</MenuItem>
                <MenuItem value="h">Horas</MenuItem>
                <MenuItem value="d">Dias</MenuItem>
              </Select>
              {fieldState.error && (
                <FormHelperText error>
                  {fieldState.error.message}
                </FormHelperText>
              )}
            </FormControl>
          </Grid>
        </Grid>
      )}
    />
  );
}
