import { FormBuilder } from "@/components/forms/form-builder";

export default async function EditFormBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <FormBuilder templateId={id} />
    </div>
  );
}
