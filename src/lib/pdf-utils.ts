"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function usePdfDownload() {
  const [downloading, setDownloading] = useState(false);
  const supabase = createClient();

  const downloadPdf = async (filePath: string, filename: string) => {
    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from("signed_forms")
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("PDF downloaded successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to download PDF"
      );
    } finally {
      setDownloading(false);
    }
  };

  return { downloadPdf, downloading };
}
