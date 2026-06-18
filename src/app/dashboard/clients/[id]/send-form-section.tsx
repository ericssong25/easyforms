"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Eye } from "lucide-react";

interface TemplateInfo {
  id: string;
  name: string;
  content: string;
}

interface SendFormSectionProps {
  clientId: string;
  templates: TemplateInfo[];
  clientData: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export function SendFormSection({
  clientId,
  templates,
}: SendFormSectionProps) {
  const router = useRouter();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const handleGeneratePreview = () => {
    if (!selectedTemplateId) return;
    router.push(
      `/dashboard/clients/${clientId}/preview/${selectedTemplateId}`
    );
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg">Send Form</CardTitle>
        <CardDescription>
          Select a template to preview and send to this client
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Form Template</Label>
          <Select
            value={selectedTemplateId}
            onValueChange={setSelectedTemplateId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a template..." />
            </SelectTrigger>
            <SelectContent>
              {templates.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No templates yet. Create one first.
                </p>
              ) : (
                templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {t.name}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="navy"
          className="w-full"
          disabled={!selectedTemplateId || templates.length === 0}
          onClick={handleGeneratePreview}
        >
          <Eye className="mr-2 h-4 w-4" />
          Generate & Preview
        </Button>
      </CardContent>
    </Card>
  );
}
