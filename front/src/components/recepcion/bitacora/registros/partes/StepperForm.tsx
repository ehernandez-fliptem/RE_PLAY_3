import { Fragment, Suspense, useState } from "react";
import {
  Box,
  Stepper,
  Step,
  Button,
  Typography,
  Stack,
  Divider,
  StepLabel,
  useTheme,
  useMediaQuery,
  StepContent,
  Skeleton,
} from "@mui/material";
import { useFormContext } from "react-hook-form";
import Spinner from "../../../../utils/Spinner";
import { Build } from "@mui/icons-material";
import Visitantes from "./steps/Visitantes";
import { LibConnector, LibStepIcon } from "../../../../utils/StepperLib";
import Acceso from "./steps/Acceso";
import Adicionales from "./steps/Adicionales";
import type { IRootState } from "../../../../../app/store";
import { useSelector } from "react-redux";

const steps = [
  {
    label: "Visitante(s)",
    descripcion: "Información general sobre los datos de visitantes",
    content: (type: number) => (
      <Suspense fallback={<Skeleton variant="rectangular" height={350} />}>
        <Visitantes type={type} name="visitantes" />
      </Suspense>
    ),
  },
  {
    label: "Acceso",
    descripcion:
      "Información para el acceso de los visitantes y actividades a realizar",
    content: (type: number) => (
      <Suspense fallback={<Skeleton variant="rectangular" height={350} />}>
        <Acceso type={type} />
      </Suspense>
    ),
  },
  {
    label: "Adicionales",
    descripcion:
      "Información opcional que puede dar más información sobre el registro",
    content: (type: number) => (
      <Suspense fallback={<Skeleton variant="rectangular" height={350} />}>
        <Adicionales type={type} />
      </Suspense>
    ),
  },
];

type StepperFormProps = {
  type: number;
  secondaryChildren?: React.ReactNode;
};

export default function StepperForm({
  type,
  secondaryChildren,
}: StepperFormProps) {
  const { rol } = useSelector((state: IRootState) => state.auth.data);
  const esVisit = rol.includes(10);
  const STEPS = esVisit ? steps.slice(1) : steps;
  const {
    formState: { isSubmitting, isValid, errors },
    watch,
  } = useFormContext();
  const [activeStep, setActiveStep] = useState(0);
  const [completed, setCompleted] = useState<{
    [k: number]: boolean;
  }>({});
  const theme = useTheme();
  const isTinyMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const fields = watch("visitantes");

  const isReadyToSubmit = isValid && Object.keys(errors).length === 0;

  const totalSteps = () => {
    return STEPS.length;
  };

  const completedSteps = () => {
    return Object.keys(completed).length;
  };

  const isLastStep = () => {
    return activeStep === totalSteps() - 1;
  };

  const allStepsCompleted = () => {
    return completedSteps() === totalSteps();
  };

  const canClickNext = () => {
    if (fields?.length > 0 && activeStep == 0) return true;
    else if (!esVisit && isReadyToSubmit && activeStep == 1) return true;
    else if (esVisit && isReadyToSubmit && activeStep == 0) return true;
    else return false;
  };

  const canSubmit = () => {
    return isReadyToSubmit;
  };

  const handleNext = () => {
    const newActiveStep =
      isLastStep() && !allStepsCompleted()
        ? // It's the last step, but not all STEPS have been completed,
          // find the first step that has been completed
          STEPS.findIndex((_step, i) => !(i in completed))
        : activeStep + 1;
    setActiveStep(newActiveStep);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleComplete = () => {
    setCompleted({
      ...completed,
      [activeStep]: true,
    });
    handleNext();
  };

  const handleReset = () => {
    setActiveStep(0);
    setCompleted({});
  };

  return (
    <Box sx={{ width: "100%", mt: 2 }}>
      <Stepper
        orientation={isTinyMobile ? "vertical" : "horizontal"}
        alternativeLabel={!isTinyMobile}
        activeStep={activeStep}
        connector={!isTinyMobile ? <LibConnector /> : <></>}
      >
        {STEPS.map((item, index) => (
          <Step key={index} completed={completed[index]}>
            <StepLabel StepIconComponent={LibStepIcon}>{item.label}</StepLabel>
            {isTinyMobile && (
              <StepContent>
                <Box component="section" sx={{ py: 2 }}>
                  {item.content(type)}
                </Box>
              </StepContent>
            )}
          </Step>
        ))}
      </Stepper>
      <div>
        {allStepsCompleted() ? (
          <Fragment>
            <Typography sx={{ mt: 2, mb: 1 }}>
              Todos los pasos se completaron
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "row", pt: 2 }}>
              <Box sx={{ flex: "1 1 auto" }} />
              <Button onClick={handleReset}>Reset</Button>
            </Box>
          </Fragment>
        ) : (
          <Fragment>
            {!isTinyMobile && (
              <Box component="section" sx={{ py: 2 }}>
                {STEPS[activeStep].content(type)}
              </Box>
            )}
            <Divider sx={{ my: 2 }} />
            <Box
              component="footer"
              sx={{
                display: "flex",
                justifyContent: "end",
                mt: 3,
                mb: 0.5,
              }}
            >
              {isSubmitting ? (
                <Spinner />
              ) : (
                <Stack
                  spacing={2}
                  direction={{ xs: "column-reverse", sm: "row" }}
                  justifyContent="end"
                  sx={{ width: "100%" }}
                >
                  {secondaryChildren}
                  {activeStep !== 0 && (
                    <Button
                      size="medium"
                      variant="contained"
                      color="inherit"
                      onClick={handleBack}
                    >
                      Atrás
                    </Button>
                  )}
                  <Box
                    sx={{
                      display: { xs: "none", sm: "flex" },
                      flex: "1 1 auto",
                    }}
                  />
                  {canClickNext() && (
                    <Button
                      size="medium"
                      variant="contained"
                      onClick={handleComplete}
                    >
                      Siguiente
                    </Button>
                  )}
                  {canSubmit() && (
                    <Button
                      type="submit"
                      size="medium"
                      variant="contained"
                      startIcon={<Build />}
                    >
                      Procesar
                    </Button>
                  )}
                </Stack>
              )}
            </Box>
          </Fragment>
        )}
      </div>
    </Box>
  );
}
