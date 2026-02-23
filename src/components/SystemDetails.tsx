import React from 'react';
import { motion } from 'framer-motion';
import {
  Cpu, MonitorSpeaker, MemoryStick, HardDrive,
  Network, Wifi, Zap, Battery, Monitor, Server,
  ArrowUp, ArrowDown, Activity, Gauge,
} from 'lucide-react';
import type { HardwareInfo, ExtendedStats } from '../App';
import '../styles/SystemDetails.css';

/* ═══════════════════════════════════════════
   Types
═══════════════════════════════════════════ */
interface SystemDetailsProps {
  systemStats?: {
    cpu: number; ram: number; disk: number; temperature: number;
    lhmReady?: boolean;
    gpuTemp?: number; gpuUsage?: number; gpuVramUsed?: number; gpuVramTotal?: number;
  };
  hardwareInfo?: HardwareInfo;
  extendedStats?: ExtendedStats;
}

/* ═══════════════════════════════════════════
   Formatters
═══════════════════════════════════════════ */
const fmt = (n: number): string => {
  if (n <= 0) return '0 B/s';
  if (n < 1024) return `${Math.round(n)} B/s`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB/s`;
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB/s`;
  return `${(n / 1073741824).toFixed(2)} GB/s`;
};

const fmtMbps = (bytesPerSec?: number) => {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 Mbps';
  const mbps = (bytesPerSec * 8) / (1024 * 1024);
  return mbps >= 100 ? `${Math.round(mbps)} Mbps` : `${mbps.toFixed(1)} Mbps`;
};

const formatMiBtoGB = (mb?: number | null): string => {
  if (!mb || mb <= 0) return '—';
  const gb = mb / 1024;
  return gb % 1 === 0 ? `${gb.toFixed(0)} GB` : `${gb.toFixed(1)} GB`;
};

const cleanBoardName = (name?: string) => {
  if (!name) return '';
  return name.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*-\s*.*/g, '').trim();
};

const isPlaceholderSerial = (s?: string) => {
  if (!s) return true;
  const v = s.trim().toLowerCase();
  const invalid = ['default string', 'to be filled by o.e.m.', 'to be filled by oem', 'system serial number', 'not specified', 'none', 'unknown', 'baseboard serial number'];
  if (invalid.includes(v)) return true;
  if (/^0+$/.test(s)) return true;
  if (s.trim().length < 3) return true;
  return false;
};

const parseLinkSpeedStr = (s?: string): number | undefined => {
  if (!s) return undefined;
  const str = String(s).trim();
  const m = str.match(/([0-9]+(?:\.[0-9]+)?)\s*(g|m)/i);
  if (m) {
    const val = parseFloat(m[1]);
    const unit = m[2].toLowerCase();
    return unit === 'g' ? val * 1000 : val;
  }
  const num = parseFloat(str.replace(/[^0-9\.]/g, ''));
  if (!isNaN(num)) {
    if (num > 10000) return Math.round(num / 1000000);
    return num;
  }
  return undefined;
};

/* ═══════════════════════════════════════════
   SVG Gradient Definitions
═══════════════════════════════════════════ */
const HudGradients: React.FC = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }}>
    <defs>
      <linearGradient id="hud-cyan-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#00F2FF" />
        <stop offset="100%" stopColor="#00D4AA" />
      </linearGradient>
      <linearGradient id="hud-emerald-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#00FF88" />
        <stop offset="100%" stopColor="#00F2FF" />
      </linearGradient>
      <linearGradient id="hud-heat-low" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#00F2FF" />
        <stop offset="100%" stopColor="#00D4AA" />
      </linearGradient>
      <linearGradient id="hud-heat-mid" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#00F2FF" />
        <stop offset="100%" stopColor="#FFD600" />
      </linearGradient>
      <linearGradient id="hud-heat-high" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#FF6B00" />
        <stop offset="100%" stopColor="#FF2D55" />
      </linearGradient>
    </defs>
  </svg>
);

