import { useState, useEffect, useCallback } from "react";
import { Autocomplete, TextField } from "@mui/material";

type Options = {
  id: string;
  label: string;
  [key: string]: string;
};

export default function InfiniteScrollAutocomplete() {
  const [options, setOptions] = useState<Options[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchMoreOptions = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      // Simulate API call
      const newItems: Options[] = await new Promise((resolve) => {
        setTimeout(() => {
          const start = page * 10;
          const end = start + 10;
          const dummyData = Array.from({ length: 10000 }, (_, i) => ({
            id: String(i),
            label: `Option ${i + 1}`,
          }));
          const slicedData = dummyData.slice(start, end);
          resolve(slicedData);
        }, 500);
      });

      setOptions((prevOptions) => [...prevOptions, ...newItems]);
      setPage((prevPage) => prevPage + 1);
      setHasMore(newItems.length > 0); // Adjust based on actual API response
    } catch (error) {
      console.error("Error fetching options:", error);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore]);

  useEffect(() => {
    fetchMoreOptions(); // Initial load
  }, [fetchMoreOptions]);

  const handleScroll = (event: React.UIEvent<HTMLUListElement>) => {
    const listboxNode = event.currentTarget;
    if (
      listboxNode.scrollTop + listboxNode.clientHeight >=
      listboxNode.scrollHeight - 50 // Threshold
    ) {
      fetchMoreOptions();
    }
  };

  return (
    <Autocomplete
      multiple
      options={options}
      getOptionLabel={(option) => option.label}
      renderInput={(params) => (
        <TextField {...params} label="Search" variant="outlined" />
      )}
      slotProps={{
        listbox: {
          onScroll: handleScroll,
        },
      }}
      loading={loading}
      loadingText="Loading more..."
    />
  );
}
