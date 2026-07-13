$base = "http://localhost:8000/api"
$ErrorActionPreference = "Stop"
$pass = 0; $fail = 0

function Test-Register($name, $email, $role) {
    $body = @{ full_name=$name; email=$email; password="test123"; role=$role } | ConvertTo-Json
    try {
        $r = Invoke-RestMethod -Uri "$base/auth/signup" -Method POST -Body $body -ContentType "application/json"
        Write-Host "  PASS  Register $role ($email): id=$($r.id)" -ForegroundColor Green
        $global:pass++
    } catch {
        $raw = $_.ErrorDetails.Message
        if ($raw -match "already exists") {
            Write-Host "  INFO  $role ($email) already seeded" -ForegroundColor Yellow
        } else {
            Write-Host "  FAIL  Register $role ($email): $raw" -ForegroundColor Red
            $global:fail++
        }
    }
}

function Test-Login($email, $pwd) {
    $body = @{ email=$email; password=$pwd } | ConvertTo-Json
    try {
        $r = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body $body -ContentType "application/json"
        Write-Host "  PASS  Login $email -> role=$($r.role)" -ForegroundColor Green
        $global:pass++
        return $r.access_token
    } catch {
        Write-Host "  FAIL  Login $email : $($_.ErrorDetails.Message)" -ForegroundColor Red
        $global:fail++
        return $null
    }
}

function Test-GetMe($token, $label) {
    $headers = @{ Authorization = "Bearer $token" }
    try {
        $r = Invoke-RestMethod -Uri "$base/auth/me" -Method GET -Headers $headers
        Write-Host "  PASS  /me ($label) -> role=$($r.role) name=$($r.full_name)" -ForegroundColor Green
        $global:pass++
        return $r
    } catch {
        Write-Host "  FAIL  /me ($label): $($_.ErrorDetails.Message)" -ForegroundColor Red
        $global:fail++
        return $null
    }
}

function Test-Get($url, $label, $token=$null) {
    $headers = @{}
    if ($token) { $headers["Authorization"] = "Bearer $token" }
    try {
        $r = Invoke-RestMethod -Uri "$base$url" -Method GET -Headers $headers
        $count = if ($r -is [array]) { $r.Count } else { "object" }
        Write-Host "  PASS  GET $url ($label) -> $count items" -ForegroundColor Green
        $global:pass++
        return $r
    } catch {
        Write-Host "  FAIL  GET $url ($label): $($_.ErrorDetails.Message)" -ForegroundColor Red
        $global:fail++
        return $null
    }
}

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  AI Blood Donation Platform - Smoke Tests" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

Write-Host "[1] Registration (new roles)" -ForegroundColor White
Test-Register "Test Donor"     "donor@test.com"     "donor"
Test-Register "Test Recipient" "recipient@test.com" "recipient"
Test-Register "Test Admin"     "admin@test.com"     "admin"
Test-Register "City Hospital"  "hospital@test.com"  "hospital"
Test-Register "Camp Organizer" "organizer@test.com" "organizer"

Write-Host "`n[2] Login Flow" -ForegroundColor White
$donorTok  = Test-Login "donor@test.com"      "test123"
$adminTok  = Test-Login "admin@test.com"      "test123"
$hospTok   = Test-Login "hospital@test.com"   "test123"
# Also test seeded users
$seedAdTok = Test-Login "admin@blood.ai"      "password123"
$seedDoTok = Test-Login "rahul@blood.ai"      "password123"

Write-Host "`n[3] /me Endpoint" -ForegroundColor White
if ($donorTok)  { Test-GetMe $donorTok  "new-donor"  | Out-Null }
if ($adminTok)  { Test-GetMe $adminTok  "new-admin"  | Out-Null }
if ($seedAdTok) { Test-GetMe $seedAdTok "seed-admin" | Out-Null }
if ($seedDoTok) { Test-GetMe $seedDoTok "seed-donor" | Out-Null }

Write-Host "`n[4] Public Endpoints" -ForegroundColor White
Test-Get "/requests/active"  "active-requests" | Out-Null
Test-Get "/camps/"           "camps-list"       | Out-Null
$donors = Test-Get "/donors/recommendations?blood_group=O%2B&latitude=12.9716&longitude=77.5946&limit=5" "recommendations"
if ($donors) { Write-Host "       -> Found $($donors.Count) recommendations" -ForegroundColor DarkGray }

Write-Host "`n[5] Protected Endpoints" -ForegroundColor White
if ($seedAdTok) {
    Test-Get "/admin/users"      "admin-users-list" $seedAdTok | Out-Null
    Test-Get "/analytics/admin"   "analytics"        $seedAdTok | Out-Null
}
if ($donorTok) {
    Test-Get "/notifications/"   "my-notifications" $donorTok | Out-Null
}

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  Results: $pass passed  |  $fail failed" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
Write-Host "============================================`n" -ForegroundColor Cyan
if ($fail -gt 0) { exit 1 }
