import { Fragment } from "react";
import { FormatPaint } from "@mui/icons-material";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { TextFieldElement } from "react-hook-form-mui";

type Props = {
  name: string;
  label: string;
};

export default function ColorCollections({ name, label }: Props) {
  const { control } = useFormContext();
  const { fields } = useFieldArray({
    control,
    name: name,
  });

  return (
    <Fragment>
      {label && (
        <Typography
          variant="overline"
          component="h2"
          display="flex"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <FormatPaint color="primary" sx={{ mr: 1 }} />{" "}
          <strong>{label}</strong>
        </Typography>
      )}
      <Grid container spacing={2}>
        {fields.map((field, index) => (
          <Grid key={field.id} size={{ xs: 12, md: 6, xl: 4 }}>
            <Card elevation={2}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Controller
                    control={control}
                    name={`${name}.${index}.color`}
                    render={({ field: { value } }) => (
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1,
                          bgcolor: value,
                          border: "2px solid",
                          borderColor: "divider",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  />
                  <Box flex={1}>
                    <Typography variant="subtitle2" fontWeight="600">
                      {(field as Record<string, string>).nombre}
                    </Typography>
                    {/* <Typography variant="caption" color="text.secondary">
                      {(field as Record<string, string>).descripcion}
                    </Typography> */}
                    <Stack direction="row" spacing={2}>
                      <TextFieldElement
                        name={`${name}.${index}.color`}
                        type="text"
                        required
                        fullWidth
                      />
                      <Controller
                        control={control}
                        name={`${name}.${index}.color`}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            type="color"
                            required
                            fullWidth
                          />
                        )}
                      />
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Fragment>
  );
}
