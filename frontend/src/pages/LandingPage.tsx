import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Search, HelpCircle, ShieldAlert, Award, Calendar, Phone, MapPin, Users } from "lucide-react";
import api from "../services/api";
import { Button } from "../components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
// Since the import above is referencing a backend path, let's copy the blood group matrix directly inside LandingPage to make it self-contained on the client side!
const LOCAL_BLOOD_COMPATIBILITY: Record<string, string[]> = {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"],
};

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedBG, setSelectedBG] = useState<string>("O-");
  const [direction, setDirection] = useState<"donate" | "receive">("donate");
  
  const [stats, setStats] = useState({
    activeRequests: 2,
    totalCamps: 2,
    livesSaved: 148,
  });

  const [activeRequests, setActiveRequests] = useState<any[]>([]);
  const [camps, setCamps] = useState<any[]>([]);
  const [campSearch, setCampSearch] = useState("");

  useEffect(() => {
    const fetchLandingData = async () => {
      try {
        const reqsRes = await api.get("/requests/active");
        setActiveRequests(reqsRes.data.slice(0, 3));
        
        const campsRes = await api.get("/camps");
        setCamps(campsRes.data.slice(0, 3));
        
        setStats({
          activeRequests: reqsRes.data.length,
          totalCamps: campsRes.data.length,
          livesSaved: 154,
        });
      } catch (err) {
        console.error("Failed to load landing page data:", err);
      }
    };
    fetchLandingData();
  }, []);

  // Compute matches for compatibility charts
  const getCompatibleGroups = () => {
    if (direction === "donate") {
      return LOCAL_BLOOD_COMPATIBILITY[selectedBG] || [];
    } else {
      // Find who can donate to selectedBG
      return Object.keys(LOCAL_BLOOD_COMPATIBILITY).filter((donor) =>
        LOCAL_BLOOD_COMPATIBILITY[donor].includes(selectedBG)
      );
    }
  };

  const compatibleBGs = getCompatibleGroups();

  const filteredCamps = camps.filter(c => 
    c.city.toLowerCase().includes(campSearch.toLowerCase()) ||
    c.name.toLowerCase().includes(campSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-red-600/10 via-transparent to-transparent">
        {/* Glow decoration */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center flex flex-col items-center gap-6">
          <Badge variant="destructive" className="px-4 py-1.5 text-xs tracking-wider uppercase font-extrabold bg-red-500/20 text-red-500 hover:bg-red-500/20">
            🩸 AI-Powered Emergency Lifeline
          </Badge>
          
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1] max-w-4xl">
            Connecting Blood Donors & Patients <span className="bg-gradient-to-r from-red-500 to-rose-600 bg-clip-text text-transparent">Instantly</span> using AI
          </h1>
          
          <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-2xl font-medium leading-relaxed">
            LifeFlow AI streamlines the donation process by matching donor profiles, calculating geographical travel, running eligibility screening checklists, and alerting matching local donors in real-time.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full sm:w-auto justify-center">
            <Button
              variant="danger"
              size="lg"
              onClick={() => navigate("/request-blood")}
              className="flex items-center gap-2 group"
            >
              <ShieldAlert className="h-5 w-5 animate-pulse" />
              Request Blood Urgently
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/register-donor")}
              className="flex items-center gap-2 border-slate-300 hover:border-red-500 dark:border-slate-800 dark:hover:border-red-500 bg-white dark:bg-slate-900"
            >
              <Heart className="h-5 w-5 text-red-500" />
              Register as Donor
            </Button>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
        
        {/* Statistics Panels */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="glass" className="hover:scale-[1.01] transition-transform duration-300">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Emergency Alerts</span>
                <h4 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-0.5">{stats.activeRequests}</h4>
              </div>
            </CardContent>
          </Card>
          
          <Card variant="glass" className="hover:scale-[1.01] transition-transform duration-300">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Upcoming Donation Camps</span>
                <h4 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-0.5">{stats.totalCamps}</h4>
              </div>
            </CardContent>
          </Card>
          
          <Card variant="glass" className="hover:scale-[1.01] transition-transform duration-300">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lives Saved Globally</span>
                <h4 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-0.5">{stats.livesSaved}+</h4>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Live Emergency Requests Banner */}
        {activeRequests.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                🚨 Active Emergency Requests in Bengaluru
              </h2>
              <Link to="/dashboard" className="text-xs font-bold text-red-500 hover:underline">
                View Control Center &rarr;
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {activeRequests.map((req) => (
                <Card key={req.id} variant="bordered" className="border-red-200/50 dark:border-red-950/30 hover:border-red-400/50 transition-colors duration-300 bg-red-500/[0.01] dark:bg-red-950/[0.02]">
                  <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/40 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold">{req.hospital_name}</CardTitle>
                      <CardDescription className="text-[10px]">{req.city}</CardDescription>
                    </div>
                    <Badge variant="destructive" className="h-6 shrink-0 bg-red-600">
                      {req.blood_group}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                    <div className="flex justify-between">
                      <span>Units Needed:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{req.units_required} Units</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Date Required:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{new Date(req.required_date).toLocaleDateString()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Urgency:</span>
                      <span className="text-red-500 font-extrabold uppercase tracking-wide">{req.urgency}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Dynamic Blood Group Compatibility Tool */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 p-6 sm:p-8 rounded-2xl shadow-sm">
          <div className="lg:col-span-5 space-y-4">
            <Badge variant="secondary" className="px-3 py-1 text-[10px] tracking-wider uppercase font-bold text-red-500 bg-red-500/10">
              Medical Reference
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white leading-tight">
              Interactive Blood Compatibility Calculator
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Understand blood group matching rules instantly. Choose a blood group and select whether you want to see who you can <strong>donate to</strong> or <strong>receive from</strong>.
            </p>
            
            {/* Toggle Button */}
            <div className="flex gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg w-fit">
              <Button
                variant={direction === "donate" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setDirection("donate")}
                className="h-8 text-xs font-bold rounded-md"
              >
                Can Donate To
              </Button>
              <Button
                variant={direction === "receive" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setDirection("receive")}
                className="h-8 text-xs font-bold rounded-md"
              >
                Can Receive From
              </Button>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Grid of Blood Groups for Selection */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Select Blood Group:</span>
              <div className="grid grid-cols-4 gap-2">
                {Object.keys(LOCAL_BLOOD_COMPATIBILITY).map((bg) => (
                  <button
                    key={bg}
                    onClick={() => setSelectedBG(bg)}
                    className={`h-11 rounded-lg font-extrabold text-sm border flex items-center justify-center transition-all ${
                      selectedBG === bg
                        ? "bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20"
                        : "bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Display */}
            <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800/40">
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                {direction === "donate" ? `Compatible Recipients for ${selectedBG}` : `Compatible Donors for ${selectedBG}`}
              </h4>
              <div className="flex flex-wrap gap-2">
                {compatibleBGs.map((bg) => (
                  <span
                    key={bg}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-black tracking-wide bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                  >
                    {bg}
                  </span>
                ))}
                {compatibleBGs.length === 0 && (
                  <span className="text-xs text-slate-400">No compatibility mapping found.</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold tracking-wide leading-normal mt-4">
                {selectedBG === "O-" && direction === "donate" && "💡 Universal Donor: O-Negative has no A, B, or Rh antigens on red cells, meaning it can be transfused to anyone safely in critical emergencies."}
                {selectedBG === "AB+" && direction === "receive" && "💡 Universal Recipient: AB-Positive has all primary antigens, making them compatible to receive red blood cells from any blood type."}
              </p>
            </div>
          </div>
        </section>

        {/* Camp Finder Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                📍 Upcoming Donation Drives & Camps
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold tracking-wide mt-0.5">
                Join a regional donation campaign organized by certified hospitals and NGOs near you.
              </p>
            </div>
            
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search camps by city..."
                value={campSearch}
                onChange={(e) => setCampSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800/80 text-xs focus:outline-none focus:border-red-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredCamps.map((camp) => (
              <Card key={camp.id} variant="bordered" className="hover:border-slate-350 dark:hover:border-slate-700 transition-all duration-300">
                <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 tracking-tight leading-snug truncate">
                        {camp.name}
                      </h4>
                      <Badge variant="outline">{camp.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-3 leading-relaxed font-semibold">
                      {camp.description}
                    </p>
                  </div>
                  
                  <div className="border-t border-slate-100 dark:border-slate-800/50 pt-3 space-y-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span className="truncate">{camp.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <span>{new Date(camp.date_time).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => navigate(`/camps`)}
                    className="w-full mt-1.5 h-9 text-xs font-bold"
                  >
                    View Details & Register
                  </Button>
                </CardContent>
              </Card>
            ))}
            
            {filteredCamps.length === 0 && (
              <div className="col-span-full py-10 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400 font-bold">No blood drives found.</p>
              </div>
            )}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-950 py-10 mt-20 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white">
              <Heart className="h-4 w-4 fill-white" />
            </div>
            <span className="font-bold text-slate-800 dark:text-white">LifeFlow AI</span>
          </div>
          
          <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold tracking-wide">
            &copy; 2026 LifeFlow AI. For educational and emergency coordination reference only.
          </p>
          
          <div className="flex gap-4 text-xs text-slate-400 dark:text-slate-500 font-bold">
            <a href="#" className="hover:text-red-500">Privacy Policy</a>
            <a href="#" className="hover:text-red-500">Terms of Service</a>
            <Link to="/ai-chat" className="hover:text-red-500">AI Medical FAQs</Link>
          </div>
        </div>
      </footer>

    </div>
  );
};
export default LandingPage;
