# =============================================
# WPS SIMULATOR - EXPERIMENTOS COMPLETOS v3
# Fix: TryParse + InvariantCulture, sin matar sims activas
# =============================================

$API  = "http://localhost:3000"
$LOG  = ".\data\experiments_log.txt"
$JSON = ".\data\experiment_results.json"
$inv  = [System.Globalization.CultureInfo]::InvariantCulture
$ns   = [System.Globalization.NumberStyles]::Any

function Log {
    param([string]$msg)
    $line = "$(Get-Date -Format 'HH:mm:ss') | $msg"
    Write-Host $line
    $line | Out-File -FilePath $LOG -Append -Encoding UTF8
}

$results = [ordered]@{}

# -----------------------------------------------------------------------
function ParseCSV-Results {
    $r = Invoke-RestMethod -Uri "$API/api/simulator/csv" -Method GET -ErrorAction SilentlyContinue
    if (-not $r -or -not $r.success) { return $null }
    $rows = ($r.data -split "`n") | Where-Object { $_.Trim() -ne "" }
    if ($rows.Count -lt 1) { return $null }

    # Indices fijos del CSV (sin header tras DELETE):
    # 4=money, 28=totalHarvestedWeight, 31=Agent
    # Si la primera fila es el header real, detectarlo y skipear
    $startIdx = 0
    if ($rows[0] -match "^Timestamp") { $startIdx = 1 }
    $mi = 4; $bi = 28; $ai = 31

    $last = @{}
    for ($i = $startIdx; $i -lt $rows.Count; $i++) {
        $c = $rows[$i] -split ","
        if ($c.Count -le $ai) { continue }
        $agentName = $c[$ai].Trim()
        if ($agentName -eq "" -or $agentName -match "^[0-9]" -or $agentName -eq "Agent") { continue }
        $mVal = 0.0; $bVal = 0.0
        [double]::TryParse(($c[$mi] -replace ",", "."), $ns, $inv, [ref]$mVal) | Out-Null
        [double]::TryParse(($c[$bi] -replace ",", "."), $ns, $inv, [ref]$bVal) | Out-Null
        $last[$agentName] = @{ m = $mVal; b = $bVal }
    }

    if ($last.Count -eq 0) { return $null }
    $mv = @($last.Values | ForEach-Object { $_.m })
    $bv = @($last.Values | ForEach-Object { $_.b })
    return @{
        count = $last.Count
        avgM  = [math]::Round(($mv | Measure-Object -Average).Average, 0)
        minM  = [math]::Round(($mv | Measure-Object -Minimum).Minimum, 0)
        maxM  = [math]::Round(($mv | Measure-Object -Maximum).Maximum, 0)
        avgB  = [math]::Round(($bv | Measure-Object -Average).Average, 2)
        minB  = [math]::Round(($bv | Measure-Object -Minimum).Minimum, 2)
        maxB  = [math]::Round(($bv | Measure-Object -Maximum).Maximum, 2)
    }
}

# -----------------------------------------------------------------------
function Save-Result {
    param([string]$Key, [string]$Label, [string]$ArgsStr, $Res)
    $script:results[$Key] = [ordered]@{
        label      = $Label
        args       = $ArgsStr
        agents     = $Res.count
        avgMoney   = $Res.avgM
        minMoney   = $Res.minM
        maxMoney   = $Res.maxM
        avgBiomasa = $Res.avgB
        minBiomasa = $Res.minB
        maxBiomasa = $Res.maxB
    }
    $script:results | ConvertTo-Json -Depth 5 | Out-File $JSON -Encoding UTF8
}

