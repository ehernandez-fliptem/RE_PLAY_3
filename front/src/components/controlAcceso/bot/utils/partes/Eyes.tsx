import { Box, keyframes, styled } from "@mui/material";
import { useEffect, useState } from "react";

const blink = keyframes`
  0% {
    transform: scaleY(1);
  }
  10% {
    transform: scaleY(0.1);
  }
  20% {
    transform: scaleY(1);
  }
  100% {
    transform: scaleY(1);
  }
`;

interface EyeProps {
  isBlinking: boolean;
}

const Eye = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isBlinking",
})<EyeProps>(({ isBlinking, theme }) => ({
  backgroundColor: theme.palette.primary.contrastText,
  borderRadius: 20,
  animation: isBlinking ? `${blink} 500ms ease-in-out` : "none",
  transformOrigin: "center",
}));

export default function Eyes() {
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const blinkRandomly = () => {
      setIsBlinking(true);

      const blinkTimer = setTimeout(() => {
        setIsBlinking(false);

        const nextBlinkDelay = Math.random() * 5000 + 5000;
        const nextBlinkTimer = setTimeout(blinkRandomly, nextBlinkDelay);

        return () => clearTimeout(nextBlinkTimer);
      }, 500);

      return () => clearTimeout(blinkTimer);
    };

    const initialDelay = Math.random() * 2000 + 3000;
    const initialTimer = setTimeout(blinkRandomly, initialDelay);

    return () => clearTimeout(initialTimer);
  }, []);

  return (
    <Box
      id="eyes"
      sx={{
        display: "flex",
        gap: { xs: 4, sm: 8 },
        my: 2,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Eye
        isBlinking={isBlinking}
        sx={{
          height: { xs: 30, sm: 50 },
          width: { xs: 15, sm: 25 },
        }}
      />
      <Eye
        isBlinking={isBlinking}
        sx={{
          height: { xs: 30, sm: 50 },
          width: { xs: 15, sm: 25 },
        }}
      />
    </Box>
  );
}
