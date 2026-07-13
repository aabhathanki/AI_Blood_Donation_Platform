import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HeartHandshake, Mail, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 bg-slate-50 dark:bg-slate-950/20 py-10">
      <Card variant="glass" className="w-full max-w-md">
        <CardHeader className="text-center pt-8 pb-4">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-md shadow-red-500/25 mb-3">
            <HeartHandshake className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-slate-400 dark:text-slate-500 font-semibold tracking-wide">
            Sign in to check matching donors, camps, and consult AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg p-3 text-xs font-bold leading-normal">
                ⚠️ {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-3"
                  required
                />
              </div>
              
              <div className="relative">
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-3"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-sm font-bold mt-2" loading={loading}>
              Sign In to Account
            </Button>
            
            {/* Quick credentials helper for seeder demo */}
            <div className="bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/40 rounded-xl p-3.5 mt-4 space-y-1.5">
              <h5 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Demo Credentials:</h5>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                <div>
                  <span className="block text-slate-400">Recipient/User:</span>
                  <span className="font-extrabold text-slate-700 dark:text-slate-350 select-all">recipient@blood.ai</span>
                </div>
                <div>
                  <span className="block text-slate-400">Donor:</span>
                  <span className="font-extrabold text-slate-700 dark:text-slate-350 select-all">rahul@blood.ai</span>
                </div>
                <div>
                  <span className="block text-slate-400">Hospital:</span>
                  <span className="font-extrabold text-slate-700 dark:text-slate-350 select-all">hospital@blood.ai</span>
                </div>
                <div>
                  <span className="block text-slate-400">All Passwords:</span>
                  <span className="font-extrabold text-slate-700 dark:text-slate-350 select-all">password123</span>
                </div>
              </div>
            </div>

            <div className="text-center text-xs text-slate-400 dark:text-slate-500 font-bold mt-4">
              Don't have an account?{" "}
              <Link to="/register" className="text-red-500 hover:underline">
                Create account &rarr;
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
export default LoginPage;
