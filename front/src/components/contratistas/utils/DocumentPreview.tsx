import { useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";

type Props = {
  docUrl?: string;
  label?: string;
};

const looksLikePdfBase64 = (value: string) => {
  const clean = String(value || "").trim();
  return clean.startsWith("JVBERi0");
};

const isPdfLike = (value: string) => {
  const lower = value.toLowerCase();
  return (
    lower.endsWith(".pdf") ||
    lower.includes(".pdf?") ||
    lower.startsWith("data:application/pdf") ||
    lower.includes("application/pdf") ||
    looksLikePdfBase64(value)
  );
};

const normalizePdfSrc = (value: string) => {
  const clean = String(value || "").trim();
  if (looksLikePdfBase64(clean)) {
    return `data:application/pdf;base64,${clean}`;
  }
  return clean;
};

export default function DocumentPreview({ docUrl, label }: Props) {
  const [forcePdf, setForcePdf] = useState(false);
  const value = String(docUrl || "").trim();

  const shouldRenderPdf = useMemo(() => {
    if (!value) return false;
    return forcePdf || isPdfLike(value);
  }, [forcePdf, value]);

  if (!value) {
    return <Typography variant="body2">Sin archivo</Typography>;
  }

  if (shouldRenderPdf) {
    return (
      <Box
        component="iframe"
        src={normalizePdfSrc(value)}
        title={label || "Documento"}
        sx={{
          width: "100%",
          height: 360,
          borderRadius: 1,
          border: "1px solid #e0e0e0",
        }}
      />
    );
  }

  return (
    <Box
      component="img"
      src={value}
      alt={label}
      onError={() => setForcePdf(true)}
      sx={{
        maxWidth: "100%",
        maxHeight: 360,
        objectFit: "contain",
        borderRadius: 1,
        border: "1px solid #e0e0e0",
      }}
    />
  );
}

