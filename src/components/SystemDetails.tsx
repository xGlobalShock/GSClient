import React from 'react';
import { motion } from 'framer-motion';
import {
  Cpu, MonitorSpeaker, MemoryStick, HardDrive,
  Network, Wifi, Zap, Battery, Monitor, Server,
  ArrowUp, ArrowDown,
} from 'lucide-react';
import type { HardwareInfo, ExtendedStats } from '../App';
import '../styles/SystemDetails.css';

interface SystemDetailsProps {
  systemStats?: { cpu: number; ram: number; disk: number; temperature: number };
  hardwareInfo?: HardwareInfo;
  extendedStats?: ExtendedStats;
}

const fmt = (n: number): string => {
  if (n <= 0) return '0 B/s';
  if (n < 1024) return `${Math.round(n)} B/s`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB/s`;
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB/s`;
  return `${(n / 1073741824).toFixed(2)} GB/s`;
};

// Convert MiB (nvidia-smi) to GB for UI display (show 1 decimal unless whole number)
const formatMiBtoGB = (mb?: number | null): string => {
  if (!mb || mb <= 0) return '—';
  const gb = mb / 1024;
  return gb % 1 === 0 ? `${gb.toFixed(0)} GB` : `${gb.toFixed(1)} GB`;
};

/* ─── Shared gradient def ─── */
const GradDef: React.FC = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }}>
    <defs>
      <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#06b6d4" />
      </linearGradient>
    </defs>
  </svg>
);

/* ─── Arc gauge ─── */
const ArcGauge: React.FC<{ value: number; unit?: string; displayValue?: string | number }> = ({ value, unit = '%', displayValue }) => {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(value, 100));
  const arcLen = circ * 0.75;
  const offset = arcLen - (pct / 100) * arcLen;
  const rotation = 135;

  return (
    <div className="sysdet-arc-gauge">
      <svg width="58" height="58" viewBox="0 0 58 58">
        <circle cx="29" cy="29" r={r} className="sysdet-arc-bg"
          strokeDasharray={`${arcLen} ${circ}`}
          strokeDashoffset={0}
          strokeWidth={3}
          transform={`rotate(${rotation} 29 29)`}
        />
        <circle cx="29" cy="29" r={r} className="sysdet-arc-fill"
          strokeDasharray={`${arcLen} ${circ}`}
          strokeDashoffset={offset}
          strokeWidth={3}
          transform={`rotate(${rotation} 29 29)`}
        />
      </svg>
      <div className="sysdet-arc-text">
        <span className="sysdet-arc-val">{displayValue ?? Math.round(value)}</span>
        <span className="sysdet-arc-unit">{unit}</span>
      </div>
    </div>
  );
};

/* ─── Info row ─── */
const Row: React.FC<{ label: string; value?: React.ReactNode; accent?: boolean; chip?: 'green' | 'yellow' }> = ({ label, value, accent, chip }) => (
  <div className="sysdet-row">
    <span className="sysdet-label">{label}</span>
    {chip ? (
      <span className={`sysdet-chip ${chip}`}>{value ?? '—'}</span>
    ) : (
      <div className={`sysdet-value${accent ? ' sysdet-accent' : ''}`}>{value ?? '—'}</div>
    )}
  </div>
);

/* ─── Usage bar row ─── */
const BarRow: React.FC<{ label: string; pct: number; display: string }> = ({ label, pct, display }) => (
  <div className="sysdet-bar-row">
    <div className="sysdet-bar-label-row">
      <span className="sysdet-label">{label}</span>
      <span className="sysdet-value sysdet-accent">{display}</span>
    </div>
    <div className="sysdet-minibar">
      <div className="sysdet-minibar-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  </div>
);

/* ─── IO badges ─── */
const IOStrip: React.FC<{ up: string; down: string }> = ({ up, down }) => (
  <div className="sysdet-io-strip">
    <span className="sysdet-io-badge up"><ArrowUp size={9} />{up}</span>
    <span className="sysdet-io-badge down"><ArrowDown size={9} />{down}</span>
  </div>
);

/* ─── Card ─── */
const Card: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  gaugeValue?: number;
  gaugeUnit?: string;
  gaugeDisplay?: string | number;
  barPct?: number;
  delay?: number;
  children: React.ReactNode;
}> = ({ icon, title, subtitle, gaugeValue, gaugeUnit, gaugeDisplay, barPct, delay = 0, children }) => (
  <motion.div
    className="sysdet-box"
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.38, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {/* top usage accent bar */}
    <div className="sysdet-card-bar">
      <div className="sysdet-card-bar-fill" style={{ width: `${barPct ?? gaugeValue ?? 0}%` }} />
    </div>

    <div className="sysdet-card-inner">
      {/* header */}
      <div className="sysdet-card-head">
        <div className="sysdet-card-icon">{icon}</div>
        <div className="sysdet-card-title-group">
          <div className="sysdet-card-title">{title}</div>
          {subtitle && <div className="sysdet-card-subtitle" title={subtitle}>{subtitle}</div>}
        </div>
        {gaugeValue !== undefined && <ArcGauge value={gaugeValue} unit={gaugeUnit} displayValue={gaugeDisplay} />}
      </div>

      {/* body */}
      <div className="sysdet-body">{children}</div>
    </div>
  </motion.div>
);

