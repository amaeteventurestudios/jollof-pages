import { BarChart3, BookOpen, Feather, Flame, Images, Mail, Monitor, Moon, Settings2, Sun, Users } from "lucide-react";
import type { ThemeChoice } from "@/components/theme-toggle";

/** The Desk's sections, in menu order. `collaborator` ones are open to invited co-workers too. */
export const LINKS = [
  { href: "/desk", label: "Books", icon: BookOpen, exact: true, collaborator: true },
  { href: "/desk/authors", label: "Pen names", icon: Feather },
  { href: "/desk/progress", label: "Progress", icon: Flame },
  { href: "/desk/images", label: "My images", short: "Images", icon: Images },
  { href: "/desk/collaboration", label: "Collaboration", short: "Collab", icon: Users, collaborator: true },
  { href: "/desk/site", label: "Website", icon: Settings2 },
  { href: "/desk/readers", label: "Readers", icon: Mail },
  { href: "/desk/stats", label: "Analytics", short: "Stats", icon: BarChart3 },
];

export const THEMES: { id: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "Match my device", icon: Monitor },
];
