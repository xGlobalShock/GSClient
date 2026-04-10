/**
 * Hardware Info Module
 * Consumes static hardware data from the native C# sidecar (GCMonitor.exe).
 * The sidecar emits {"type":"hwinfo",...} and {"type":"hwinfo-update",...}
 * messages which are captured by hardwareMonitor.js and exposed here.
 *
 * Fallback: systeminformation library for edge cases where sidecar data is missing.
 */

const { ipcMain } = require('electron');
const os = require('os');
const si = require('systeminformation');
const hardwareMonitor = require('./hardwareMonitor');

let _hwInfoResult = null;
let _hwInfoPromise = null;

function getDefaultHardwareInfo() {
  return {
    cpuName: 'Unknown CPU',
    gpuName: 'Unknown GPU',
    ramInfo: 'Unknown',
    ramBrand: '',
    ramPartNumber: '',
    diskName: 'Unknown Disk',
    cpuCores: 0,
    cpuThreads: 0,
    cpuMaxClock: '',
    gpuVramTotal: '',
    gpuDriverVersion: '',
    ramTotalGB: 0,
    ramUsedGB: 0,
    ramSticks: '',
    ramSpeed: '',
    ramSlotMap: '',
    ramDramBrand: '',
    ramPageFileUsed: 0,
    ramPageFileTotal: 0,
    ramNonPagedPool: 0,
    ramStandby: 0,
    ramModified: 0,
    ramTopProcesses: [],
    diskTotalGB: 0,
    diskFreeGB: 0,
    diskType: '',
    diskHealth: '',
    allDrives: [],
    physicalDisks: [],
    networkAdapter: '',
    networkLinkSpeed: '',
    networkAdapters: [],
    ipAddress: '',
    ipv6Address: '',
    macAddress: '',
    gateway: '',
    dns: '',
    motherboardManufacturer: '',
    motherboardProduct: '',
    motherboardSerial: '',
    biosVersion: '',
    biosDate: '',
    windowsVersion: '',
    windowsBuild: '',
    systemUptime: `${Math.floor(os.uptime()/86400)}d ${Math.floor((os.uptime()%86400)/3600)}h ${Math.floor((os.uptime()%3600)/60)}m`,
    powerPlan: '',
    lastWindowsUpdate: '',
    windowsActivation: '',
    secureBoot: '',
    keyboardName: '',
    hasBattery: false,
    batteryPercent: 0,
    batteryStatus: '',
  };
}

function initHardwareInfo() {
  _hwInfoPromise = _fetchFromSidecar().then(info => {
    _hwInfoResult = info || getDefaultHardwareInfo();
    return _hwInfoResult;
  }).catch(err => {
    console.error('[HW Info] fetch failed:', err.message);
    _hwInfoResult = getDefaultHardwareInfo();
    return _hwInfoResult;
  });
}

function getHwInfoPromise() {
  return _hwInfoPromise;
}

/**
 * Wait for the sidecar's hwinfo message and transform it into the
 * hardware info object shape the rest of the app expects.
 */
