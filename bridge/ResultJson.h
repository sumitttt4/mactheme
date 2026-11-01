#pragma once

// A search result as the shell sees it: data only, no strings meant for
// display (every label lives in React). Upstream's SearchResult carries far
// more; fields are added here phase by phase as the UI needs them.

#include "IndexService.h"
#include "SearchTypes.h"

#include <QJsonObject>
#include <QString>

namespace quarry {

// "file", "folder", "app", "setting", "web", "plugin".
QString kindOf(const ws::SearchResult& result);
// `handle`: the opaque id the shell passes back to act on the row.
QJsonObject toJson(const ws::SearchResult& result, const QString& handle);
// "idle", "loading", "building", "ready".
QString stateName(ws::IndexService::State state);

} // namespace quarry
