import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFolder, deleteFolder, listFolders, updateFolder } from "../db/foldersRepo";
import type { ReceiptFolder } from "../types/folder";
import { receiptFolderKeys, receiptKeys } from "./queryKeys";

export const useReceiptFoldersQuery = () => {
  return useQuery<ReceiptFolder[]>({
    queryKey: receiptFolderKeys.all,
    queryFn: listFolders,
  });
};

export const useCreateReceiptFolderMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFolder,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: receiptFolderKeys.all });
    },
  });
};

export const useUpdateReceiptFolderMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateFolder,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: receiptFolderKeys.all });
    },
  });
};

export const useDeleteReceiptFolderMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFolder,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: receiptFolderKeys.all });
      await queryClient.invalidateQueries({ queryKey: receiptKeys.all });
    },
  });
};
