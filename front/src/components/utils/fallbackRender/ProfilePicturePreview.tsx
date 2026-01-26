import { Avatar, Box, Skeleton } from "@mui/material";

type ProfilePictureProps = {
  variant?: "circular" | "text" | "rectangular" | "rounded";
};

export default function ProfilePicturePreview({
  variant = "circular",
}: ProfilePictureProps) {
  return (
    <Box
      sx={{
        p: 3,
        display: "flex",
        justifyContent: "center",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Skeleton
        variant={variant}
        sx={{
          width: 150,
          height: 150,
          mb: 2,
        }}
      >
        <Avatar
          sx={{
            width: 150,
            height: 150,
          }}
        />
      </Skeleton>
    </Box>
  );
}
