#pragma once

// How a row is opened, worked out from what the engine found, never from
// anything the client sent. The shell's main process carries it out: it is
// the foreground process when Enter is pressed, and only the foreground can
// let the started program take the foreground (FORK-NOTES.md, "Opening").

#include "SearchTypes.h"

#include <QJsonObject>
#include <QString>
#include <QStringList>

namespace lode::launch {

struct Plan {
    enum class How {
        None, // cannot be opened (a web shortcut or plugin row: not in this phase)
        Path, // a file or folder, opened by its type's handler
        Uri, // a non-web URI: "ms-settings:display", "windowsdefender:"
        Program, // a program with arguments: "control.exe /name ...", explorer.exe shell:AppsFolder\...
    };
    How how = How::None;
    QString target; // the path, URI or program (expanded, absolute where known)
    QStringList arguments; // Program only
    bool canReveal = false; // a file or folder: can be shown in its folder
};

Plan resolve(const ws::SearchResult& result);
QJsonObject toJson(const Plan& plan);

} // namespace lode::launch
