// ══════════════════════════════════════════════════════════════════════════
// APP CATALOG — Curated list of apps installable via winget
// ══════════════════════════════════════════════════════════════════════════

export interface CatalogApp {
  name: string;
  id: string; // winget package ID
}

export const APP_CATALOG: CatalogApp[] = [
  // Browsers
  { name: 'Brave', id: 'Brave.Brave' },
  { name: 'Chrome', id: 'Google.Chrome' },
  { name: 'Edge', id: 'Microsoft.Edge' },
  { name: 'Firefox', id: 'Mozilla.Firefox' },
  { name: 'Opera GX', id: 'Opera.OperaGX' },
  { name: 'Tor Browser', id: 'TorProject.TorBrowser' },
  // Communications
  { name: 'Discord', id: 'Discord.Discord' },
  { name: 'Teams', id: 'Microsoft.Teams' },
  { name: 'Telegram', id: 'Telegram.TelegramDesktop' },
  { name: 'Zoom', id: 'Zoom.Zoom' },
  // Gaming
  { name: 'Steam', id: 'Valve.Steam' },
  { name: 'Epic Games Launcher', id: 'EpicGames.EpicGamesLauncher' },
  { name: 'EA App', id: 'ElectronicArts.EADesktop' },
  { name: 'GOG Galaxy', id: 'GOG.Galaxy' },
  { name: 'Ubisoft Connect', id: 'Ubisoft.Connect' },
  { name: 'Battle.net', id: 'Blizzard.BattleNet' },
  { name: 'GeForce NOW', id: 'Nvidia.GeForceNow' },
  // Gaming Tools
  { name: 'MSI Afterburner', id: 'Guru3D.Afterburner' },
  { name: 'RTSS', id: 'Guru3D.RTSS' },
  { name: 'HWiNFO', id: 'REALiX.HWiNFO' },
  { name: 'GPU-Z', id: 'TechPowerUp.GPU-Z' },
  { name: 'CPU-Z', id: 'CPUID.CPU-Z' },
  { name: 'GeForce Experience', id: 'Nvidia.GeForceExperience' },
  { name: 'AMD Software', id: 'AMD.RyzenMaster' },
  // Streaming & Recording
  { name: 'OBS Studio', id: 'OBSProject.OBSStudio' },
  { name: 'Streamlabs', id: 'Streamlabs.Streamlabs' },
  { name: 'VoiceMeeter Banana', id: 'VB-Audio.Voicemeeter.Banana' },
  { name: 'VoiceMeeter Potato', id: 'VB-Audio.Voicemeeter.Potato' },
  { name: 'EarTrumpet', id: 'File-New-Project.EarTrumpet' },
  { name: 'VLC', id: 'VideoLAN.VLC' },
  // Development
  { name: 'VS Code', id: 'Microsoft.VisualStudioCode' },
  { name: 'Git', id: 'Git.Git' },
  { name: 'GitHub Desktop', id: 'GitHub.GitHubDesktop' },
  { name: 'NodeJS LTS', id: 'OpenJS.NodeJS.LTS' },
  { name: 'Python 3', id: 'Python.Python.3.12' },
  { name: 'Visual Studio 2022', id: 'Microsoft.VisualStudio.2022.Community' },
  { name: 'Windows Terminal', id: 'Microsoft.WindowsTerminal' },
  { name: 'Notepad++', id: 'Notepad++.Notepad++' },
  // Utilities
  { name: '7-Zip', id: '7zip.7zip' },
  { name: 'WinRAR', id: 'RARLab.WinRAR' },
  { name: 'Revo Uninstaller', id: 'RevoUninstaller.RevoUninstaller' },
  { name: 'Bitwarden', id: 'Bitwarden.Bitwarden' },
  // Media
  { name: 'Spotify', id: 'Spotify.Spotify' },
  // Runtimes
  { name: '.NET 8 Desktop Runtime', id: 'Microsoft.DotNet.DesktopRuntime.8' },
  { name: '.NET 6 Desktop Runtime', id: 'Microsoft.DotNet.DesktopRuntime.6' },
  { name: 'VC++ 2015-2022 Redist', id: 'Microsoft.VCRedist.2015+.x64' },
  { name: 'DirectX Runtime', id: 'Microsoft.DirectX' },
];
