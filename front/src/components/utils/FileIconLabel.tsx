import {
  Article,
  AudioFile,
  CoPresent,
  DataObject,
  Description,
  Folder,
  GridOn,
  Image,
  PictureAsPdf,
  Storage,
  VideoFile,
} from "@mui/icons-material";
import { Typography } from "@mui/material";

type Props = {
  file_name?: string;
  type: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
};
export default function FileIconLabel({ file_name, type }: Props) {
  const getFileIcon = () => {
    switch (type) {
      case 1:
        return <Folder color="inherit" fontSize="small" />;
      case 2:
        return <Description color="info" fontSize="small" />;
      case 3:
        return <GridOn color="success" fontSize="small" />;
      case 4:
        return <CoPresent color="warning" fontSize="small" />;
      case 5:
        return <Image color="error" fontSize="small" />;
      case 6:
        return <PictureAsPdf color="error" fontSize="small" />;
      case 7:
        return <VideoFile color="error" fontSize="small" />;
      case 8:
        return <AudioFile color="error" fontSize="small" />;
      case 9:
        return <Storage color="inherit" fontSize="small" />;
      case 10:
        return <DataObject color="inherit" fontSize="small" />;
      default:
        return <Article color="info" fontSize="small" />;
    }
  };

  return (
    <>
      {getFileIcon()}{" "}
      <Typography key={file_name} variant="body2" component="h6" sx={{ ml: 2 }}>
        {file_name}
      </Typography>
    </>
  );
}
