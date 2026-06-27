import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  PlusCircle,
  BarChart3,
  Tags,
  MessageSquareQuote,
  ChevronLeft,
  ChevronRight,
  Menu,
  MapPin,
} from "lucide-react";
import logo from "@/assets/kerala-police-logo.png";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/cases", label: "All Cases", icon: FolderOpen },
  { to: "/new-case", label: "Register Case", icon: PlusCircle },
  { to: "/analysis", label: "Analysis", icon: BarChart3 },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/locations", label: "Locations", icon: MapPin },
  { to: "/feedback", label: "Feedback", icon: MessageSquareQuote },
] as const;

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // null on SSR → avoids hydration mismatch (clock ticks only after mount)
  const [now, setNow] = useState<Date | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setNow(new Date()); // set immediately on mount
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside
        className={`${collapsed ? "w-[60px]" : "w-[240px]"} ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:static z-40 h-screen md:h-auto md:min-h-screen flex flex-col text-white transition-all duration-200`}
        style={{ background: "#0a1f44" }}
      >
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <img
            src={logo}
            alt="Kerala Police"
            className="w-9 h-9 rounded-full bg-white p-0.5 shrink-0"
          />
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-[15px] font-semibold leading-tight">Cybercrime Police</div>
              <div className="text-[11px] text-[#8192b0]">Palakkad Station</div>
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1">
          {nav.map((n) => {
            const active = isActive(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-[14px] transition-colors duration-150 relative ${
                  active
                    ? "bg-white/[0.08] text-white"
                    : "text-white/75 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r"
                    style={{ background: "#8b0000" }}
                  />
                )}
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span>{n.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden md:flex w-full items-center justify-center gap-2 text-[12px] text-white/60 hover:text-white py-1.5 rounded"
          >
            {collapsed ? (
              <ChevronRight size={14} />
            ) : (
              <>
                <ChevronLeft size={14} /> Collapse
              </>
            )}
          </button>
          {!collapsed && (
            <p className="text-[10px] text-white/40 text-center mt-2 leading-tight">
              Powered by Kerala Police
              <br />
              Cybercrime Police Station Palakkad
            </p>
          )}
        </div>
      </aside>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-black/40 z-30"
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 px-4 md:px-8 flex items-center justify-between border-b border-[#e0e4ed] bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 -ml-2 text-[#0a1f44]"
            >
              <Menu size={20} />
            </button>
            <img src={logo} alt="" className="w-8 h-8 hidden sm:block" />
            <div>
              <h2 className="text-[16px] font-semibold text-[#0a1f44] leading-tight">
                Cybercrime Police Station
              </h2>
              <p className="text-[12px] text-[#5a6478]">Palakkad</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[13px] font-medium text-[#0a1f44] tabular-nums">
              {now ? now.toLocaleTimeString("en-IN", { hour12: false }) : ""}
            </div>
            <div className="text-[11px] text-[#5a6478] mb-1">
              {now
                ? now.toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : ""}
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("auth");
                window.location.href = "/login";
              }}
              className="text-[11px] font-medium text-[#8b0000] hover:underline"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 page-fade">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
