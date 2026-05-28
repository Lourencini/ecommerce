# ============================================================
# E-3D Print -- Script de Inicializacao
# Uso: .\start.ps1
#      .\start.ps1 -SkipSeed     (pula o seed)
#      .\start.ps1 -SkipDocker   (nao inicia o Docker/Postgres)
#      .\start.ps1 -Fresh        (recria o banco do zero)
# ============================================================
param(
    [switch]$SkipSeed,
    [switch]$SkipDocker,
    [switch]$Fresh
)

$ErrorActionPreference = "Continue"
$Root = $PSScriptRoot
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$PidsFile = Join-Path $Root ".running.json"

# Helpers de output
function Write-Step($msg) { Write-Host "`n  $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  v $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  ! $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "`n  X ERRO: $msg" -ForegroundColor Red }
function Write-Info($msg) { Write-Host "    $msg" -ForegroundColor DarkGray }

# Banner
Clear-Host
Write-Host ""
Write-Host "  E-3D Print -- Ambiente de Desenvolvimento" -ForegroundColor Magenta
Write-Host "  --------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

# Verificar se ja ha servicos rodando
if (Test-Path $PidsFile) {
    $running = Get-Content $PidsFile | ConvertFrom-Json
    $backendAlive  = $running.backend  -and (Get-Process -Id $running.backend  -ErrorAction SilentlyContinue)
    $frontendAlive = $running.frontend -and (Get-Process -Id $running.frontend -ErrorAction SilentlyContinue)

    if ($backendAlive -or $frontendAlive) {
        Write-Warn "Servicos ja estao rodando!"
        Write-Info "Backend PID : $($running.backend)"
        Write-Info "Frontend PID: $($running.frontend)"
        Write-Host ""
        Write-Host "  Use .\stop.ps1 para parar antes de reiniciar." -ForegroundColor Yellow
        Write-Host ""
        exit 0
    }
}

# PASSO 1: Verificar pre-requisitos
Write-Step "[1/7] Verificando pre-requisitos..."

try {
    $nodeVer = node --version 2>&1
    Write-Ok "Node.js $nodeVer"
} catch {
    Write-Fail "Node.js nao encontrado. Instale em https://nodejs.org"
    exit 1
}

try {
    $npmVer = npm --version 2>&1
    Write-Ok "npm $npmVer"
} catch {
    Write-Fail "npm nao encontrado."
    exit 1
}

if (-not $SkipDocker) {
    try {
        $dockerVer = docker --version 2>&1
        Write-Ok "Docker CLI: $dockerVer"
    } catch {
        Write-Warn "Docker nao encontrado. Use -SkipDocker se o Postgres ja estiver rodando."
        $SkipDocker = $true
    }

    # Verificar se o engine esta respondendo
    if (-not $SkipDocker) {
        $engineOk = docker info 2>&1 | Select-String "Server Version" -Quiet
        if (-not $engineOk) {
            Write-Warn "Docker engine nao esta rodando. Tentando iniciar o Docker Desktop..."

            $dockerDesktopPaths = @(
                "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
                "$env:LOCALAPPDATA\Docker\Docker Desktop.exe"
            )
            $ddExe = $dockerDesktopPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

            if ($ddExe) {
                Start-Process $ddExe
                Write-Info "Aguardando Docker Desktop iniciar (ate 90 segundos)..."
                $waited = 0
                $engineReady = $false
                while ($waited -lt 90) {
                    Start-Sleep -Seconds 5
                    $waited += 5
                    $check = docker info 2>&1 | Select-String "Server Version" -Quiet
                    if ($check) { $engineReady = $true; break }
                    Write-Host "    . ($waited s)" -NoNewline -ForegroundColor DarkGray
                }
                Write-Host ""
                if ($engineReady) {
                    Write-Ok "Docker Desktop iniciado com sucesso! ($waited s)"
                } else {
                    Write-Fail "Docker Desktop nao respondeu em 90s. Inicie manualmente e tente de novo."
                    Write-Info "Ou use: .\start.ps1 -SkipDocker  (se o Postgres ja estiver rodando)"
                    exit 1
                }
            } else {
                Write-Fail "Docker Desktop nao encontrado. Inicie o Docker Desktop manualmente e tente de novo."
                Write-Info "Ou use: .\start.ps1 -SkipDocker  (se o Postgres ja estiver rodando)"
                exit 1
            }
        } else {
            Write-Ok "Docker engine respondendo"
        }
    }
}

# PASSO 2: Configurar arquivos .env
Write-Step "[2/7] Configurando variaveis de ambiente..."

$BackendEnv        = Join-Path $BackendDir ".env"
$BackendEnvExample = Join-Path $BackendDir ".env.example"

if (-not (Test-Path $BackendEnv)) {
    Write-Info "Criando backend/.env a partir do .env.example..."
    Copy-Item $BackendEnvExample $BackendEnv

    $rng48 = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
    $buf48 = New-Object byte[] 48
    $rng48.GetBytes($buf48)
    $jwtSecret = [Convert]::ToBase64String($buf48)
    (Get-Content $BackendEnv) `
        -replace 'JWT_SECRET="TROQUE-POR-32-CHARS-ALEATORIO-AQUI"', "JWT_SECRET=`"$jwtSecret`"" |
        Set-Content $BackendEnv
    Write-Ok "backend/.env criado com JWT_SECRET gerado automaticamente"
} else {
    Write-Ok "backend/.env ja existe"
}

$envContent = Get-Content $BackendEnv -Raw

$newVars = @{
    "JWT_EXPIRES_IN"           = '"7d"'
    "API_URL"                  = '"http://localhost:3001/api/v1"'
    "MERCADOPAGO_ACCESS_TOKEN" = '"TEST-insira-sua-chave-aqui"'
    "RESEND_API_KEY"           = '"re_insira-sua-chave-aqui"'
    "EMAIL_FROM"               = '"E-3D Print <noreply@seudominio.com.br>"'
}

$appended = $false
foreach ($key in $newVars.Keys) {
    if ($envContent -notmatch "^$key=") {
        Add-Content $BackendEnv "`n$key=$($newVars[$key])"
        $appended = $true
    }
}
if ($appended) { Write-Ok "Variaveis novas adicionadas ao backend/.env" }