# -----------------------------------------------------------------------
function Run-Sim {
    param([string]$Key, [string]$Label, [array]$SimArgs)

    # Si ya tenemos resultado valido (avgMoney > 0), saltar
    if ($script:results.Contains($Key) -and $script:results[$Key].avgMoney -gt 0) {
        Log "SKIP: $Key ya tiene avgMoney=$($script:results[$Key].avgMoney)"
        return
    }

    Log "=== START: $Label ==="

    # ESPERAR (nunca matar) si hay sim activa
    $st = Invoke-RestMethod -Uri "$API/api/simulator" -Method GET
    if ($st.running) {
        Log "Sim activa encontrada - esperando que termine (NO se mata)..."
        do { Start-Sleep -Seconds 20; $st = Invoke-RestMethod -Uri "$API/api/simulator" -Method GET } while ($st.running)
    }

    # Limpiar CSV
    Invoke-RestMethod -Uri "$API/api/simulator/csv" -Method DELETE -ErrorAction SilentlyContinue | Out-Null
    Start-Sleep -Seconds 2

    # Lanzar
    $body   = @{ args = $SimArgs } | ConvertTo-Json
    $rStart = Invoke-RestMethod -Uri "$API/api/simulator" -Method POST -Body $body -ContentType "application/json"
    if (-not $rStart.success) { Log "ERROR al iniciar: $($rStart.error)"; return }
    Log "Iniciada: $($SimArgs -join ' ')"

    # Polling cada 20s
    do { Start-Sleep -Seconds 20; $st = Invoke-RestMethod -Uri "$API/api/simulator" -Method GET } while ($st.running)
    Log "Terminada."

    $res = ParseCSV-Results
    if ($null -eq $res) { Log "ADVERTENCIA: CSV sin datos para $Key"; return }
    Log "OK: Agentes=$($res.count) | AvgMoney=$($res.avgM) | MinM=$($res.minM) | MaxM=$($res.maxM) | AvgBiomasa=$($res.avgB)"
    Save-Result -Key $Key -Label $Label -ArgsStr ($SimArgs -join " ") -Res $res
}

# =================================================================
# INICIO DEL SCRIPT
# =================================================================
Log "=== SCRIPT v3 INICIADO ==="

# -- E1_R1: datos previos capturados manualmente --
$results["E1_R1_M1500K_Pers0"] = [ordered]@{
    label="Exp1 - Money=1.5M Varianza=Baja(personality=0)"
    args="-agents 5 -money 1500000 -personality 0 -emotions 1 -land 2 -years 5"
    agents=5; avgMoney=14741402; minMoney=0; maxMoney=0
    avgBiomasa=0; minBiomasa=0; maxBiomasa=0
    nota="Run inicial pre-script; biomasa=0 (no hubo fila de cosecha al final)"
}

# -- E2_R3 capturado manualmente (sim que termino justo antes del relanzamiento) --
$results["E2_R3_M3000K_EmYes"] = [ordered]@{
    label="Exp2 - Money=3.0M CON Emociones"
    args="-agents 5 -money 3000000 -personality 0 -tools 20 -seeds 50 -years 5 -mode single -env local -world 400 -emotions 1 -land 2"
    agents=5; avgMoney=7188082; minMoney=0; maxMoney=0
    avgBiomasa=16186.4; minBiomasa=0; maxBiomasa=0
    nota="Capturado manualmente post-fix; min/max requieren re-run para precisión"
}

# Verificar si hay sim activa y esperar (no capturar como E1_R4)
Log "Verificando estado del simulador..."
$stInit = Invoke-RestMethod -Uri "$API/api/simulator" -Method GET
if ($stInit.running) {
    Log "Sim activa - esperando que termine antes de limpiar CSV..."
    do { Start-Sleep -Seconds 20; $stInit = Invoke-RestMethod -Uri "$API/api/simulator" -Method GET } while ($stInit.running)
    Log "Sim previa termino."
}
Log "Simulador listo para experimentos."

# =================================================================
# EXPERIMENTO 1 - Money x Varianza
# =================================================================
Run-Sim -Key "E1_R2_M1500K_Pers04" `
    -Label "Exp1 - Money=1.5M Varianza=Alta(personality=0.4)" `
    -SimArgs @("-agents","5","-money","1500000","-personality","0.4","-tools","20","-seeds","50","-years","5","-mode","single","-env","local","-world","400","-emotions","1","-land","2")

Run-Sim -Key "E1_R3_M3000K_Pers0" `
    -Label "Exp1 - Money=3.0M Varianza=Baja(personality=0)" `
    -SimArgs @("-agents","5","-money","3000000","-personality","0","-tools","20","-seeds","50","-years","5","-mode","single","-env","local","-world","400","-emotions","1","-land","2")