/* ═══════════════════════════════════════════
   Radial Gauge — glowing circular indicator
═══════════════════════════════════════════ */
const RadialGauge: React.FC<{
  value: number; unit?: string; displayValue?: string | number; size?: number;
}> = ({ value, unit = '%', displayValue, size = 64 }) => {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(value, 100));
  const arcLen = circ * 0.75;
  const offset = arcLen - (pct / 100) * arcLen;
  const rotation = 135;
  const center = size / 2;
  const color = pct > 80 ? '#FF2D55' : pct > 60 ? '#FFD600' : '#00F2FF';

  return (
    <div className="hud-radial-gauge">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* bg track */}
        <circle cx={center} cy={center} r={r}
          fill="none" stroke="rgba(0,242,255,0.08)" strokeWidth={3} strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circ}`} strokeDashoffset={0}
          transform={`rotate(${rotation} ${center} ${center})`}
        />
        {/* active arc */}
        <circle cx={center} cy={center} r={r}
          fill="none" stroke={color} strokeWidth={3} strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circ}`} strokeDashoffset={offset}
          transform={`rotate(${rotation} ${center} ${center})`}
          style={{
            transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease',
            filter: `drop-shadow(0 0 6px ${color}88)`,
          }}
        />
      </svg>
      <div className="hud-radial-text">
        <span className="hud-radial-val" style={{ color }}>{displayValue ?? Math.round(value)}</span>
        <span className="hud-radial-unit">{unit}</span>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   Neon Bar Gauge — thin glowing horizontal bar
═══════════════════════════════════════════ */
const NeonBar: React.FC<{ pct: number; label?: string; display?: string; color?: string }> = ({
  pct, label, display, color = '#00F2FF',
}) => (
  <div className="hud-neon-bar-wrap">
    {(label || display) && (
      <div className="hud-neon-bar-header">
        {label && <span className="hud-neon-bar-label">{label}</span>}
        {display && <span className="hud-neon-bar-display" style={{ color }}>{display}</span>}
      </div>
    )}
    <div className="hud-neon-bar-track">
      <div
        className="hud-neon-bar-fill"
        style={{
          width: `${Math.min(pct, 100)}%`,
          background: `linear-gradient(90deg, ${color}00, ${color})`,
          boxShadow: `0 0 8px ${color}66, 0 0 2px ${color}44`,
        }}
      />
    </div>
  </div>
);

/* ═══════════════════════════════════════════
   Shimmer Loader
═══════════════════════════════════════════ */
const ValueLoader: React.FC = () => (
  <span className="hud-value-loader"><span className="hud-value-loader-bar" /></span>
);

/* ═══════════════════════════════════════════
   Info Row
═══════════════════════════════════════════ */
const Row: React.FC<{
  label: string; value?: React.ReactNode; accent?: boolean;
  chip?: 'green' | 'yellow'; loading?: boolean;
}> = ({ label, value, accent, chip, loading }) => (
  <div className="hud-row">
    <span className="hud-label">{label}</span>
    {loading ? (
      <ValueLoader />
    ) : chip ? (
      <span className={`hud-chip ${chip}`}>{value ?? '—'}</span>
    ) : (
      <div className={`hud-value${accent ? ' hud-accent' : ''}`}>{value ?? '—'}</div>
    )}
  </div>
);

/* ═══════════════════════════════════════════
   IO Speed Badges
═══════════════════════════════════════════ */
const IOStrip: React.FC<{ up: string; down: string }> = ({ up, down }) => (
  <div className="hud-io-strip">
    <span className="hud-io-badge up"><ArrowUp size={9} />{up}</span>
    <span className="hud-io-badge down"><ArrowDown size={9} />{down}</span>
  </div>
);