$FrontendEnv        = Join-Path $FrontendDir ".env.local"
$FrontendEnvExample = Join-Path $FrontendDir ".env.local.example"

if (-not (Test-Path $FrontendEnv)) {
    if (Test-Path $FrontendEnvExample) {
        Copy-Item $FrontendEnvExample $FrontendEnv

        $rng32 = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
        $buf32 = New-Object byte[] 32
        $rng32.GetBytes($buf32)
        $nextAuthSecret = [Convert]::ToBase64String($buf32)
        (Get-Content $FrontendEnv) `
            -replace 'NEXTAUTH_SECRET="GERE-COM-openssl-rand-base64-32"', "NEXTAUTH_SECRET=`"$nextAuthSecret`"" |
            Set-Content $FrontendEnv
        Write-Ok "frontend/.env.local criado com NEXTAUTH_SECRET gerado automaticamente"
    } else {
        $rng32b = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
        $buf32b = New-Object byte[] 32
        $rng32b.GetBytes($buf32b)
        $generatedSecret = [Convert]::ToBase64String($buf32b)
        @"
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET="$generatedSecret"
"@ | Set-Content $FrontendEnv
        Write-Ok "frontend/.env.local criado"
    }
} else {
    Write-Ok "frontend/.env.local ja existe"
}

