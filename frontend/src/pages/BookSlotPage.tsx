import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Calendar,
  MapPin,
  Clock,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  HelpCircle
} from "lucide-react";
import api from "../services/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import SlotPicker from "../components/SlotPicker";
import QRCode from "../components/ui/QRCode";

export const BookSlotPage: React.FC = () => {
  const { campId } = useParams<{ campId: string }>();
  const navigate = useNavigate();

  const [camp, setCamp] = useState<any | null>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Eligibility wizard states
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);
  const [elAge, setElAge] = useState("");
  const [elWeight, setElWeight] = useState("");
  const [elRecentDonation, setElRecentDonation] = useState("no");
  const [elMedical, setElMedical] = useState("no");
  const [eligibilityChecked, setEligibilityChecked] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [eligibilityReason, setEligibilityReason] = useState("");

  // Confirmed booking state
  const [bookingConfirmed, setBookingConfirmed] = useState<any | null>(null);

  const fetchCampDetails = async () => {
    setLoading(true);
    try {
      const campRes = await api.get(`/camps/${campId}`);
      setCamp(campRes.data);

      const slotsRes = await api.get(`/slots/${campId}`);
      setSlots(slotsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (campId) fetchCampDetails();
  }, [campId]);

  const handleBookingSubmit = async () => {
    if (!selectedSlotId) return;
    try {
      const res = await api.post(`/appointments/?slot_id=${selectedSlotId}`);
      setBookingConfirmed(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to book slot.");
    }
  };

  const handleEligibilityCheckSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const age = parseInt(elAge);
    const weight = parseInt(elWeight);

    if (isNaN(age) || isNaN(weight)) {
      alert("Please fill in valid numbers.");
      return;
    }

    if (age < 18 || age > 65) {
      setIsEligible(false);
      setEligibilityReason("Whole blood donors must be between 18 and 65 years old.");
    } else if (weight < 50) {
      setIsEligible(false);
      setEligibilityReason("Donors must weigh at least 50 kg.");
    } else if (elRecentDonation === "yes") {
      setIsEligible(false);
      setEligibilityReason("You must wait 90 days between donations.");
    } else if (elMedical === "yes") {
      setIsEligible(false);
      setEligibilityReason("Based on chronic medical indications, you are deferred.");
    } else {
      setIsEligible(true);
      setEligibilityReason("");
    }
    setEligibilityChecked(true);
  };

  const proceedWithBooking = () => {
    setShowEligibilityModal(false);
    handleBookingSubmit();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
      </div>
    );
  }

  if (bookingConfirmed) {
    return (
      <div className="py-12 px-4 max-w-lg mx-auto text-center space-y-6 animate-fade-in-up">
        <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-555 mx-auto">
          <CheckCircle className="h-8 w-8 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">
            Booking Confirmed!
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Your donation appointment slot has been registered.
          </p>
        </div>

        <div className="flex justify-center py-4">
          <QRCode value={bookingConfirmed.qr_code} size={160} />
        </div>

        <Card variant="bordered" className="text-left p-4 space-y-2 bg-slate-50/50">
          <span className="text-[9px] font-bold text-slate-450 uppercase block">Drive Location Details</span>
          <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{camp?.name}</h4>
          <span className="text-[10px] text-slate-400 block font-semibold">
            Address: {camp?.address}, {camp?.city}
          </span>
          <span className="text-[10px] text-slate-400 block font-semibold">
            Slot Schedule: {bookingConfirmed.slot?.date} &bull; {bookingConfirmed.slot?.start_time} - {bookingConfirmed.slot?.end_time}
          </span>
        </Card>

        <div className="flex gap-3 justify-center pt-4">
          <Link to="/donor-portal">
            <Button className="h-10 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800">
              Go to Donor Portal
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 space-y-6 max-w-4xl mx-auto animate-fade-in-up">
      {/* Back link */}
      <Link to="/camps" className="flex items-center gap-1 text-[11px] font-extrabold text-slate-450 uppercase tracking-wide hover:text-slate-650">
        <ChevronLeft className="h-4 w-4" />
        Back to regional drives
      </Link>

      {/* Camp Header Card */}
      <Card variant="glass" className="p-5">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{camp?.status}</Badge>
            </div>
            <h3 className="text-xl font-black text-slate-850 dark:text-white mt-1">
              {camp?.name}
            </h3>
            <span className="text-xs font-semibold text-slate-400 block leading-normal mt-0.5">
              {camp?.description}
            </span>
          </div>

          <div className="text-xs text-slate-400 font-bold space-y-2 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800/40 pt-3 md:pt-0 md:pl-5 shrink-0">
            <span className="flex items-center gap-1.5 leading-none">
              <MapPin className="h-4 w-4 text-red-500" />
              {camp?.address}, {camp?.city}
            </span>
            <span className="flex items-center gap-1.5 leading-none">
              <Calendar className="h-4 w-4 text-red-500" />
              Date: {new Date(camp?.date_time).toLocaleDateString()}
            </span>
          </div>
        </div>
      </Card>

      {/* Slots Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Available Time-slots
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
            Select a convenient slot. You will be prompted with a quick AI pre-check prior to booking.
          </p>
        </div>

        <SlotPicker
          slots={slots}
          selectedSlotId={selectedSlotId}
          onSelectSlot={(id) => setSelectedSlotId(id)}
        />
      </div>

      {/* Footer Booking Trigger */}
      {selectedSlotId && (
        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-850 mt-6">
          <Button
            onClick={() => setShowEligibilityModal(true)}
            className="h-10 text-xs font-bold bg-red-500 hover:bg-red-600 text-white"
          >
            Check Eligibility & Confirm Booking
          </Button>
        </div>
      )}

      {/* AI Eligibility check wizard modal */}
      {showEligibilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-850 shadow-2xl overflow-hidden p-6 space-y-4 animate-scale-up">
            <div className="flex items-center gap-2 border-b pb-3">
              <HelpCircle className="h-5 w-5 text-red-500" />
              <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100">
                AI Eligibility Pre-Check
              </h3>
            </div>

            {!eligibilityChecked ? (
              <form onSubmit={handleEligibilityCheckSubmit} className="space-y-4">
                <p className="text-[10px] font-semibold text-slate-400 leading-normal">
                  Before confirming, please answer these quick health indicators to ensure safe donations.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Age (Years)</label>
                    <Input type="number" placeholder="25" value={elAge} onChange={(e) => setElAge(e.target.value)} required />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Weight (KG)</label>
                    <Input type="number" placeholder="68" value={elWeight} onChange={(e) => setElWeight(e.target.value)} required />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Have you donated blood in the last 3 months?</label>
                  <div className="flex gap-3 mt-1 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold">
                      <input type="radio" name="recent" value="yes" checked={elRecentDonation === "yes"} onChange={() => setElRecentDonation("yes")} /> Yes
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold">
                      <input type="radio" name="recent" value="no" checked={elRecentDonation === "no"} onChange={() => setElRecentDonation("no")} /> No
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Do you have chronic medical conditions or recent major surgery?</label>
                  <div className="flex gap-3 mt-1 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold">
                      <input type="radio" name="med" value="yes" checked={elMedical === "yes"} onChange={() => setElMedical("yes")} /> Yes
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold">
                      <input type="radio" name="med" value="no" checked={elMedical === "no"} onChange={() => setElMedical("no")} /> No
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowEligibilityModal(false)} className="h-9">
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="h-9 bg-red-500 hover:bg-red-600 text-white">
                    Submit check
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 py-2">
                {isEligible ? (
                  <div className="space-y-3 text-center">
                    <div className="h-10 w-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto">
                      <CheckCircle className="h-6 w-6" />
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                      Eligible to Donate!
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Your responses align with standard medical eligibility guidelines.
                    </p>
                    <div className="flex gap-2 justify-center pt-3">
                      <Button variant="outline" size="sm" onClick={() => setEligibilityChecked(false)} className="h-9">
                        Check Again
                      </Button>
                      <Button onClick={proceedWithBooking} size="sm" className="h-9 bg-red-500 hover:bg-red-600 text-white">
                        Confirm Book
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-center">
                    <div className="h-10 w-10 bg-red-500/10 rounded-full flex items-center justify-center text-red-555 mx-auto">
                      <AlertCircle className="h-6 w-6 text-red-500" />
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-150">
                      Fulfillment Deferral Detected
                    </h4>
                    <p className="text-[10px] text-red-500 font-bold leading-normal">
                      Reason: {eligibilityReason}
                    </p>
                    <p className="text-[9px] text-slate-400 leading-normal">
                      We suggest postponing donation booking for safety purposes or consulting with clinical staff.
                    </p>
                    <div className="flex gap-2 justify-center pt-3">
                      <Button variant="outline" size="sm" onClick={() => setEligibilityChecked(false)} className="h-9">
                        Modify Info
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowEligibilityModal(false)} className="h-9">
                        Cancel Booking
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default BookSlotPage;
