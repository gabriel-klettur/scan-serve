import { useEffect, useMemo } from "react";

export const useObjectUrl = (blob: Blob | null | undefined): string | null => {
  const url = useMemo(() => {
    if (!blob) {
      return null;
    }
    return URL.createObjectURL(blob);
  }, [blob]);

  useEffect(() => {
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [url]);

  return url;
};
