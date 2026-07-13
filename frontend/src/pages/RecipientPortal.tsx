import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  MapPin,
  Clock,
  ThumbsUp,
  ExternalLink,
  Phone,
  Mail,
  AlertCircle,
  TrendingUp,
  Activity,
  ChevronRight
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Button } from "../components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Dialog } from "../components/ui/Dialog";
import StatusTimeline from "../components/ui/StatusTimeline";

export const RecipientPortal: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [hospitalsStock, setHospitalsStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selected Request Matches
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [recommendedDonors, setRecommendedDonors] = useState<any[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);

  // AI Emergency Routing Modal
  const [routingReq, setRoutingReq] = useState<any | null>(null);
  const [routingResults, setRoutingResults] = useState<any | null>(null);
  const [routingLoading, setRoutingLoading] = useState(false);

  const fetchRecipientData = async () => {
    setLoading(true);
    try {
      // 1. Fetch user's requests
      const reqRes = await api.get("/requests");
      setRequests(reqRes.data);

      // 2. Fetch public blood inventory aggregates
      const stockRes = await api.get("/inventory/public");
      // Map object { "O+": 10, ... } to array
      const mappedStock = Object.keys(stockRes.data).map((group) => ({
        group,
        units: stockRes.data[group]
      }));
      setHospitalsStock(mappedStock);
    } catch (err) {
      console.error("Recipient portal loader error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchRecipientData();
  }, [user]);

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

  const handleResolveRequest = async (reqId: number, newStatus: string) => {
    try {
      await api.patch(`/requests/${reqId}`, { status: newStatus });
      fetchRecipientData();
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  const triggerAIEmergencyRouting = async (req: any) => {
    setRoutingReq(req);
    setRoutingResults(null);
    setRoutingLoading(true);
    try {
      // Trigger AI consultation route via backend /ai/consult endpoint or query stock directly
      const msg = `Route emergency blood for group ${req.blood_group}`;
      const res = await api.post("/ai/consult", { message: msg });
      setRoutingResults(res.data.response);
    } catch (err) {
      console.error(err);
      setRoutingResults("No compatible active hospital stocks could be resolved by AI at this moment.");
    } finally {
      setRoutingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
      </div>
    );
  }

  return (
    <div className="py-6 px-4 space-y-8 max-w-7xl mx-auto animate-fade-in-up">
      {/* Welcome Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white tracking-tight">
            Recipient Portal
          </h2>
          <CardDescription className="text-xs font-semibold text-slate-400 mt-0.5">
            Lodge blood requests, track real-time fulfillment timelines, and invoke AI routing.
          </CardDescription>
        </div>
        <Link to="/request-blood">
          <Button className="flex items-center gap-1.5 h-10 text-xs font-bold bg-red-500 hover:bg-red-600 text-white">
            <ShieldAlert className="h-4.5 w-4.5" />
            Lodge Blood Request
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left main: User's blood requests list with workflow timeline */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Your Active Blood Requests Timeline
          </h3>

          <div className="space-y-4">
            {requests.map((req) => (
              <Card key={req.id} variant="bordered" className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={req.urgency === "emergency" ? "destructive" : "warning"}>
                        {req.urgency}
                      </Badge>
                      <Badge variant="outline">{req.status}</Badge>
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 mt-2">
                      Hospital: {req.hospital_name}
                    </h4>
                    <span className="text-[10px] text-slate-400 block font-semibold">
                      Required Date: {new Date(req.required_date).toLocaleDateString()} &bull; Required Units: {req.units_required}
                    </span>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-500 font-extrabold text-sm border border-red-500/20">
                    {req.blood_group}
                  </div>
                </div>

                {/* Workflow timeline component */}
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/40">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                     FULFILLMENT WORKFLOW PROGRESS
                  </span>
                  <StatusTimeline currentStatus={req.workflow_status || "created"} />
                </div>

                {/* Request Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                  {req.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleViewMatches(req)}
                        className="h-8 text-[11px] font-bold"
                      >
                        Match Donors
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => triggerAIEmergencyRouting(req)}
                        className="h-8 text-[11px] font-bold bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 border-0"
                      >
                        AI Emergency Route
                      </Button>
                    </>
                  )}
                  {req.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolveRequest(req.id, "fulfilled")}
                      className="h-8 text-[11px] font-bold hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/20 ml-auto"
                    >
                      Fulfill request
                    </Button>
                  )}
                </div>
              </Card>
            ))}

            {requests.length === 0 && (
              <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <ShieldAlert className="h-10 w-10 text-slate-355 mx-auto mb-2.5" />
                <p className="text-xs text-slate-400 font-bold">You have not raised any blood requests yet.</p>
                <Link to="/request-blood" className="text-xs text-red-500 font-extrabold hover:underline mt-1.5 inline-block">
                  Raise an urgent request now
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Global Blood Inventories available */}
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Partner Blood Inventory Stock
          </h3>

          <Card variant="glass" className="p-4 space-y-4">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">
              AGGREGATE AVAILABLE UNITS
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              {hospitalsStock.map((stock) => (
                <div
                  key={stock.group}
                  className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800/60 rounded-xl bg-white dark:bg-slate-900/40"
                >
                  <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                    {stock.group}
                  </span>
                  <Badge variant={stock.units < 5 ? "warning" : "success"}>
                    {stock.units} Units
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Matches Dialog */}
      <Dialog
        open={!!selectedReq}
        onClose={() => setSelectedReq(null)}
        title={selectedReq ? `Donor Matches: Request #${selectedReq.id} [${selectedReq.blood_group}]` : "Donor Matches"}
      >
        <div className="space-y-4">
          <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-lg text-xs leading-normal">
            👩‍⚕️ **AI Smart Recommendations**: Matches sorted by compatibility scores and physical geodistance.
          </div>
          {matchesLoading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500" />
            </div>
          ) : (
            <div className="space-y-3">
              {recommendedDonors.map((match) => (
                <div key={match.id} className="border p-3.5 rounded-xl bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40 flex justify-between items-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-red-500" />
                  <div className="pl-1">
                    <h4 className="font-bold text-xs text-slate-850 dark:text-slate-150">
                      {match.full_name}
                    </h4>
                    <span className="text-[10px] text-slate-400 block font-semibold mt-0.5">
                      📍 {match.distance_km} km away in {match.city}
                    </span>
                    <div className="flex gap-2 text-[10px] text-slate-500 font-bold pt-1">
                      <a href={`tel:${match.contact_info}`} className="flex items-center gap-1 text-red-500 hover:underline">
                        <Phone className="h-3 w-3" />
                        {match.contact_info}
                      </a>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Match Score</span>
                    <span className="text-sm font-black text-slate-800 dark:text-white">{match.score}%</span>
                  </div>
                </div>
              ))}

              {recommendedDonors.length === 0 && (
                <div className="text-center py-6 text-slate-400 font-bold text-xs">
                  No active matching donors found nearby.
                </div>
              )}
            </div>
          )}
        </div>
      </Dialog>

      {/* AI Emergency Routing Dialog */}
      <Dialog
        open={!!routingReq}
        onClose={() => setRoutingReq(null)}
        title="AI Emergency Routing Consultant"
      >
        <div className="space-y-4">
          <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg text-xs leading-normal">
            🚑 **AI Emergency Routing Advisor**: Recommends the fastest route to compatible blood units based on real-time inventory and logistics.
          </div>

          {routingLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider animate-pulse">Running Route Solver...</span>
            </div>
          ) : (
            <div className="bg-slate-900/5 dark:bg-slate-950/40 p-4 border rounded-xl whitespace-pre-line text-xs font-bold leading-relaxed text-slate-700 dark:text-slate-350 font-mono">
              {routingResults}
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
};
export default RecipientPortal;
