/** Re-mounts on every navigation, so each page arrives with a short rise. */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
