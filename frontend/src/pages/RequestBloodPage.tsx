import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, MapPin, Loader2, Navigation, HeartHandshake } from "lucide-react";
import api from "../services/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";

export const RequestBloodPage: React.FC = () => {
  const navigate = useNavigate();

  const [bloodGroup, setBloodGroup] = useState("O+");
  const [unitsRequired, setUnitsRequired] = useState("1");
  const [hospitalName, setHospitalName] = useState("");
  const [city, setCity] = useState("Bangalore");
  const [latitude, setLatitude] = useState("12.9716");
  const [longitude, setLongitude] = useState("77.5946");
  const [urgency, setUrgency] = useState("medium"); // low, medium, high, emergency
  const [requiredDate, setRequiredDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setGeoLoading(false);
        setError(null);
      },
      (err) => {
        console.error(err);
        setGeoLoading(false);
        setError("Failed to fetch coordinates. Please enter them manually.");
      },
      { timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bloodGroup || !unitsRequired || !hospitalName || !city || !latitude || !longitude || !urgency || !requiredDate) {
      setError("Please fill in all fields.");
      return;
    }

    const units = parseInt(unitsRequired);
    if (isNaN(units) || units <= 0) {
      setError("Please enter a valid number of units.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await api.post("/requests/", {
        blood_group: bloodGroup,
        units_required: units,
        hospital_name: hospitalName,
        city,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        urgency,
        required_date: requiredDate,
      });

      // Navigate back to control center
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create blood request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <Card variant="glass">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800/40 p-6 flex flex-row items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
            <ShieldAlert className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <CardTitle className="text-xl sm:text-2xl font-black">
              Raise Emergency Blood Request
            </CardTitle>
            <CardDescription className="text-slate-400 dark:text-slate-500 font-semibold tracking-wide">
              Create a request detailing blood group, hospital location, and urgency to search matching regional donors.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg p-3 text-xs font-bold leading-normal">
                ⚠️ {error}
              </div>
            )}

            {/* Core Info */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1.5">
                Request Specifications
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                    Required Blood Group
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="flex w-full rounded-lg border border-slate-200 bg-white/50 px-3.5 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-200"
                  >
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Units Required (e.g. 1 Unit = 350ml)"
                  type="number"
                  placeholder="e.g. 2"
                  value={unitsRequired}
                  onChange={(e) => setUnitsRequired(e.target.value)}
                  min="1"
                  required
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                    Urgency Level
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="flex w-full rounded-lg border border-slate-200 bg-white/50 px-3.5 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-200"
                  >
                    <option value="low">Low (Routine replenishment)</option>
                    <option value="medium">Medium (Within 24-48 Hours)</option>
                    <option value="high">High (Within 12 Hours)</option>
                    <option value="emergency">EMERGENCY (IMMEDIATE matching needed)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Hospital / Medical Facility Name"
                  type="text"
                  placeholder="e.g. Columbia Asia, Hebbal"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  required
                />

                <Input
                  label="Date Needed"
                  type="date"
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Geographical details */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1.5">
                Hospital GPS Coordinates
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="City"
                  type="text"
                  placeholder="e.g. Bangalore"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />

                <Input
                  label="Hospital Latitude"
                  type="number"
                  step="0.000001"
                  placeholder="e.g. 12.9716"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  required
                />

                <Input
                  label="Hospital Longitude"
                  type="number"
                  step="0.000001"
                  placeholder="e.g. 77.5946"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  required
                />
              </div>

              {/* coordinates auto filler */}
              <Button
                type="button"
                variant="secondary"
                onClick={handleGetCurrentLocation}
                disabled={geoLoading}
                className="w-full flex items-center justify-center gap-2 h-11 border border-slate-200 dark:border-slate-800"
              >
                {geoLoading ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <Navigation className="h-4.5 w-4.5 text-red-500" />
                )}
                Auto-fill Hospital GPS Coordinates (from current device)
              </Button>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-bold shadow-md shadow-red-500/10"
              loading={loading}
            >
              Broadcast Emergency Blood Request
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
export default RequestBloodPage;
