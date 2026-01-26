import { Box, Stack, styled, type Theme } from "@mui/material";
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
  width: sizes[size],
  height: sizes[size],
  borderRadius: "50%",
  display: "inline-block",
  borderTop: `4px solid ${theme.palette.primary.contrastText}`,
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
    borderBottom: `4px solid #C4C4C4`,
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

type Props = {
  title?: string;
  fullPage?: boolean;
  size?: Sizes;
};

export default function Spinner({ title, fullPage, size }: Props) {
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
              p: 2,
            }
      }
      component={Stack}
    >
      {title && (
        <small style={{ textAlign: "center", marginBottom: 10 }}>{title}</small>
      )}
      <Loader size={size}/>
    </Box>
  );
}
