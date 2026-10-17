# Motion and interaction review

Applied the available Emil design-engineering and Apple design guidance. The table records issues found and corrected during implementation; this is a source/browser review, not a Windows frame-time measurement.

| Before | After | Why |
| --- | --- | --- |
| Generic layout-based Dock scaling | Fixed 48px slots, Motion values, springs, transform strings | Pointer tracking does not update React state or animate width/margins |
| Dock-sized CSS breakpoint changed icon size underneath fixed motion math | Capacity derived from native window width; consistent icon geometry | Keeps cursor distance and visual icon centers aligned |
| Native region clipped hover magnification | Tight idle hit region; expanded region on hover/context menu | Preserves desktop click-through outside chrome while allowing icon rise |
| Tooltip inherited icon scale | Tooltip is a sibling with its own fixed typography | Labels stay readable without becoming part of the magnification |
| Popup webviews created at startup | Popups created on first use | Avoids paying for three idle WebViews before they are needed |
| Keyboard launcher entrance could animate | Native show/hide and result selection are immediate | Repeated keyboard actions remain direct |
| A slider could snap back before native acknowledgement | Draft value stays until the commit resolves | Feedback remains stable; failures restore the actual value |
| Generic fade/scale from center | Panel origin at top-right, 160–180ms transitions | Anchors the Control Center to the menu-bar trigger |

Reduced motion suppresses movement/spring tracking; fine-pointer hover is explicitly gated. Reduced transparency and increased contrast use solid surfaces. CSS does not animate `all`, width, height, padding, or margins. Runtime Windows DWM appearance, real display refresh performance, and sleep/wake smoothness remain unverified.

**Verdict:** source/browser motion checks pass; Windows interaction and frame-time acceptance remains pending.
