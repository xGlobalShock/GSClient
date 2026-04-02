# PC Tweaks (added by the app)

This document lists the PC tweaks exposed in the app and their registry targets.

>*Reduce Input Latency*
- Path: HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl
- DWORD: IRQ8Priority
- Value: 1

>*Boost Foreground App Priority*
- Path: HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl
- DWORD: Win32PrioritySeparation
- Value: 38

>*Enable GPU Low-Latency Mode*
- Path: HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers
- DWORD: HwSchMode
- Value: 2

>*Disable GPU Timeout Detection*
- Path: HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers
- DWORD: TdrLevel
- Value: 0

>*Use Full RAM Capacity (Disable Memory Compression)*
- Path: MMAgent
- DWORD: MemoryCompression
- Value: 0

>*Network Interrupts Priority*
- Path: HKLM:\SYSTEM\CurrentControlSet\Services\NDIS\Parameters
- DWORD: ProcessorThrottleMode
- Value: 1

>*Fullscreen Opt.*
- Path: HKCU:\System\GameConfigStore
- DWORD: GameDVR_FSEBehaviorMonitorEnabled
- Value: 0

>*USB Suspend*
- Path: HKLM:\SYSTEM\CurrentControlSet\Services\USB
- DWORD: DisableSelectiveSuspend
- Value: 1

>*Game DVR*
- Path: HKCU:\System\GameConfigStore
- DWORD: GameDVR_Enabled
- Value: 0

>*Game DVR Policy*
- Path: HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR
- DWORD: AllowGameDVR
- Value: 0

>*Disable App Capture*
- Path: HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR
- DWORD: AppCaptureEnabled
- Value: 0

>*DWM Overlay Test Mode*
- Path: HKLM:\SOFTWARE\Microsoft\Windows\Dwm
- DWORD: OverlayTestMode
- Value: 5

>*Fullscreen Optimization Mode*
- Path: HKCU:\System\GameConfigStore
- DWORD: GameDVR_FSEBehaviorMode
- Value: 2

>*Games Priority*
- Path: HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games
- DWORD: Priority
- Value: 6

>*Disable Network Throttling*
- Path: HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile
- DWORD: NetworkThrottlingIndex
- Value: 4294967295 (0xFFFFFFFF)

>*Expand System File Cache*
- Path: HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management
- DWORD: LargeSystemCache
- Value: 1