# PASSO 3: Iniciar banco de dados
if (-not $SkipDocker) {
    Write-Step "[3/7] Iniciando PostgreSQL via Docker..."
    Set-Location $Root

    if ($Fresh) {
        Write-Warn "Modo -Fresh: removendo volume do banco anterior..."
        docker compose down -v 2>&1 | Out-Null
        Write-Ok "Volume removido"
    }

    # Funcao: liberar porta 5432 parando containers Docker que a ocupam
    function Clear-Port5432 {
        # Container rodando com a porta mapeada
        $occupant = docker ps --filter "publish=5432" --format "{{.Names}}" 2>$null
        if ($occupant) {
            Write-Warn "Container Docker '$occupant' esta usando a porta 5432."
            Write-Info "Parando '$occupant' temporariamente para liberar a porta..."
            docker stop $occupant 2>$null | Out-Null
            Start-Sleep -Seconds 2
            Write-Info "(Para restaurar depois: docker start $occupant)"
            return $true
        }
        return $false
    }

    # Verificar se o nosso container ja esta rodando
    $containerRunning = docker ps --filter "name=ecommerce3d_postgres" --format "{{.Names}}" 2>$null
    if ($containerRunning -match "ecommerce3d_postgres") {
        Write-Ok "Container PostgreSQL ja esta rodando (reaproveitado)"
    } else {
        # Remover container anterior parado (se existir)
        $existing = docker ps -a --filter "name=ecommerce3d_postgres" --format "{{.Names}}" 2>$null
        if ($existing -match "ecommerce3d_postgres") {
            docker rm -f ecommerce3d_postgres 2>$null | Out-Null
        }

        # Primeira tentativa
        $dockerOutput = docker compose up -d 2>&1
        if ($LASTEXITCODE -ne 0) {
            $outStr = ($dockerOutput | Out-String)
            if ($outStr -match "port is already allocated|address already in use") {
                Write-Warn "Porta 5432 em uso. Identificando o processo..."

                # Descobrir o que ocupa a porta
                $netLine = netstat -ano 2>$null | Where-Object { $_ -match "0\.0\.0\.0:5432\s" }
                $pidOwner = if ($netLine) { ($netLine -split '\s+' | Where-Object { $_ -match '^\d+$' } | Select-Object -Last 1) } else { $null }
                if ($pidOwner) {
                    $ownerProc = Get-Process -Id $pidOwner -ErrorAction SilentlyContinue
                    Write-Info "Porta ocupada por: $($ownerProc.Name) (PID $pidOwner)"
                }

                # Tentar liberar via Docker
                $cleared = Clear-Port5432
                if ($cleared) {
                    Write-Info "Tentando subir o container novamente..."
                    docker compose up -d 2>&1 | Out-Null
                    if ($LASTEXITCODE -eq 0) {
                        Write-Ok "Container PostgreSQL iniciado"
                    } else {
                        Write-Warn "Porta 5432 ocupada por processo nao-Docker (Postgres nativo?)."
                        Write-Info "Usando o banco de dados existente na porta 5432. Continuando..."
                    }
                } else {
                    Write-Warn "Porta 5432 ocupada por processo nao-Docker (Postgres nativo?)."
                    Write-Info "Usando o banco de dados existente na porta 5432. Continuando..."
                }
            } else {
                Write-Fail "Falha ao iniciar Docker Compose."
                Write-Info $outStr
                exit 1
            }
        } else {
            Write-Ok "Container PostgreSQL iniciado"
        }
    }

    # Aguardar Postgres ficar pronto
    Write-Info "Aguardando PostgreSQL ficar pronto..."
    $maxWait = 30
    $elapsed = 0
    $ready   = $false
    while ($elapsed -lt $maxWait) {
        $health = docker inspect --format "{{.State.Health.Status}}" ecommerce3d_postgres 2>$null
        if ($health -eq "healthy") { $ready = $true; break }
        Start-Sleep -Seconds 2
        $elapsed += 2
        Write-Host "    ." -NoNewline -ForegroundColor DarkGray
    }
    Write-Host ""

    if (-not $ready) {
        Start-Sleep -Seconds 3
        Write-Warn "Health check demorou -- continuando mesmo assim..."
    } else {
        Write-Ok "PostgreSQL pronto! ($($elapsed)s)"
    }
} else {
    Write-Step "[3/7] Pulando Docker (-SkipDocker ativo)"
    Write-Info "Certifique-se que o PostgreSQL esta rodando na porta 5432"
}

# PASSO 4: Instalar dependencias
Write-Step "[4/7] Verificando dependencias npm..."

$BackendModules = Join-Path $BackendDir "node_modules"
if (-not (Test-Path $BackendModules)) {
    Write-Info "Instalando dependencias do backend (pode demorar)..."
    Set-Location $BackendDir
    npm install --silent 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Fail "npm install falhou no backend."; exit 1 }
    Write-Ok "Backend: dependencias instaladas"
} else {
    Write-Ok "Backend: node_modules ja existe"
}