/* ═══════════════════════════════════════════
   Per-Core Heat Map
═══════════════════════════════════════════ */
const CoreHeatMap: React.FC<{ cores: number[]; threadCount?: number; loading?: boolean }> = ({
  cores, threadCount, loading,
}) => {
  const getHeatColor = (pct: number) => {
    if (pct < 25) return '#00F2FF';
    if (pct < 50) return '#00D4AA';
    if (pct < 75) return '#FFD600';
    return '#FF2D55';
  };

  if (loading) {
    return (
      <div className="hud-heatmap-wrap">
        <div className="hud-heatmap-label">PER-CORE</div>
        <div className="hud-heatmap-grid">
          {Array.from({ length: threadCount || 8 }).map((_, i) => (
            <div key={i} className="hud-heatmap-cell hud-heatmap-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="hud-heatmap-wrap">
      <div className="hud-heatmap-label">PER-CORE</div>
      <div className="hud-heatmap-grid">
        {cores.map((pct, i) => {
          const color = getHeatColor(pct);
          return (
            <div
              key={i}
              className="hud-heatmap-cell"
              title={`Core ${i}: ${pct}%`}
              style={{
                background: `${color}${Math.max(Math.round(pct * 2.55), 18).toString(16).padStart(2, '0')}`,
                boxShadow: pct > 50 ? `0 0 6px ${color}44` : 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   Bento Card — Glassmorphic container
═══════════════════════════════════════════ */
const BentoCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  gaugeValue?: number;
  gaugeUnit?: string;
  gaugeDisplay?: string | number;
  className?: string;
  delay?: number;
  children: React.ReactNode;
}> = ({ icon, title, subtitle, gaugeValue, gaugeUnit, gaugeDisplay, className = '', delay = 0, children }) => (
  <motion.div
    className={`hud-bento-card ${className}`}
    initial={{ opacity: 0, y: 20, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {/* Scanline overlay */}
    <div className="hud-scanline-overlay" />
    {/* Corner accents */}
    <div className="hud-corner hud-corner-tl" />
    <div className="hud-corner hud-corner-tr" />
    <div className="hud-corner hud-corner-bl" />
    <div className="hud-corner hud-corner-br" />

    {/* Top accent line */}
    <div className="hud-card-accent-line">
      <div className="hud-card-accent-fill" style={{ width: `${gaugeValue ?? 0}%` }} />
    </div>

    <div className="hud-card-inner">
      {/* Header */}
      <div className="hud-card-head">
        <div className="hud-card-icon">{icon}</div>
        <div className="hud-card-title-group">
          <div className="hud-card-title">{title}</div>
          {subtitle && <div className="hud-card-subtitle" title={subtitle}>{subtitle}</div>}
        </div>
        {gaugeValue !== undefined && (
          <RadialGauge value={gaugeValue} unit={gaugeUnit} displayValue={gaugeDisplay} />
        )}
      </div>

      {/* Body */}
      <div className="hud-card-body">{children}</div>
    </div>
  </motion.div>
);

/* ═══════════════════════════════════════════
   Main SystemDetails Component
═══════════════════════════════════════════ */
const SystemDetails: React.FC<SystemDetailsProps> = ({ systemStats, hardwareInfo, extendedStats }) => {
  const hw = hardwareInfo;
  const ext = extendedStats;
  const s = systemStats;

  const gpuUsage = ext?.gpuUsage != null && ext.gpuUsage >= 0 ? ext.gpuUsage : (s?.gpuUsage ?? -1);
  const gpuTemp = ext?.gpuTemp != null && ext.gpuTemp >= 0 ? ext.gpuTemp : (s?.gpuTemp ?? -1);
  const gpuVramUsed = ext?.gpuVramUsed != null && ext.gpuVramUsed >= 0 ? ext.gpuVramUsed : (s?.gpuVramUsed ?? -1);
  const gpuVramTotal = ext?.gpuVramTotal != null && ext.gpuVramTotal > 0 ? ext.gpuVramTotal : (s?.gpuVramTotal ?? -1);
  // hasGpu: true if ANY live GPU metric is available (usage, temp, or VRAM)
  const hasGpu = gpuUsage >= 0 || gpuTemp >= 0 || gpuVramUsed >= 0 || gpuVramTotal > 0;
  // gpuInitializing: LHM + nvidia-smi haven't provided data yet (show shimmers, not "no drivers")
  const gpuInitializing = !hasGpu && (!s?.lhmReady || !ext);

  const lhmLoading = !s?.lhmReady;
  const hwLoading = !hw;
  const extLoading = !ext;

  return (
    <motion.section
      className="hud-section"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <HudGradients />

      {/* Section Header */}
      <div className="hud-section-header">
        <div className="hud-section-icon"><Server size={16} /></div>
        <h3 className="hud-section-title">SYSTEM DETAILS</h3>
        <div className="hud-section-line" />
      </div>

      {/* Bento Grid */}
      <div className="hud-bento-grid">

        {/* ── PROCESSOR (large tile) ── */}
        <BentoCard
          icon={<Cpu size={18} />}
          title="PROCESSOR"
          subtitle={hw?.cpuName}
          gaugeValue={gpuTemp >= 0 ? gpuTemp : undefined}
          gaugeUnit="°C"
          gaugeDisplay={gpuTemp >= 0 ? Math.trunc(gpuTemp) : '—'}
          className="hud-tile-cpu"
          delay={0.05}
        >
          <Row label="Cores / Threads" value={hw ? `${hw.cpuCores}C / ${hw.cpuThreads}T` : undefined} loading={hwLoading} />
          <Row label="Max Clock" value={hw?.cpuMaxClock} loading={hwLoading} />
          {ext && ext.cpuClock > 0 ? (
            <NeonBar
              pct={ext.cpuClock > 0 ? Math.min((ext.cpuClock / (parseFloat(hw?.cpuMaxClock || '5') * 1000)) * 100, 100) : 0}
              label="Current Clock"
              display={`${(ext.cpuClock / 1000).toFixed(2)} GHz`}
            />
          ) : extLoading ? (
            <Row label="Current Clock" loading />
          ) : null}
          {ext?.perCoreCpu && ext.perCoreCpu.length > 0 ? (
            <CoreHeatMap cores={ext.perCoreCpu} />
          ) : (
            <CoreHeatMap cores={[]} threadCount={hw?.cpuThreads || 8} loading={extLoading} />
          )}
        </BentoCard>

        {/* ── GRAPHICS (large tile) ── */}
        <BentoCard
          icon={<MonitorSpeaker size={18} />}
          title="GRAPHICS"
          subtitle={hw?.gpuName}
          gaugeValue={hasGpu ? gpuUsage : 0}
          gaugeUnit="%"
          className="hud-tile-gpu"
          delay={0.1}
        >
          {gpuVramTotal > 0 ? (
            <Row label="VRAM" value={formatMiBtoGB(gpuVramTotal)} />
          ) : hw?.gpuVramTotal ? (
            <Row label="VRAM" value={hw.gpuVramTotal} />
          ) : (
            <Row label="VRAM" loading={gpuInitializing} />
          )}
          {hw?.gpuDriverVersion ? (
            <Row label="Driver" value={hw.gpuDriverVersion} />
          ) : (
            <Row label="Driver" loading={hwLoading} />
          )}
          {hasGpu ? (
            <>
              <Row label="GPU Temp" value={gpuTemp >= 0 ? `${Math.trunc(gpuTemp)}°C` : undefined} accent loading={gpuTemp < 0} />
              {gpuVramUsed >= 0 && gpuVramTotal > 0 ? (
                <NeonBar
                  pct={(gpuVramUsed / gpuVramTotal) * 100}
                  label="VRAM Used"
                  display={`${formatMiBtoGB(gpuVramUsed)} / ${formatMiBtoGB(gpuVramTotal)}`}
                  color="#00D4AA"
                />
              ) : (
                <Row label="VRAM Used" loading />
              )}
            </>
          ) : gpuInitializing ? (
            <>
              <Row label="GPU Temp" loading />
              <Row label="VRAM Used" loading />
            </>
          ) : (
            <div className="hud-note">Live stats require NVIDIA drivers</div>
          )}
        </BentoCard>

        {/* ── MEMORY ── */}
        <BentoCard
          icon={<MemoryStick size={18} />}
          title="MEMORY"
          subtitle={hw?.ramBrand || hw?.ramInfo}
          gaugeValue={s?.ram}
          gaugeUnit="%"
          className="hud-tile-mem"
          delay={0.15}
        >
          {hw?.ramInfo ? <Row label="Config" value={hw.ramInfo} /> : <Row label="Config" loading={hwLoading} />}
          {hw?.ramPartNumber ? <Row label="Part Number" value={hw.ramPartNumber} /> : hwLoading && <Row label="Part Number" loading />}
          {hw?.ramSticks ? <Row label="Sticks" value={hw.ramSticks} /> : hwLoading && <Row label="Sticks" loading />}
          {ext && ext.ramTotalGB > 0 ? (
            <NeonBar
              pct={(ext.ramUsedGB / ext.ramTotalGB) * 100}
              label="Used"
              display={`${ext.ramUsedGB.toFixed(1)} / ${ext.ramTotalGB.toFixed(1)} GB`}
              color="#00F2FF"
            />
          ) : (
            <Row label="Used" loading={extLoading} />
          )}
        </BentoCard>

        {/* ── STORAGE ── */}
        <BentoCard
          icon={<HardDrive size={18} />}
          title="STORAGE"
          subtitle={hw?.diskName}
          gaugeValue={s?.disk}
          gaugeUnit="%"
          className="hud-tile-storage"
          delay={0.2}
        >
          <Row label="Type" value={hw?.diskType} loading={hwLoading} />
          <Row
            label="Health"
            value={hw?.diskHealth}
            chip={hw?.diskHealth?.toLowerCase() === 'healthy' ? 'green' : 'yellow'}
            loading={hwLoading}
          />
          <Row
            label="Read/Write"
            loading={extLoading}
            value={ext ? (
              <div className="hud-io-inline">
                <IOStrip up={fmt(ext.diskWriteSpeed || 0)} down={fmt(ext.diskReadSpeed || 0)} />
              </div>
            ) : undefined}
          />
          {hw?.allDrives && hw.allDrives.length > 0 && (
            <div className="hud-drives-section">
              <div className="hud-drives-title">ALL DRIVES</div>
              {hw.allDrives.map((d) => (
                <div key={d.letter} className="hud-drive-row">
                  <span className="hud-drive-letter">{d.letter}</span>
                  <div className="hud-drive-bar-track">
                    <div
                      className="hud-drive-bar-fill"
                      style={{
                        width: `${d.totalGB > 0 ? Math.min(((d.totalGB - d.freeGB) / d.totalGB) * 100, 100) : 0}%`,
                      }}
                    />
                  </div>
                  <span className="hud-drive-info">{d.freeGB} GB free</span>
                </div>
              ))}
            </div>
          )}
        </BentoCard>

        {/* ── NETWORK ── */}
        <BentoCard
          icon={<Network size={18} />}
          title="NETWORK"
          subtitle={hw?.networkAdapter}
          gaugeValue={(() => {
            const up = ext?.networkUp ?? 0;
            const down = ext?.networkDown ?? 0;
            const bytes = up + down;
            const mbps = Math.round(((bytes * 8) / (1024 * 1024)) * 10) / 10;
            const link = parseLinkSpeedStr(hw?.networkLinkSpeed) ?? 1000;
            return link > 0 ? Math.min((mbps / link) * 100, 100) : 0;
          })()}
          gaugeDisplay={Math.round(((ext?.networkUp ?? 0) + (ext?.networkDown ?? 0)) * 8 / (1024 * 1024))}
          gaugeUnit="Mbps"
          className="hud-tile-net"
          delay={0.25}
        >
          {hw?.ipAddress ? <Row label="Local IP Address" value={hw.ipAddress} /> : <Row label="Local IP Address" loading={hwLoading} />}
          {hw?.macAddress ? <Row label="MAC" value={hw.macAddress} /> : hwLoading && <Row label="MAC" loading />}
          {hw?.gateway ? <Row label="Gateway" value={hw.gateway} /> : hwLoading && <Row label="Gateway" loading />}
          {hw?.dns ? <Row label="DNS" value={hw.dns} /> : hwLoading && <Row label="DNS" loading />}
          {ext?.ssid && <Row label="Wi‑Fi SSID" value={ext.ssid} />}
          {ext ? (
            ext.latencyMs != null && ext.latencyMs > 0 ? (
              <NeonBar
                pct={Math.min(ext.latencyMs / 200 * 100, 100)}
                label="Ping/Latency"
                display={`${ext.latencyMs} ms`}
                color={ext.latencyMs < 30 ? '#00FF88' : ext.latencyMs < 80 ? '#FFD600' : '#FF2D55'}
              />
            ) : null
          ) : (
            <Row label="Ping/Latency" loading />
          )}
          {hw?.networkLinkSpeed ? <Row label="Link Speed" value={hw.networkLinkSpeed} /> : <Row label="Link Speed" loading={hwLoading} />}
          {ext ? (
            <Row
              label="Realtime Speed"
              value={(ext.networkUp > 0 || ext.networkDown > 0) ? (
                <div className="hud-io-inline">
                  <IOStrip up={fmtMbps(ext.networkUp)} down={fmtMbps(ext.networkDown)} />
                </div>
              ) : '—'}
            />
          ) : (
            <Row label="Realtime Speed" loading />
          )}
          {ext && ext.wifiSignal > 0 && (
            <div className="hud-inline-row wifi">
              <Wifi size={13} />
              <span>Wi-Fi Signal: {ext.wifiSignal}%</span>
            </div>
          )}
        </BentoCard>

        {/* ── SYSTEM ── */}
        <BentoCard
          icon={<Monitor size={18} />}
          title="SYSTEM"
          subtitle={hw?.windowsVersion}
          gaugeValue={ext && ext.processCount > 0 ? Math.min((ext.processCount / 500) * 100, 100) : 0}
          gaugeUnit="proc"
          gaugeDisplay={ext?.processCount ?? 0}
          className="hud-tile-sys"
          delay={0.3}
        >
          <Row label="Build" value={hw?.windowsBuild} loading={hwLoading} />
          <Row label="Motherboard" value={hw?.motherboardProduct ? cleanBoardName(hw.motherboardProduct) : hw?.motherboardManufacturer} loading={hwLoading} />
          <Row label="BIOS" value={(hw?.biosVersion || hw?.biosDate) ? `${hw?.biosVersion || 'Unknown'}${hw?.biosDate ? ' — ' + hw.biosDate : ''}` : undefined} loading={hwLoading} />
          <Row label="Board S/N" value={!isPlaceholderSerial(hw?.motherboardSerial) ? hw?.motherboardSerial : (hw ? '—' : undefined)} loading={hwLoading} />
          <Row label="Uptime" value={ext?.systemUptime ?? hw?.systemUptime} accent loading={!(ext?.systemUptime || hw?.systemUptime) && (extLoading || hwLoading)} />
          <Row label="Power Plan" value={hw?.powerPlan ?? (hw ? '—' : undefined)} loading={hwLoading} />
          {hw?.hasBattery && (
            <div className="hud-inline-row batt">
              <Battery size={13} />
              <span>{hw.batteryPercent}% — {hw.batteryStatus}</span>
            </div>
          )}
        </BentoCard>

      </div>
    </motion.section>
  );
};

export default SystemDetails;