if (-not $results.Contains("E1_R4_M3000K_Pers04")) {
    Run-Sim -Key "E1_R4_M3000K_Pers04" `
        -Label "Exp1 - Money=3.0M Varianza=Alta(personality=0.4)" `
        -SimArgs @("-agents","5","-money","3000000","-personality","0.4","-tools","20","-seeds","50","-years","5","-mode","single","-env","local","-world","400","-emotions","1","-land","2")
}

# =================================================================
# EXPERIMENTO 2 - Money x Emociones
# =================================================================
# E2_R1 = compartido con E1_R1
$src1 = $results["E1_R1_M1500K_Pers0"]
$e2r1 = [ordered]@{}; $src1.Keys | ForEach-Object { $e2r1[$_] = $src1[$_] }; $e2r1["label"] = "Exp2 - Money=1.5M CON Emociones"
$results["E2_R1_M1500K_EmYes"] = $e2r1

Run-Sim -Key "E2_R2_M1500K_EmNo" `
    -Label "Exp2 - Money=1.5M SIN Emociones" `
    -SimArgs @("-agents","5","-money","1500000","-personality","0","-tools","20","-seeds","50","-years","5","-mode","single","-env","local","-world","400","-emotions","0","-land","2")

Run-Sim -Key "E2_R3_M3000K_EmYes" `
    -Label "Exp2 - Money=3.0M CON Emociones" `
    -SimArgs @("-agents","5","-money","3000000","-personality","0","-tools","20","-seeds","50","-years","5","-mode","single","-env","local","-world","400","-emotions","1","-land","2")

Run-Sim -Key "E2_R4_M3000K_EmNo" `
    -Label "Exp2 - Money=3.0M SIN Emociones" `
    -SimArgs @("-agents","5","-money","3000000","-personality","0","-tools","20","-seeds","50","-years","5","-mode","single","-env","local","-world","400","-emotions","0","-land","2")

# =================================================================
# EXPERIMENTO 3 - Money x Tierras
# =================================================================
# E3_R1 = compartido con E1_R1
$src1b = $results["E1_R1_M1500K_Pers0"]
$e3r1 = [ordered]@{}; $src1b.Keys | ForEach-Object { $e3r1[$_] = $src1b[$_] }; $e3r1["label"] = "Exp3 - Money=1.5M Tierras=2"
$results["E3_R1_M1500K_L2"] = $e3r1

Run-Sim -Key "E3_R2_M1500K_L12" `
    -Label "Exp3 - Money=1.5M Tierras=12" `
    -SimArgs @("-agents","5","-money","1500000","-personality","0","-tools","20","-seeds","50","-years","5","-mode","single","-env","local","-world","400","-emotions","1","-land","12")

Run-Sim -Key "E3_R3_M3000K_L2" `
    -Label "Exp3 - Money=3.0M Tierras=2" `
    -SimArgs @("-agents","5","-money","3000000","-personality","0","-tools","20","-seeds","50","-years","5","-mode","single","-env","local","-world","400","-emotions","1","-land","2")

Run-Sim -Key "E3_R4_M3000K_L12" `
    -Label "Exp3 - Money=3.0M Tierras=12" `
    -SimArgs @("-agents","5","-money","3000000","-personality","0","-tools","20","-seeds","50","-years","5","-mode","single","-env","local","-world","400","-emotions","1","-land","12")

# =================================================================
$results | ConvertTo-Json -Depth 5 | Out-File $JSON -Encoding UTF8
Log "=== TODOS LOS EXPERIMENTOS COMPLETADOS ==="
Write-Host "`n=========== RESUMEN FINAL ===========" -ForegroundColor Green
$results.Keys | ForEach-Object {
    $v = $results[$_]
    Write-Host ("  {0,-38} AvgMoney={1,12}  AvgBiomasa={2,10}" -f $_, $v.avgMoney, $v.avgBiomasa)
}
Write-Host "=====================================" -ForegroundColor Green
