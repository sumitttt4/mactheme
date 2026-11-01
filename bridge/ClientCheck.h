#pragma once

// Who may talk to the bridge: the pipe's DACL (upstream ws::pipe, src/mcp/
// Pipe.cpp) already keeps out every account but the user's own, the
// administrators and the system. This narrows it to the user alone, in this
// Windows session: an administrator's process, or the same user signed in on
// another session (fast user switching, RDP), is turned away.

#include <QString>

#include <windows.h>

namespace quarry {

// `clientToken`: the client's, as the pipe server identified it (may be
// null: then false). `why` says what did not match.
bool sameUserAndSession(HANDLE clientToken, QString& why);

} // namespace quarry
