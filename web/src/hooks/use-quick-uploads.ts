import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, useUserId } from "@/hooks/use-auth";
import { AIQuickUploadApiFactory, FilesApiFactory } from "@/api";
import type {
  IdentifiableQuickUploadResponse,
  QuickUploadResponse,
} from "@/api";
import { getBaseUrl } from "@/lib/api-utils";
import { readSseStream } from "@/lib/sse";
import { QueryKeys } from "@/constants/query-keys";

const ACTIVE_STATUSES = new Set([
  "pending",
  "created",
  "processing",
  "proposal_ready",
  "failed",
]);

const SUBSCRIBABLE_STATUSES = new Set(["pending", "created", "processing"]);

const subscriptions = new Map<string, AbortController>();

const TERMINAL_STATUSES = new Set(["accepted", "rejected"]);

export interface UseQuickUploadsReturn {
  items: IdentifiableQuickUploadResponse[];
  isLoading: boolean;
  createFromFile: (file: File) => Promise<void>;
  completeQuickUpload: (id: string, accepted: boolean) => Promise<void>;
  retry: (failedId: string) => Promise<void>;
}

export function useQuickUploads(): UseQuickUploadsReturn {
  const userId = useUserId();
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  const { data: rawItems = [], isLoading } = useQuery({
    queryKey: [QueryKeys.QUICK_UPLOADS, userId],
    queryFn: async () => {
      const res = await AIQuickUploadApiFactory().listQuickUploads(userId);
      return res.data;
    },
    refetchInterval: false,
  });

  const items = useMemo(
    () => rawItems.filter((item) => ACTIVE_STATUSES.has(item.status)),
    [rawItems],
  );

  const upsertItem = useCallback(
    (updated: IdentifiableQuickUploadResponse) => {
      queryClient.setQueryData<IdentifiableQuickUploadResponse[]>(
        [QueryKeys.QUICK_UPLOADS, userId],
        (prev = []) => {
          const idx = prev.findIndex((i) => i.id === updated.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = updated;
            return next;
          }
          return [...prev, updated];
        },
      );
    },
    [queryClient, userId],
  );

  const removeItem = useCallback(
    (id: string) => {
      queryClient.setQueryData<IdentifiableQuickUploadResponse[]>(
        [QueryKeys.QUICK_UPLOADS, userId],
        (prev = []) => prev.filter((i) => i.id !== id),
      );
    },
    [queryClient, userId],
  );

  const subscribe = useCallback(
    async (id: string) => {
      if (subscriptions.has(id)) return;

      const controller = new AbortController();
      subscriptions.set(id, controller);

      try {
        const token = await getAccessToken();
        const headers: Record<string, string> = {
          Accept: "text/event-stream",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const base = getBaseUrl();
        const url = new URL(
          `/api/users/${userId}/ai/quick-upload/${id}/subscribe`,
          base,
        ).toString();

        const response = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers,
          signal: controller.signal,
        });

        const refetch = async () => {
          try {
            const res = await AIQuickUploadApiFactory().getQuickUpload(
              userId,
              id,
            );
            upsertItem({ ...res.data, id });
            queryClient.setQueryData([QueryKeys.QUICK_UPLOAD, id], res.data);
            if (TERMINAL_STATUSES.has(res.data.status)) {
              removeItem(id);
            }
          } catch {
            // ignore refetch errors
          }
        };

        await readSseStream(
          response,
          (event) => {
            if (event.event === "state") {
              try {
                const parsed = JSON.parse(event.data) as QuickUploadResponse;
                upsertItem({ ...parsed, id });
                if (TERMINAL_STATUSES.has(parsed.status)) {
                  removeItem(id);
                  const ctrl = subscriptions.get(id);
                  if (ctrl) {
                    ctrl.abort();
                    subscriptions.delete(id);
                  }
                }
              } catch {
                // malformed SSE data
              }
            } else if (event.event === "proposal") {
              void refetch();
            } else if (event.event === "done" || event.event === "error") {
              void refetch();
              const ctrl = subscriptions.get(id);
              if (ctrl) {
                ctrl.abort();
                subscriptions.delete(id);
              }
            }
          },
          controller.signal,
        );
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          subscriptions.delete(id);
        }
      }
    },
    [userId, getAccessToken, upsertItem, removeItem, queryClient],
  );

  useEffect(() => {
    for (const item of items) {
      if (
        SUBSCRIBABLE_STATUSES.has(item.status) &&
        !subscriptions.has(item.id)
      ) {
        void subscribe(item.id);
      }
    }
  }, [items, subscribe]);

  const createFromFileId = useCallback(
    async (fileId: string) => {
      const res = await AIQuickUploadApiFactory().createQuickUpload(userId, {
        file_id: fileId,
      });
      upsertItem(res.data);
    },
    [userId, upsertItem],
  );

  const createFromFile = useCallback(
    async (file: File) => {
      const createRes = await FilesApiFactory().createFile(userId, {
        mime_type: file.type,
        original_name: file.name,
        size_bytes: file.size,
      });
      const fileRecord = createRes.data;
      const { upload_url, upload_headers, upload_method } =
        fileRecord.upload_metadata;

      await fetch(upload_url, {
        method: upload_method,
        headers: upload_headers,
        body: file,
      });

      await FilesApiFactory().confirmFile(userId, fileRecord.id);

      await createFromFileId(fileRecord.id);
    },
    [userId, createFromFileId],
  );

  const completeQuickUpload = useCallback(
    async (id: string, accepted: boolean) => {
      await AIQuickUploadApiFactory().complete(userId, id, { accepted });
      removeItem(id);
      const ctrl = subscriptions.get(id);
      if (ctrl) {
        ctrl.abort();
        subscriptions.delete(id);
      }
    },
    [userId, removeItem],
  );

  const retry = useCallback(
    async (failedId: string) => {
      const current = queryClient.getQueryData<
        IdentifiableQuickUploadResponse[]
      >([QueryKeys.QUICK_UPLOADS, userId]);
      const failed = current?.find((i) => i.id === failedId);
      if (!failed) return;

      removeItem(failedId);
      const ctrl = subscriptions.get(failedId);
      if (ctrl) {
        ctrl.abort();
        subscriptions.delete(failedId);
      }

      await createFromFileId(failed.source_file_id);
    },
    [userId, queryClient, removeItem, createFromFileId],
  );

  return { items, isLoading, createFromFile, completeQuickUpload, retry };
}
