$base = "http://localhost:8000/api"
$pass = 0; $fail = 0; $warns = 0

function hdr($title) { Write-Host "`n$('='*55)`n  $title`n$('='*55)" -ForegroundColor Cyan }
function ok($msg)   { Write-Host "  PASS  $msg" -ForegroundColor Green;  $global:pass++ }
function err($msg)  { Write-Host "  FAIL  $msg" -ForegroundColor Red;    $global:fail++ }
function info($msg) { Write-Host "  INFO  $msg" -ForegroundColor Yellow }

function Login($email, $pwd) {
    $body = @{ email=$email; password=$pwd } | ConvertTo-Json
    try {
        $r = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body $body -ContentType "application/json"
        ok "Login [$email] -> role=$($r.role)"
        return $r.access_token
    } catch { err "Login [$email]: $($_.ErrorDetails.Message)"; return $null }
}

function GET($path, $label, $tok=$null) {
    $h = @{}; if ($tok) { $h["Authorization"] = "Bearer $tok" }
    try {
        $r = Invoke-RestMethod -Uri "$base$path" -Method GET -Headers $h
        $n = if ($r -is [array]) { "$($r.Count) items" } elseif ($r -is [hashtable] -or $r.PSObject) { "object" } else { $r }
        ok "GET $path ($label) -> $n"
        return $r
    } catch { err "GET $path ($label): $($_.ErrorDetails.Message)"; return $null }
}

function POST($path, $body, $label, $tok=$null) {
    $h = @{ "Content-Type"="application/json" }
    if ($tok) { $h["Authorization"] = "Bearer $tok" }
    $json = if ($body -is [string]) { $body } else { $body | ConvertTo-Json -Depth 5 }
    try {
        $r = Invoke-RestMethod -Uri "$base$path" -Method POST -Body $json -Headers $h
        ok "POST $path ($label)"
        return $r
    } catch { err "POST $path ($label): $($_.ErrorDetails.Message)"; return $null }
}

function PATCH($path, $body, $label, $tok) {
    $h = @{ "Content-Type"="application/json"; "Authorization"="Bearer $tok" }
    $json = if ($body -is [string]) { $body } else { $body | ConvertTo-Json -Depth 5 }
    try {
        $r = Invoke-RestMethod -Uri "$base$path" -Method PATCH -Body $json -Headers $h
        ok "PATCH $path ($label)"
        return $r
    } catch { err "PATCH $path ($label): $($_.ErrorDetails.Message)"; return $null }
}

# ============================================================
hdr "1. AUTH - REGISTRATION (All 5 Roles)"
# ============================================================
$roles = @(
    @{name="Demo Donor2"; email="donor2@demo.com"; password="demo1234"; role="donor"},
    @{name="Demo Recipient2"; email="recip2@demo.com"; password="demo1234"; role="recipient"},
    @{name="Demo Admin2"; email="admin2@demo.com"; password="demo1234"; role="admin"},
    @{name="Demo Hospital2"; email="hosp2@demo.com"; password="demo1234"; role="hospital"},
    @{name="Demo Organizer"; email="org2@demo.com"; password="demo1234"; role="organizer"}
)
foreach ($role in $roles) {
    $body = $role | ConvertTo-Json
    try {
        $r = Invoke-RestMethod -Uri "$base/auth/signup" -Method POST -Body $body -ContentType "application/json"
        ok "Register [$($role.role)] -> id=$($r.id)"
        $pass++
    } catch {
        $raw = $_.ErrorDetails.Message
        if ($raw -match "already exists") { info "[$($role.role)] $($role.email) already exists" }
        else { err "Register [$($role.role)]: $raw"; $fail++ }
    }
}

# ============================================================
hdr "2. AUTH - LOGIN (All Roles)"
# ============================================================
$adminTok   = Login "admin@blood.ai"      "password123"
$hospTok    = Login "hospital@blood.ai"   "password123"
$donorTok   = Login "rahul@blood.ai"      "password123"
$recipTok   = Login "recipient@blood.ai"  "password123"
$donor2Tok  = Login "donor2@demo.com"     "demo1234"

# ============================================================
hdr "3. AUTH - /me ENDPOINT"
# ============================================================
$adminMe = GET "/auth/me" "admin /me" $adminTok
$hospMe  = GET "/auth/me" "hospital /me" $hospTok
$donorMe = GET "/auth/me" "donor /me" $donorTok
$recipMe = GET "/auth/me" "recipient /me" $recipTok

# ============================================================
hdr "4. DONOR FEATURES"
# ============================================================
# Get recommendations (public)
$recs = GET "/donors/recommendations?blood_group=O%2B&latitude=12.9716&longitude=77.5946&limit=5" "Donor Recommendations (O+, Bangalore)"
if ($recs) { info "Found $($recs.Count) eligible donor(s)" }

