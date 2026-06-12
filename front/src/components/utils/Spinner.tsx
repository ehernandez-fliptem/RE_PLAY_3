import { Box, Stack, styled, Typography, type Theme } from "@mui/material";
type Sizes = "small" | "medium" | "large";
type LoaderProps = {
  size?: Sizes;
};

const sizes = {
  small: 20,
  medium: 40,
  large: 60,
};

const Loader = styled(({ ...props }: LoaderProps) => (
  <Box component="span" {...props} />
))(({ theme, size = "medium" }: { theme: Theme; size?: Sizes }) => ({
  position: "relative",
  width: sizes[size],
  height: sizes[size],
  borderRadius: "50%",
  display: "inline-block",
  borderTop: `${size === "small" ? 3 : 4}px solid ${theme.palette.primary.main}`,
  borderRight: "4px solid transparent",
  boxSizing: "border-box",
  animation: "rotation 1s linear infinite",
  "&::after": {
    content: "''",
    boxSizing: "border-box",
    position: "absolute",
    left: 0,
    top: 0,
    width: sizes[size],
    height: sizes[size],
    borderRadius: "50%",
    borderBottom: `${size === "small" ? 3 : 4}px solid ${theme.palette.grey[300]}`,
    borderLeft: "4px solid transparent",
  },
  "@keyframes rotation": {
    from: {
      transform: "rotate(0deg)",
    },
    to: {
      transform: "rotate(360deg)",
    },
  },
}));

const LoadingDots = styled("span")(({ theme }) => ({
  display: "inline-flex",
  gap: 3,
  marginLeft: 3,
  verticalAlign: "baseline",
  "& span": {
    width: 4,
    height: 4,
    borderRadius: "50%",
    backgroundColor: theme.palette.primary.main,
    display: "inline-block",
    animation: "dotJump 1s ease-in-out infinite",
  },
  "& span:nth-of-type(2)": {
    animationDelay: "0.14s",
  },
  "& span:nth-of-type(3)": {
    animationDelay: "0.28s",
  },
  "@keyframes dotJump": {
    "0%, 80%, 100%": {
      transform: "translateY(0)",
      opacity: 0.45,
    },
    "40%": {
      transform: "translateY(-5px)",
      opacity: 1,
    },
  },
}));

type Props = {
  title?: string;
  fullPage?: boolean;
  size?: Sizes;
};

export default function Spinner({ title, fullPage, size }: Props) {
  if (size === "small") {
    return <Loader size={size} />;
  }

  const label = title || "Cargando";

  return (
    <Box
      sx={
        fullPage
          ? {
            width: "100dvw",
            height: "100dvh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }
          : {
              width: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 3,
              px: 2,
            }
      }
      component={Stack}
    >
      <Box
        sx={(theme) => ({
          width: { xs: 148, sm: 160 },
          minHeight: { xs: 138, sm: 150 },
          borderRadius: 3,
          bgcolor: "background.paper",
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: "0 16px 40px rgba(15, 23, 42, 0.16)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        })}
      >
        <Loader size={size || "medium"} />
        <Typography
          variant="body2"
          sx={{
            color: "text.primary",
            fontWeight: 700,
            letterSpacing: 0,
            lineHeight: 1.2,
            textAlign: "center",
          }}
        >
          {label}
          <LoadingDots aria-hidden="true">
            <span />
            <span />
            <span />
          </LoadingDots>
        </Typography>
      </Box>
    </Box>
  );
}
