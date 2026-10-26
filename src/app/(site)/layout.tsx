import "@/components/site/site.css";
import { Reveal } from "@/components/site/reveal";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* hidden motion states apply only when scripting runs */}
      <script
        dangerouslySetInnerHTML={{
          // .js turns on motion states; .seen skips the intro after the first page of a visit
          __html: "(function(d){d.classList.add('js');try{if(sessionStorage.getItem('jp-seen'))d.classList.add('seen');else sessionStorage.setItem('jp-seen','1')}catch(e){}})(document.documentElement)",
        }}
      />
      <div className="site min-h-screen">{children}</div>
      <Reveal />
    </>
  );
}
