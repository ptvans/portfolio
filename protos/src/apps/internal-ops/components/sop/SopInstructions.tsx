// The SOP's instructions, on its page: the document as written. The agent
// runs a compiled copy of this text, but people only ever read the raw one.
// Prose is capped at 72ch, which in this font keeps lines under ~100
// characters at any window width.

import type { Sop } from "../../../../types/domain";
import { RichText } from "./SopText";

const paragraphs = (body: string) => body.split(/\n{2,}/).filter((p) => p.trim());

export function SopInstructions({ sop, className = "", bodyClassName = "" }: { sop: Sop; className?: string; bodyClassName?: string }) {
  return (
    <section aria-labelledby="sop-instructions" className={`flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-slate-200 px-4 py-3 md:px-5">
        <h2 id="sop-instructions" className="text-base font-semibold text-slate-900">
          Instructions
        </h2>
        <span className="text-xs text-slate-500">v{sop.version} · as written</span>
      </div>

      <div className={`min-h-0 px-4 py-4 md:px-5 ${bodyClassName}`}>
        <div className="max-w-[72ch] text-[15px] leading-[1.65] text-slate-700">
          {sop.blocks.map((block) => (
            <div key={block.id} className="mb-5 last:mb-0">
              <h3 className="mb-1 text-sm font-semibold text-slate-900">{block.heading}</h3>
              {paragraphs(block.body).map((p, i) => (
                <Paragraph key={i} text={p} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// A rule the agent learned shows as an annotation under the paragraph it
// amends ("+ Added by Stella, Jul 27: …").
function Paragraph({ text }: { text: string }) {
  const learned = text.match(/^\+\s*(Added by [^:]+):\s*([\s\S]*)$/);
  if (learned) {
    return (
      <p className="mb-3 border-l-2 border-brand-200 pl-3 text-slate-600 last:mb-0">
        <span className="mr-1 text-xs font-medium text-brand-700">{learned[1]}</span>
        <RichText text={learned[2]} />
      </p>
    );
  }
  return (
    <p className="mb-3 last:mb-0">
      <RichText text={text} />
    </p>
  );
}
