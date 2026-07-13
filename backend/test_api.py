import urllib.request
import urllib.parse
import json
import sys


BASE_URL = "http://localhost:8000/api"

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _req(url, *, method="GET", data=None, token=None, expect_status=None):
    """Send an HTTP request and return (status_code, parsed_json)."""
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            body = resp.read().decode()
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        if expect_status and e.code == expect_status:
            return e.code, json.loads(body) if body else {}
        print(f"[HTTP {e.code}] {url} — {body[:200]}")
        raise


def login(email, password):
    payload = json.dumps({"email": email, "password": password}).encode()
    _, data = _req(f"{BASE_URL}/auth/login", method="POST", data=payload)
    return data["access_token"]


# ─────────────────────────────────────────────────────────────────────────────
# Test Sections
# ─────────────────────────────────────────────────────────────────────────────

def run_tests():
    print("[INFO] Starting API Integration Verification...")

    # ── 1. Donor login & profile ──────────────────────────────────────────────
    donor_token = login("rahul@blood.ai", "password123")
    print("[SUCCESS] §1 Auth Login – Donor JWT received.")

    _, me = _req(f"{BASE_URL}/auth/me", token=donor_token)
    assert me["role"] == "donor", "Expected donor role"
    print(f"[SUCCESS] §1 Auth Me – Role: {me['role']}, Name: {me['full_name']}")

    # ── 2. Donor recommendations ──────────────────────────────────────────────
    _, donors = _req(
        f"{BASE_URL}/donors/recommendations?blood_group=O%2B&latitude=12.9716&longitude=77.5946&limit=5",
        token=donor_token,
    )
    print(f"[SUCCESS] §2 Donor Recommendations – Found {len(donors)} matches.")
    for d in donors:
        print(f"   • {d['full_name']} ({d['blood_group']}) — {d['distance_km']} km, Score: {d['score']}%")

    # ── 3. Active public blood requests ───────────────────────────────────────
    _, active_reqs = _req(f"{BASE_URL}/requests/active")
    print(f"[SUCCESS] §3 Active Requests – Found {len(active_reqs)} pending requests.")
    for r in active_reqs:
        print(f"   • {r['hospital_name']} | {r['blood_group']} | {r['urgency']}")

    # ── 4. Admin login ────────────────────────────────────────────────────────
    admin_token = login("admin@blood.ai", "password123")
    print("[SUCCESS] §4 Admin Login – Admin JWT received.")

    _, admin_me = _req(f"{BASE_URL}/auth/me", token=admin_token)
    assert admin_me["role"] == "admin", "Expected admin role"
    print(f"[SUCCESS] §4 Admin Auth/Me – Role: {admin_me['role']}")

    # ── 5. Recipient creates a request → gets pending_approval ───────────────
    recipient_token = login("recipient@blood.ai", "password123")
    print("[SUCCESS] §5 Recipient Login – Token received.")

    new_req_payload = json.dumps({
        "blood_group": "B+",
        "units_required": 1,
        "hospital_name": "Manipal Hospital, Whitefield",
        "city": "Bangalore",
        "latitude": 12.9698,
        "longitude": 77.7500,
        "urgency": "high",
        "required_date": "2026-07-15",
    }).encode()
    status_code, created_req = _req(
        f"{BASE_URL}/requests/",
        method="POST",
        data=new_req_payload,
        token=recipient_token,
    )
    assert status_code == 201, f"Expected 201 Created, got {status_code}"
    assert created_req["status"] == "pending_approval", (
        f"Non-admin request should be pending_approval, got '{created_req['status']}'"
    )
    created_req_id = created_req["id"]
    print(f"[SUCCESS] §5 Recipient Request Created – ID: {created_req_id}, Status: {created_req['status']}")

    # ── 6. Admin approves the request (pending_approval → pending) ────────────
    approve_payload = json.dumps({"status": "pending"}).encode()
    _, approved_req = _req(
        f"{BASE_URL}/requests/{created_req_id}",
        method="PATCH",
        data=approve_payload,
        token=admin_token,
    )
    assert approved_req["status"] == "pending", (
        f"After admin approval status should be 'pending', got '{approved_req['status']}'"
    )
    print(f"[SUCCESS] §6 Admin Approved Request – ID: {created_req_id}, Status: {approved_req['status']}")

    # ── 7. Admin rejects (cancels) the same request ───────────────────────────
    reject_payload = json.dumps({"status": "cancelled"}).encode()
    _, rejected_req = _req(
        f"{BASE_URL}/requests/{created_req_id}",
        method="PATCH",
        data=reject_payload,
        token=admin_token,
    )
    assert rejected_req["status"] == "cancelled", (
        f"After admin rejection status should be 'cancelled', got '{rejected_req['status']}'"
    )
    print(f"[SUCCESS] §7 Admin Rejected Request – ID: {created_req_id}, Status: {rejected_req['status']}")

    # ── 8. Hospital creates a camp → gets pending_approval ────────────────────
    hospital_token = login("hospital@blood.ai", "password123")
    print("[SUCCESS] §8 Hospital Login – Token received.")

    new_camp_payload = json.dumps({
        "name": "Koramangala Community Drive",
        "description": "Test approval camp.",
        "city": "Bangalore",
        "address": "Koramangala Indoor Stadium",
        "latitude": 12.9352,
        "longitude": 77.6245,
        "date_time": "2026-08-10T09:00:00",
    }).encode()
    status_code, created_camp = _req(
        f"{BASE_URL}/camps/",
        method="POST",
        data=new_camp_payload,
        token=hospital_token,
    )
    assert status_code == 201, f"Expected 201 Created, got {status_code}"
    assert created_camp["status"] == "pending_approval", (
        f"Hospital camp should be pending_approval, got '{created_camp['status']}'"
    )
    created_camp_id = created_camp["id"]
    print(f"[SUCCESS] §8 Hospital Camp Created – ID: {created_camp_id}, Status: {created_camp['status']}")

    # ── 9. Admin approves camp (pending_approval → upcoming) ─────────────────
    camp_approve_payload = json.dumps({"status": "upcoming"}).encode()
    _, approved_camp = _req(
        f"{BASE_URL}/camps/{created_camp_id}",
        method="PATCH",
        data=camp_approve_payload,
        token=admin_token,
    )
    assert approved_camp["status"] == "upcoming", (
        f"After admin approval camp status should be 'upcoming', got '{approved_camp['status']}'"
    )
    print(f"[SUCCESS] §9 Admin Approved Camp – ID: {created_camp_id}, Status: {approved_camp['status']}")

    # ── 10. Admin rejects (cancels) a camp ───────────────────────────────────
    camp_reject_payload = json.dumps({"status": "cancelled"}).encode()
    _, rejected_camp = _req(
        f"{BASE_URL}/camps/{created_camp_id}",
        method="PATCH",
        data=camp_reject_payload,
        token=admin_token,
    )
    assert rejected_camp["status"] == "cancelled", (
        f"After admin rejection camp status should be 'cancelled', got '{rejected_camp['status']}'"
    )
    print(f"[SUCCESS] §10 Admin Rejected Camp – ID: {created_camp_id}, Status: {rejected_camp['status']}")

    # ── 11. Admin view: /camps/all includes all statuses ─────────────────────
    _, all_camps = _req(f"{BASE_URL}/camps/all", token=admin_token)
    statuses = {c["status"] for c in all_camps}
    print(f"[SUCCESS] §11 /camps/all – {len(all_camps)} total camps, statuses seen: {statuses}")

    # ── 12. Public /camps only returns upcoming/active ────────────────────────
    _, public_camps = _req(f"{BASE_URL}/camps")
    for c in public_camps:
        assert c["status"] in ("upcoming", "active"), (
            f"Public camp listing should only contain upcoming/active, got '{c['status']}'"
        )
    print(f"[SUCCESS] §12 /camps (public) – {len(public_camps)} camps, all upcoming/active.")

    print("\n[SUCCESS] All 12 Approval Workflow Verifications Passed Successfully!")


if __name__ == "__main__":
    run_tests()
