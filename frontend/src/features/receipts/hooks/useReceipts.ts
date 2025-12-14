import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Receipt } from "../types/receipt";
import {
  createReceipt,
  deleteReceipt,
  getReceiptById,
  listReceipts,
  updateReceiptFolder,
  updateReceiptOcr,
} from "../db/receiptsRepo";
import { receiptKeys } from "./queryKeys";

export const useReceiptsQuery = (folderId: string | null | undefined) => {
  return useQuery<Receipt[]>({
    queryKey: receiptKeys.list(folderId),
    queryFn: () => listReceipts(folderId),
  });
};

export const useReceiptQuery = (id: string) => {
  return useQuery<Receipt | null>({
    queryKey: receiptKeys.detail(id),
    queryFn: () => getReceiptById(id),
  });
};

export const useCreateReceiptMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createReceipt,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: receiptKeys.all });
    },
  });
};

export const useDeleteReceiptMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteReceipt,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: receiptKeys.all });
    },
  });
};

export const useUpdateReceiptFolderMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateReceiptFolder,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: receiptKeys.all });
    },
  });
};

export const useUpdateReceiptOcrMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ receiptId, ocr }: { receiptId: string; ocr: Parameters<typeof updateReceiptOcr>[1] }) =>
      updateReceiptOcr(receiptId, ocr),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: receiptKeys.all });
    },
  });
};