async function _fetchFromSidecar() {
  const defaults = getDefaultHardwareInfo();

  // Wait up to 20 seconds for sidecar hwinfo data (extra headroom for PawnIO staging on first install)
  const sidecarPromise = hardwareMonitor.getHwInfoFromSidecarPromise();
  const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 20000));
  const raw = await Promise.race([sidecarPromise, timeoutPromise]);

  if (!raw) {
    console.warn('[HW Info] Sidecar hwinfo timed out, trying systeminformation fallback');
    return _siFallback(defaults);
  }

  // Map sidecar fields to the expected info object
  const info = { ...defaults };

  info.cpuName = raw.cpuName || info.cpuName;
  info.cpuCores = raw.cpuCores || info.cpuCores;
  info.cpuThreads = raw.cpuThreads || info.cpuThreads;
  info.cpuMaxClock = raw.cpuMaxClock || info.cpuMaxClock;

  info.gpuName = raw.gpuName || info.gpuName;
  info.gpuVramTotal = raw.gpuVramTotal || info.gpuVramTotal;
  info.gpuDriverVersion = raw.gpuDriverVersion || info.gpuDriverVersion;

  info.ramInfo = raw.ramInfo || info.ramInfo;
  info.ramTotalGB = raw.ramTotalGB || info.ramTotalGB;
  info.ramUsedGB = raw.ramUsedGB || info.ramUsedGB;
  info.ramSpeed = raw.ramSpeed || info.ramSpeed;
  info.ramSticks = raw.ramSticks || info.ramSticks;
  info.ramBrand = raw.ramBrand || info.ramBrand;
  info.ramPartNumber = raw.ramPartNumber || info.ramPartNumber;
  info.ramSlotMap = raw.ramSlotMap || info.ramSlotMap;
  info.ramDramBrand = raw.ramDramBrand || info.ramDramBrand;
  info.ramPageFileUsed = raw.ramPageFileUsed || info.ramPageFileUsed;
  info.ramPageFileTotal = raw.ramPageFileTotal || info.ramPageFileTotal;
  info.ramNonPagedPool = raw.ramNonPagedPool || info.ramNonPagedPool;
  info.ramStandby = raw.ramStandby || info.ramStandby;
  info.ramModified = raw.ramModified || info.ramModified;
  info.ramTopProcesses = Array.isArray(raw.ramTopProcesses) ? raw.ramTopProcesses : info.ramTopProcesses;

  info.diskName = raw.diskName || info.diskName;
  info.diskType = raw.diskType || info.diskType;
  info.diskHealth = raw.diskHealth || info.diskHealth;
  info.diskTotalGB = raw.diskTotalGB || info.diskTotalGB;
  info.diskFreeGB = raw.diskFreeGB || info.diskFreeGB;
  info.allDrives = Array.isArray(raw.allDrives) ? raw.allDrives : info.allDrives;
  info.physicalDisks = Array.isArray(raw.physicalDisks) ? raw.physicalDisks : info.physicalDisks;

  info.networkAdapter = raw.networkAdapter || info.networkAdapter;
  info.networkLinkSpeed = raw.networkLinkSpeed || info.networkLinkSpeed;
  info.networkAdapters = Array.isArray(raw.networkAdapters) ? raw.networkAdapters : info.networkAdapters;
  info.ipAddress = raw.ipAddress || info.ipAddress;
  info.ipv6Address = raw.ipv6Address || info.ipv6Address;
  info.macAddress = raw.macAddress || info.macAddress;
  info.gateway = raw.gateway || info.gateway;
  info.dns = raw.dns || info.dns;

  info.windowsVersion = raw.windowsVersion || info.windowsVersion;
  info.windowsBuild = raw.windowsBuild || info.windowsBuild;
  info.windowsActivation = raw.windowsActivation || info.windowsActivation;
  info.lastWindowsUpdate = raw.lastWindowsUpdate || info.lastWindowsUpdate;

  info.motherboardManufacturer = raw.motherboardManufacturer || info.motherboardManufacturer;
  info.motherboardProduct = raw.motherboardProduct || info.motherboardProduct;
  info.motherboardSerial = raw.motherboardSerial || info.motherboardSerial;

  info.biosVersion = raw.biosVersion || info.biosVersion;
  info.biosDate = raw.biosDate || info.biosDate;

  info.systemUptime = raw.systemUptime || info.systemUptime;
  info.powerPlan = raw.powerPlan || info.powerPlan;
  info.secureBoot = raw.secureBoot || info.secureBoot;
  info.keyboardName = raw.keyboardName || info.keyboardName;

  info.hasBattery = raw.hasBattery === true;
  if (info.hasBattery) {
    info.batteryPercent = raw.batteryPercent || 0;
    info.batteryStatus = raw.batteryStatus || '';
  }

  // If sidecar missed critical fields, fill from systeminformation
  if (!info.cpuName || info.cpuName === 'Unknown CPU' || !info.gpuName || info.gpuName === 'Unknown GPU') {
    await _siFallback(info);
  }

  return info;
}

/**
 * systeminformation fallback — only called when sidecar data is missing critical fields.
 */
