import { Box } from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";

const sound = keyframes`
  0% {
    opacity: .35;
    height: 3px;
  }
  100% {
    opacity: 1;
    height: 20px;
  }
`;

interface BarProps {
  animationDuration: string;
  leftPosition: string;
  isTalking?: boolean;
}

const Bar = styled(Box, {
  shouldForwardProp: (prop) =>
    prop !== "animationDuration" && prop !== "leftPosition" && prop !== "isTalking",
})<BarProps>(({ animationDuration, leftPosition, isTalking, theme }) => ({
  backgroundColor: theme.palette.secondary.contrastText,
  bottom: 1,
  height: 0,
  width: 10,
  margin: "0px 4px",
  borderRadius: 5,
  animation: `${sound} 0ms -600ms linear infinite alternate`,
  animationDuration: isTalking ? "0ms" : animationDuration,
  left: leftPosition,
}));

interface BarAnimation {
  duration: string;
  left: string;
}

type Props = {
  isTalking?: boolean;
};
export default function Mouth({ isTalking = false }: Props) {
  const barAnimations: BarAnimation[] = [
    { duration: "474ms", left: "1px" },
    { duration: "433ms", left: "15px" },
    { duration: "407ms", left: "29px" },
    { duration: "458ms", left: "43px" },
    { duration: "400ms", left: "57px" },
    { duration: "427ms", left: "71px" },
    { duration: "441ms", left: "85px" },
    { duration: "419ms", left: "99px" },
    // { duration: "487ms", left: "113px" },
    // { duration: "442ms", left: "127px" },
  ];

  return (
    <Box
      id="mouth"
      sx={{
        width: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          borderRadius: 25,
          height: !isTalking ? 50 : 0,
        }}
      >
        {barAnimations.map((bar, index) => (
          <Bar
            key={index}
            animationDuration={bar.duration}
            leftPosition={bar.left}
            isTalking={isTalking}
          />
        ))}
      </Box>
    </Box>
  );
}
