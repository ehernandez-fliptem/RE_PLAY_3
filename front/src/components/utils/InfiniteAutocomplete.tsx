import React, { useState, useEffect, useCallback } from "react";
import {
  Autocomplete,
  TextField,
  CircularProgress,
  Box,
  type AutocompleteProps,
  type TextFieldProps,
} from "@mui/material";
import InfiniteScroll from "react-infinite-scroll-component";
import { clienteAxios, handlingError } from "../../app/config/axios";
import useDebounce from "../../hooks/useDebounce";

type Options = {
  id: string;
  label: string;
  [key: string]: string;
};

type Props = {
  urlApiSearch: string;
  autocompleteProps?:
    | Omit<
        AutocompleteProps<
          {
            id: string;
            label: string;
          },
          true,
          false,
          false,
          "div"
        >,
        "loading" | "name" | "renderInput" | "options"
      >
    | undefined;
  textFieldProps?: Omit<TextFieldProps, "name" | "required"> | undefined;
  loadingComponent?: React.ReactNode;
};

export default function InfiniteAutocomplete({
  urlApiSearch,
  autocompleteProps,
  textFieldProps,
  loadingComponent,
}: Props) {
  const [options, setOptions] = useState<Options[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const debouncedValue = useDebounce(inputValue);

  const fetchProducts = useCallback(
    async (query: string = "", page = 0, limit = 10) => {
      if (query.length < 2 || isLoading) return;
      setIsLoading(true);
      try {
        const urlParams = new URLSearchParams({
          filter: JSON.stringify([query]),
          pagination: JSON.stringify({ page, pageSize: limit }),
          sort: JSON.stringify([]),
        });
        const res = await clienteAxios.get(urlApiSearch + urlParams.toString());
        if (res.data.estado) {
          setError("");
          const newProducts = res.data.datos.paginatedResults || [];

          if (page === 0) {
            setOptions((prev) => [
              ...prev,
              ...newProducts
                .filter(
                  (itemA: { [key: string]: string }) =>
                    !prev.some((itemB) => itemB.id === itemA._id)
                )
                .map((item: { [key: string]: string }) => {
                  return { id: item._id, label: item.nombre };
                }),
            ]);
          } else {
            setOptions((prev) => [
              ...prev,
              ...newProducts.map((item: { [key: string]: string }) => {
                return { id: item._id, label: item.nombre };
              }),
            ]);
          }

          setHasMore(res.data.datos.paginatedResults.length > options.length);
        } else {
          setError(res.data.mensaje);
        }
      } catch (error) {
        console.error(error)
        handlingError(error);
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    setPage(0);
    setHasMore(false);
    fetchProducts(debouncedValue, 0, 10);
  }, [debouncedValue, fetchProducts]);

  const loadMoreData = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(inputValue, nextPage);
  };

  const ListboxComponent = React.forwardRef<
    HTMLDivElement,
    React.PropsWithChildren<unknown>
  >((props, ref) => {
    const { children, ...other } = props;

    return (
      <div ref={ref}>
        <InfiniteScroll
          dataLength={options.length}
          next={loadMoreData}
          hasMore={hasMore}
          loader={
            <Box sx={{ display: "flex", justifyContent: "center", p: 1 }}>
              {loadingComponent ? (
                loadingComponent
              ) : (
                <CircularProgress size={20} />
              )}
            </Box>
          }
          height={300}
          {...other}
        >
          {children}
        </InfiniteScroll>
      </div>
    );
  });

  return (
    <Autocomplete
      options={options}
      loading={isLoading}
      inputValue={inputValue}
      onInputChange={(_event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      noOptionsText={
        options.length === 0 && inputValue.length > 1
          ? "No hay registros encontrados"
          : "Ingresa al menos 2 caracteres"
      }
      loadingText="Loading..."
      slotProps={{
        listbox: {
          component: options.length > 10 ? ListboxComponent : undefined,
        },
      }}
      getOptionLabel={(option) => option.label || ""}
      renderInput={(params) => (
        <TextField
          {...params}
          {...textFieldProps}
          error={!!error}
          helperText={
            error
              ? error
              : inputValue.length === 1
              ? "Ingresa al menos 2 caracteres"
              : ""
          }
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <React.Fragment>
                  {isLoading ? (
                    <>
                      {loadingComponent ? (
                        loadingComponent
                      ) : (
                        <CircularProgress color="inherit" size={20} />
                      )}
                    </>
                  ) : null}
                  {params.InputProps.endAdornment}
                </React.Fragment>
              ),
            },
          }}
        />
      )}
      {...autocompleteProps}
    />
  );
}
