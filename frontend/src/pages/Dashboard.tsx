import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Heart,
  ShieldAlert,
  Calendar,
  UserCheck,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Phone,
  Mail,
  Bot,
  ThumbsUp,
  XCircle,
  Building2
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Button } from "../components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Dialog } from "../components/ui/Dialog";
import MapContainer from "../components/MapContainer";

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Unified lists
  const [requests, setRequests] = useState<any[]>([]);
  const [camps, setCamps] = useState<any[]>([]);
  const [unverifiedDonors, setUnverifiedDonors] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);

  // Selected Request Matches Dialog
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [recommendedDonors, setRecommendedDonors] = useState<any[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);

  // Donor toggle states
  const [donorProfile, setDonorProfile] = useState<any | null>(null);
  const [availability, setAvailability] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch camps — admins/hospitals get ALL (incl. pending_approval) via /camps/all
      const campsEndpoint =
        user?.role === "admin" || user?.role === "hospital_ngo"
          ? "/camps/all"
          : "/camps";
      const campsRes = await api.get(campsEndpoint);
      setCamps(campsRes.data);

      // 2. Fetch requests (role-based)
      const requestsRes = await api.get("/requests");
      setRequests(requestsRes.data);

      // 3. For donors, fetch their donor profile info
      if (user?.role === "donor") {
        try {
          const profileRes = await api.get("/donors/profile");
          setDonorProfile(profileRes.data);
          setAvailability(profileRes.data.availability);
        } catch (err) {
          // No profile yet
        }
      }

      // 4. For admins, fetch unverified donors to show moderation console
      if (user?.role === "admin" || user?.role === "hospital_ngo") {
        // Find unverified donors by querying all recommendation databases or custom filters
        // Let's seed / recommend compatible check or fetch all recommendations and filter unverified
        try {
          // Query recommendation list with dummy coords to get all donors
          const recsRes = await api.get("/donors/recommendations", {
            params: { blood_group: "O+", latitude: 12.9716, longitude: 77.5946, limit: 100 }
          });
          const unverified = recsRes.data.filter((d: any) => !d.is_verified);
          setUnverifiedDonors(unverified);
        } catch (err) {
          console.error(err);
        }
      }

      // 5. Gather map markers
      const markers: any[] = [];
      
      // Add camps
      campsRes.data.forEach((c: any) => {
        markers.push({
          id: c.id,
          latitude: c.latitude,
          longitude: c.longitude,
          title: c.name,
          subtitle: `Donation Camp - Date: ${new Date(c.date_time).toLocaleDateString()}`,
          type: "camp",
          details: c.address
        });
      });

      // Add pending requests
      const activeReqs = await api.get("/requests/active");
      activeReqs.data.forEach((r: any) => {
        markers.push({
          id: r.id,
          latitude: r.latitude,
          longitude: r.longitude,
          title: `${r.blood_group} Requested`,
          subtitle: `${r.units_required} Units required at ${r.hospital_name}`,
          type: "request",
          details: `Urgency: ${r.urgency.toUpperCase()}`
        });
      });

      setMapMarkers(markers);

    } catch (err) {
      console.error("Dashboard loader error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Handle donor profile availability toggle
  const handleToggleAvailability = async (checked: boolean) => {
    if (!donorProfile) return;
    setAvailability(checked);
    try {
      await api.post("/donors/profile", {
        blood_group: donorProfile.blood_group,
        weight: donorProfile.weight,
        age: donorProfile.age,
        medical_info: donorProfile.medical_info,
        last_donation_date: donorProfile.last_donation_date,
        availability: checked,
        city: donorProfile.city,
        latitude: donorProfile.latitude,
        longitude: donorProfile.longitude,
        contact_info: donorProfile.contact_info
      });
    } catch (err) {
      console.error("Failed to toggle availability:", err);
    }
  };

  // View recommended matches for a request
  const handleViewMatches = async (req: any) => {
    setSelectedReq(req);
    setRecommendedDonors([]);
    setMatchesLoading(true);
    try {
      const res = await api.get(`/requests/${req.id}/matches`);
      setRecommendedDonors(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setMatchesLoading(false);
    }
  };

  // Verify donor (Admin/Hospital)
  const handleVerifyDonor = async (donorId: number) => {
    try {
      await api.post(`/donors/${donorId}/verify`);
      setUnverifiedDonors((prev) => prev.filter((d) => d.id !== donorId));
      fetchDashboardData();
    } catch (err) {
      alert("Failed to verify donor profile.");
    }
  };

  // Resolve request status (fulfilled/cancelled/pending/pending_approval)
  const handleResolveRequest = async (reqId: number, newStatus: string) => {
    try {
      await api.patch(`/requests/${reqId}`, { status: newStatus });
      fetchDashboardData();
    } catch (err) {
      alert("Failed to resolve request.");
    }
  };

  // Approve or reject a camp (admin / hospital_ngo)
  const handleResolveCamp = async (campId: number, newStatus: string) => {
    try {
      await api.patch(`/camps/${campId}`, { status: newStatus });
      fetchDashboardData();
    } catch (err) {
      alert("Failed to update camp status.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
      </div>
    );
  }

  // Approval pending counts for admin banner
  const pendingRequestCount = requests.filter((r: any) => r.status === "pending_approval").length;
  const pendingCampCount = camps.filter((c: any) => c.status === "pending_approval").length;

  return (
    <div className="py-6 px-4 space-y-8 max-w-7xl mx-auto animate-fade-in-up">
      
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white tracking-tight">
            Control Center Dashboard
          </h2>
          <CardDescription className="text-xs text-slate-400 dark:text-slate-500 font-semibold tracking-wide mt-0.5">
            Role: <span className="text-red-500 font-extrabold uppercase">{user?.role.replace("_", " ")}</span> &bull; Account: {user?.email}
          </CardDescription>
        </div>
        
        {/* Quick action buttons */}
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link to="/ai-chat">
            <Button variant="outline" className="flex items-center gap-2 h-10 text-xs font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <Bot className="h-4.5 w-4.5 text-red-500" />
              Ask AI Assistant
            </Button>
          </Link>
          
          {user?.role === "recipient" && (
            <Link to="/request-blood">
              <Button className="flex items-center gap-2 h-10 text-xs font-bold">
                <ShieldAlert className="h-4.5 w-4.5" />
                Raise Urgent Request
              </Button>
            </Link>
          )}

          {user?.role === "donor" && !donorProfile && (
            <Link to="/register-donor">
              <Button className="flex items-center gap-2 h-10 text-xs font-bold">
                <Heart className="h-4.5 w-4.5 fill-white" />
                Create Donor Profile
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Admin / Hospital: Approval Action Required Banner */}
      {(user?.role === "admin" || user?.role === "hospital_ngo") && (pendingRequestCount > 0 || pendingCampCount > 0) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {pendingRequestCount > 0 && (
            <div className="flex items-center gap-3 flex-1 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                  {pendingRequestCount} Blood Request{pendingRequestCount > 1 ? "s" : ""} Awaiting Approval
                </p>
                <p className="text-[10px] text-slate-500 font-medium">Review in the Global Requests Ledger below.</p>
              </div>
            </div>
          )}
          {pendingCampCount > 0 && (
            <div className="flex items-center gap-3 flex-1 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
              <Building2 className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                  {pendingCampCount} Donation Camp{pendingCampCount > 1 ? "s" : ""} Awaiting Approval
                </p>
                <p className="text-[10px] text-slate-500 font-medium">Review in the Camp Approval Queue below.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Geolocation Map Center */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Real-time Donation Map
        </h3>
        <MapContainer markers={mapMarkers} height="400px" />
      </section>

      {/* Grid containing specific Role actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column (Requests & Drives) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* User's raised requests (Recipient / Hospital / Admin view) */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {user?.role === "admin" || user?.role === "hospital_ngo" ? "Global Blood Requests Ledger" : "Your Blood Requests"}
            </h3>
            
            <div className="space-y-3.5">
              {requests.map((req) => (
                <Card
                  key={req.id}
                  variant="bordered"
                  className={`transition-colors ${
                    req.status === "pending_approval"
                      ? "border-amber-500/30 bg-amber-500/[0.015] hover:border-amber-500/50"
                      : "hover:border-slate-350 dark:hover:border-slate-800"
                  }`}
                >
                  <CardContent className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={req.urgency === "emergency" ? "destructive" : "warning"}>
                          {req.urgency}
                        </Badge>
                        <Badge variant={req.status === "pending_approval" ? "warning" : "outline"}>
                          {req.status === "pending_approval" ? "Pending Approval" : req.status}
                        </Badge>
                      </div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        Hospital: {req.hospital_name}
                      </h4>
                      <span className="text-[10px] font-semibold text-slate-400 block leading-tight">
                        Required Date: {new Date(req.required_date).toLocaleDateString()} &bull; City: {req.city}
                      </span>
                      {/* Recipient-facing message for their own pending_approval requests */}
                      {req.status === "pending_approval" && user?.role === "recipient" && (
                        <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1 mt-0.5">
                          <AlertCircle className="h-3 w-3" />
                          Awaiting admin approval before going live on the platform.
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Blood group indicator */}
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-500 font-extrabold text-sm border border-red-500/20">
                        {req.blood_group}
                      </div>

                      <div className="flex flex-col gap-1">
                        {req.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => handleViewMatches(req)}
                            className="h-8 text-[11px] font-bold"
                          >
                            Find Matches
                          </Button>
                        )}

                        {/* Admin / Hospital: Approve or Reject pending_approval requests */}
                        {(user?.role === "admin" || user?.role === "hospital_ngo") && req.status === "pending_approval" && (
                          <div className="flex gap-1.5 mt-0.5">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleResolveRequest(req.id, "pending")}
                              className="h-7 px-2 text-[10px] font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 flex items-center gap-1"
                            >
                              <ThumbsUp className="h-3 w-3" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleResolveRequest(req.id, "cancelled")}
                              className="h-7 px-2 text-[10px] font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center gap-1"
                            >
                              <XCircle className="h-3 w-3" />
                              Reject
                            </Button>
                          </div>
                        )}

                        {/* Owner / Admin: Fulfill or Cancel active pending requests */}
                        {(user?.id === req.recipient_id || user?.role === "admin" || user?.role === "hospital_ngo") && req.status === "pending" && (
                          <div className="flex gap-1.5 mt-0.5">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleResolveRequest(req.id, "fulfilled")}
                              className="h-7 px-2 text-[10px] font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                            >
                              Fulfill
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleResolveRequest(req.id, "cancelled")}
                              className="h-7 px-2 text-[10px] font-bold bg-slate-200/50 text-slate-500 hover:bg-slate-200"
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {requests.length === 0 && (
                <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <ShieldAlert className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-450 font-bold">No active requests logged.</p>
                </div>
              )}
            </div>
          </section>

          {/* Camp Approvals Panel — Admin / Hospital only */}
          {(user?.role === "admin" || user?.role === "hospital_ngo") &&
            camps.some((c: any) => c.status === "pending_approval") && (
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Camp Approval Queue
              </h3>
              <div className="space-y-3">
                {camps
                  .filter((c: any) => c.status === "pending_approval")
                  .map((camp: any) => (
                    <Card key={camp.id} variant="bordered" className="border-amber-500/20 bg-amber-500/[0.02] p-4">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="warning">pending approval</Badge>
                          </div>
                          <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                            {camp.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-semibold block leading-tight">
                            {camp.address}, {camp.city} &bull; {new Date(camp.date_time).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => handleResolveCamp(camp.id, "upcoming")}
                            className="h-8 px-3 text-[11px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1.5"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleResolveCamp(camp.id, "cancelled")}
                            className="h-8 px-3 text-[11px] font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center gap-1.5"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            </section>
          )}

          {/* Regional camps (approved/upcoming only) */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Regional Donation Camps
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {camps
                .filter((c: any) => c.status !== "pending_approval")
                .map((camp: any) => (
                <Card key={camp.id} variant="bordered" className="p-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                        {camp.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-semibold block leading-tight mt-0.5">
                        {camp.address}, {camp.city}
                      </span>
                    </div>
                    <Badge variant="outline">{camp.status}</Badge>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800/50 pt-2.5 mt-3 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(camp.date_time).toLocaleDateString()}
                    </span>
                    <strong className="text-slate-800 dark:text-slate-200">{camp.registrations?.length || 0} Registered</strong>
                  </div>
                </Card>
              ))}
              
              {camps.filter((c: any) => c.status !== "pending_approval").length === 0 && (
                <div className="col-span-full p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-450 font-bold">No upcoming camps scheduled.</p>
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Right column (Moderation / Profiling) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* If Donor: Availability status widget */}
          {user?.role === "donor" && donorProfile && (
            <Card variant="glass" className="border-red-500/10 bg-red-500/[0.01]">
              <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800/40">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Heart className="h-4.5 w-4.5 text-red-500 fill-red-500 animate-pulse" />
                  Donor Registry Panel
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold uppercase">Blood Group:</span>
                  <Badge variant="destructive" className="font-extrabold text-sm bg-red-600">
                    {donorProfile.blood_group}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold uppercase">Verification Status:</span>
                  <Badge variant={donorProfile.is_verified ? "success" : "warning"}>
                    {donorProfile.is_verified ? "Verified Donor" : "Pending Verification"}
                  </Badge>
                </div>
                
                <div className="border-t border-slate-100 dark:border-slate-800/50 pt-4 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg">
                  <div className="flex flex-col text-left">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Live Availability Status
                    </label>
                    <span className="text-[9px] text-slate-400 leading-none mt-0.5">
                      Toggle whether you are ready to receive emergency alerts.
                    </span>
                  </div>
                  
                  <input
                    type="checkbox"
                    checked={availability}
                    onChange={(e) => handleToggleAvailability(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-350 text-red-600 focus:ring-red-500"
                  />
                </div>
                
                <Link to="/register-donor">
                  <Button variant="outline" className="w-full h-9 text-[11px] font-bold">
                    Edit Profile Credentials
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Admin Moderation Board: Verify Donor Profiles */}
          {(user?.role === "admin" || user?.role === "hospital_ngo") && unverifiedDonors.length > 0 && (
            <Card variant="glass" className="border-amber-500/10">
              <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800/40">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <UserCheck className="h-4.5 w-4.5 text-amber-500" />
                  Donor Moderation Console
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Confirm and verify registered donor credentials.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-3.5 max-h-[350px] overflow-y-auto">
                {unverifiedDonors.map((donor) => (
                  <div key={donor.id} className="flex justify-between items-center gap-2 border-b border-slate-100 dark:border-slate-800/50 pb-2.5">
                    <div className="text-left">
                      <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        {donor.full_name || donor.email}
                      </h5>
                      <span className="text-[10px] text-slate-400 block">
                        Blood: <strong className="text-red-500">{donor.blood_group}</strong> &bull; City: {donor.city}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleVerifyDonor(donor.id)}
                      className="h-7 text-[10px] font-bold bg-amber-500 hover:bg-amber-600"
                    >
                      Verify
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

        </div>

      </div>

      {/* Recommended matches overlays dialog pop-up */}
      <Dialog
        open={!!selectedReq}
        onClose={() => setSelectedReq(null)}
        title={selectedReq ? `Donor Matches: Request #${selectedReq.id} [${selectedReq.blood_group}]` : "Donor Matches"}
      >
        {matchesLoading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-lg text-xs leading-normal">
              👩‍⚕️ **AI Smart Recommendations**: These top matches are selected based on **blood compatibility**, shortest **geodistance**, **availability** status, and **verification validation**.
            </div>
            
            <div className="space-y-3">
              {recommendedDonors.map((match, idx) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between border border-slate-100 p-3.5 rounded-xl bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40 relative overflow-hidden"
                >
                  {/* Matching score bar graphic */}
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-red-500" />
                  
                  <div className="text-left space-y-1 pl-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        {match.full_name}
                      </h4>
                      {match.is_verified && (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1 rounded-md font-bold uppercase">
                          Verified
                        </span>
                      )}
                    </div>
                    
                    <span className="text-[10px] text-slate-400 block leading-tight font-medium">
                      📍 {match.distance_km} km away in {match.city}
                    </span>
                    
                    <div className="flex gap-2 text-[10px] text-slate-500 font-bold pt-1">
                      <a href={`tel:${match.contact_info}`} className="flex items-center gap-1 text-red-500 hover:underline">
                        <Phone className="h-3 w-3" />
                        {match.contact_info}
                      </a>
                      <a href={`mailto:${match.email}`} className="flex items-center gap-1 text-red-500 hover:underline">
                        <Mail className="h-3 w-3" />
                        {match.email}
                      </a>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                      Match Index
                    </div>
                    <div className="text-sm font-black text-slate-800 dark:text-slate-100">
                      {match.score}%
                    </div>
                  </div>
                </div>
              ))}

              {recommendedDonors.length === 0 && (
                <div className="p-8 text-center text-slate-400 font-bold">
                  No compatible matching donors found in nearby range.
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>

    </div>
  );
};
export default Dashboard;
