import "@/components/site/site.css";
import { Reveal } from "@/components/site/reveal";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* hidden motion states apply only when scripting runs */}
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      <div className="site min-h-screen">{children}</div>
      <Reveal />
    </>
  );
}
