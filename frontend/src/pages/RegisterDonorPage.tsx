import React, { useState, useEffect } from "react";
import { Heart, MapPin, Loader2, Navigation, CheckCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";

export const RegisterDonorPage: React.FC = () => {
  const { user, updateUserRoleInContext } = useAuth();
  
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [medicalInfo, setMedicalInfo] = useState("");
  const [lastDonationDate, setLastDonationDate] = useState("");
  const [availability, setAvailability] = useState(true);
  const [city, setCity] = useState("Bangalore");
  const [latitude, setLatitude] = useState("12.9716");
  const [longitude, setLongitude] = useState("77.5946");
  
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Load existing profile if any
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/donors/profile");
        const profile = res.data;
        if (profile) {
          setBloodGroup(profile.blood_group);
          setWeight(profile.weight.toString());
          setAge(profile.age.toString());
          setMedicalInfo(profile.medical_info || "");
          setLastDonationDate(profile.last_donation_date || "");
          setAvailability(profile.availability);
          setCity(profile.city);
          setLatitude(profile.latitude.toString());
          setLongitude(profile.longitude.toString());
          setIsEditMode(true);
        }
      } catch (err) {
        // No profile exists yet, which is expected for first timers
      }
    };
    fetchProfile();
  }, []);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: "error", text: "Geolocation is not supported by your browser." });
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setGeoLoading(false);
        setMessage({ type: "success", text: "GPS coordinates successfully fetched!" });
      },
      (error) => {
        console.error("GPS fetch error:", error);
        setGeoLoading(false);
        setMessage({
          type: "error",
          text: "Failed to fetch GPS location. Please enter values manually (defaulted to Bangalore).",
        });
      },
      { timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bloodGroup || !weight || !age || !city || !latitude || !longitude) {
      setMessage({ type: "error", text: "Please fill in all required fields." });
      return;
    }

    const ageNum = parseInt(age);
    const weightNum = parseFloat(weight);

    if (ageNum < 18 || ageNum > 65) {
      setMessage({ type: "error", text: "Donor must be between 18 and 65 years old." });
      return;
    }

    if (weightNum < 50) {
      setMessage({ type: "error", text: "Donor weight must be at least 50 kg." });
      return;
    }

    setMessage(null);
    setLoading(true);

    try {
      const res = await api.post("/donors/profile", {
        blood_group: bloodGroup,
        weight: weightNum,
        age: ageNum,
        medical_info: medicalInfo || null,
        last_donation_date: lastDonationDate || null,
        availability,
        city,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        contact_info: user?.email || "+91 99999 99999", // Bind user context contact
      });

      // Update local context user role to 'donor'
      updateUserRoleInContext("donor");
      setIsEditMode(true);
      setMessage({
        type: "success",
        text: isEditMode
          ? "Donor profile successfully updated!"
          : "Donor registration completed! You are now listed as available.",
      });
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Failed to save profile." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <Card variant="glass">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800/40 p-6 flex flex-row items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
            <Heart className="h-6 w-6 fill-red-500" />
          </div>
          <div>
            <CardTitle className="text-xl sm:text-2xl font-black">
              {isEditMode ? "Manage Donor Profile" : "Register as Active Blood Donor"}
            </CardTitle>
            <CardDescription className="text-slate-400 dark:text-slate-500 font-semibold tracking-wide">
              {isEditMode
                ? "Update your health criteria or toggle your live donation availability."
                : "Join the donor registry. Help local hospitals find you during emergencies."}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {message && (
              <div
                className={`p-4 rounded-xl border text-xs font-bold leading-normal flex items-center gap-2 ${
                  message.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                    : "bg-red-500/10 border-red-500/20 text-red-500"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle className="h-4.5 w-4.5 shrink-0" />
                ) : (
                  <span>⚠️</span>
                )}
                {message.text}
              </div>
            )}

            {/* Health Criteria Block */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1.5">
                Medical & Health Criteria
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                    Blood Group
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
                  label="Weight (kg)"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 68.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  required
                />

                <Input
                  label="Age (Years)"
                  type="number"
                  placeholder="e.g. 25"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Last Donation Date (Optional)"
                  type="date"
                  value={lastDonationDate}
                  onChange={(e) => setLastDonationDate(e.target.value)}
                  helperText="Leave empty if you have never donated before"
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                    Chronic Conditions / Medical Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. None, minor asthma, taking allergy pills"
                    value={medicalInfo}
                    onChange={(e) => setMedicalInfo(e.target.value)}
                    className="flex w-full rounded-lg border border-slate-200 bg-white/50 px-3.5 py-2.5 text-sm transition-all duration-200 placeholder:text-slate-450 focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Location Block */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1.5">
                Donation Location Details
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
                  label="Latitude"
                  type="number"
                  step="0.000001"
                  placeholder="e.g. 12.9716"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  required
                />

                <Input
                  label="Longitude"
                  type="number"
                  step="0.000001"
                  placeholder="e.g. 77.5946"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  required
                />
              </div>

              {/* Coordinates Getter */}
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
                Auto-Detect Current GPS Coordinates
              </Button>
            </div>

            {/* Availability Toggle */}
            <div className="flex items-center gap-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 p-4 rounded-xl">
              <input
                id="availability-check"
                type="checkbox"
                checked={availability}
                onChange={(e) => setAvailability(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-red-600 focus:ring-red-500"
              />
              <div className="flex flex-col text-left">
                <label
                  htmlFor="availability-check"
                  className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  I am currently available for donation request alerts
                </label>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wide">
                  Toggle this off if you are recovering, sick, or travelling out of state.
                </span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-bold shadow-md shadow-red-500/10"
              loading={loading}
            >
              {isEditMode ? "Save Changes" : "Complete Donor Setup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
export default RegisterDonorPage;
