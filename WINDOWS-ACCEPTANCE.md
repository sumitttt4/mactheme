# Windows acceptance — not yet executed

Keep the original taskbar enabled for checks 1–6. Record Windows build, taskbar customizer/version, monitor resolutions/scales, and main process PID.

1. Start the portable executable with its DLL. Confirm native transparency, no white startup flash, menu bar inside the work area, and tray recovery commands. Try 100%, 125%, 150%, and 200% scale.
2. Start Notepad, Edge, Terminal. Check running dots, switch/minimize, context menu focus, Escape, app closure, and foreground-focus refusal. Ensure clicking empty screen outside the Dock reaches the desktop.
3. Pin/unpin through search; quit and relaunch. Verify empty pins stay empty, icon/name mapping, a Store app launch, and Refresh after installing an app.
4. Use Alt+Space repeatedly: typing must start immediately, arrows/Enter work, Escape and focus loss dismiss. Set another shortcut; attempt a conflicting one and ensure the old one still works. Test the emergency shortcut while the normal taskbar is visible.
5. Confirm Control Center values against Windows: unplug headphones and reconnect, change default audio endpoint, adjust volume by pointer and keyboard. Test supported internal brightness and an unsupported external display fallback. Verify no battery on desktops and accurate charging on laptops.
6. Test light/dark/system, reduced motion, reduced transparency, high contrast, auto-hide at bottom edge, sleep/wake, fullscreen video/game exit, mixed DPI monitor disconnect/reconnect, and a taskbar moved to the top. Check Windows maximized windows do not sit under reserved menu bars.
7. Only now test temporary taskbar hiding. Confirm bar placement moves to the available top edge. Restore by tray, normal quit, emergency shortcut, and `mactheme.exe --restore-taskbar`, separately. Check the original Windows auto-hide preference is restored each time.
8. Test crash recovery by ending only the **main PID**, leaving the watchdog running. Test Explorer restart while hidden. Do not mark recovery verified until both succeed with the actual customization tool.
9. Enable startup and reboot; confirm only one shell instance, tray access, shortcut registration, no taskbar automatically hidden, and disable startup afterward if unwanted.
10. Measure Task Manager CPU/private working set after 5 idle minutes and while moving the pointer over the Dock. Check process counts with popups unopened/opened. Capture latency/jitter at the monitor's native refresh rate. No performance target is currently claimed as measured.

Authoring environment evidence: frontend production build; five search/pin unit tests; six Playwright browser checks; Windows-target Rust check, Clippy with warnings denied, test executable compilation, and release executable generation. These do not validate the integration steps above.