$FrontendModules = Join-Path $FrontendDir "node_modules"
if (-not (Test-Path $FrontendModules)) {
    Write-Info "Instalando dependencias do frontend (pode demorar)..."
    Set-Location $FrontendDir
    npm install --legacy-peer-deps --silent 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Fail "npm install falhou no frontend."; exit 1 }
    Write-Ok "Frontend: dependencias instaladas"
} else {
    Write-Ok "Frontend: node_modules ja existe"
}

# PASSO 5: Banco de dados -- migrate e seed
Write-Step "[5/7] Configurando banco de dados..."
Set-Location $BackendDir

Write-Info "Gerando Prisma Client..."
npx prisma generate 2>&1 | Out-Null
Write-Ok "Prisma Client gerado"

Write-Info "Sincronizando schema com o banco (prisma db push)..."
# --force-reset: dropa e recria o schema quando ha colunas NOT NULL sem default
# O seed restaura os dados logo em seguida, entao nao ha perda real em dev
$pushOutput = npx prisma db push --force-reset --accept-data-loss 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Fail "prisma db push falhou. Verifique a DATABASE_URL no backend/.env"
    Write-Info "Saida: $pushOutput"
    Write-Info ""
    Write-Info "DATABASE_URL atual:"
    $dbUrl = (Get-Content $BackendEnv | Where-Object { $_ -match "^DATABASE_URL" })
    Write-Info "  $dbUrl"
    exit 1
}
Write-Ok "Schema aplicado ao banco"

if (-not $SkipSeed) {
    Write-Info "Executando seed (dados iniciais)..."
    $seedOutput = npm run prisma:seed 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "Seed falhou (pode ser normal se os dados ja existem)."
        Write-Info "Detalhes: $($seedOutput | Select-Object -Last 3)"
    } else {
        Write-Ok "Seed executado com sucesso"
    }
} else {
    Write-Ok "Seed pulado (-SkipSeed)"
}

# PASSO 6: Iniciar servicos
Write-Step "[6/7] Iniciando servicos..."
Set-Location $Root

# Liberar portas 3001 e 3000 se ainda ocupadas por processos anteriores
foreach ($port in @(3001, 3000)) {
    $ownerPidStr = (netstat -ano 2>$null |
        Where-Object { $_ -match "0\.0\.0\.0:$port\s.*LISTENING" } |
        ForEach-Object { ($_ -split '\s+')[-1] } |
        Select-Object -First 1)
    if ($ownerPidStr -and $ownerPidStr -match '^\d+$') {
        $ownerPidInt = [int]$ownerPidStr
        $ownerProc = Get-Process -Id $ownerPidInt -ErrorAction SilentlyContinue
        if ($ownerProc) {
            Write-Warn "Porta $port em uso por $($ownerProc.Name) (PID $ownerPidInt). Encerrando..."
            # Matar filhos node.exe e o processo pai
            Get-CimInstance Win32_Process |
                Where-Object { $_.ParentProcessId -eq $ownerPidInt } |
                ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
            Stop-Process -Id $ownerPidInt -Force -ErrorAction SilentlyContinue
            Start-Sleep -Milliseconds 500
            Write-Ok "Porta $port liberada"
        }
    }
}

# Criar scripts temporarios para evitar problemas de aspas aninhadas
$backendLaunch  = Join-Path $Root ".run-backend.ps1"
$frontendLaunch = Join-Path $Root ".run-frontend.ps1"

@"
`$host.UI.RawUI.WindowTitle = 'Backend E-3D Print'
Set-Location "$BackendDir"
Write-Host '--- Backend NestJS (porta 3001) ---' -ForegroundColor Cyan
npm run dev
"@ | Set-Content $backendLaunch -Encoding UTF8

@"
`$host.UI.RawUI.WindowTitle = 'Frontend E-3D Print'
Set-Location "$FrontendDir"
Write-Host '--- Frontend Next.js (porta 3000) ---' -ForegroundColor Cyan
npm run dev
"@ | Set-Content $frontendLaunch -Encoding UTF8

$useWT = $null -ne (Get-Command wt -ErrorAction SilentlyContinue)

