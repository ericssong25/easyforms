"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { EditorContent, Extension, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import FontFamily from "@tiptap/extension-font-family";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Link from "@tiptap/extension-link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  Plus,
  Minus,
  Eraser,
  AlertTriangle,
} from "lucide-react";
import {
  PAGE_PX,
  MARGINS,
  CONTENT_WIDTH,
  EDITABLE_HEIGHT,
} from "@/lib/document-format";
import { DOCUMENT_CSS } from "@/lib/document-styles";
import {
  DEFAULT_LOGO,
  LOGO_PRESETS,
  LOGO_SIZE_MAX,
  LOGO_SIZE_MIN,
  hasLogo,
  normalizeLogo,
  type TemplateLogo,
} from "@/lib/document-logo";

// ---- Editor extensions (kept local to this file so the editor is self-contained) ----

const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize?.replace(/['"]+/g, ""),
        renderHTML: (attributes) => {
          if (!attributes.fontSize) return {};
          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
    };
  },
  addCommands() {
    return {
      ...this.parent?.(),
      setFontSize:
        (fontSize: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

const LineHeight = Extension.create({
  name: "lineHeight",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "listItem"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight?.replace(/['"]+/g, ""),
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string | null) =>
        ({ commands }) => {
          const types = ["paragraph", "heading", "listItem"] as const;
          for (const t of types) {
            commands.updateAttributes(t, { lineHeight });
          }
          return true;
        },
    };
  },
});

const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
  { label: "Georgia", value: "Georgia, 'Times New Roman', serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "DM Sans", value: "'DM Sans', system-ui, sans-serif" },
];

// ---- Component ----

export interface RichTextEditorHandle {
  insertText: (text: string) => void;
  focus: () => void;
}

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  logo?: TemplateLogo | null;
  onLogoChange?: (logo: TemplateLogo) => void;
  onOverflowChange?: (overflow: boolean) => void;
}

export const RichTextEditor = forwardRef<
  RichTextEditorHandle,
  RichTextEditorProps
>(function RichTextEditor(
  { content, onChange, logo, onLogoChange, onOverflowChange },
  ref
) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      FontFamily,
      Underline,
      FontSize,
      LineHeight,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "ef-doc-link" },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "ef-document",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  // Live overflow detection. We measure the body height against the
  // EDITABLE_HEIGHT we have reserved. ResizeObserver catches reflows that
  // happen without an onUpdate (e.g. font swaps, image loads).
  const editableRef = useRef<HTMLDivElement | null>(null);
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    if (!editableRef.current || !editor) return;
    const el = editableRef.current;
    const check = () => {
      // Subtract the body's vertical position inside the container so we
      // measure the content rect itself, not including any top padding.
      const contentHeight = el.scrollHeight;
      const isOverflow = contentHeight > EDITABLE_HEIGHT + 1;
      setOverflow(isOverflow);
      onOverflowChange?.(isOverflow);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    editor.on("update", check);
    return () => {
      ro.disconnect();
      editor.off("update", check);
    };
  }, [editor, onOverflowChange]);

  const safeLogo = normalizeLogo(logo ?? DEFAULT_LOGO);

  useImperativeHandle(
    ref,
    () => ({
      insertText: (text: string) => {
        if (!editor) return;
        const { from, empty } = editor.state.selection;
        if (!empty) {
          editor.chain().focus().deleteSelection().insertContent(text).run();
        } else {
          const textBefore = editor.state.doc.textBetween(
            Math.max(0, from - 1),
            from
          );
          const prefix = textBefore && textBefore !== " " ? " " : "";
          editor.chain().focus().insertContent(prefix + text).run();
        }
        editor.commands.focus();
      },
      focus: () => editor?.commands.focus(),
    }),
    [editor]
  );

  if (!editor) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-16 text-sm text-muted-foreground">
        Loading editor...
      </div>
    );
  }

  // --- toolbar handlers ---

  const getCurrentFontSize = (): number => {
    const attrs = editor.getAttributes("textStyle");
    const size = attrs.fontSize ? parseInt(attrs.fontSize as string, 10) : NaN;
    return isNaN(size) ? 12 : size;
  };
  const changeFontSize = (delta: number) => {
    const current = getCurrentFontSize();
    const newSize = Math.max(8, Math.min(72, current + delta));
    editor.chain().focus().setFontSize(`${newSize}pt`).run();
  };

  const getCurrentLineHeight = (): number => {
    const attrs = editor.getAttributes("paragraph");
    const lh = attrs.lineHeight ? parseFloat(attrs.lineHeight as string) : NaN;
    return isNaN(lh) ? 1.5 : lh;
  };
  const changeLineHeight = (delta: number) => {
    const current = getCurrentLineHeight();
    const newLh = Math.max(0.8, Math.min(3, current + delta));
    const rounded = Math.round(newLh * 10) / 10;
    editor.chain().focus().setLineHeight(String(rounded)).run();
  };

  const getCurrentFontFamily = (): string => {
    const attrs = editor.getAttributes("textStyle");
    return (attrs.fontFamily as string) || "";
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL (leave empty to remove):", previousUrl ?? "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  const clearFormatting = () => {
    editor.chain().focus().clearNodes().unsetAllMarks().run();
  };

  const updateLogo = (patch: Partial<TemplateLogo>) => {
    onLogoChange?.({ ...safeLogo, ...patch });
  };

  const uploadLogoFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateLogo({ dataUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-3">
      {onLogoChange && (
        <LogoPanel
          logo={safeLogo}
          onChange={(patch) => onLogoChange({ ...safeLogo, ...patch })}
          onUpload={uploadLogoFile}
        />
      )}

      {overflow && (
        <div
          className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="font-medium">Content exceeds one page.</p>
            <p className="text-xs text-amber-800/80">
              Reduce content, font size, or line height so it fits the single
              Letter sheet.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        <Toolbar
          editor={editor}
          currentFontSize={getCurrentFontSize()}
          currentLineHeight={getCurrentLineHeight()}
          currentFontFamily={getCurrentFontFamily()}
          onFontSizeDelta={changeFontSize}
          onLineHeightDelta={changeLineHeight}
          onSetLink={setLink}
          onClearFormatting={clearFormatting}
        />

        {/* Paper sheet (light gray "desk", centered sheet with shadow) */}
        <div
          className="flex justify-center overflow-auto bg-slate-100 py-6"
          style={{ maxHeight: "calc(100vh - 280px)" }}
        >
          <div
            className="ef-document relative bg-white shadow-[0_2px_12px_rgba(15,23,42,0.12)]"
            style={{
              width: PAGE_PX.width,
              minHeight: PAGE_PX.height,
              paddingTop: MARGINS.top,
              paddingRight: MARGINS.right,
              paddingBottom: MARGINS.bottom,
              paddingLeft: MARGINS.left,
            }}
          >
            <DocumentStyleTag />

            {hasLogo(safeLogo) && (
              <div
                className="ef-logo"
                data-pos={safeLogo.position}
                style={
                  {
                    "--ef-logo-w": `${safeLogo.size}px`,
                    "--ef-logo-max-w": `${Math.min(safeLogo.size, 240)}px`,
                  } as React.CSSProperties
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={safeLogo.dataUrl!} alt="Document logo" />
              </div>
            )}

            <div
              className="relative"
              style={{ minHeight: EDITABLE_HEIGHT, zIndex: 1 }}
            >
              <div
                ref={editableRef}
                className="ef-document-content relative"
                style={{
                  minHeight: EDITABLE_HEIGHT,
                  width: CONTENT_WIDTH,
                }}
              >
                <EditorContent editor={editor} />
              </div>
              {overflow && <OverflowLimitLine />}
            </div>

            <div className="ef-signature-zone" aria-hidden>
              <div className="ef-signature-label">— Signature —</div>
              <div className="ef-signature-meta">
                Signature is added at the bottom of the page when the document
                is signed.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// ----- Toolbar (extracted) -----

function Toolbar(props: {
  editor: NonNullable<ReturnType<typeof useEditor>>;
  currentFontSize: number;
  currentLineHeight: number;
  currentFontFamily: string;
  onFontSizeDelta: (delta: number) => void;
  onLineHeightDelta: (delta: number) => void;
  onSetLink: () => void;
  onClearFormatting: () => void;
}) {
  const {
    editor,
    currentFontSize,
    currentLineHeight,
    currentFontFamily,
    onFontSizeDelta,
    onLineHeightDelta,
    onSetLink,
  } = props;

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
      {/* Font family */}
      <select
        value={currentFontFamily}
        onChange={(e) =>
          editor.chain().focus().setFontFamily(e.target.value || "").run()
        }
        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-ring"
        title="Font family"
      >
        <option value="">Default font</option>
        {FONT_OPTIONS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <Sep />

      <Btn title="Decrease font size" onClick={() => onFontSizeDelta(-1)}>
        <Minus className="h-3 w-3" />
      </Btn>
      <span className="flex h-8 w-9 items-center justify-center text-xs font-medium tabular-nums text-slate-600">
        {currentFontSize}
      </span>
      <Btn title="Increase font size" onClick={() => onFontSizeDelta(1)}>
        <Plus className="h-3 w-3" />
      </Btn>

      <Sep />

      <Btn title="Decrease line height" onClick={() => onLineHeightDelta(-0.1)}>
        <span className="text-[10px] font-semibold">−</span>
      </Btn>
      <span className="flex h-8 w-9 items-center justify-center text-xs font-medium tabular-nums text-slate-600">
        {currentLineHeight.toFixed(1)}
      </span>
      <Btn title="Increase line height" onClick={() => onLineHeightDelta(0.1)}>
        <span className="text-[10px] font-semibold">+</span>
      </Btn>

      <Sep />

      <Btn
        title="Heading 1"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="h-4 w-4" />
      </Btn>
      <Btn
        title="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </Btn>
      <Btn
        title="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-4 w-4" />
      </Btn>

      <Sep />

      <Btn
        title="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </Btn>
      <Btn
        title="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </Btn>
      <Btn
        title="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-4 w-4" />
      </Btn>
      <Btn
        title="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </Btn>
      <Btn title="Clear formatting" onClick={props.onClearFormatting}>
        <Eraser className="h-4 w-4" />
      </Btn>

      <Sep />

      <Btn
        title="Align left"
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="h-4 w-4" />
      </Btn>
      <Btn
        title="Align center"
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="h-4 w-4" />
      </Btn>
      <Btn
        title="Align right"
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="h-4 w-4" />
      </Btn>

      <Sep />

      <Btn
        title="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </Btn>
      <Btn
        title="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </Btn>

      <Sep />

      <Btn
        title="Insert / edit link"
        active={editor.isActive("link")}
        onClick={onSetLink}
      >
        <LinkIcon className="h-4 w-4" />
      </Btn>

      <Sep />

      <Btn
        title="Undo"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="h-4 w-4" />
      </Btn>
      <Btn
        title="Redo"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="h-4 w-4" />
      </Btn>
    </div>
  );
}

function Sep() {
  return <div className="mx-1 h-5 w-px bg-slate-200" />;
}

function Btn({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", active && "bg-slate-200 text-slate-900")}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      {children}
    </Button>
  );
}

// ----- Logo panel -----

function LogoPanel({
  logo,
  onChange,
  onUpload,
}: {
  logo: TemplateLogo;
  onChange: (patch: Partial<TemplateLogo>) => void;
  onUpload: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-700">Logo</span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
        >
          {hasLogo(logo) ? "Replace" : "Upload"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = "";
          }}
        />

        {hasLogo(logo) && (
          <>
            <div className="mx-1 h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onChange({ position: "left" })}
                className={cn(
                  "rounded-md px-2 py-1 text-xs",
                  logo.position === "left"
                    ? "bg-slate-200 text-slate-900"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                Top-left
              </button>
              <button
                type="button"
                onClick={() => onChange({ position: "right" })}
                className={cn(
                  "rounded-md px-2 py-1 text-xs",
                  logo.position === "right"
                    ? "bg-slate-200 text-slate-900"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                Top-right
              </button>
            </div>

            <div className="mx-1 h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-1">
              {LOGO_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => onChange({ size: p.size })}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs",
                    logo.size === p.size
                      ? "bg-slate-200 text-slate-900"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="mx-1 h-5 w-px bg-slate-200" />
            <input
              type="range"
              min={LOGO_SIZE_MIN}
              max={LOGO_SIZE_MAX}
              value={logo.size}
              onChange={(e) => onChange({ size: Number(e.target.value) })}
              className="h-2 w-24 cursor-pointer accent-navy"
              title={`Logo width: ${logo.size}px`}
            />
            <span className="w-10 text-right text-xs tabular-nums text-slate-500">
              {logo.size}px
            </span>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange({ dataUrl: null })}
              className="text-slate-500"
            >
              Remove
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ----- Style tag (scoped) -----

function DocumentStyleTag() {
  // We inject a per-instance <style> tag with the document CSS. This keeps
  // the rules inside the .ef-document scope and avoids a global CSS file.
  return (
    <style
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: scopeDocumentCss(DOCUMENT_CSS) }}
    />
  );
}

function scopeDocumentCss(css: string): string {
  // document-styles.ts already scopes everything under .ef-document and
  // uses a :root {} block for custom properties. We must keep that :root
  // rule at the document level so the CSS variables resolve.
  return css;
}

// ----- Overflow marker -----

function OverflowLimitLine() {
  // Red dashed limit line drawn across the sheet at the bottom edge of
  // the editable area. We use a fixed position from the top of the sheet
  // (not the editable div), so the line is correct even when the content
  // has already pushed past the bottom of the sheet.
  return (
    <div
      aria-hidden
      className="ef-overflow-line pointer-events-none absolute left-0 right-0 z-30"
      style={{ top: MARGINS.top + EDITABLE_HEIGHT }}
    >
      <div
        className="h-0 w-full"
        style={{
          borderTop: "2px dashed #ef4444",
        }}
      />
      <div
        className="-mt-px w-full"
        style={{
          height: "9999px",
          background:
            "repeating-linear-gradient(-45deg, rgba(239,68,68,0.08) 0, rgba(239,68,68,0.08) 8px, rgba(239,68,68,0.16) 8px, rgba(239,68,68,0.16) 16px)",
        }}
      />
    </div>
  );
}