async function _siFallback(info) {
  try {
    const [cpu, mem, graphics, disks, osInfo] = await Promise.all([
      si.cpu().catch(() => null),
      si.mem().catch(() => null),
      si.graphics().catch(() => null),
      si.diskLayout().catch(() => null),
      si.osInfo().catch(() => null),
    ]);

    if ((!info.cpuName || info.cpuName === 'Unknown CPU') && cpu) {
      info.cpuName = `${cpu.manufacturer || ''} ${cpu.brand || ''}`.trim() || info.cpuName;
      info.cpuCores = info.cpuCores || cpu.physicalCores || 0;
      info.cpuThreads = info.cpuThreads || cpu.cores || 0;
      if (!info.cpuMaxClock && cpu.speedMax) info.cpuMaxClock = `${cpu.speedMax} GHz`;
    }

    if ((!info.gpuName || info.gpuName === 'Unknown GPU') && graphics && graphics.controllers && graphics.controllers.length > 0) {
      // Prefer real GPU — skip virtual/remote display adapters
      const realGpu = graphics.controllers.find(g => {
        const n = (g.model || g.vendor || '').toLowerCase();
        return !/(virtual|dummy|parsec|remote|generic|display-only)/i.test(n);
      }) || graphics.controllers[0];
      info.gpuName = realGpu.vendor && realGpu.model ? `${realGpu.vendor} ${realGpu.model}` : realGpu.model || info.gpuName;
      info.gpuVramTotal = info.gpuVramTotal || (realGpu.vram ? `${realGpu.vram} MB` : '');
      info.gpuDriverVersion = info.gpuDriverVersion || realGpu.driverVersion || '';
    }

    if ((!info.ramInfo || info.ramInfo === 'Unknown') && mem) {
      const totalGB = Math.round((mem.total || 0) / (1024 * 1024 * 1024));
      info.ramInfo = `${totalGB || info.ramTotalGB || 0} GB`;
      info.ramTotalGB = info.ramTotalGB || totalGB;
      info.ramUsedGB = info.ramUsedGB || Math.round((mem.active || 0) / (1024 * 1024 * 1024));
    }

    if ((!info.diskName || info.diskName === 'Unknown Disk') && Array.isArray(disks) && disks.length > 0) {
      // Prefer non-USB internal disk
      const internalDisk = disks.find(d => d.interfaceType !== 'USB') || disks[0];
      info.diskName = internalDisk.name || internalDisk.model || info.diskName;
      info.diskType = info.diskType || internalDisk.type || '';
      info.diskTotalGB = info.diskTotalGB || Math.round((internalDisk.size || 0) / (1024 * 1024 * 1024));
    }

    if ((!info.windowsVersion || info.windowsVersion === 'Unknown') && osInfo) {
      info.windowsVersion = osInfo.distro || osInfo.platform || info.windowsVersion;
      info.windowsBuild = info.windowsBuild || osInfo.release || '';
    }
  } catch (err) {
    console.error('[HW Info] systeminformation fallback failed:', err && err.message ? err.message : err);
  }
  return info;
}

function registerIPC() {
  ipcMain.handle('system:get-hardware-info', async () => {
    // Merge any hwinfo-update fields (slow queries) that arrived after initial fetch
    const latest = hardwareMonitor.getHwInfoFromSidecar();
    if (_hwInfoResult && latest) {
      for (const key of Object.keys(latest)) {
        if (key === 'type') continue;
        const cur = _hwInfoResult[key];
        const val = latest[key];
        if (val != null && val !== '' && val !== 'Unknown' && (cur == null || cur === '' || cur === 'Unknown' || cur === 'Unavailable')) {
          _hwInfoResult[key] = val;
        }
      }
    }

    if (_hwInfoResult) return _hwInfoResult;
    if (_hwInfoPromise) {
      const result = await _hwInfoPromise;
      if (result) return result;
      _hwInfoResult = getDefaultHardwareInfo();
      return _hwInfoResult;
    }
    _hwInfoResult = getDefaultHardwareInfo();
    return _hwInfoResult;
  });
}

module.exports = {
  initHardwareInfo,
  getHwInfoPromise,
  registerIPC,
};
