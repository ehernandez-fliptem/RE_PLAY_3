import { Box, Stack, Typography } from "@mui/material";
import { CheckCircle, ErrorOutline, WarningAmber } from "@mui/icons-material";
import {
  getDocumentosChecksStatus,
  type DocumentosChecks,
} from "./documentosChecks";

type Props = {
  documentosChecks?: Partial<DocumentosChecks> | null;
};

const DocumentRow = ({
  label,
  tone,
}: {
  label: string;
  tone: "complete" | "missing";
}) => {
  const isComplete = tone === "complete";
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.25,
        py: 0.9,
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: isComplete ? "success.light" : "warning.light",
        bgcolor: isComplete
          ? "rgba(46, 125, 50, 0.08)"
          : "rgba(237, 108, 2, 0.08)",
        color: isComplete ? "success.dark" : "warning.dark",
      }}
    >
      {isComplete ? (
        <CheckCircle sx={{ fontSize: 20, flexShrink: 0 }} />
      ) : (
        <ErrorOutline sx={{ fontSize: 20, flexShrink: 0 }} />
      )}
      <Typography variant="body2" fontWeight={700}>
        {label}
      </Typography>
    </Box>
  );
};

export default function DocumentosIncompletosContent({
  documentosChecks,
}: Props) {
  const { completos, faltantes } = getDocumentosChecksStatus(documentosChecks);

  return (
    <Stack spacing={2} sx={{ pt: 0.5, pb: 1 }}>
      <Box
        sx={{
          display: "flex",
          gap: 1.25,
          alignItems: "flex-start",
          border: "1px solid",
          borderColor: "warning.light",
          bgcolor: "rgba(237, 108, 2, 0.08)",
          color: "warning.dark",
          borderRadius: 2,
          px: 1.5,
          py: 1.25,
        }}
      >
        <WarningAmber sx={{ mt: 0.2, flexShrink: 0 }} />
        <Box>
          <Typography variant="subtitle2" fontWeight={800}>
            No es posible verificar al visitante.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Para verificar al visitante, primero completa los documentos
            requeridos.
          </Typography>
        </Box>
      </Box>

      <Box>
        <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 1 }}>
          Completos
        </Typography>
        <Stack spacing={0.75}>
          {completos.length > 0 ? (
            completos.map(({ key, label }) => (
              <DocumentRow key={key} label={label} tone="complete" />
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              Aun no hay documentos marcados.
            </Typography>
          )}
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 1 }}>
          Faltantes
        </Typography>
        <Stack spacing={0.75}>
          {faltantes.map(({ key, label }) => (
            <DocumentRow key={key} label={label} tone="missing" />
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}
