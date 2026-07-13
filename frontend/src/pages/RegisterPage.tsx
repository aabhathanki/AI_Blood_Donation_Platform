import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HeartHandshake } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";

export const RegisterPage: React.FC = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("recipient"); // Default

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !role) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await signup(email, fullName, password, role);
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
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
            Create Account
          </CardTitle>
          <CardDescription className="text-slate-400 dark:text-slate-500 font-semibold tracking-wide">
            Register to join our real-time blood contribution network.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg p-3 text-xs font-bold leading-normal">
                ⚠️ {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg p-3 text-xs font-bold leading-normal">
                🎉 Account created! Redirecting to Sign In...
              </div>
            )}

            <div className="space-y-3.5">
              <Input
                label="Full Name"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              
              <Input
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              
              <Input
                label="Password"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              {/* Role select */}
              <div className="w-full flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                  I Want To:
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="flex w-full rounded-lg border border-slate-200 bg-white/50 px-3.5 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-200"
                >
                  <option value="recipient">Find Blood (Recipient)</option>
                  <option value="donor">Donate Blood (Donor Profile Setup)</option>
                  <option value="hospital_ngo">Represent Hospital / NGO</option>
                </select>
                <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                  *Donors will be asked to fill in their medical details and location coordinate profiles in the next step.
                </p>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-sm font-bold mt-2" loading={loading}>
              Create New Account
            </Button>

            <div className="text-center text-xs text-slate-400 dark:text-slate-500 font-bold mt-4">
              Already have an account?{" "}
              <Link to="/login" className="text-red-500 hover:underline">
                Sign In &rarr;
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
export default RegisterPage;
