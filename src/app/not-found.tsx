import "@/components/site/site.css";
import SiteNotFound from "./(site)/not-found";

/** Unknown addresses outside the site's own routes get the same page as a missing book. */
export default function NotFound() {
  return (
    <div className="site min-h-screen">
      <SiteNotFound />
    </div>
  );
}
