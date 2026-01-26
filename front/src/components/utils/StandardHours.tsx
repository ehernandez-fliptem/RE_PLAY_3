import {
  Box,
  Grid,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  Typography,
  type SwitchProps,
} from "@mui/material";
import {
  Controller,
  useFieldArray,
  useFormContext,
  type ControllerRenderProps,
} from "react-hook-form";
import { TimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { styled } from "@mui/material/styles";
import { Fragment } from "react";
import { DoNotDisturb } from "@mui/icons-material";

const DAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

type Props = {
  name: string;
  label?: string;
};

export default function StandardHours({ name, label }: Props) {
  const { control, setValue } = useFormContext();
  const { fields } = useFieldArray({
    control,
    name,
  });

  const handleValue = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: ControllerRenderProps,
    i: number
  ) => {
    field.onChange(e.target.checked);
    setValue(
      `${name}.${i}.entrada`,
      !field.value
        ? dayjs().set("hour", 16).startOf("hour")
        : dayjs().set("hour", 9).startOf("hour")
    );
    setValue(
      `${name}.${i}.salida`,
      !field.value
        ? dayjs().set("hour", 8).startOf("hour")
        : dayjs().set("hour", 18).startOf("hour")
    );
  };

  return (
    <Box>
      <Typography variant="body1" component="span">
        {label}
      </Typography>
      <Stack spacing={4} component="div" sx={{ my: 2 }}>
        {fields.map((item, i) => (
          <Controller
            key={item.id}
            control={control}
            name={`${name}.${i}.activo`}
            render={({ field }) => (
              <Grid
                container
                spacing={2}
                sx={{
                  minHeight: 40,
                  my: 2,
                  display: "flex",
                  alignItems: "center",
                  height: "100%",
                }}
              >
                <Grid size={{ xs: 6, sm: 4 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Controller
                      control={control}
                      name={`${name}.${i}.activo`}
                      render={({ field }) => (
                        <Switch
                          {...field}
                          color="success"
                          checked={field.value}
                          onChange={(e) => field.onChange(e)}
                        />
                      )}
                    />
                    <Typography variant="body1" component="span">
                      {DAYS[i]}
                    </Typography>
                  </Stack>
                </Grid>
                {field.value ? (
                  <Fragment>
                    <Grid size={{ xs: 6, sm: 2 }}>
                      <Controller
                        control={control}
                        name={`${name}.${i}.esNocturno`}
                        render={({ field }) => (
                          <MuiSwitch
                            {...field}
                            checked={field.value}
                            onChange={(e) => handleValue(e, field, i)}
                          />
                        )}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Controller
                          control={control}
                          name={`${name}.${i}.esNocturno`}
                          render={({ field: fieldNocturno, fieldState }) => {
                            const minTime = fieldNocturno.value
                              ? dayjs().set("hour", 16).startOf("hour")
                              : dayjs().set("hour", 0).startOf("hour");
                            const maxTime = fieldNocturno.value
                              ? dayjs().set("hour", 12).endOf("hour")
                              : dayjs().set("hour", 23).endOf("hour");
                            return (
                              <Fragment>
                                <Controller
                                  control={control}
                                  name={`${name}.${i}.entrada`}
                                  render={({ field }) => (
                                    <TimePicker
                                      {...field}
                                      ampm
                                      minutesStep={1}
                                      minTime={minTime}
                                      timeSteps={{ hours: 1, minutes: 1 }}
                                      label="Entrada"
                                      value={field.value || dayjs()}
                                      onChange={(value) =>
                                        field.onChange(value)
                                      }
                                      slotProps={{
                                        textField: {
                                          margin: "normal",
                                          size: "small",
                                          fullWidth: true,
                                          error: !!fieldState.error?.message,
                                          helperText: fieldState.error?.message,
                                        },
                                      }}
                                      views={["hours", "minutes"]}
                                      format="HH:mm"
                                    />
                                  )}
                                />
                                <Typography
                                  variant="body1"
                                  component="span"
                                  sx={{
                                    display: { xs: "none", sm: "block" },
                                  }}
                                >
                                  -
                                </Typography>
                                <Controller
                                  control={control}
                                  name={`${name}.${i}.salida`}
                                  render={({ field }) => (
                                    <TimePicker
                                      {...field}
                                      ampm
                                      minutesStep={1}
                                      maxTime={maxTime}
                                      timeSteps={{ hours: 1, minutes: 1 }}
                                      label="Salida"
                                      value={field.value || dayjs()}
                                      onChange={(value) =>
                                        field.onChange(value)
                                      }
                                      slotProps={{
                                        textField: {
                                          margin: "normal",
                                          size: "small",
                                          fullWidth: true,
                                          error: !!fieldState.error?.message,
                                          helperText: fieldState.error?.message,
                                        },
                                      }}
                                      views={["hours", "minutes"]}
                                      format="HH:mm"
                                    />
                                  )}
                                />
                              </Fragment>
                            );
                          }}
                        />
                      </Stack>
                    </Grid>
                  </Fragment>
                ) : (
                  <Grid size={{ xs: 12, sm: 8 }}>
                    <TextField
                      disabled
                      fullWidth
                      type="text"
                      value="Cerrado"
                      size="small"
                      slotProps={{
                        input: {
                          disabled: true,
                          startAdornment: (
                            <InputAdornment position="start">
                              <DoNotDisturb />
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                  </Grid>
                )}
              </Grid>
            )}
          />
        ))}
      </Stack>
    </Box>
  );
}

const MuiSwitch = styled(({ ...props }: SwitchProps) => <Switch {...props} />)(
  ({ theme }) => ({
    width: 62,
    height: 34,
    padding: 7,
    "& .MuiSwitch-switchBase": {
      margin: 1,
      padding: 0,
      transform: "translateX(6px)",
      "&.Mui-checked": {
        color: "#fff",
        transform: "translateX(22px)",
        "& .MuiSwitch-thumb:before": {
          backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="18" width="18" viewBox="0 0 24 24"><path fill="${encodeURIComponent(
            "#fff"
          )}" d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1"></path></svg>')`,
        },
        "& + .MuiSwitch-track": {
          opacity: 1,
          backgroundColor: theme.palette.grey[800],
          ...theme.applyStyles("dark", {
            backgroundColor: theme.palette.grey[800],
          }),
        },
      },
    },
    "& .MuiSwitch-thumb": {
      width: 32,
      height: 32,
      "&::before": {
        content: "''",
        position: "absolute",
        width: "100%",
        height: "100%",
        left: 0,
        top: 0,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="18" width="18" viewBox="0 0 24 24"><path fill="${encodeURIComponent(
          "#fff"
        )}" d="M11 4V2c0-.55.45-1 1-1s1 .45 1 1v2c0 .55-.45 1-1 1s-1-.45-1-1m7.36 3.05 1.41-1.42c.39-.39.39-1.02 0-1.41a.996.996 0 0 0-1.41 0l-1.41 1.42c-.39.39-.39 1.02 0 1.41s1.02.39 1.41 0M22 11h-2c-.55 0-1 .45-1 1s.45 1 1 1h2c.55 0 1-.45 1-1s-.45-1-1-1m-10 8c-.55 0-1 .45-1 1v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1M5.64 7.05 4.22 5.64c-.39-.39-.39-1.03 0-1.41s1.03-.39 1.41 0l1.41 1.41c.39.39.39 1.03 0 1.41s-1.02.39-1.4 0m11.31 9.9c-.39.39-.39 1.03 0 1.41l1.41 1.41c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.41-1.41c-.38-.39-1.02-.39-1.41 0M2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1m3.64 6.78 1.41-1.41c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.41 1.41c-.39.39-.39 1.03 0 1.41.38.39 1.02.39 1.41 0M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6"></path></svg>')`,
      },
      ...theme.applyStyles("dark", {
        backgroundColor: theme.palette.primary.main,
      }),
    },
    "& .MuiSwitch-track": {
      opacity: 1,
      backgroundColor: theme.palette.grey[400],
      borderRadius: 20 / 2,
      ...theme.applyStyles("dark", {
        backgroundColor: theme.palette.grey[400],
      }),
    },
  })
);
