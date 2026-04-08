import { styled } from "@mui/material/styles";
import Button, { type ButtonProps } from "@mui/material/Button";
import { Box, Typography } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useState } from "react";

type Props = {
  name: string;
  onUpload: React.ChangeEventHandler<HTMLInputElement>;
  label: string;
  buttonProps?: ButtonProps;
  multiple?: boolean;
  accept?: string;
  showLegend?: boolean;
};

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

export default function InputFileUpload({
  name,
  onUpload,
  label,
  buttonProps,
  multiple,
  accept = "image/*,application/pdf",
  showLegend = true,
}: Props) {
  const [error, setError] = useState<string>("");

  const isAllowedFile = (file: File) => {
    if (file.type?.startsWith("image/")) return true;
    if (file.type === "application/pdf") return true;
    const lower = file.name.toLowerCase();
    return [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".bmp",
      ".gif",
      ".pdf",
    ].some((ext) => lower.endsWith(ext));
  };

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    const invalid = files.find((file) => !isAllowedFile(file));
    if (invalid) {
      setError("Solo se permiten imágenes o PDF.");
      event.target.value = "";
      return;
    }
    setError("");
    onUpload(event);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      <Button
        component="label"
        variant="contained"
        startIcon={<CloudUploadIcon />}
        {...buttonProps}
      >
        {label}
        <VisuallyHiddenInput
          name={name}
          type="file"
          onChange={handleChange}
          multiple={multiple}
          accept={accept}
        />
      </Button>
      {showLegend && (
        <Typography variant="caption" color="text.secondary">
          Formatos permitidos: imágenes o PDF.
        </Typography>
      )}
      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
    </Box>
  );
}