# Get all donors (admin)
$allDonors = GET "/donors/" "All Donors [admin]" $adminTok
if ($allDonors) { info "Total registered donors in DB: $($allDonors.Count)" }

# ============================================================
hdr "5. BLOOD REQUESTS"
# ============================================================
# Active requests (public)
$activeReqs = GET "/requests/active" "Active Blood Requests (public)"
if ($activeReqs) { info "Active requests count: $($activeReqs.Count)" }

# Create a new blood request as recipient
$newReq = POST "/requests/" @{
    blood_group="AB+"; units_required=2; hospital_name="Manipal Hospital"; 
    city="Bangalore"; latitude=12.9716; longitude=77.5946; urgency="high";
    required_date=(Get-Date).AddDays(2).ToString("yyyy-MM-dd")
} "Create Blood Request [recipient]" $recipTok

if ($newReq) {
    $reqId = $newReq.id
    info "Created request id=$reqId blood_group=AB+ urgency=high"
    
    # Admin approve request
    $approved = PATCH "/requests/$reqId" @{ status="approved" } "Approve Request [admin]" $adminTok
    if ($approved) { info "Request status -> $($approved.status)" }
    
    # Admin reject request
    $newReq2 = POST "/requests/" @{
        blood_group="B-"; units_required=1; hospital_name="Apollo Hospital";
        city="Bangalore"; latitude=12.9716; longitude=77.5946; urgency="normal";
        required_date=(Get-Date).AddDays(5).ToString("yyyy-MM-dd")
    } "Create 2nd Request [recipient]" $recipTok
    if ($newReq2) {
        PATCH "/requests/$($newReq2.id)" @{ status="rejected" } "Reject Request [admin]" $adminTok | Out-Null
    }
}

# My requests as recipient
GET "/requests/my" "My Requests [recipient]" $recipTok | Out-Null

# ============================================================
hdr "6. DONATION CAMPS"
# ============================================================
$camps = GET "/camps/" "All Camps (public)" | Out-Null
GET "/camps/all" "All Camps incl. pending [admin]" $adminTok | Out-Null

# Create a new camp as hospital
$campDt = (Get-Date).AddDays(30).ToString("yyyy-MM-ddTHH:mm:ss")
$newCamp = POST "/camps/" @{
    name="Demo Health Drive 2026"; description="Test camp for AI platform demo.";
    city="Bangalore"; address="Demo Hall, MG Road"; latitude=12.9716; longitude=77.5946;
    date_time=$campDt
} "Create Camp [hospital]" $hospTok

if ($newCamp) {
    $campId = $newCamp.id
    info "Created camp id=$campId status=$($newCamp.status)"
    
    # Admin approve camp
    PATCH "/camps/$campId" @{ status="approved" } "Approve Camp [admin]" $adminTok | Out-Null
    
    # Donor registers for camp
    POST "/camps/$campId/register" $null "Register for Camp [donor]" $donorTok | Out-Null
    
    # Get specific camp
    GET "/camps/$campId" "Get Camp Detail" $donorTok | Out-Null
    
    # Donor unregisters
    POST "/camps/$campId/unregister" $null "Unregister from Camp [donor]" $donorTok | Out-Null
}

# ============================================================
hdr "7. DONATION SLOTS & APPOINTMENTS"
# ============================================================
# Get camps list and pick first existing camp
$allCamps = Invoke-RestMethod -Uri "$base/camps/all" -Method GET -Headers @{ Authorization="Bearer $adminTok" }
if ($allCamps -and $allCamps.Count -gt 0) {
    $c = $allCamps[0]
    info "Using camp id=$($c.id) name=$($c.name)"
    
    # Create a slot for this camp
    $slotDate = (Get-Date).AddDays(15).ToString("yyyy-MM-dd")
    $slot = POST "/slots/" @{
        camp_id=$c.id; date=$slotDate; start_time="09:00"; end_time="17:00"; max_capacity=50
    } "Create Slot [hospital]" $hospTok
    
    if ($slot) {
        info "Created slot id=$($slot.id) date=$($slot.date)"
        $slotId = $slot.id
        
        # List slots for camp
        GET "/slots/camp/$($c.id)" "List Slots for Camp" $donorTok | Out-Null
        
        # Book an appointment
        $appt = POST "/appointments/" @{ slot_id=$slotId } "Book Appointment [donor]" $donorTok
        if ($appt) {
            info "Appointment id=$($appt.id) status=$($appt.status)"
            $apptId = $appt.id
            
            # Admin approves appointment
            PATCH "/appointments/$apptId/status" @{ status="approved" } "Approve Appointment [admin]" $adminTok | Out-Null
            
            # Donor's appointments
            GET "/appointments/my" "My Appointments [donor]" $donorTok | Out-Null
        }
    }
}

