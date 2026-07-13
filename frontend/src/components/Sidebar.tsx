import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Heart,
  CalendarDays,
  Bot,
  PlusCircle,
  ShieldCheck,
  UserCheck,
  Map,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cn } from "../utils/cn";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const getLinks = () => {
    if (!user) return [];

    const baseLinks = [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/camps", label: "Donation Camps", icon: CalendarDays },
      { to: "/ai-chat", label: "AI Health Assistant", icon: Bot },
    ];

    if (user.role === "recipient") {
      return [
        ...baseLinks,
        { to: "/recipient-portal", label: "Recipient Portal", icon: UserCheck },
        { to: "/request-blood", label: "Request Blood", icon: PlusCircle },
        { to: "/register-donor", label: "Become a Donor", icon: Heart },
      ];
    }

    if (user.role === "donor") {
      return [
        ...baseLinks,
        { to: "/donor-portal", label: "Donor Portal", icon: UserCheck },
        { to: "/register-donor", label: "Donor Profile", icon: Heart },
        { to: "/request-blood", label: "Request Blood", icon: PlusCircle },
      ];
    }

    if (user.role === "hospital_ngo") {
      return [
        ...baseLinks,
        { to: "/hospital-portal", label: "Hospital Portal", icon: ShieldCheck },
        { to: "/request-blood", label: "Raise Request", icon: PlusCircle },
      ];
    }

    if (user.role === "admin") {
      return [
        ...baseLinks,
        { to: "/admin-portal", label: "Admin Control", icon: ShieldCheck },
        { to: "/request-blood", label: "Manage Requests", icon: PlusCircle },
      ];
    }

    return baseLinks;
  };

  const links = getLinks();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed bottom-0 top-16 z-30 flex w-64 flex-col border-r border-slate-200 bg-white p-4 transition-transform duration-300 dark:border-slate-800/40 dark:bg-slate-950 md:sticky md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex-1 space-y-1.5 py-4">
          <span className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Menu Navigation
          </span>
          <nav className="flex flex-col gap-1 mt-2">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => onClose()}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-red-500/10 text-red-500 font-bold"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/60 dark:hover:text-white"
                    )
                  }
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Card inside Sidebar */}
        {user && (
          <div className="border-t border-slate-150 p-2 pt-4 dark:border-slate-800/50">
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/30">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/10 text-red-500 font-bold text-sm">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col text-left overflow-hidden">
                <span className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                  {user.full_name}
                </span>
                <span className="truncate text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">
                  {user.role.replace("_", " ")}
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
export default Sidebar;
