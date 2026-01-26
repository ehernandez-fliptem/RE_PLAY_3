interface ColorOptions {
  main: string;
  light?: string;
  dark?: string;
  contrastText?: string;
}

export interface ColorPalette {
  primary: ColorOptions;
  secondary: ColorOptions;
  error: ColorOptions;
  warning: ColorOptions;
  info: ColorOptions;
  success: ColorOptions;
}