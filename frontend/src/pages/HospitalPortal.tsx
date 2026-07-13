import React, { useState, useEffect } from "react";
import {
  Building2,
  Users,
  Calendar,
  Layers,
  Activity,
  UserCheck,
  Plus,
  Trash2,
  Check,
  Clock,
  ThumbsUp,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Button } from "../components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { DataTable } from "../components/ui/DataTable";
import { Chart } from "../components/ui/Chart";

export const HospitalPortal: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Portal Data States
  const [analytics, setAnalytics] = useState<any>(null);
  const [unverifiedDonors, setUnverifiedDonors] = useState<any[]>([]);
  const [myCamps, setMyCamps] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [globalRequests, setGlobalRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedCampId, setSelectedCampId] = useState<string>("");
  const [slotDate, setSlotDate] = useState("");
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");
  const [slotCap, setSlotCap] = useState(10);

  const [invGroup, setInvGroup] = useState("O+");
  const [invAvail, setInvAvail] = useState(10);
  const [invRes, setInvRes] = useState(0);

  const fetchPortalData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Overview & Reports Analytics
      const analRes = await api.get("/analytics/hospital");
      setAnalytics(analRes.data);

      // 2. Fetch Unverified Donors
      const donorsRes = await api.get("/donors/recommendations", {
        params: { blood_group: "O+", latitude: 12.9716, longitude: 77.5946, limit: 100 }
      });
      setUnverifiedDonors(donorsRes.data.filter((d: any) => !d.is_verified));

      // 3. Fetch My Camps
      const campsRes = await api.get("/camps/all");
      const filteredCamps = campsRes.data.filter((c: any) => c.organized_by_id === user?.id);
      setMyCamps(filteredCamps);
      if (filteredCamps.length > 0 && !selectedCampId) {
        setSelectedCampId(filteredCamps[0].id.toString());
      }

      // 4. Fetch Slots for selected camp
      if (selectedCampId || (filteredCamps.length > 0)) {
        const campIdQuery = selectedCampId || filteredCamps[0].id.toString();
        const slotsRes = await api.get(`/slots/${campIdQuery}`);
        setSlots(slotsRes.data);
      }

      // 5. Fetch Inventory list
      const invRes = await api.get("/inventory/");
      setInventory(invRes.data);

      // 6. Fetch Global Blood Requests Ledger
      const reqsRes = await api.get("/requests");
      setGlobalRequests(reqsRes.data);

      // 7. Fetch all Appointments for this hospital's camps
      if (filteredCamps.length > 0) {
        const allAppts: any[] = [];
        for (const camp of filteredCamps) {
          const campSlotsRes = await api.get(`/slots/${camp.id}`);
          for (const s of campSlotsRes.data) {
            const slotApptsRes = await api.get(`/appointments/slot/${s.id}`);
            allAppts.push(...slotApptsRes.data);
          }
        }
        setAppointments(allAppts);
      }

    } catch (err) {
      console.error("Hospital portal fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchPortalData();
  }, [user, selectedCampId]);

  // Actions
  const handleVerifyDonor = async (donorId: number) => {
    try {
      await api.post(`/donors/${donorId}/verify`);
      fetchPortalData();
    } catch (err) {
      alert("Verification failed.");
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampId || !slotDate || !slotStart || !slotEnd) return;
    try {
      await api.post(`/slots/?camp_id=${selectedCampId}`, {
        date: slotDate,
        start_time: slotStart,
        end_time: slotEnd,
        capacity: slotCap
      });
      setSlotDate("");
      setSlotStart("");
      setSlotEnd("");
      fetchPortalData();
    } catch (err) {
      alert("Failed to add slot.");
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    if (!window.confirm("Delete this donation slot?")) return;
    try {
      await api.delete(`/slots/${slotId}`);
      fetchPortalData();
    } catch (err) {
      alert("Failed to delete slot.");
    }
  };

  const handleApproveAppointment = async (apptId: number) => {
    try {
      await api.patch(`/appointments/${apptId}/approve`);
      fetchPortalData();
    } catch (err) {
      alert("Approval failed.");
    }
  };

  const handleCheckinAppointment = async (apptId: number) => {
    try {
      await api.patch(`/appointments/${apptId}/checkin`);
      fetchPortalData();
    } catch (err) {
      alert("Check-in failed.");
    }
  };

  const handleCompleteAppointment = async (apptId: number) => {
    try {
      await api.patch(`/appointments/${apptId}/complete`);
      fetchPortalData();
    } catch (err) {
      alert("Failed to complete appointment.");
    }
  };

  const handleUpdateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/inventory/${invGroup}`, {
        units_available: invAvail,
        units_reserved: invRes
      });
      fetchPortalData();
    } catch (err) {
      alert("Failed to update inventory.");
    }
  };

  const handleUpdateRequestWorkflow = async (reqId: number, nextWorkflow: string) => {
    try {
      await api.patch(`/requests/${reqId}`, { workflow_status: nextWorkflow });
      fetchPortalData();
    } catch (err) {
      alert("Failed to update workflow state.");
    }
  };

  if (loading && activeTab === "overview") {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
      </div>
    );
  }

  // Chart data formatting
  const chartData = Object.keys(analytics?.inventory || {}).map((group) => ({
    label: group,
    value: analytics.inventory[group] || 0
  }));

  const apptStatsData = Object.keys(analytics?.appointment_stats || {}).map((status) => ({
    label: status.toUpperCase(),
    value: analytics.appointment_stats[status] || 0
  }));

  return (
    <div className="py-6 px-4 space-y-8 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white tracking-tight">
          Hospital Dashboard
        </h2>
        <CardDescription className="text-xs font-semibold text-slate-400 mt-0.5">
          Verify donor applications, schedule donation drives, manage bookings, and track blood stocks.
        </CardDescription>
      </div>

      {/* Tabs list */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800 pb-px">
        {[
          { id: "overview", label: "Overview", icon: Layers },
          { id: "donors", label: "Donor Verification", icon: UserCheck },
          { id: "slots", label: "Slot Manager", icon: Calendar },
          { id: "appointments", label: "Appointments Queue", icon: Clock },
          { id: "inventory", label: "Blood Stock", icon: Building2 },
          { id: "requests", label: "Emergency Ledger", icon: Activity },
          { id: "reports", label: "Reports", icon: TrendingUp }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-all ${
                isActive
                  ? "border-red-500 text-red-500 font-extrabold"
                  : "border-transparent text-slate-400 hover:text-slate-655"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active Tab Panel */}
      <div className="space-y-6">
        {/* 1. Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card variant="bordered" className="p-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Camps Managed</span>
                  <span className="text-2xl font-black text-slate-850 dark:text-white">{analytics?.total_camps_organized || 0}</span>
                </div>
                <div className="h-11 w-11 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500"><Calendar className="h-5 w-5" /></div>
              </Card>

              <Card variant="bordered" className="p-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Registrations</span>
                  <span className="text-2xl font-black text-slate-850 dark:text-white">{analytics?.total_registrations || 0}</span>
                </div>
                <div className="h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Users className="h-5 w-5" /></div>
              </Card>

              <Card variant="bordered" className="p-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Slots</span>
                  <span className="text-2xl font-black text-slate-850 dark:text-white">{slots.length}</span>
                </div>
                <div className="h-11 w-11 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500"><Clock className="h-5 w-5" /></div>
              </Card>

              <Card variant="bordered" className="p-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Units in Stock</span>
                  <span className="text-2xl font-black text-slate-850 dark:text-white">
                    {Object.values(analytics?.inventory || {}).reduce((acc: number, cur: any) => acc + (cur || 0), 0)}
                  </span>
                </div>
                <div className="h-11 w-11 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500"><Building2 className="h-5 w-5" /></div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card variant="glass" className="p-5 space-y-4">
                <CardTitle className="text-sm font-bold">Blood Stock Levels</CardTitle>
                <Chart type="bar" data={chartData.length ? chartData : [{label: "O+", value: 0}]} height={180} />
              </Card>
              <Card variant="glass" className="p-5 space-y-4">
                <CardTitle className="text-sm font-bold">Appointment Queue Metrics</CardTitle>
                <Chart type="line" data={apptStatsData.length ? apptStatsData : [{label: "PENDING", value: 0}]} height={180} color="#f59e0b" />
              </Card>
            </div>
          </div>
        )}

        {/* 2. Donor Verification */}
        {activeTab === "donors" && (
          <Card variant="glass" className="p-5 space-y-4">
            <CardTitle className="text-sm font-bold">Donor Applications Queue</CardTitle>
            <DataTable
              data={unverifiedDonors}
              searchKey="full_name"
              searchPlaceholder="Search applicant name..."
              columns={[
                { header: "Name", accessor: (d: any) => d.full_name || d.email },
                { header: "Blood Group", accessor: (d: any) => <Badge variant="destructive">{d.blood_group}</Badge> },
                { header: "City", accessor: "city" },
                { header: "Age", accessor: "age" },
                { header: "Weight", accessor: (d: any) => `${d.weight} kg` },
                {
                  header: "Verify Action",
                  accessor: (d: any) => (
                    <Button
                      size="sm"
                      onClick={() => handleVerifyDonor(d.id)}
                      className="h-7 text-[10px] font-bold bg-amber-500 hover:bg-amber-600"
                    >
                      Verify Donor
                    </Button>
                  )
                }
              ]}
            />
          </Card>
        )}

        {/* 3. Slot Manager */}
        {activeTab === "slots" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card variant="glass" className="p-5 space-y-4 h-fit">
              <CardTitle className="text-sm font-bold">Create Donation Slot</CardTitle>
              <form onSubmit={handleAddSlot} className="space-y-3.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Select Camp Drive</label>
                  <select
                    value={selectedCampId}
                    onChange={(e) => setSelectedCampId(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                  >
                    {myCamps.map((camp) => (
                      <option key={camp.id} value={camp.id}>{camp.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Date</label>
                  <Input type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} required />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Start Time</label>
                    <Input placeholder="09:00 AM" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} required />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">End Time</label>
                    <Input placeholder="11:00 AM" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} required />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Max Capacity</label>
                  <Input type="number" value={slotCap} onChange={(e) => setSlotCap(parseInt(e.target.value))} required />
                </div>

                <Button type="submit" className="w-full h-10 text-xs font-bold flex items-center justify-center gap-1">
                  <Plus className="h-4 w-4" /> Add Slot
                </Button>
              </form>
            </Card>

            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Drive Slots Registered
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {slots.map((s) => (
                  <Card key={s.id} variant="bordered" className="p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                          {s.start_time} - {s.end_time}
                        </span>
                        <Badge variant={s.status === "active" ? "success" : "outline"}>{s.status}</Badge>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold block mt-1">Date: {s.date}</span>
                      <span className="text-[10px] text-slate-400 block font-medium">Booked: {s.booked_count} / {s.capacity}</span>
                    </div>

                    <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800/40 mt-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDeleteSlot(s.id)}
                        className="h-7 px-2 text-[10px] font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                ))}

                {slots.length === 0 && (
                  <div className="col-span-full p-8 text-center text-slate-450 font-bold text-xs border border-dashed rounded-xl">
                    No slots created for this camp.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. Appointments Queue */}
        {activeTab === "appointments" && (
          <Card variant="glass" className="p-5 space-y-4">
            <CardTitle className="text-sm font-bold">Appointments Booking Ledger</CardTitle>
            <DataTable
              data={appointments}
              columns={[
                { header: "Donor", accessor: (a: any) => a.donor?.full_name || a.donor?.email },
                { header: "Slot Date", accessor: (a: any) => a.slot?.date },
                { header: "Time", accessor: (a: any) => `${a.slot?.start_time} - ${a.slot?.end_time}` },
                { header: "Ref ID", accessor: (a: any) => a.qr_code.substring(0, 8).toUpperCase() },
                { header: "Status", accessor: (a: any) => <Badge>{a.status}</Badge> },
                {
                  header: "Actions",
                  accessor: (a: any) => (
                    <div className="flex gap-1.5">
                      {a.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => handleApproveAppointment(a.id)}
                          className="h-7 text-[10px] font-bold bg-emerald-500 hover:bg-emerald-600 flex items-center gap-1"
                        >
                          <ThumbsUp className="h-3 w-3" /> Approve
                        </Button>
                      )}
                      {a.status === "approved" && (
                        <Button
                          size="sm"
                          onClick={() => handleCheckinAppointment(a.id)}
                          className="h-7 text-[10px] font-bold bg-blue-500 hover:bg-blue-600 flex items-center gap-1"
                        >
                          <Check className="h-3 w-3" /> Check In
                        </Button>
                      )}
                      {a.status === "checked_in" && (
                        <Button
                          size="sm"
                          onClick={() => handleCompleteAppointment(a.id)}
                          className="h-7 text-[10px] font-bold bg-purple-500 hover:bg-purple-600 flex items-center gap-1"
                        >
                          <Activity className="h-3 w-3" /> Complete Donation
                        </Button>
                      )}
                    </div>
                  )
                }
              ]}
            />
          </Card>
        )}

        {/* 5. Blood Stock */}
        {activeTab === "inventory" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card variant="glass" className="p-5 space-y-4 h-fit">
              <CardTitle className="text-sm font-bold">Update Stock Inventory</CardTitle>
              <form onSubmit={handleUpdateInventory} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Blood Group</label>
                  <select
                    value={invGroup}
                    onChange={(e) => setInvGroup(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                  >
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Units Available</label>
                  <Input type="number" value={invAvail} onChange={(e) => setInvAvail(parseInt(e.target.value))} required />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Units Reserved (for critical request matchings)</label>
                  <Input type="number" value={invRes} onChange={(e) => setInvRes(parseInt(e.target.value))} required />
                </div>

                <Button type="submit" className="w-full h-10 text-xs font-bold">
                  Update Stock
                </Button>
              </form>
            </Card>

            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Current Inventory Ledger
                </h3>
                {inventory.some((i) => i.units_available < 5) && (
                  <Badge variant="destructive" className="flex items-center gap-1 font-bold animate-pulse">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Shortage Alert Detected
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {inventory.map((inv) => (
                  <Card
                    key={inv.id}
                    variant="bordered"
                    className={`p-4 flex flex-col justify-between ${
                      inv.units_available < 5 ? "border-red-500/30 bg-red-500/[0.015]" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-extrabold text-slate-850 dark:text-slate-100">{inv.blood_group}</span>
                      {inv.units_available < 5 && <span className="text-[8px] font-bold bg-red-500/10 text-red-500 px-1 py-0.5 rounded uppercase">Low</span>}
                    </div>
                    <div className="mt-3 text-[10px] font-semibold text-slate-400">
                      Available: <strong className="text-slate-800 dark:text-slate-200">{inv.units_available} units</strong>
                      <div className="mt-0.5">Reserved: {inv.units_reserved}</div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 6. Emergency Requests */}
        {activeTab === "requests" && (
          <Card variant="glass" className="p-5 space-y-4">
            <CardTitle className="text-sm font-bold">Emergency Request Ledger & Routing workflow</CardTitle>
            <DataTable
              data={globalRequests}
              columns={[
                { header: "Hospital/Venue", accessor: "hospital_name" },
                { header: "Blood Group", accessor: (r: any) => <Badge variant="destructive">{r.blood_group}</Badge> },
                { header: "Units Needed", accessor: "units_required" },
                { header: "Fulfillment Status", accessor: (r: any) => <Badge variant="outline">{r.status}</Badge> },
                { header: "Workflow Stage", accessor: (r: any) => <Badge variant="warning">{r.workflow_status || "created"}</Badge> },
                {
                  header: "Fulfillment Action",
                  accessor: (r: any) => (
                    <div className="flex gap-1.5">
                      {r.workflow_status === "created" && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateRequestWorkflow(r.id, "verified")}
                          className="h-7 text-[10px] font-bold bg-amber-500 hover:bg-amber-600"
                        >
                          Mark Verified
                        </Button>
                      )}
                      {r.workflow_status === "verified" && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateRequestWorkflow(r.id, "searching")}
                          className="h-7 text-[10px] font-bold bg-blue-500 hover:bg-blue-600"
                        >
                          Start Matchmaking
                        </Button>
                      )}
                      {r.workflow_status === "searching" && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateRequestWorkflow(r.id, "matched")}
                          className="h-7 text-[10px] font-bold bg-purple-500 hover:bg-purple-600"
                        >
                          Mark Matched
                        </Button>
                      )}
                      {r.workflow_status === "matched" && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateRequestWorkflow(r.id, "fulfilled")}
                          className="h-7 text-[10px] font-bold bg-emerald-500 hover:bg-emerald-600"
                        >
                          Mark Fulfilled
                        </Button>
                      )}
                    </div>
                  )
                }
              ]}
            />
          </Card>
        )}

        {/* 7. Reports */}
        {activeTab === "reports" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up">
            <Card variant="glass" className="p-5 space-y-4">
              <CardTitle className="text-sm font-bold">Stock Capacity Allocation by Group</CardTitle>
              <Chart type="area" data={chartData.length ? chartData : [{label: "O+", value: 0}]} height={200} color="#10b981" />
            </Card>

            <Card variant="glass" className="p-5 space-y-4">
              <CardTitle className="text-sm font-bold">Appointment Queue Statistics Reports</CardTitle>
              <Chart type="bar" data={apptStatsData.length ? apptStatsData : [{label: "PENDING", value: 0}]} height={200} color="#f59e0b" />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
export default HospitalPortal;
