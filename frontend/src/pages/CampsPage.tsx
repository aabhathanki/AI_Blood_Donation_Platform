import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Plus, Check, Clock, ShieldAlert, Award } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Dialog } from "../components/ui/Dialog";

export const CampsPage: React.FC = () => {
  const { user } = useAuth();
  const [camps, setCamps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Camp Creation States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("Bangalore");
  const [address, setAddress] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [latitude, setLatitude] = useState("12.9716");
  const [longitude, setLongitude] = useState("77.5946");
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchCamps = async () => {
    setLoading(true);
    try {
      const res = await api.get("/camps/all");
      setCamps(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to retrieve donation camps.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCamps();
  }, []);

  const handleRegister = async (campId: number, isRegistered: boolean) => {
    try {
      if (isRegistered) {
        await api.post(`/camps/${campId}/unregister`);
      } else {
        await api.post(`/camps/${campId}/register`);
      }
      fetchCamps(); // Reload updated registration data
    } catch (err: any) {
      alert(err.response?.data?.detail || "Action failed.");
    }
  };

  const handleCreateCamp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address || !dateTime || !latitude || !longitude) {
      alert("Please fill in all fields.");
      return;
    }

    setSubmitLoading(true);
    try {
      await api.post("/camps/", {
        name,
        description: description || null,
        city,
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        date_time: dateTime,
      });
      setIsCreateOpen(false);
      setName("");
      setDescription("");
      setAddress("");
      setDateTime("");
      fetchCamps();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to organize camp.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const isUserRegistered = (camp: any) => {
    if (!user) return false;
    return camp.registrations.some((r: any) => r.donor_id === user.id);
  };

  const canOrganize = user?.role === "hospital_ngo" || user?.role === "admin";

  return (
    <div className="py-6 px-4 space-y-6 max-w-6xl mx-auto">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200/50 dark:border-slate-800/40 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            🩸 Donation Campaigns & Camps
          </h2>
          <CardDescription className="text-xs text-slate-400 dark:text-slate-500 font-semibold tracking-wide mt-0.5">
            Participate in regional camps or coordinate drives as an NGO / Hospital.
          </CardDescription>
        </div>

        {canOrganize && (
          <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 h-10 text-xs font-bold shrink-0">
            <Plus className="h-4.5 w-4.5" />
            Organize Donation Camp
          </Button>
        )}
      </div>

      {/* Main List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-xs font-bold leading-normal">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {camps.map((camp) => {
            const registered = isUserRegistered(camp);
            return (
              <Card key={camp.id} variant="bordered" className="hover:border-slate-350 dark:hover:border-slate-800 transition-all duration-300">
                <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800/50 flex flex-col gap-2">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 line-clamp-1 leading-snug">
                      {camp.name}
                    </h3>
                    <Badge variant={camp.status === "upcoming" ? "info" : "outline"} className="shrink-0">
                      {camp.status}
                    </Badge>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Organized by: {camp.organizer?.full_name || "Partner Clinic"}
                  </span>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                  <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-3 leading-relaxed font-semibold">
                    {camp.description || "Join this community effort to donate blood and support regional emergency centers."}
                  </p>

                  <div className="border-t border-slate-100 dark:border-slate-800/50 pt-3 space-y-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <div className="flex items-center gap-2.5">
                      <MapPin className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span className="truncate">{camp.address}, {camp.city}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <span>{new Date(camp.date_time).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Registered Donors Metric */}
                  <div className="bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-3 text-xs flex justify-between items-center">
                    <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wide">Registered Donors:</span>
                    <strong className="text-slate-800 dark:text-slate-200 text-sm font-black">{camp.registrations?.length || 0} Donors</strong>
                  </div>

                  {/* Camp registers buttons */}
                  {user && user.role === "donor" && (
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => handleRegister(camp.id, registered)}
                        variant={registered ? "secondary" : "primary"}
                        className="w-full flex items-center justify-center gap-2 h-10 text-xs font-bold"
                      >
                        {registered ? (
                          <>
                            <Check className="h-4 w-4 text-emerald-500" />
                            Unregister (Registered)
                          </>
                        ) : (
                          "Register as Participant"
                        )}
                      </Button>
                      {camp.status === "upcoming" && (
                        <Link to={`/book-slot/${camp.id}`} className="w-full">
                          <Button
                            variant="outline"
                            className="w-full flex items-center justify-center gap-2 h-10 text-xs font-bold border-red-500/20 text-red-500 hover:bg-red-500/10"
                          >
                            Book Donation Slot
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          
          {camps.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-bold">No donation drives scheduled.</p>
            </div>
          )}
        </div>
      )}

      {/* Creation Overlay modal Dialog */}
      <Dialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Organize New Donation Camp"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCamp} loading={submitLoading}>Publish Camp</Button>
          </div>
        }
      >
        <form onSubmit={handleCreateCamp} className="space-y-4">
          <Input
            label="Camp Campaign Title"
            type="text"
            placeholder="e.g. Annual Summer Blood Contribution Drive"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
              Campaign Description
            </label>
            <textarea
              placeholder="Detail guidelines, sponsors, food, and rewards..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex w-full min-h-[80px] rounded-lg border border-slate-200 bg-white/50 px-3.5 py-2.5 text-sm transition-all duration-200 placeholder:text-slate-450 focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="City"
              type="text"
              placeholder="e.g. Bangalore"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
            <Input
              label="Campaign Date & Time"
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              required
            />
          </div>

          <Input
            label="Venue Address"
            type="text"
            placeholder="e.g. Rotary Club Hall, Bengaluru"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Venue Latitude"
              type="number"
              step="0.000001"
              placeholder="12.9716"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              required
            />
            <Input
              label="Venue Longitude"
              type="number"
              step="0.000001"
              placeholder="77.5946"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              required
            />
          </div>
        </form>
      </Dialog>
    </div>
  );
};
export default CampsPage;
