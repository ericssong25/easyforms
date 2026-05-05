"use client";

import { forwardRef, useImperativeHandle } from "react";
import { useEditor, EditorContent, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import FontFamily from "@tiptap/extension-font-family";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
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
  Image as ImageIcon,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  Plus,
  Minus,
  WrapText,
} from "lucide-react";

const FONTS = [
  { label: "Default", value: "Inter, sans-serif" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "Courier New, monospace" },
  { label: "DM Sans", value: "'DM Sans', sans-serif" },
];

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
        types: ["paragraph", "heading"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) =>
              element.style.lineHeight?.replace(/['"]+/g, ""),
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
          if (lineHeight === null) {
            commands.updateAttributes("paragraph", { lineHeight: null });
            commands.updateAttributes("heading", { lineHeight: null });
            return true;
          }
          commands.updateAttributes("paragraph", { lineHeight });
          commands.updateAttributes("heading", { lineHeight });
          return true;
        },
    };
  },
});

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export interface RichTextEditorHandle {
  insertText: (text: string) => void;
  focus: () => void;
}

export const RichTextEditor = forwardRef<
  RichTextEditorHandle,
  RichTextEditorProps
>(function RichTextEditor({ content, onChange }, ref) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      FontFamily,
      Image.configure({ inline: true, allowBase64: true }),
      Underline,
      FontSize,
      LineHeight,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-slate-blue underline" },
      }),
      Highlight.configure({ multicolor: true }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-[210mm] mx-auto min-h-[400px] px-6 py-4 outline-none focus:outline-none leading-snug bg-white",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  useImperativeHandle(ref, () => ({
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
  }));

  const addImage = () => {
    if (!editor) return;
    const url = window.prompt("Image URL:");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL:", previousUrl);
    if (url === null) return;
    if (url === "")
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const getCurrentFontSize = (): number => {
    if (!editor) return 16;
    const attrs = editor.getAttributes("textStyle");
    const size = attrs.fontSize ? parseInt(attrs.fontSize as string, 10) : NaN;
    return isNaN(size) ? 16 : size;
  };

  const changeFontSize = (delta: number) => {
    if (!editor) return;
    const current = getCurrentFontSize();
    const newSize = Math.max(8, Math.min(72, current + delta));
    editor.chain().focus().setFontSize(`${newSize}px`).run();
  };

  const getCurrentLineHeight = (): number => {
    if (!editor) return 1.5;
    const attrs = editor.getAttributes("paragraph");
    const lh = attrs.lineHeight ? parseFloat(attrs.lineHeight as string) : NaN;
    return isNaN(lh) ? 1.5 : lh;
  };

  const changeLineHeight = (delta: number) => {
    if (!editor) return;
    const current = getCurrentLineHeight();
    const newLh = Math.max(0.8, Math.min(3, current + delta));
    const rounded = Math.round(newLh * 10) / 10;
    editor.chain().focus().setLineHeight(String(rounded)).run();
  };

  if (!editor) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-muted-foreground">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 px-3 py-2">
        {/* Font Family */}
        <select
          onChange={(e) =>
            editor.chain().focus().setFontFamily(e.target.value || "").run()
          }
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-ring"
          defaultValue=""
        >
          <option value="">Font</option>
          {FONTS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <div className="mx-1 h-5 w-px bg-slate-200" />

        {/* Font Size */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => changeFontSize(-2)}
          title="Decrease font size"
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="flex h-8 w-8 items-center justify-center text-xs font-medium tabular-nums text-slate-600">
          {getCurrentFontSize()}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => changeFontSize(2)}
          title="Increase font size"
        >
          <Plus className="h-3 w-3" />
        </Button>

        <div className="mx-1 h-5 w-px bg-slate-200" />

        {/* Line Height */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => changeLineHeight(-0.1)}
          title="Decrease line height"
        >
          <WrapText className="h-3 w-3" />
        </Button>
        <span className="flex h-8 w-8 items-center justify-center text-xs font-medium tabular-nums text-slate-600">
          {getCurrentLineHeight().toFixed(1)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => changeLineHeight(0.1)}
          title="Increase line height"
        >
          <Plus className="h-3 w-3" />
        </Button>

        <div className="mx-1 h-5 w-px bg-slate-200" />

        {/* Heading levels */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            editor.isActive("heading", { level: 1 }) && "bg-slate-100"
          )}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            editor.isActive("heading", { level: 2 }) && "bg-slate-100"
          )}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            editor.isActive("heading", { level: 3 }) && "bg-slate-100"
          )}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>

        <div className="mx-1 h-5 w-px bg-slate-200" />

        {/* Inline formatting */}
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", editor.isActive("bold") && "bg-slate-100")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", editor.isActive("italic") && "bg-slate-100")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            editor.isActive("underline") && "bg-slate-100"
          )}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", editor.isActive("strike") && "bg-slate-100")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            editor.isActive("highlight") && "bg-slate-100"
          )}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          title="Highlight"
        >
          <Highlighter className="h-4 w-4" />
        </Button>

        <div className="mx-1 h-5 w-px bg-slate-200" />

        {/* Alignment */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            editor.isActive({ textAlign: "left" }) && "bg-slate-100"
          )}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            editor.isActive({ textAlign: "center" }) && "bg-slate-100"
          )}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            editor.isActive({ textAlign: "right" }) && "bg-slate-100"
          )}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <div className="mx-1 h-5 w-px bg-slate-200" />

        {/* Bullet & Ordered Lists */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            editor.isActive("bulletList") && "bg-slate-100"
          )}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            editor.isActive("orderedList") && "bg-slate-100"
          )}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="mx-1 h-5 w-px bg-slate-200" />

        {/* Link & Image */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            editor.isActive("link") && "bg-slate-100"
          )}
          onClick={setLink}
          title="Insert Link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={addImage}
          title="Insert Image"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>

        <div className="mx-1 h-5 w-px bg-slate-200" />

        {/* Undo / Redo */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
});
