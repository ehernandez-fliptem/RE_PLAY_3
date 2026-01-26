import { useEffect, useState } from "react";
import { styled, type Theme } from "@mui/material/styles";
import Badge, { type BadgeProps } from "@mui/material/Badge";

interface DynamicBadgeProps extends BadgeProps {
  isOnline?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const NetworkBadge = styled(({ isOnline, ...props }: DynamicBadgeProps) => (
  <Badge {...props} />
))(({ theme, isOnline }: { theme: Theme; isOnline?: boolean }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: isOnline
      ? theme.palette.success.main
      : theme.palette.error.main,
    color: isOnline
      ? theme.palette.success.contrastText
      : theme.palette.error.contrastText,
    boxShadow: theme.shadows[4],
    "&::after": {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      animation: "ripple 2s infinite ease-in-out",
      border: "1px solid currentColor",
      content: '""',
    },
  },
  "@keyframes ripple": {
    "0%": {
      transform: "scale(.8)",
      opacity: 1,
    },
    "100%": {
      transform: "scale(2.4)",
      opacity: 0,
    },
  },
}));

const useNetworkStatus = () => {
  const [isOnline, setOnline] = useState(true);

  const updateNetworkStatus = () => {
    setOnline(navigator.onLine);
  };

  useEffect(() => {
    updateNetworkStatus();
  }, []);

  useEffect(() => {
    window.addEventListener("load", updateNetworkStatus);
    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);

    return () => {
      window.removeEventListener("load", updateNetworkStatus);
      window.removeEventListener("online", updateNetworkStatus);
      window.removeEventListener("offline", updateNetworkStatus);
    };
  }, []);

  return {
    isOnline,
    NetworkBadge: (props: DynamicBadgeProps) => (
      <NetworkBadge {...props} isOnline={isOnline} />
    ),
  };
};

export default useNetworkStatus;
