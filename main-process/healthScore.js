const { ipcMain } = require('electron');

/**
 * System Health Score — aggregates real-time metrics into a 0–100 score.
 * 
 * Weights:
 *   CPU temperature (20%) — penalise above 75 °C, critical above 90 °C
 *   CPU usage       (15%) — sustained high usage = unhealthy
 *   RAM pressure    (15%) — penalise above 80 %
 *   Disk free space (15%) — penalise below 20 %
 *   GPU temperature (15%) — penalise above 80 °C
 *   Network latency (10%) — penalise above 100 ms
 *   Disk health     (10%) — binary: healthy = 100, degraded = 50, unknown = 70
 */

function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

function computeScore(stats, hardwareInfo) {
  const factors = [];

  // Detect CPU vendor for temperature thresholds
  const cpuName = (hardwareInfo?.cpuName || '').toLowerCase();
  const isAMD = cpuName.includes('amd') || cpuName.includes('ryzen') || cpuName.includes('epyc');
  // Intel: Tjunction ~100°C → warning 82°C, critical 92°C
  // AMD: Tctl ~95°C → warning 80°C, critical 90°C
  const cpuWarnTemp = isAMD ? 80 : 82;
  const cpuCritTemp = isAMD ? 90 : 92;

  // ── CPU Temperature (20 %) ────────────────────────────────────────────────
  const cpuTemp = stats?.temperature ?? 0;
  if (cpuTemp > 0) {
    // 30 °C = 100, warnTemp = 60, critTemp = 0
    const tempScore = cpuTemp <= 30 ? 100
      : cpuTemp >= cpuCritTemp ? 0
      : 100 - ((cpuTemp - 30) / (cpuCritTemp - 30)) * 100;
    factors.push({ key: 'cpuTemp', label: 'CPU Temp', score: clamp(tempScore, 0, 100), weight: 0.20, value: `${Math.round(cpuTemp)}°C`, status: cpuTemp > cpuCritTemp ? 'critical' : cpuTemp > cpuWarnTemp ? 'warning' : 'good' });
  } else {
    factors.push({ key: 'cpuTemp', label: 'CPU Temp', score: 70, weight: 0.20, value: 'N/A', status: 'unknown' });
  }

  // ── CPU Usage (15 %) ───────────────────────────────────────────────────────
  const cpuUsage = stats?.cpu ?? 0;
  const cpuScore = cpuUsage <= 30 ? 100
    : cpuUsage >= 95 ? 10
    : 100 - ((cpuUsage - 30) / 65) * 90;
  factors.push({ key: 'cpuUsage', label: 'CPU Usage', score: clamp(cpuScore, 0, 100), weight: 0.15, value: `${Math.round(cpuUsage)}%`, status: cpuUsage > 90 ? 'critical' : cpuUsage > 70 ? 'warning' : 'good' });

  // ── RAM Pressure (15 %) ────────────────────────────────────────────────────
  const ramUsage = stats?.ram ?? 0;
  const ramScore = ramUsage <= 50 ? 100
    : ramUsage >= 95 ? 5
    : 100 - ((ramUsage - 50) / 45) * 95;
  factors.push({ key: 'ramUsage', label: 'RAM Usage', score: clamp(ramScore, 0, 100), weight: 0.15, value: `${Math.round(ramUsage)}%`, status: ramUsage > 90 ? 'critical' : ramUsage > 80 ? 'warning' : 'good' });

  // ── Disk Free Space (15 %) ─────────────────────────────────────────────────
  const diskUsage = stats?.disk ?? 0;
  const diskScore = diskUsage <= 60 ? 100
    : diskUsage >= 95 ? 5
    : 100 - ((diskUsage - 60) / 35) * 95;
  factors.push({ key: 'diskSpace', label: 'Disk Space', score: clamp(diskScore, 0, 100), weight: 0.15, value: `${Math.round(100 - diskUsage)}% free`, status: diskUsage > 90 ? 'critical' : diskUsage > 80 ? 'warning' : 'good' });

  // ── GPU Temperature (15 %) ─────────────────────────────────────────────────
  const gpuTemp = stats?.gpuTemp ?? -1;
  if (gpuTemp > 0) {
    const gpuTempScore = gpuTemp <= 35 ? 100
      : gpuTemp >= 95 ? 0
      : 100 - ((gpuTemp - 35) / 60) * 100;
    factors.push({ key: 'gpuTemp', label: 'GPU Temp', score: clamp(gpuTempScore, 0, 100), weight: 0.15, value: `${Math.round(gpuTemp)}°C`, status: gpuTemp > 85 ? 'critical' : gpuTemp > 75 ? 'warning' : 'good' });
  } else {
    factors.push({ key: 'gpuTemp', label: 'GPU Temp', score: 80, weight: 0.15, value: 'N/A', status: 'unknown' });
  }

  // ── Network Latency (10 %) ─────────────────────────────────────────────────
  const latency = stats?.latencyMs ?? 0;
  let netScore = 100;
  if (latency > 0) {
    netScore = latency <= 20 ? 100
      : latency >= 200 ? 10
      : 100 - ((latency - 20) / 180) * 90;
  }
  factors.push({ key: 'networkLatency', label: 'Latency', score: clamp(netScore, 0, 100), weight: 0.10, value: latency > 0 ? `${Math.round(latency)}ms` : 'N/A', status: latency > 150 ? 'critical' : latency > 80 ? 'warning' : 'good' });

  // ── Disk Health (10 %) ─────────────────────────────────────────────────────
  const diskHealth = (hardwareInfo?.diskHealth || '').toLowerCase();
  let healthVal = 70; // unknown default
  let healthStatus = 'unknown';
  if (diskHealth === 'healthy' || diskHealth === 'ok' || diskHealth === 'good') {
    healthVal = 100; healthStatus = 'good';
  } else if (diskHealth === 'caution' || diskHealth === 'degraded') {
    healthVal = 40; healthStatus = 'warning';
  } else if (diskHealth === 'bad' || diskHealth === 'critical') {
    healthVal = 10; healthStatus = 'critical';
  }
  factors.push({ key: 'diskHealth', label: 'Storage', score: healthVal, weight: 0.10, value: diskHealth || 'Unknown', status: healthStatus });

  // ── Compute weighted total ────────────────────────────────────────────────
  let totalScore = 0;
  for (const f of factors) {
    totalScore += f.score * f.weight;
  }

  return {
    score: Math.round(clamp(totalScore, 0, 100)),
    factors,
  };
}

function registerIPC() {
  ipcMain.handle('health:compute', async (_event, stats, hardwareInfo) => {
    return computeScore(stats, hardwareInfo);
  });
}

module.exports = { registerIPC, computeScore };
