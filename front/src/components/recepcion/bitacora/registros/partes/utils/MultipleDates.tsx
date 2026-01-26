import { Add, Delete } from "@mui/icons-material";
import {
  alpha,
  Button,
  Card,
  CardActions,
  CardContent,
  Checkbox,
  FormControlLabel,
  Grid,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
  type CheckboxProps,
} from "@mui/material";
import { DateTimePicker, type DateTimePickerProps } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";
import { useState } from "react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { handlingError } from "../../../../../../app/config/axios";

type Props = {
  name: string;
  nameArray: string;
  dateTimeProps: DateTimePickerProps;
  checkBoxProps?: CheckboxProps;
};

const startDay = dayjs().startOf("day");
const endDay = dayjs().endOf("day");

export default function MultipleDates({
  name,
  nameArray,
  dateTimeProps,
  checkBoxProps,
}: Props) {
  const theme = useTheme();
  const isMobileSize = useMediaQuery(theme.breakpoints.down("sm"));
  const { control, watch, formState, setValue, resetField, clearErrors } =
    useFormContext();
  const { fields, append, remove } = useFieldArray({
    control: control,
    name: nameArray,
  });
  const fecha_entrada = watch(name);
  const fechas = watch(nameArray);
  const beetweenToday = dayjs(fecha_entrada).isBetween(startDay, endDay);
  const [activeMultiple, setActiveMultiple] = useState(fechas.length > 0);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setActiveMultiple(event.target.checked);
    if (!event.target.checked) {
      resetField(name);
      setValue(nameArray, []);
      clearErrors(nameArray);
    }
  };

  const addDate = () => {
    try {
      const fecha_entrada = watch(name);
      const dayjs_entrada = dayjs(fecha_entrada);
      if (fecha_entrada) {
        append({ fecha_entrada: dayjs_entrada });
        setValue(name, dayjs_entrada.add(1, "day"));
      }
    } catch (error: unknown) {
      handlingError(error);
    }
  };

  const handleDelete = (I: number) => {
    remove(I);
  };

  return (
    <Grid container columnSpacing={2}>
      <Grid size={{ xs: 12, sm: 9 }}>
        <Controller
          name={name}
          render={({ field, fieldState }) => (
            <DateTimePicker
              {...dateTimeProps}
              {...field}
              label="Fecha de Entrada"
              minDate={dayjs()}
              minTime={beetweenToday ? dayjs() : startDay}
              onChange={(value) => field.onChange(value)}
              slotProps={{
                textField: {
                  required: true,
                  margin: "normal",
                  fullWidth: true,
                  size: "small",
                  error: !!fieldState.error?.message,
                  helperText: fieldState.error?.message,
                },
              }}
            />
          )}
        />
      </Grid>
      <Grid
        size={{ xs: 12, sm: 3 }}
        display="flex"
        alignItems="center"
        justifyContent={{ xs: "end", sm: "center" }}
      >
        <FormControlLabel
          sx={{ m: 0 }}
          label="Múltiples fechas"
          control={
            <Checkbox
              checked={activeMultiple}
              onChange={handleChange}
              {...checkBoxProps}
            />
          }
        />
      </Grid>
      {activeMultiple && (
        <>
          <Grid
            size={12}
            sx={{
              mt: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={addDate}
            >
              <Add />
            </Button>
          </Grid>
          {fields.length > 0 && (
            <Grid
              container
              spacing={2}
              size={12}
              sx={{ py:2, maxHeight: 250, overflowY: "auto" }}
            >
              {(
                fields as unknown as { id: string; fecha_entrada: Dayjs }[]
              ).map((item, IDX) => {
                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
                    <Controller
                      name={`fechas.${IDX}.fecha_entrada`}
                      control={control}
                      render={({ field, fieldState }) => (
                        <Card
                          sx={(theme) => ({
                            bgcolor: fieldState.error
                              ? alpha(theme.palette.error.light, 0.2)
                              : ``,
                            border: fieldState.error
                              ? `1px solid ${theme.palette.error.main}`
                              : 0,
                          })}
                        >
                          <CardContent
                            sx={{
                              py: { xs: 2, sm: 1 },
                              ":last-child": { pb: { xs: 2, sm: 1 } },
                            }}
                          >
                            <Stack
                              spacing={0}
                              display="flex"
                              flexDirection="row"
                              justifyContent={{
                                xs: "center",
                                sm: "space-between",
                              }}
                              alignItems="center"
                              sx={{ pb: 0 }}
                            >
                              <span>
                                {field.value.format("DD/MM/YYYY, HH:mm a")}
                              </span>
                              <span>{fieldState.error?.message}</span>
                              {!isMobileSize && (
                                <IconButton
                                  color="primary"
                                  onClick={() => handleDelete(IDX)}
                                >
                                  <Delete />
                                </IconButton>
                              )}
                            </Stack>
                          </CardContent>
                          {isMobileSize && (
                            <CardActions>
                              <Button
                                fullWidth
                                variant="contained"
                                onClick={() => handleDelete(IDX)}
                              >
                                <Delete />
                              </Button>
                            </CardActions>
                          )}
                        </Card>
                      )}
                    />
                  </Grid>
                );
              })}
            </Grid>
          )}
          {formState.errors[nameArray] && (
            <Grid size={12} sx={{ pb: 2, width: "100%" }}>
              <Typography
                variant="body2"
                component="span"
                sx={(theme) => ({
                  display: "block",
                  width: "100%",
                  borderRadius: "4px",
                  p: 2,
                  bgcolor: formState.errors[nameArray]
                    ? alpha(theme.palette.error.light, 0.2)
                    : ``,
                  border: formState.errors[nameArray]
                    ? `1px solid ${theme.palette.error.main}`
                    : 0,
                })}
              >
                {formState.errors[nameArray]?.message?.toString()}
              </Typography>
            </Grid>
          )}
        </>
      )}
    </Grid>
  );
}
