# ============================================================
# E-3D Print -- Script de Parada de Servicos
# Uso: .\stop.ps1
#      .\stop.ps1 -WithDocker   (para tambem o PostgreSQL)
#      .\stop.ps1 -Full         (para tudo + remove volume do banco)
# ============================================================
param(
    [switch]$WithDocker,
    [switch]$Full
)

$ErrorActionPreference = "SilentlyContinue"
$Root    = $PSScriptRoot
$PidsFile = Join-Path $Root ".running.json"

# Helpers de output
function Write-Step($msg) { Write-Host "`n  $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  v $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  ! $msg" -ForegroundColor Yellow }
function Write-Info($msg) { Write-Host "    $msg" -ForegroundColor DarkGray }

# Banner
Write-Host ""
Write-Host "  E-3D Print -- Parando servicos..." -ForegroundColor Red
Write-Host "  --------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

# Sem arquivo de PIDs: tentar por nome
if (-not (Test-Path $PidsFile)) {
    Write-Warn "Nenhum arquivo .running.json encontrado."
    Write-Info "Os servicos podem nao ter sido iniciados com .\start.ps1"
    Write-Host ""

    Write-Step "Tentando encerrar processos node.exe..."
    $nodeProcs = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcs) {
        $nodeProcs | ForEach-Object {
            try { $_.Kill() } catch { }
        }
        Write-Ok "Encerrados $($nodeProcs.Count) processo(s) node.exe"
    } else {
        Write-Info "Nenhum processo node.exe encontrado"
    }

    if ($WithDocker -or $Full) {
        Write-Step "Parando PostgreSQL via Docker..."
        Set-Location $Root
        if ($Full) {
            docker compose down -v 2>&1 | Out-Null
            Write-Ok "PostgreSQL parado e volume removido"
        } else {
            docker compose stop 2>&1 | Out-Null
            Write-Ok "PostgreSQL parado (volume preservado)"
        }
    }

    Write-Host ""
    Write-Host "  Pronto!" -ForegroundColor Green
    Write-Host ""
    exit 0
}

# Carregar PIDs
Write-Step "Encerrando servicos..."

$running = Get-Content $PidsFile | ConvertFrom-Json
$mode    = $running.mode

if ($mode -eq "wt") {
    # Modo Windows Terminal
    $wtPid  = $running.backend
    $wtProc = Get-Process -Id $wtPid -ErrorAction SilentlyContinue

    if ($wtProc) {
        Write-Info "Encerrando Windows Terminal (PID $wtPid) e processos filhos..."

        try {
            $children = Get-CimInstance Win32_Process |
                Where-Object { $_.ParentProcessId -eq $wtPid }
            foreach ($child in $children) {
                $cp = Get-Process -Id $child.ProcessId -ErrorAction SilentlyContinue
                if ($cp) { $cp.Kill() }
            }
        } catch { }

        try {
            $wtProc.Kill()
            Write-Ok "Windows Terminal encerrado (PID $wtPid)"
        } catch {
            Write-Warn "Nao foi possivel encerrar o wt (PID $wtPid)"
        }
    } else {
        Write-Warn "Processo Windows Terminal (PID $wtPid) nao encontrado"
    }

    # Limpar node.exe sobreviventes
    $remaining = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($remaining) {
        $remaining | ForEach-Object { try { $_.Kill() } catch { } }
        Write-Ok "Processos node.exe remanescentes encerrados ($($remaining.Count))"
    }

} else {
    # Modo janelas separadas
    $backendPid  = $running.backend
    $frontendPid = $running.frontend

    # Encerrar Backend
    if ($backendPid) {
        $proc = Get-Process -Id $backendPid -ErrorAction SilentlyContinue
        if ($proc) {
            try {
                $children = Get-CimInstance Win32_Process |
                    Where-Object { $_.ParentProcessId -eq $backendPid }
                foreach ($child in $children) {
                    $cp = Get-Process -Id $child.ProcessId -ErrorAction SilentlyContinue
                    if ($cp) { $cp.Kill() }
                }
            } catch { }

            try {
                $proc.Kill()
                Write-Ok "Backend encerrado  (PID $backendPid)"
            } catch {
                Write-Warn "Nao foi possivel encerrar o backend (PID $backendPid)"
            }
        } else {
            Write-Warn "Backend (PID $backendPid) nao encontrado -- ja encerrado?"
        }
    }

    # Encerrar Frontend
    if ($frontendPid) {
        $proc = Get-Process -Id $frontendPid -ErrorAction SilentlyContinue
        if ($proc) {
            try {
                $children = Get-CimInstance Win32_Process |
                    Where-Object { $_.ParentProcessId -eq $frontendPid }
                foreach ($child in $children) {
                    $cp = Get-Process -Id $child.ProcessId -ErrorAction SilentlyContinue
                    if ($cp) { $cp.Kill() }
                }
            } catch { }

            try {
                $proc.Kill()
                Write-Ok "Frontend encerrado (PID $frontendPid)"
            } catch {
                Write-Warn "Nao foi possivel encerrar o frontend (PID $frontendPid)"
            }
        } else {
            Write-Warn "Frontend (PID $frontendPid) nao encontrado -- ja encerrado?"
        }
    }
}

# Verificar portas liberadas
Start-Sleep -Seconds 1

$port3001 = $false
$port3000 = $false

try { $c = New-Object System.Net.Sockets.TcpClient; $c.Connect("localhost", 3001); $c.Close(); $port3001 = $true } catch { }
try { $c = New-Object System.Net.Sockets.TcpClient; $c.Connect("localhost", 3000); $c.Close(); $port3000 = $true } catch { }

if ($port3001) {
    Write-Warn "Porta 3001 ainda em uso. Execute: Stop-Process -Name node -Force"
} else {
    Write-Ok "Porta 3001 liberada"
}

if ($port3000) {
    Write-Warn "Porta 3000 ainda em uso"
} else {
    Write-Ok "Porta 3000 liberada"
}

# Banco de dados
if ($WithDocker -or $Full) {
    Write-Step "Parando PostgreSQL via Docker..."
    Set-Location $Root

    if ($Full) {
        Write-Warn "Modo -Full: removendo container E volume do banco!"
        docker compose down -v 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "PostgreSQL parado e volume removido (dados apagados)"
        } else {
            Write-Warn "docker compose down falhou -- verifique se o Docker esta rodando"
        }
    } else {
        docker compose stop 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "PostgreSQL parado (volume preservado -- dados mantidos)"
        } else {
            Write-Warn "docker compose stop falhou -- verifique se o Docker esta rodando"
        }
    }
} else {
    Write-Host ""
    Write-Info "Banco de dados PostgreSQL continua rodando."
    Write-Info "Use .\stop.ps1 -WithDocker para para-lo tambem."
    Write-Info "Use .\stop.ps1 -Full para parar e apagar os dados."
}

# Limpar arquivo de PIDs
Remove-Item $PidsFile -Force -ErrorAction SilentlyContinue
Write-Ok ".running.json removido"

# Resumo
Write-Host ""
Write-Host "  --------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Servicos encerrados com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "  Para iniciar novamente: .\start.ps1" -ForegroundColor DarkGray
Write-Host ""
