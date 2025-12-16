import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDefaultFolderId, setDefaultFolderId } from "../db/settingsRepo";

export const receiptSettingsKeys = {
  all: ["receiptSettings"] as const,
};

export const useDefaultFolderIdQuery = () => {
  return useQuery<string | null>({
    queryKey: receiptSettingsKeys.all,
    queryFn: getDefaultFolderId,
  });
};

export const useSetDefaultFolderIdMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setDefaultFolderId,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: receiptSettingsKeys.all });
    },
  });
};
