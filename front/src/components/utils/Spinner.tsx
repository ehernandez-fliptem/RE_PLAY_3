import { useEffect, useRef, useState } from "react";
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
  backgroundAfterMs?: number;
};

export default function Spinner({ title, fullPage, size, backgroundAfterMs = 8000 }: Props) {
  const [isBackground, setIsBackground] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (size === "small" || backgroundAfterMs <= 0) return;
    const timer = window.setTimeout(() => setIsBackground(true), backgroundAfterMs);
    return () => window.clearTimeout(timer);
  }, [backgroundAfterMs, size]);

  useEffect(() => {
    const modalRoot = rootRef.current?.closest('[role="presentation"]');
    if (!modalRoot) return;
    if (isBackground) {
      modalRoot.classList.add("app-modal-background-active");
    }
    return () => {
      modalRoot.classList.remove("app-modal-background-active");
    };
  }, [isBackground]);

  if (size === "small") {
    return <Loader size={size} />;
  }

  const label = isBackground ? "Cargando" : title || "Cargando";

  return (
    <Box
      ref={rootRef}
      className={isBackground ? "app-spinner-compact app-spinner-background" : "app-spinner-compact"}
      sx={
        isBackground
          ? {
              width: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 1.5,
              px: 2,
            }
          : fullPage
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
        sx={{
          width: "fit-content",
          minWidth: isBackground ? "auto" : 96,
          minHeight: isBackground ? "auto" : 92,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: isBackground ? 0 : 1.5,
        }}
      >
        {!isBackground && <Loader size={size || "medium"} />}
        <Typography
          variant="body2"
          sx={{
            color: "text.primary",
            fontWeight: 700,
            letterSpacing: 0,
            lineHeight: 1.2,
            textAlign: "center",
            whiteSpace: "nowrap",
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
