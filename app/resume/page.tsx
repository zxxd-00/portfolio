import type { Metadata } from "next";
import { hasResume } from "@/lib/materials";

export const metadata: Metadata = { title: "Resume" };

export default function ResumePage() {
  const available = hasResume();
  const href = "/materials/resume.pdf";

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-6 pt-16 sm:pt-24">
        <div>
          <h1 className="font-display text-[clamp(3rem,9vw,6.5rem)] text-forest">Resume</h1>
          <p className="mt-4 max-w-[50ch] text-lg">One page: education, Formula SAE, research and projects.</p>
        </div>
        {available && (
          <a
            href={href}
            download="Zaid-Adassi-Resume.pdf"
            className="inline-flex items-center gap-3 border-[1.5px] border-forest bg-forest px-5 py-3 font-medium text-paper transition-colors hover:border-ink hover:bg-ink"
          >
            <span aria-hidden className="h-4 w-2.5 border border-paper bg-blaze" />
            Download PDF
          </a>
        )}
      </header>

      {available ? (
        <object data={href} type="application/pdf" className="mt-12 hidden aspect-[8.5/11] w-full max-w-4xl border border-ink/25 md:block" aria-label="Resume preview">
          <p className="p-6">
            Your browser can&rsquo;t preview PDFs. <a className="link" href={href}>Open the resume</a>.
          </p>
        </object>
      ) : (
        <div className="unsurveyed mt-12 flex aspect-[8.5/11] w-full max-w-xl items-end border border-ink/25 p-5">
          <div className="bg-paper px-3 py-2">
            <p className="meta text-ink-soft">Resume · survey pending</p>
            {process.env.NODE_ENV === "development" && <p className="meta mt-1 text-blaze">Add materials/resume.pdf</p>}
          </div>
        </div>
      )}
    </div>
  );
}
