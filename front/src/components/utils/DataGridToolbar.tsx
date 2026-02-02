import * as React from "react";
import { styled, useTheme } from "@mui/material/styles";
import {
  Toolbar,
  ToolbarButton,
  ColumnsPanelTrigger,
  FilterPanelTrigger,
  ExportCsv,
  ExportPrint,
  QuickFilter,
  QuickFilterControl,
  QuickFilterClear,
  QuickFilterTrigger,
} from "@mui/x-data-grid";
import Tooltip from "@mui/material/Tooltip";
import Menu from "@mui/material/Menu";
import Badge from "@mui/material/Badge";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import FilterListIcon from "@mui/icons-material/FilterList";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import CancelIcon from "@mui/icons-material/Cancel";
import SearchIcon from "@mui/icons-material/Search";
import Typography from "@mui/material/Typography";
import { Box, Stack, useMediaQuery } from "@mui/material";

type OwnerState = {
  expanded: boolean;
};

const StyledQuickFilter = styled(QuickFilter)({
  display: "grid",
  alignItems: "center",
});

const StyledToolbarButton = styled(ToolbarButton)<{ ownerState: OwnerState }>(
  ({ theme, ownerState }) => ({
    gridArea: "1 / 1",
    width: "min-content",
    height: "min-content",
    zIndex: 1,
    opacity: ownerState.expanded ? 0 : 1,
    pointerEvents: ownerState.expanded ? "none" : "auto",
    transition: theme.transitions.create(["opacity"]),
  })
);

const StyledTextField = styled(TextField)<{
  ownerState: OwnerState;
}>(({ theme, ownerState }) => ({
  gridArea: "1 / 1",
  overflowX: "clip",
  width: ownerState.expanded ? 240 : "var(--trigger-width)",
  opacity: ownerState.expanded ? 1 : 0,
  transition: theme.transitions.create(["width", "opacity"]),
}));

type Props = {
  tableTitle?: string;
  showFilterButton?: boolean;
  showColumnsButton?: boolean;
  showExportButton?: boolean;
  showSearchButton?: boolean;
  customActionButtons?: React.ReactNode;
};

export default function DataGridToolbar({
  tableTitle,
  showFilterButton,
  showColumnsButton,
  showExportButton = true,
  showSearchButton = true,
  customActionButtons,
}: Props) {
  const [exportMenuOpen, setExportMenuOpen] = React.useState(false);
  const exportMenuTriggerRef = React.useRef<HTMLButtonElement>(null);
  const theme = useTheme();
  const isTinyMobile = useMediaQuery(theme.breakpoints.down("sm"));
  return (
    <Toolbar style={{ minHeight: isTinyMobile ? 80 : "auto" }}>
      <Box
        component="div"
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: "center",
          width: "100%",
        }}
      >
        <Typography
          fontWeight="medium"
          sx={{ fontSize: { xs: 15, sm: 18 }, flex: 1, m: 0.5 }}
        >
          {tableTitle}
        </Typography>
        <Divider
          variant="middle"
          flexItem
          sx={{ display: { xs: "block", sm: "none" }, mx: 0.5, mb: 1 }}
        />
        <Stack
          direction={{ xs: "row", sm: "row" }}
          justifyContent="space-around"
          alignItems="center"
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          {customActionButtons}

          <Divider
            orientation="vertical"
            variant="middle"
            flexItem
            sx={{ display: { xs: "none", sm: "block" }, mx: 0.5 }}
          />

          {showColumnsButton && (
            <Tooltip title="Columns">
              <ColumnsPanelTrigger render={<ToolbarButton />}>
                <ViewColumnIcon fontSize="small" />
              </ColumnsPanelTrigger>
            </Tooltip>
          )}

          {showFilterButton && (
            <Tooltip title="Filters">
              <FilterPanelTrigger
                render={(props, state) => (
                  <ToolbarButton {...props} color="default">
                    <Badge
                      badgeContent={state.filterCount}
                      color="primary"
                      variant="dot"
                    >
                      <FilterListIcon fontSize="small" />
                    </Badge>
                  </ToolbarButton>
                )}
              />
            </Tooltip>
          )}

          {showExportButton && (
            <React.Fragment>
              <Tooltip title="Exportar">
                <ToolbarButton
                  ref={exportMenuTriggerRef}
                  id="export-menu-trigger"
                  aria-controls="export-menu"
                  aria-haspopup="true"
                  aria-expanded={exportMenuOpen ? "true" : undefined}
                  onClick={() => setExportMenuOpen(true)}
                >
                  <FileDownloadIcon fontSize="small" />
                </ToolbarButton>
              </Tooltip>
              <Menu
                id="export-menu"
                anchorEl={exportMenuTriggerRef.current}
                open={exportMenuOpen}
                onClose={() => setExportMenuOpen(false)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{
                  list: {
                    "aria-labelledby": "export-menu-trigger",
                  },
                }}
              >
                <ExportPrint
                  options={{
                    fileName: "pdf_data",
                    hideFooter: true,
                    hideToolbar: true,
                    includeCheckboxes: false,
                  }}
                  render={<MenuItem />}
                  onClick={() => setExportMenuOpen(false)}
                >
                  Imprimir
                </ExportPrint>
                <ExportCsv
                  options={{
                    fileName: "csv_data",
                    utf8WithBom: true,
                  }}
                  render={<MenuItem />}
                  onClick={() => setExportMenuOpen(false)}
                >
                  Descargar CSV
                </ExportCsv>
                {/* Available to MUI X Premium users */}
                {/* <ExportExcel render={<MenuItem />}>
            Download as Excel
          </ExportExcel> */}
              </Menu>
            </React.Fragment>
          )}

          {showSearchButton && (
            <StyledQuickFilter>
              <QuickFilterTrigger
                render={(triggerProps, state) => (
                  <Tooltip title="Buscar" enterDelay={0}>
                    <StyledToolbarButton
                      {...triggerProps}
                      ownerState={{ expanded: state.expanded }}
                      color="default"
                      aria-disabled={state.expanded}
                    >
                      <SearchIcon fontSize="small" />
                    </StyledToolbarButton>
                  </Tooltip>
                )}
              />

              <QuickFilterControl
                render={({ ref, ...controlProps }, state) => (
                  <StyledTextField
                    {...controlProps}
                    ownerState={{ expanded: state.expanded }}
                    inputRef={ref}
                    aria-label="Buscar"
                    placeholder="Buscar..."
                    size="small"
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        ),
                        endAdornment: state.value ? (
                          <InputAdornment position="end">
                            <QuickFilterClear
                              edge="end"
                              size="small"
                              aria-label="Limpiar búsqueda"
                              style={{ marginRight: -0.75 }}
                            >
                              <CancelIcon fontSize="small" />
                            </QuickFilterClear>
                          </InputAdornment>
                        ) : null,
                        ...controlProps.slotProps?.input,
                      },
                      ...controlProps.slotProps,
                    }}
                  />
                )}
              />
            </StyledQuickFilter>
          )}
        </Stack>
      </Box>
    </Toolbar>
  );
}
