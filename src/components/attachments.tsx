import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Props = { orgId: string; taskId?: string; noteId?: string };

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function Attachments({ orgId, taskId, noteId }: Props) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const key = ["attachments", taskId ?? noteId];

  const { data: files = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      let query = supabase
        .from("attachments")
        .select("id, file_name, file_size, storage_path")
        .order("created_at", { ascending: false });
      query = taskId ? query.eq("task_id", taskId) : query.eq("note_id", noteId!);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const remove = useMutation({
    mutationFn: async (file: { id: string; storage_path: string }) => {
      await supabase.storage.from("org-files").remove([file.storage_path]);
      const { error } = await supabase.from("attachments").delete().eq("id", file.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    onError: (e: Error) => toast.error(e.message),
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${orgId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage.from("org-files").upload(path, file);
    if (uploadError) {
      setUploading(false);
      toast.error(uploadError.message);
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("attachments").insert({
      org_id: orgId,
      task_id: taskId ?? null,
      note_id: noteId ?? null,
      storage_path: path,
      file_name: file.name,
      file_size: file.size,
      uploaded_by: userData.user!.id,
    });
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: key });
  }

  async function download(path: string) {
    const { data, error } = await supabase.storage.from("org-files").createSignedUrl(path, 60);
    if (error || !data) {
      toast.error("Could not open that file.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Paperclip className="size-4" /> Files
        </h3>
        <Button
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading…" : "Attach file"}
        </Button>
        <input ref={inputRef} type="file" className="hidden" onChange={onFile} />
      </div>
      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground">No files attached yet.</p>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{f.file_name}</span>
              <span className="text-xs text-muted-foreground">{formatSize(f.file_size)}</span>
              <button onClick={() => download(f.storage_path)} aria-label="Download">
                <Download className="size-4 text-muted-foreground hover:text-foreground" />
              </button>
              <button onClick={() => remove.mutate(f)} aria-label="Delete">
                <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
