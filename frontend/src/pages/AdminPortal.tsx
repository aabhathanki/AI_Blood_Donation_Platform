import React, { useState, useEffect } from "react";
import {
  Shield,
  Users,
  Building2,
  Calendar,
  Activity,
  UserX,
  FileCheck,
  ClipboardList,
  Heart,
  Award,
  TrendingUp,
  Search
} from "lucide-react";
import api from "../services/api";
import { Button } from "../components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { DataTable } from "../components/ui/DataTable";
import { Chart } from "../components/ui/Chart";

export const AdminPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState("overview");

  // Portal States
  const [analytics, setAnalytics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [pendingHospitals, setPendingHospitals] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Analytics
      const analRes = await api.get("/analytics/admin");
      setAnalytics(analRes.data);

      // 2. Fetch Users
      const usersRes = await api.get("/admin/users");
      setUsers(usersRes.data);

      // 3. Fetch Pending Hospital Verifications
      const hospRes = await api.get("/admin/hospitals/pending");
      setPendingHospitals(hospRes.data);

      // 4. Fetch System Audit Logs
      const logsRes = await api.get("/admin/audit-logs");
      setAuditLogs(logsRes.data);

    } catch (err) {
      console.error("Admin portal loader error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleSuspendUser = async (userId: number) => {
    if (!window.confirm("Are you sure you want to suspend this account?")) return;
    try {
      await api.patch(`/admin/users/${userId}/suspend`);
      fetchAdminData();
    } catch (err) {
      alert("Action failed.");
    }
  };

  const handleActivateUser = async (userId: number) => {
    try {
      await api.patch(`/admin/users/${userId}/activate`);
      fetchAdminData();
    } catch (err) {
      alert("Action failed.");
    }
  };

  const handleVerifyHospital = async (hospId: number, approve: boolean) => {
    try {
      await api.patch(`/admin/hospitals/${hospId}/verify`, null, {
        params: { approve }
      });
      fetchAdminData();
    } catch (err) {
      alert("Verification update failed.");
    }
  };

  if (loading && activeTab === "overview") {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
      </div>
    );
  }

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const roleMatches = userRoleFilter ? u.role === userRoleFilter : true;
    const searchMatches = userSearchQuery
      ? u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.full_name.toLowerCase().includes(userSearchQuery.toLowerCase())
      : true;
    return roleMatches && searchMatches;
  });

  // Chart data formatting
  const requestsChartData = Object.keys(analytics?.charts?.requests_by_status || {}).map((s) => ({
    label: s.toUpperCase(),
    value: analytics.charts.requests_by_status[s] || 0
  }));

  const bgChartData = Object.keys(analytics?.charts?.donors_by_blood_group || {}).map((bg) => ({
    label: bg,
    value: analytics.charts.donors_by_blood_group[bg] || 0
  }));

  const summary = analytics?.summary || {};

  return (
    <div className="py-6 px-4 space-y-8 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white tracking-tight">
          Admin Control Center
        </h2>
        <CardDescription className="text-xs font-semibold text-slate-400 mt-0.5">
          Monitor system metrics, review license credentials, audit critical transactions, and manage roles.
        </CardDescription>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800 pb-px">
        {[
          { id: "overview", label: "System Analytics", icon: TrendingUp },
          { id: "users", label: "User Management", icon: Users },
          { id: "hospitals", label: "Hospital Verification", icon: FileCheck },
          { id: "logs", label: "System Audit Logs", icon: ClipboardList }
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

      {/* Tab Panels */}
      <div className="space-y-6">
        {/* 1. Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card variant="bordered" className="p-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Donors</span>
                  <span className="text-2xl font-black text-slate-850 dark:text-white">{summary.total_donors || 0}</span>
                  <span className="text-[9px] text-slate-400 font-semibold block">{summary.active_donors || 0} active availabilities</span>
                </div>
                <div className="h-11 w-11 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                  <Heart className="h-5 w-5 fill-red-550" />
                </div>
              </Card>

              <Card variant="bordered" className="p-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Emergency Requests</span>
                  <span className="text-2xl font-black text-slate-850 dark:text-white">{summary.emergency_requests || 0}</span>
                  <span className="text-[9px] text-slate-400 font-semibold block">Out of {summary.total_requests || 0} total requests</span>
                </div>
                <div className="h-11 w-11 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Activity className="h-5 w-5" />
                </div>
              </Card>

              <Card variant="bordered" className="p-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Blood Collected</span>
                  <span className="text-2xl font-black text-slate-850 dark:text-white">{summary.units_collected || 0} Units</span>
                  <span className="text-[9px] text-slate-400 font-semibold block">From {summary.total_appointments || 0} appointments</span>
                </div>
                <div className="h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Award className="h-5 w-5" />
                </div>
              </Card>

              <Card variant="bordered" className="p-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated Lives Saved</span>
                  <span className="text-2xl font-black text-slate-850 dark:text-white">{summary.lives_saved || 0} Lives</span>
                  <span className="text-[9px] text-slate-450 font-semibold block uppercase tracking-wider">AI Impact Metric</span>
                </div>
                <div className="h-11 w-11 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Shield className="h-5 w-5" />
                </div>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card variant="glass" className="p-5 space-y-4">
                <CardTitle className="text-sm font-bold">Registry Blood Group Breakdown</CardTitle>
                <Chart type="bar" data={bgChartData.length ? bgChartData : [{label: "O+", value: 0}]} height={200} />
              </Card>
              <Card variant="glass" className="p-5 space-y-4">
                <CardTitle className="text-sm font-bold">Blood Requests Outcomes</CardTitle>
                <Chart type="line" data={requestsChartData.length ? requestsChartData : [{label: "PENDING", value: 0}]} height={200} color="#3b82f6" />
              </Card>
            </div>
          </div>
        )}

        {/* 2. User Management */}
        {activeTab === "users" && (
          <Card variant="glass" className="p-5 space-y-4">
            <CardTitle className="text-sm font-bold">System Users Directory</CardTitle>
            
            {/* Filters panel */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="max-w-xs flex-1">
                <Input
                  placeholder="Search user name or email..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-[150px]"
              >
                <option value="">All Roles</option>
                <option value="donor">Donor</option>
                <option value="recipient">Recipient</option>
                <option value="hospital_ngo">Hospital/NGO</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <DataTable
              data={filteredUsers}
              columns={[
                { header: "Name", accessor: "full_name" },
                { header: "Email Address", accessor: "email" },
                { header: "User Role", accessor: (u: any) => <Badge variant="outline">{u.role}</Badge> },
                {
                  header: "Account Status",
                  accessor: (u: any) =>
                    u.is_suspended ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )
                },
                {
                  header: "Manage Role Account",
                  accessor: (u: any) =>
                    u.role === "admin" ? (
                      <span className="text-[10px] font-bold text-slate-400">Restricted</span>
                    ) : u.is_suspended ? (
                      <Button
                        size="sm"
                        onClick={() => handleActivateUser(u.id)}
                        className="h-7 text-[10px] font-bold bg-emerald-500 hover:bg-emerald-600"
                      >
                        Re-Activate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSuspendUser(u.id)}
                        className="h-7 text-[10px] font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20"
                      >
                        Suspend
                      </Button>
                    )
                }
              ]}
            />
          </Card>
        )}

        {/* 3. Hospital Verification */}
        {activeTab === "hospitals" && (
          <Card variant="glass" className="p-5 space-y-4">
            <CardTitle className="text-sm font-bold">Pending Hospital Profiles Queue</CardTitle>
            <DataTable
              data={pendingHospitals}
              columns={[
                { header: "Hospital Profile", accessor: (h: any) => h.user?.full_name || `Hosp-ID: ${h.user_id}` },
                { header: "License Reference", accessor: "license_number" },
                { header: "Registered Location", accessor: "address" },
                { header: "Audit Verification Rating", accessor: (h: any) => `${h.rating} Star` },
                {
                  header: "License Document Review",
                  accessor: (h: any) => (
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        alert(`Simulating License PDF Preview: License Ref: ${h.license_number}`);
                      }}
                      className="text-red-500 hover:underline uppercase text-[10px] font-bold tracking-wider"
                    >
                      Review license pdf
                    </a>
                  )
                },
                {
                  header: "Actions",
                  accessor: (h: any) => (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleVerifyHospital(h.id, true)}
                        className="h-7 text-[10px] font-bold bg-emerald-500 hover:bg-emerald-600"
                      >
                        Approve Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleVerifyHospital(h.id, false)}
                        className="h-7 text-[10px] font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20"
                      >
                        Reject
                      </Button>
                    </div>
                  )
                }
              ]}
            />
          </Card>
        )}

        {/* 4. System Audit Logs */}
        {activeTab === "logs" && (
          <Card variant="glass" className="p-5 space-y-4">
            <CardTitle className="text-sm font-bold">System Configuration Audit Trail</CardTitle>
            <DataTable
              data={auditLogs}
              columns={[
                { header: "Timestamp", accessor: (l: any) => new Date(l.created_at).toLocaleString() },
                { header: "User account", accessor: (l: any) => l.user?.full_name || `ID: ${l.user_id}` },
                { header: "Action Taken", accessor: (l: any) => <Badge variant="outline">{l.action.toUpperCase()}</Badge> },
                { header: "Entity target", accessor: (l: any) => `${l.entity_type.toUpperCase()} #${l.entity_id || "N/A"}` },
                { header: "Logged Metadata", accessor: (l: any) => l.metadata_json || "{}" }
              ]}
            />
          </Card>
        )}
      </div>
    </div>
  );
};
export default AdminPortal;
