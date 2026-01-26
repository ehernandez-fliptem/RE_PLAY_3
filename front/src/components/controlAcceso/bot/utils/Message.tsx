import { Box, styled, Typography } from "@mui/material";

interface MessageBubbleProps {
  isUser?: boolean;
  isError?: boolean;
}

const MessageBubble = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isUser" && prop !== "isError",
})<MessageBubbleProps>(({ isUser, isError, theme }) => ({
  maxWidth: "100%",
  padding: "0.5rem 0.75rem",
  borderRadius: 5,
  //   alignSelf: isUser ? "flex-end" : "flex-start",
  backgroundColor: isError
    ? theme.palette.error.main
    : isUser
    ? theme.palette.primary.main
    : theme.palette.secondary.light,
  color: isError
    ? theme.palette.error.contrastText
    : isUser
    ? theme.palette.primary.contrastText
    : theme.palette.secondary.contrastText,
}));

type Props = {
  message: string;
  isUser?: boolean;
  isError?: boolean;
};

export default function Message({
  message,
  isUser = false,
  isError = false,
}: Props) {
  return (
    <MessageBubble isUser={isUser} isError={isError}>
      <Typography variant="overline">{message}</Typography>
    </MessageBubble>
  );
}