/* ═══════════════════════════════════════════
   Main component
═══════════════════════════════════════════ */

// Clean motherboard/product name for display (remove parenthetical SKU/codes)
const cleanBoardName = (name?: string) => {
  if (!name) return '';
  // remove parenthetical content and trailing codes like " - something"
  return name.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*-\s*.*/g, '').trim();
};

const SystemDetails: React.FC<SystemDetailsProps> = ({ systemStats, hardwareInfo, extendedStats }) => {
  const hw = hardwareInfo;
  const ext = extendedStats;
  const s = systemStats;
  const hasGpu = ext != null && ext.gpuUsage >= 0;

  return (
    <motion.section className="sysdet-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      <GradDef />
      <div className="sysdet-header">
        <Server size={15} />
        <h3 className="sysdet-title">System Details</h3>
      </div>

      <div className="sysdet-grid">

        {/* ── CPU ── */}
        <Card icon={<Cpu size={17} />} title="Processor"
          subtitle={hw?.cpuName}
          gaugeValue={s?.cpu} gaugeUnit="%"
          delay={0.04}
        >
          <Row label="Cores / Threads" value={hw ? `${hw.cpuCores}C / ${hw.cpuThreads}T` : undefined} />
          <Row label="Max Clock" value={hw?.cpuMaxClock} />
          <Row label="CPU Temp" value={s?.temperature > 0 ? `${s.temperature}°C` : undefined} accent />
          {ext && ext.cpuClock > 0 && (
            <Row label="Current Clock" value={`${(ext.cpuClock / 1000).toFixed(2)} GHz`} accent />
          )}
          {ext && ext.perCoreCpu && ext.perCoreCpu.length > 0 && (
            <div className="sysdet-cores-wrap">
              <div className="sysdet-cores-label">Per-Core</div>
              <div className="sysdet-core-bars">
                {ext.perCoreCpu.map((pct, i) => (
                  <div key={i} className="sysdet-core" title={`Core ${i}: ${pct}%`}>
                    <div className="sysdet-core-fill" style={{ height: `${Math.min(pct, 100)}%` }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* ── GPU ── */}
        <Card icon={<MonitorSpeaker size={17} />} title="Graphics"
          subtitle={hw?.gpuName}
          gaugeValue={hasGpu ? ext.gpuUsage : 0} gaugeUnit="%"
          delay={0.08}
        >
          {(ext && ext.gpuVramTotal > 0) ? (
            <Row label="VRAM" value={formatMiBtoGB(ext.gpuVramTotal)} />
          ) : (
            hw?.gpuVramTotal && <Row label="VRAM" value={hw.gpuVramTotal} />
          )}
          {hw?.gpuDriverVersion && <Row label="Driver" value={hw.gpuDriverVersion} />}
          {hasGpu ? (
            <>
              <Row label="GPU Temp" value={ext.gpuTemp >= 0 ? `${ext.gpuTemp}°C` : undefined} accent />
              {ext.gpuVramUsed >= 0 && ext.gpuVramTotal > 0 && (
                <BarRow
                  label="VRAM Used"
                  pct={(ext.gpuVramUsed / ext.gpuVramTotal) * 100}
                  display={`${formatMiBtoGB(ext.gpuVramUsed)} / ${formatMiBtoGB(ext.gpuVramTotal)}`}
                />
              )}
            </>
          ) : (
            <div className="sysdet-note">Live stats require NVIDIA drivers</div>
          )}
        </Card>

        {/* ── RAM ── */}
        <Card icon={<MemoryStick size={17} />} title="Memory"
          subtitle={hw?.ramBrand || hw?.ramInfo}
          gaugeValue={s?.ram} gaugeUnit="%"
          delay={0.12}
        >
          {hw?.ramInfo && <Row label="Config" value={hw.ramInfo} />}
          {hw?.ramPartNumber && <Row label="Part Number" value={hw.ramPartNumber} />}
          {hw?.ramSticks && <Row label="Sticks" value={hw.ramSticks} />}
          {ext && ext.ramTotalGB > 0 && (
            <BarRow
              label="Used"
              pct={(ext.ramUsedGB / ext.ramTotalGB) * 100}
              display={`${ext.ramUsedGB.toFixed(1)} / ${ext.ramTotalGB.toFixed(1)} GB`}
            />
          )}
        </Card>

        {/* ── Storage ── */}
        <Card icon={<HardDrive size={17} />} title="Storage"
          subtitle={hw?.diskName}
          gaugeValue={s?.disk} gaugeUnit="%"
          delay={0.16}
        >
          <Row label="Type" value={hw?.diskType} />
          <Row label="Health" value={hw?.diskHealth}
            chip={hw?.diskHealth?.toLowerCase() === 'healthy' ? 'green' : 'yellow'}
          />
          {hw && hw.diskTotalGB > 0 && (
            <BarRow
              label="Capacity"
              pct={hw.diskTotalGB > 0 ? ((hw.diskTotalGB - hw.diskFreeGB) / hw.diskTotalGB) * 100 : 0}
              display={`${hw.diskFreeGB.toFixed(0)} GB free`}
            />
          )}
          <Row
            label="Read/Write"
            value={ext && (ext.diskReadSpeed > 0 || ext.diskWriteSpeed > 0) ? (
              <div className="sysdet-value-with-io">
                <div className="sysdet-io-badges-wrap">
                  <IOStrip up={fmt(ext.diskWriteSpeed)} down={fmt(ext.diskReadSpeed)} />
                </div>
              </div>
            ) : '—'}
          />
          {hw && hw.allDrives && hw.allDrives.length > 1 && (
            <div className="sysdet-drives">
              <div className="sysdet-drives-title">All Drives</div>
              {hw.allDrives.map((d) => (
                <div key={d.letter} className="sysdet-drive-row">
                  <span className="sysdet-drive-letter">{d.letter}</span>
                  <div className="sysdet-minibar sysdet-drive-bar">
                    <div className="sysdet-minibar-fill"
                      style={{ width: `${d.totalGB > 0 ? Math.min(((d.totalGB - d.freeGB) / d.totalGB) * 100, 100) : 0}%` }}
                    />
                  </div>
                  <span className="sysdet-drive-info">{d.freeGB} GB free</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Network ── */}
        <Card icon={<Network size={17} />} title="Network"
          subtitle={hw?.networkAdapter}
          gaugeValue={ext ? Math.min(((ext.networkUp + ext.networkDown) / (1024 * 1024 * 15)) * 100, 100) : 0}
          gaugeUnit="Mbps"
          delay={0.20}
        >
          {hw?.ipAddress && <Row label="Local IP Address" value={hw.ipAddress} />}
          {hw?.ipv6Address && <Row label="IPv6" value={hw.ipv6Address} />}
          {hw?.macAddress && <Row label="MAC" value={hw.macAddress} />}
          {hw?.gateway && <Row label="Gateway" value={hw.gateway} />}
          {hw?.dns && <Row label="DNS" value={hw.dns} />}
          {ext?.ssid && <Row label="Wi‑Fi SSID" value={ext.ssid} />}
          {ext && ext.latencyMs && ext.latencyMs > 0 && <Row label="Ping/Latency" value={`${ext.latencyMs} ms`} />}
          {hw?.networkLinkSpeed && <Row label="Link Speed" value={hw.networkLinkSpeed} />}
          <Row
            label="Realtime Speed"
            value={ext && (ext.networkUp > 0 || ext.networkDown > 0) ? (
              <div className="sysdet-value-with-io">
                <div className="sysdet-io-badges-wrap">
                  <IOStrip up={fmt(ext.networkUp)} down={fmt(ext.networkDown)} />
                </div>
              </div>
            ) : '—'}
          />
          {ext && ext.wifiSignal > 0 && (
            <div className="sysdet-inline-row wifi">
              <Wifi size={13} />
              <span>Wi-Fi Signal: {ext.wifiSignal}%</span>
            </div>
          )}
        </Card>

        {/* ── System ── */}
        <Card icon={<Monitor size={17} />} title="System"
          subtitle={hw?.windowsVersion}
          gaugeValue={ext && ext.processCount > 0 ? Math.min((ext.processCount / 500) * 100, 100) : 0}
          gaugeUnit="proc"
          gaugeDisplay={ext?.processCount ?? 0}
          delay={0.24}
        >
          <Row label="Build" value={hw?.windowsBuild} />
          <Row label="Motherboard" value={hw?.motherboardProduct ? cleanBoardName(hw.motherboardProduct) : hw?.motherboardManufacturer} />
          <Row label="BIOS" value={(hw?.biosVersion || hw?.biosDate) ? `${hw?.biosVersion || 'Unknown'}${hw?.biosDate ? ' — ' + hw.biosDate : ''}` : undefined} />
          <Row label="Board S/N" value={hw?.motherboardSerial || '—'} />
          <Row label="Uptime" value={ext?.systemUptime ?? hw?.systemUptime} />
          <Row label="Power Plan" value={hw?.powerPlan ?? '—'} />
          {hw?.hasBattery && (
            <div className="sysdet-inline-row batt">
              <Battery size={13} />
              <span>{hw.batteryPercent}% — {hw.batteryStatus}</span>
            </div>
          )}
        </Card>

      </div>
    </motion.section>
  );
};

export default SystemDetails;