# ============================================================
hdr "8. BLOOD INVENTORY"
# ============================================================
# Add inventory for hospital
POST "/inventory/" @{ blood_group="O+"; units_available=50; min_threshold=10 } "Add Inventory O+ [hospital]" $hospTok | Out-Null
POST "/inventory/" @{ blood_group="A+"; units_available=30; min_threshold=8  } "Add Inventory A+ [hospital]" $hospTok | Out-Null
POST "/inventory/" @{ blood_group="B-"; units_available=5;  min_threshold=10 } "Add Inventory B- [hospital]" $hospTok | Out-Null
POST "/inventory/" @{ blood_group="AB-";units_available=8;  min_threshold=10 } "Add Inventory AB- [hospital]" $hospTok | Out-Null

# View hospital inventory
GET "/inventory/" "My Inventory [hospital]" $hospTok | Out-Null
# Low stock alerts
GET "/inventory/alerts" "Low Stock Alerts [hospital]" $hospTok | Out-Null

# ============================================================
hdr "9. NOTIFICATIONS"
# ============================================================
GET "/notifications/"          "My Notifications [donor]"  $donorTok | Out-Null
GET "/notifications/"          "My Notifications [admin]"  $adminTok | Out-Null
GET "/notifications/unread-count" "Unread Count [donor]"   $donorTok | Out-Null

# ============================================================
hdr "10. ANALYTICS"
# ============================================================
$analytics = GET "/analytics/admin"    "Admin Analytics" $adminTok
if ($analytics) {
    $s = $analytics.summary
    info "Total Donors: $($s.total_donors) | Total Requests: $($s.total_requests) | Total Camps: $($s.total_camps)"
    info "Emergency Requests: $($s.emergency_requests) | Appointments: $($s.total_appointments)"
}
GET "/analytics/hospital"  "Hospital Analytics" $hospTok | Out-Null
GET "/analytics/donor/$($donorMe.id)" "Donor Analytics [self]" $donorTok | Out-Null

# ============================================================
hdr "11. ADMIN PANEL"
# ============================================================
$users = GET "/admin/users"            "All Users [admin]"        $adminTok
if ($users) { info "Platform has $($users.Count) registered users" }
GET "/admin/pending-requests"          "Pending Requests [admin]" $adminTok | Out-Null
GET "/admin/pending-camps"             "Pending Camps [admin]"    $adminTok | Out-Null

# Verify a donor
if ($donorMe) {
    PATCH "/admin/verify-donor/$($donorMe.id)" @{} "Verify Donor [admin]" $adminTok | Out-Null
}

# ============================================================
hdr "12. AI CHAT"
# ============================================================
$aiMsg1 = POST "/ai/chat" @{ message="What is the universal donor blood group?" } "AI Chat - Universal Donor Q" $donorTok
if ($aiMsg1) { info "AI Response (snippet): $($aiMsg1.response.Substring(0, [Math]::Min(120, $aiMsg1.response.Length)))..." }

$aiMsg2 = POST "/ai/chat" @{ message="Am I eligible to donate blood today?" } "AI Chat - Eligibility Check" $donorTok
if ($aiMsg2) { info "AI Response (snippet): $($aiMsg2.response.Substring(0, [Math]::Min(120, $aiMsg2.response.Length)))..." }

$aiMsg3 = POST "/ai/chat" @{ message="I need O+ blood urgently in Bangalore" } "AI Chat - Emergency Request" $recipTok
if ($aiMsg3) { info "AI Response (snippet): $($aiMsg3.response.Substring(0, [Math]::Min(120, $aiMsg3.response.Length)))..." }

GET "/ai/conversations" "AI Conversation History [donor]" $donorTok | Out-Null

# ============================================================
hdr "13. SWAGGER API DOCS"
# ============================================================
try {
    $docs = Invoke-WebRequest -Uri "http://localhost:8000/docs" -UseBasicParsing
    if ($docs.StatusCode -eq 200) { ok "Swagger UI /docs is accessible (HTTP 200)" }
} catch { err "Swagger /docs not accessible" }

try {
    $openapi = Invoke-RestMethod -Uri "http://localhost:8000/openapi.json"
    $routeCount = $openapi.paths.PSObject.Properties.Count
    ok "OpenAPI spec loaded -> $routeCount API routes documented"
} catch { err "OpenAPI spec not accessible" }

# ============================================================
Write-Host "`n$('='*55)" -ForegroundColor Cyan
Write-Host "  FINAL RESULTS: $pass PASSED | $fail FAILED" -ForegroundColor $(if ($fail -eq 0) {"Green"} else {"Red"})
Write-Host "$('='*55)`n" -ForegroundColor Cyan
if ($fail -gt 0) { exit 1 }
