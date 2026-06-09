import { NextResponse } from "next/server";
import { getServiceRoleSupabase } from "@/lib/supabase/service";
import { parseServerMetadata } from "@/lib/tracking";

export const runtime = "nodejs";

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const submissionId = formData.get("submissionId") as string | null;
    const signatureData = formData.get("signatureData") as string | null;

    if (!file || !submissionId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    if (!UUID_LIKE.test(submissionId)) {
      return NextResponse.json(
        { error: "submissionId must be a UUID" },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: "Server is not configured" },
        { status: 500 }
      );
    }

    // Resolve the agent id from the submission row server-side. The
    // public signer does not (and should not) receive the agent id.
    const { data: sub, error: subErr } = await supabase
      .from("form_submissions")
      .select("id, agent_id, status")
      .eq("id", submissionId)
      .single();

    if (subErr || !sub) {
      console.error("[upload-signed-pdf] submission lookup failed:", subErr);
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }
    const agentId = sub.agent_id as string;

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
      console.error("[upload-signed-pdf] storage upload error:", uploadError);
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
      ip_address: meta.ip_address,
      user_agent: meta.user_agent,
      device_type: meta.device_type,
    });

    return NextResponse.json({ url: pdfUrl });
  } catch (error) {
    console.error("[upload-signed-pdf] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
