"use client";

import { useState, useEffect, useRef, useId } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from "@/components/ui/rich-text-editor";
import { DocumentSheet } from "@/components/document/document-sheet";
import { DEFAULT_LOGO, normalizeLogo, type TemplateLogo } from "@/lib/document-logo";
import { toast } from "sonner";
import {
  Eye,
  Save,
  ArrowLeft,
  Code2,
  Variable,
  Monitor,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const VARIABLE_SECTIONS: { title: string; variables: { label: string; token: string }[] }[] = [
  {
    title: "Client Fields",
    variables: [
      { label: "First Name", token: "{first_name}" },
      { label: "Last Name", token: "{last_name}" },
      { label: "Email", token: "{email}" },
      { label: "Phone", token: "{phone}" },
      { label: "Address", token: "{address}" },
      { label: "City", token: "{city}" },
      { label: "State", token: "{state}" },
      { label: "ZIP Code", token: "{zip}" },
      { label: "Date of Birth", token: "{date_of_birth}" },
      { label: "Subscriber Number", token: "{subscriber_number}" },
      { label: "Tax Filing Status", token: "{tax_filing_status}" },
      { label: "Marital Status", token: "{marital_status}" },
      { label: "Projected Annual Income", token: "{projected_annual_income}" },
      { label: "Tax Dependents Count", token: "{tax_dependents_count}" },
      { label: "Coverage Count", token: "{coverage_count}" },
    ],
  },
  {
    title: "Policy Fields",
    variables: [
      { label: "Policy Number", token: "{policy_number}" },
      { label: "Carrier", token: "{carrier}" },
      { label: "Plan", token: "{plan}" },
      { label: "Premium", token: "{premium}" },
      { label: "Effective Date", token: "{effective_date}" },
    ],
  },
  {
    title: "Agency Fields",
    variables: [
      { label: "Agency Name", token: "{agency_name}" },
      { label: "Agent NPN", token: "{npn}" },
      { label: "Agent Name", token: "{agent_name}" },
    ],
  },
  {
    title: "Form Fields",
    variables: [{ label: "Today's Date", token: "{today_date}" }],
  },
];

// Which sections are open by default on desktop.
// Client is the largest and most-used category, so we open it and
// collapse the rest to keep the panel short.
const DEFAULT_OPEN_SECTIONS = new Set<string>(["Client Fields"]);

interface FormBuilderProps {
  templateId?: string;
}

export function FormBuilder({ templateId }: FormBuilderProps) {
  const router = useRouter();
  const supabase = createClient();
  const editorRef = useRef<RichTextEditorHandle>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("<p></p>");
  const [logo, setLogo] = useState<TemplateLogo>(DEFAULT_LOGO);
  const [activeTab, setActiveTab] = useState("edit");
  const [saving, setSaving] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [showVarsMobile, setShowVarsMobile] = useState(false);
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    if (templateId) loadTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const loadTemplate = async () => {
    setLoadingTemplate(true);
    try {
      const { data: existingUser } = await supabase.auth.getUser();
      if (!existingUser.user) return;
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("id", templateId)
        .eq("agent_id", existingUser.user.id)
        .single();
      if (error) throw error;
      if (data) {
        setName(data.name);
        setContent(data.content || "<p></p>");
        setLogo(normalizeLogo(data.logo));
      }
    } catch {
      toast.error("Failed to load template");
    } finally {
      setLoadingTemplate(false);
    }
  };

  const insertVariable = (token: string) => {
    editorRef.current?.insertText(token);
  };

  const renderPreview = () => {
    const today = new Date().toLocaleDateString("en-US");
    return content.replace(/\{(\w+)\}/g, (_match: string, key: string) => {
      const varMap: Record<string, string> = {
        first_name: "John",
        last_name: "Smith",
        email: "john@email.com",
        phone: "555-0123",
        address: "123 Main Street",
        city: "New York",
        state: "NY",
        zip: "10001",
        date_of_birth: "01/15/1985",
        subscriber_number: "SUB-987654",
        tax_filing_status: "Single",
        marital_status: "Single",
        projected_annual_income: "$20,000",
        tax_dependents_count: "3",
        coverage_count: "3",
        policy_number: "POL-12345",
        carrier: "Blue Cross",
        plan: "Gold PPO",
        premium: "$250.00",
        effective_date: "01/01/2025",
        agency_name: "ABC Insurance",
        npn: "12345678",
        agent_name: "Jane Agent",
        today_date: today,
      };
      return varMap[key] ?? `[${key}]`;
    });
  };

  const performSave = async () => {
    setSaving(true);
    try {
      const { data: existingUser } = await supabase.auth.getUser();
      if (!existingUser.user) throw new Error("Not authenticated");

      const payload = {
        name: name.trim(),
        content: content.trim(),
        logo: logo && logo.dataUrl ? logo : null,
      };

      if (templateId) {
        const { error } = await supabase
          .from("templates")
          .update(payload)
          .eq("id", templateId)
          .eq("agent_id", existingUser.user.id);
        if (error) throw error;
        toast.success("Template updated");
      } else {
        const { error } = await supabase
          .from("templates")
          .insert({
            agent_id: existingUser.user.id,
            ...payload,
          })
          .select()
          .single();
        if (error) throw error;
        toast.success("Template created");
      }
      router.push("/dashboard/forms");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save template"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !content.trim() || content === "<p></p>") {
      toast.error("Please provide a name and content for the template");
      return;
    }
    if (overflow) {
      const ok = window.confirm(
        "Content exceeds one page. Save anyway?"
      );
      if (!ok) return;
    }
    await performSave();
  };

  if (loadingTemplate) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading template...</p>
      </div>
    );
  }

  const VariablesPanel = () => (
    <div className="divide-y divide-border">
      {VARIABLE_SECTIONS.map((section) => (
        <VariableSection
          key={section.title}
          title={section.title}
          variables={section.variables}
          defaultOpen={DEFAULT_OPEN_SECTIONS.has(section.title)}
          onInsert={insertVariable}
        />
      ))}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-4 sm:px-6 lg:px-8">
      {/* Mobile warning */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 lg:hidden">
        <p className="flex items-center gap-2 text-sm font-medium text-amber-800">
          <Monitor className="h-4 w-4 shrink-0" />
          Desktop recommended
        </p>
        <p className="mt-1 text-xs text-amber-700">
          The template editor works best on a computer. You can still create
          templates here, but the experience is optimized for larger screens.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/forms")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {templateId ? "Edit Template" : "New Template"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Design your form with the rich text editor
            </p>
          </div>
        </div>
        <Button
          variant="navy"
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Template"}
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="template-name">Template Name</Label>
        <Input
          id="template-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Health Insurance Application"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {/* Mobile variables toggle */}
          <div className="mb-2 lg:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVarsMobile(!showVarsMobile)}
            >
              <Variable className="mr-1 h-3 w-3" />
              {showVarsMobile ? "Hide Variables" : "Show Variables"}
            </Button>
            {showVarsMobile && (
              <Card className="mt-2 border-border">
                <CardContent className="p-3">
                  <VariablesPanel />
                </CardContent>
              </Card>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="edit">
                <Code2 className="mr-1 h-3 w-3" />
                Edit
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="mr-1 h-3 w-3" />
                Preview
              </TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="mt-4">
              <RichTextEditor
                ref={editorRef}
                content={content}
                onChange={setContent}
                logo={logo}
                onLogoChange={setLogo}
                onOverflowChange={setOverflow}
              />
            </TabsContent>
            <TabsContent value="preview" className="mt-4">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <DocumentSheet
                  html={renderPreview()}
                  logo={logo}
                  showSignatureZone
                  signatureLabel="Signature"
                  signatureMeta="Signature is added when the document is signed"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Desktop variables panel */}
        <Card className="hidden h-fit border-border lg:block">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Variable className="h-4 w-4" />
              Variables
            </CardTitle>
            <CardDescription>
              Click to insert at cursor position
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <VariablesPanel />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ----- Variable section (accordion-style collapsible) -----

function VariableSection({
  title,
  variables,
  defaultOpen,
  onInsert,
}: {
  title: string;
  variables: { label: string; token: string }[];
  defaultOpen: boolean;
  onInsert: (token: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const buttonId = useId();
  const panelId = useId();

  return (
    <div>
      <button
        id={buttonId}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          "flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors",
          "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        )}
      >
        <span>{title}</span>
        <span className="flex items-center gap-2">
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
            {variables.length}
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </span>
      </button>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className="grid gap-0.5 px-1.5 pb-2"
        >
          {variables.map((v) => (
            <button
              key={v.token}
              onClick={() => onInsert(v.token)}
              title={v.token}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
