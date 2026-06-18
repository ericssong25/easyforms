"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, FileText, Pencil, ArrowRight } from "lucide-react";

interface Template {
  id: string;
  name: string;
  created_at: string;
}

export function TemplatesGrid({ templates }: { templates: Template[] }) {
  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card/30 px-6 py-14 sm:py-20">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <FileText className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-base font-semibold text-foreground sm:text-lg">
          No templates yet
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first form template
        </p>
        <Link href="/dashboard/forms/builder" className="mt-5">
          <Button variant="navy">
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template, idx) => (
        <motion.div
          key={template.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.3,
            ease: "easeOut",
            delay: Math.min(idx, 12) * 0.04,
          }}
        >
          <Card className="group h-full border-border transition-all hover:border-primary/40 hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate text-base text-foreground">
                    {template.name}
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Created {new Date(template.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-2">
                <Link href={`/dashboard/forms/builder/${template.id}`}>
                  <Button variant="outline" size="sm">
                    <Pencil className="mr-1.5 h-3 w-3" />
                    Edit
                  </Button>
                </Link>
                <Link
                  href={`/dashboard/forms/builder/${template.id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100"
                >
                  Open
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
