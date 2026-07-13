import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  Calendar,
  Award,
  Flame,
  CheckCircle,
  Clock,
  ArrowRight,
  QrCode,
  AlertCircle
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Button } from "../components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Dialog } from "../components/ui/Dialog";
import QRCode from "../components/ui/QRCode";

export const DonorPortal: React.FC = () => {
  const { user } = useAuth();
  const [donorProfile, setDonorProfile] = useState<any | null>(null);
  const [availability, setAvailability] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [personalStats, setPersonalStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);

  const fetchDonorData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Profile
      const profileRes = await api.get("/donors/profile");
      setDonorProfile(profileRes.data);
      setAvailability(profileRes.data.availability);

      // 2. Fetch Appointments
      const apptsRes = await api.get("/appointments/mine");
      setAppointments(apptsRes.data);

      // 3. Fetch Personal Stats
      const statsRes = await api.get(`/analytics/donor/${user?.id}`);
      setPersonalStats(statsRes.data);
    } catch (err) {
      console.error("Donor portal fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchDonorData();
  }, [user]);

  const handleToggleAvailability = async (checked: boolean) => {
    if (!donorProfile) return;
    setAvailability(checked);
    try {
      await api.post("/donors/profile", {
        ...donorProfile,
        availability: checked
      });
    } catch (err) {
      console.error("Failed to toggle availability:", err);
    }
  };

  const handleCancelAppointment = async (apptId: number) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await api.patch(`/appointments/${apptId}/cancel`);
      fetchDonorData();
    } catch (err) {
      alert("Failed to cancel appointment.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "approved":
        return <Badge variant="default">Approved</Badge>;
      case "checked_in":
        return <Badge variant="warning">Checked In</Badge>;
      case "cancelled":
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="warning">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
      </div>
    );
  }

  // Parse certificates if present
  const certificates = donorProfile?.certificates ? JSON.parse(donorProfile.certificates) : [];

  return (
    <div className="py-6 px-4 space-y-8 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white tracking-tight">
            Donor Portal
          </h2>
          <CardDescription className="text-xs font-semibold text-slate-400 mt-0.5">
            Manage your slots, history, credentials, and contributions.
          </CardDescription>
        </div>
        <Link to="/camps">
          <Button className="flex items-center gap-1.5 h-10 text-xs font-bold bg-red-500 hover:bg-red-600 text-white">
            <Calendar className="h-4.5 w-4.5" />
            Book Slot
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Grid of Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Blood Group */}
        <Card variant="bordered" className="flex items-center p-5 justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Blood Group</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white">{donorProfile?.blood_group || "N/A"}</span>
          </div>
          <div className="h-11 w-11 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 font-black text-lg">
            {donorProfile?.blood_group || "O+"}
          </div>
        </Card>

        {/* Total Donations */}
        <Card variant="bordered" className="flex items-center p-5 justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Donations</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white">{personalStats?.total_donations || 0} Units</span>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Award className="h-6 w-6" />
          </div>
        </Card>

        {/* Streak */}
        <Card variant="bordered" className="flex items-center p-5 justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Donation Streak</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white">{personalStats?.streak || 0} Streak</span>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Flame className="h-6 w-6 fill-amber-500" />
          </div>
        </Card>

        {/* Active Toggle */}
        <Card variant="bordered" className="flex flex-col justify-between p-4 bg-red-500/[0.01]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ready Alerts</span>
              <span className="text-xs font-bold text-slate-850 dark:text-slate-100 mt-0.5 block">Live Availability</span>
            </div>
            <input
              type="checkbox"
              checked={availability}
              onChange={(e) => handleToggleAvailability(e.target.checked)}
              className="h-5 w-5 rounded border-slate-350 text-red-600 focus:ring-red-500 cursor-pointer"
            />
          </div>
          <span className="text-[9px] text-slate-400 leading-none mt-2">
            Receive notification alerts during local emergencies.
          </span>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bookings Section */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Your Booked Appointments
          </h3>
          <div className="space-y-3">
            {appointments.map((appt) => (
              <Card key={appt.id} variant="bordered" className="hover:border-slate-300 dark:hover:border-slate-800 transition-colors">
                <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(appt.status)}
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Booked on {new Date(appt.booked_at).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-850 dark:text-slate-200">
                      Camp drive slot
                    </h4>
                    <span className="text-[10px] font-semibold text-slate-400 block">
                      Slot: {appt.slot.date} &bull; {appt.slot.start_time} - {appt.slot.end_time}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {appt.status !== "cancelled" && appt.status !== "completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedAppt(appt)}
                        className="h-8 text-[11px] font-bold flex items-center gap-1.5"
                      >
                        <QrCode className="h-4 w-4" />
                        View QR Code
                      </Button>
                    )}
                    {appt.status === "pending" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCancelAppointment(appt.id)}
                        className="h-8 text-[11px] font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {appointments.length === 0 && (
              <div className="p-10 text-center bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl">
                <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-bold">No appointments booked yet.</p>
                <Link to="/camps" className="text-xs text-red-500 hover:underline font-bold mt-1 inline-block">
                  Find and book slots nearby
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Certificates Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Donation Portfolio & Certificates
          </h3>
          <Card variant="glass" className="p-4 space-y-4">
            {certificates.map((cert: any) => (
              <div key={cert.id} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/40 pb-3 last:border-0 last:pb-0">
                <div>
                  <h5 className="text-xs font-black text-slate-850 dark:text-slate-150">
                    LF-{cert.id} Certification
                  </h5>
                  <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                    {cert.camp_name} &bull; {cert.date}
                  </span>
                </div>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert(`Simulating PDF Download for LF-${cert.id} Certificate.\nThank you for saving lives!`);
                  }}
                  className="text-[10px] font-extrabold text-red-500 hover:underline uppercase tracking-wide flex items-center gap-1 bg-red-500/10 px-2.5 py-1 rounded-md"
                >
                  <Award className="h-3.5 w-3.5" />
                  PDF Download
                </a>
              </div>
            ))}

            {certificates.length === 0 && (
              <div className="text-center py-8 text-slate-400 font-bold text-xs space-y-2">
                <Award className="h-8 w-8 text-slate-350 mx-auto" />
                <p>No certificates earned yet.</p>
                <p className="text-[10px] text-slate-450 font-normal leading-normal">
                  You will receive an official digital certificate after a hospital registers your completed donation slot.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog
        open={!!selectedAppt}
        onClose={() => setSelectedAppt(null)}
        title="Check-In Reference Code"
      >
        {selectedAppt && (
          <div className="space-y-4 text-center">
            <p className="text-xs font-bold text-slate-500">
              Present this QR Code to clinical staff at the donation site for instant appointment check-in.
            </p>
            <div className="flex justify-center">
              <QRCode value={selectedAppt.qr_code} size={180} />
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-3 text-left">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Check-in Details</span>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-150 mt-1">
                Ref ID: {selectedAppt.qr_code}
              </p>
              <p className="text-[10px] font-semibold text-slate-400">
                Slot: {selectedAppt.slot.date} &bull; {selectedAppt.slot.start_time} - {selectedAppt.slot.end_time}
              </p>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
export default DonorPortal;