if ($useWT) {
    Write-Info "Abrindo no Windows Terminal (tabs separadas)..."

    $wtProc = Start-Process wt -ArgumentList @(
        "new-tab", "--title", "Backend",
        "powershell", "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $backendLaunch,
        ";",
        "new-tab", "--title", "Frontend",
        "powershell", "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $frontendLaunch
    ) -PassThru
    Start-Sleep -Seconds 2

    @{ backend = $wtProc.Id; frontend = $wtProc.Id; mode = "wt" } |
        ConvertTo-Json | Set-Content $PidsFile

    Write-Ok "Servicos abertos no Windows Terminal"

} else {
    Write-Info "Abrindo janelas PowerShell separadas..."

    $backendProc = Start-Process powershell `
        -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-File", $backendLaunch) `
        -PassThru

    Start-Sleep -Milliseconds 500

    $frontendProc = Start-Process powershell `
        -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-File", $frontendLaunch) `
        -PassThru

    @{
        backend  = $backendProc.Id
        frontend = $frontendProc.Id
        mode     = "separate"
    } | ConvertTo-Json | Set-Content $PidsFile

    Write-Ok "Backend  aberto (PID $($backendProc.Id))"
    Write-Ok "Frontend aberto (PID $($frontendProc.Id))"
}

# PASSO 7: Aguardar e mostrar URLs
Write-Step "[7/7] Aguardando servicos iniciarem..."

Write-Info "Aguardando backend na porta 3001..."
$maxWait = 60
$elapsed = 0
$backendReady = $false
while ($elapsed -lt $maxWait) {
    try {
        $conn = New-Object System.Net.Sockets.TcpClient
        $conn.Connect("localhost", 3001)
        $conn.Close()
        $backendReady = $true
        break
    } catch { }
    Start-Sleep -Seconds 2
    $elapsed += 2
    Write-Host "    ." -NoNewline -ForegroundColor DarkGray
}
Write-Host ""

Write-Info "Aguardando frontend na porta 3000..."
$elapsed = 0
$frontendReady = $false
while ($elapsed -lt $maxWait) {
    try {
        $conn = New-Object System.Net.Sockets.TcpClient
        $conn.Connect("localhost", 3000)
        $conn.Close()
        $frontendReady = $true
        break
    } catch { }
    Start-Sleep -Seconds 2
    $elapsed += 2
    Write-Host "    ." -NoNewline -ForegroundColor DarkGray
}
Write-Host ""

# Resumo final
Write-Host ""
Write-Host "  --------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

if ($backendReady) {
    Write-Host "  >> Backend  -> http://localhost:3001/api/v1" -ForegroundColor Green
    Write-Host "  >> Swagger  -> http://localhost:3001/api/docs" -ForegroundColor Green
} else {
    Write-Host "  !  Backend  -> ainda iniciando... (verifique a janela do backend)" -ForegroundColor Yellow
}

if ($frontendReady) {
    Write-Host "  >> Loja     -> http://localhost:3000" -ForegroundColor Green
    Write-Host "  >> Admin    -> http://localhost:3000/admin" -ForegroundColor Green
} else {
    Write-Host "  !  Frontend -> ainda iniciando... (verifique a janela do frontend)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  --------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Credenciais padrao (seed):" -ForegroundColor DarkGray
Write-Host "  Admin  : admin@e3dprint.com   / Admin@123" -ForegroundColor DarkGray
Write-Host "  Cliente: cliente@e3dprint.com / Cliente@123" -ForegroundColor DarkGray
Write-Host ""

$envContent = Get-Content $BackendEnv -Raw
if ($envContent -match "insira-sua-chave") {
    Write-Host "  --------------------------------------------------" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  Configure estas integracoes no backend/.env:" -ForegroundColor Yellow
    if ($envContent -match "TEST-insira") {
        Write-Host "   * MercadoPago: MERCADOPAGO_ACCESS_TOKEN (https://developers.mercadopago.com)" -ForegroundColor Yellow
    }
    if ($envContent -match "re_insira") {
        Write-Host "   * E-mail: RESEND_API_KEY (https://resend.com)" -ForegroundColor Yellow
    }
    Write-Host ""
}

Write-Host "  Para parar todos os servicos: .\stop.ps1" -ForegroundColor DarkGray
Write-Host ""
