# Compute UNIQUE rendimiento per lote (avoiding double-counting compra/venta)
$json = Get-Content 'c:\Users\admin\.gemini\antigravity\scratch\Cierre_regionales\src\core\snapshots\cierre_2026_05.json' -Raw | ConvertFrom-Json
$all = @($json | Where-Object { $_.cabezasGeneral -gt 0 -or $_.cabezasOfi -gt 0 })

# Collect unique lotes by id_lote
$lotes = @{}
foreach($a in $all) {
    foreach($op in $a.operacionesDetalle) {
        $lid = [string]$op.id_lote
        if (-not $lotes.ContainsKey($lid)) {
            $lotes[$lid] = @{
                rend = [double]($op.rendimiento_real)
                cab = [double]($op.cantidad)
                tipo = [string]$op.tipo
            }
        }
    }
}

Write-Output "=== MAYO 2026 - Rend% ponderado por cabezas (LOTES UNICOS) ==="
Write-Output "Lotes unicos: $($lotes.Count)"

$sRC=0; $sC=0; $sRCi=0; $sCi=0; $sRCf=0; $sCf=0; $sRCm=0; $sCm=0; $sRCc=0; $sCc=0
foreach($l in $lotes.Values) {
    $r = $l.rend; $c = $l.cab
    if ($c -le 0) { continue }
    $sRC += $r * $c; $sC += $c
    $t = $l.tipo
    if ($t -match 'MAG') { $sRCm += $r * $c; $sCm += $c }
    elseif ($t -match 'FAENA') { $sRCf += $r * $c; $sCf += $c }
    elseif ($t -match 'CRIA|REPRODUCTOR') { $sRCc += $r * $c; $sCc += $c }
    else { $sRCi += $r * $c; $sCi += $c }
}

$rendGral = [math]::Round($sRC / $sC, 2)
Write-Output "REND GRAL: $rendGral% (panel muestra 2.82%)"
Write-Output "Total cab (unicos): $sC"
if ($sCi -gt 0) { Write-Output "INV:   $([math]::Round($sRCi / $sCi, 2))%" }
if ($sCf -gt 0) { Write-Output "FAENA: $([math]::Round($sRCf / $sCf, 2))%" }
if ($sCm -gt 0) { Write-Output "MAG:   $([math]::Round($sRCm / $sCm, 2))%" }
if ($sCc -gt 0) { Write-Output "CRIA:  $([math]::Round($sRCc / $sCc, 2))%" }

# Check $/CAB using unique lotes
$tImpV=0; $tImpC=0; $tCabU=0
foreach($l in $lotes.Values) { $tCabU += $l.cab }
Write-Output "Cab unicos: $tCabU"

# ABRIL
$jsonA = Get-Content 'c:\Users\admin\.gemini\antigravity\scratch\Cierre_regionales\src\core\snapshots\cierre_2026_04.json' -Raw | ConvertFrom-Json
$allA = @($jsonA | Where-Object { $_.cabezasGeneral -gt 0 -or $_.cabezasOfi -gt 0 })
$lotesA = @{}
foreach($a in $allA) {
    foreach($op in $a.operacionesDetalle) {
        $lid = [string]$op.id_lote
        if (-not $lotesA.ContainsKey($lid)) {
            $lotesA[$lid] = @{
                rend = [double]($op.rendimiento_real)
                cab = [double]($op.cantidad)
                tipo = [string]$op.tipo
            }
        }
    }
}
$sRC2=0; $sC2=0; $sRCi2=0; $sCi2=0; $sRCf2=0; $sCf2=0
foreach($l in $lotesA.Values) {
    $r = $l.rend; $c = $l.cab
    if ($c -le 0) { continue }
    $sRC2 += $r * $c; $sC2 += $c
    $t = $l.tipo
    if ($t -match 'FAENA') { $sRCf2 += $r * $c; $sCf2 += $c }
    elseif (-not ($t -match 'MAG|CRIA|REPRODUCTOR')) { $sRCi2 += $r * $c; $sCi2 += $c }
}
Write-Output "`n=== ABRIL 2026 - LOTES UNICOS ==="
Write-Output "REND GRAL: $([math]::Round($sRC2 / $sC2, 2))% (panel muestra ~2.5%)"
if ($sCi2 -gt 0) { Write-Output "INV:   $([math]::Round($sRCi2 / $sCi2, 2))%" }
if ($sCf2 -gt 0) { Write-Output "FAENA: $([math]::Round($sRCf2 / $sCf2, 2))%" }
Write-Output "Cab unicos: $sC2"
