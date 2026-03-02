#!/usr/bin/env pwsh

# v0.60 System Initialization Script
# Purpose: Initialize database tables, restart containers, and verify Homey connection

Write-Output "========================================`n  v0.60 System Initialization`n========================================"

# Step 1: Initialize database tables
Write-Output "`n[1/5] Initializing database tables..."
$sqlFile = "init_tables.sql"
$result = cat $sqlFile | docker exec -i homey_db psql -U postgres -d homey_db 2>&1
if ($result -match "CREATE|INSERT") {
    Write-Output "✅ Database tables created/verified"
} else {
    Write-Output "⚠️  Database initialization output: $result"
}

# Step 2: Verify tables exist
Write-Output "`n[2/5] Verifying database tables..."
$tables = docker exec homey_db psql -U postgres -d homey_db -t -c "SELECT string_agg(tablename, ', ') FROM pg_tables WHERE schemaname='public';" 2>&1
Write-Output "📊 Tables: $tables"

# Step 3: Restart backend container
Write-Output "`n[3/5] Restarting backend..."
docker-compose restart backend 2>&1 | Out-Null
Start-Sleep 3
Write-Output "✅ Backend restarted"

# Step 4: Test Homey API endpoint
Write-Output "`n[4/5] Testing Homey Pro API..."
$response = curl -s http://localhost:3001/api/homey/temperatures 2>&1
Write-Output "🌡️  Homey API Response (first 100 chars): $($response | Select-Object -First 100)"

# Step 5: Check health status
Write-Output "`n[5/5] Checking system health..."
$health = curl -s http://localhost:3001/api/health 2>&1 | ConvertFrom-Json
Write-Output "✅ System Status: $($health.status)"
Write-Output "📦 Database: $($health.database)"

Write-Output "`n========================================`n  ✅ Initialization Complete`n========================================"
