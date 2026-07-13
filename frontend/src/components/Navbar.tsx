import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sun, Moon, LogOut, User, HeartHandshake, Bot, Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Button } from "./ui/Button";

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/50 bg-white/70 backdrop-blur-md dark:border-slate-800/40 dark:bg-slate-950/70 transition-all duration-300">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        
        {/* Left: Brand/Logo */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-900 md:hidden text-slate-500 dark:text-slate-400"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform duration-200">
              <HeartHandshake className="h-5 w-5 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-white dark:to-slate-300">
              Life<span className="text-red-500">Flow</span> AI
            </span>
          </Link>
        </div>

        {/* Right: Actions and user status */}
        <div className="flex items-center gap-2.5">
          {/* AI Helper Quick Link */}
          <Link to="/ai-chat">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400"
              title="AI Assistant Chat"
            >
              <Bot className="h-5 w-5" />
            </Button>
          </Link>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            title="Toggle Dark/Light Mode"
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>

          {/* Notification Alert Icon (Pure aesthetic placeholder) */}
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white relative"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950 animate-pulse" />
            </Button>
          )}

          {/* Auth buttons or User Profile info */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3 dark:border-slate-800">
              {/* User profile dropdown button */}
              <div
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 text-red-500 font-bold text-xs ring-1 ring-red-500/20 group-hover:bg-red-500 group-hover:text-white transition-all duration-200">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-red-500 transition-colors duration-200 leading-3">
                    {user.full_name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                    {user.role.replace("_", " ")}
                  </span>
                </div>
              </div>
              
              {/* Logout button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="h-9 w-9 text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 ml-1"
                title="Log Out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 pl-1.5">
              <Link to="/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Sign Up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
export default Navbar;
