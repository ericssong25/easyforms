import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseServerMetadata } from "@/lib/tracking";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const submissionId = formData.get("submissionId") as string | null;
    const agentId = formData.get("agentId") as string | null;
    const signatureData = formData.get("signatureData") as string | null;

    if (!file || !submissionId || !agentId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const filePath = `${agentId}/${submissionId}/signed.pdf`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("signed_forms")
      .upload(filePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const { data: urlData } = await supabase.storage
      .from("signed_forms")
      .getPublicUrl(filePath);

    const pdfUrl = urlData.publicUrl;

    await supabase
      .from("form_submissions")
      .update({
        status: "signed",
        signed_pdf_url: pdfUrl,
        signature_data: signatureData,
        signed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    const meta = parseServerMetadata(
      request.headers.get("user-agent"),
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip")
    );

    await supabase.from("tracking_events").insert({
      submission_id: submissionId,
      event_type: "signed",
      ...meta,
    });

    return NextResponse.json({ url: pdfUrl });
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
