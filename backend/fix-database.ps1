# Quick fix script for database setup
Write-Host "`n=== Database Setup Fix ===`n"

Write-Host "The database password is not set in .env file.`n"

Write-Host "Do you have PostgreSQL installed? (Y/N)"
$hasPostgres = Read-Host

if ($hasPostgres -eq "Y" -or $hasPostgres -eq "y") {
    Write-Host "`nWhat is your PostgreSQL password?"
    Write-Host "(Common defaults: 'postgres' or password you set during installation)"
    $password = Read-Host "Password"
    
    if ([string]::IsNullOrWhiteSpace($password)) {
        $password = "postgres"
        Write-Host "Using default: postgres"
    }
    
    # Update .env file
    Write-Host "`nUpdating .env file..."
    $envContent = Get-Content .env -Raw
    $envContent = $envContent -replace "DB_PASSWORD=", "DB_PASSWORD=$password"
    Set-Content .env -Value $envContent -NoNewline
    Write-Host "✅ .env updated!"
    
    # Test connection
    Write-Host "`nTesting connection..."
    node test-connection.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Great! Database connection works!"
        Write-Host "`nNext steps:"
        Write-Host "1. Run: npm run db:migrate"
        Write-Host "2. Run: npm run db:seed"
        Write-Host "3. Run: npm run dev"
    } else {
        Write-Host "`n⚠️  Connection failed. Let's check if database exists..."
        Write-Host "`nTrying to create database..."
        
        $env:PGPASSWORD = $password
        $createDb = psql -U postgres -c "CREATE DATABASE property_management_uae;" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database created!"
            Write-Host "`nNow run: npm run db:migrate"
        } else {
            Write-Host "⚠️  Could not create database automatically"
            Write-Host "Please create it manually:"
            Write-Host "  psql -U postgres"
            Write-Host "  CREATE DATABASE property_management_uae;"
            Write-Host "  \q"
        }
    }
} else {
    Write-Host "`n❌ PostgreSQL is not installed."
    Write-Host "`nPlease install PostgreSQL first:"
    Write-Host "https://www.postgresql.org/download/windows/"
    Write-Host "`nAfter installation, run this script again."
}

Write-Host "`n"

