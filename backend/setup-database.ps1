# Database Setup Helper Script
Write-Host "`n=== Database Setup Helper ===`n"

Write-Host "Step 1: Checking PostgreSQL..."
try {
    $psqlVersion = psql --version 2>&1
    Write-Host "✅ PostgreSQL found: $psqlVersion"
} catch {
    Write-Host "❌ PostgreSQL not found in PATH"
    Write-Host "Please install PostgreSQL or add it to your PATH"
    exit 1
}

Write-Host "`nStep 2: Please enter your PostgreSQL password:"
$password = Read-Host "Password (or press Enter for 'postgres')"

if ([string]::IsNullOrWhiteSpace($password)) {
    $password = "postgres"
}

Write-Host "`nStep 3: Creating database..."
$env:PGPASSWORD = $password

try {
    psql -U postgres -c "CREATE DATABASE property_management_uae;" 2>&1 | Out-Null
    Write-Host "✅ Database created successfully!"
} catch {
    Write-Host "⚠️  Database might already exist (this is okay)"
}

Write-Host "`nStep 4: Updating .env file..."
$envContent = Get-Content .env -Raw
$envContent = $envContent -replace "DB_PASSWORD=", "DB_PASSWORD=$password"
Set-Content .env -Value $envContent
Write-Host "✅ .env file updated with password"

Write-Host "`n✅ Setup complete! Now run:"
Write-Host "   npm run db:migrate"
Write-Host "   npm run db:seed"
Write-Host "   npm run dev"

