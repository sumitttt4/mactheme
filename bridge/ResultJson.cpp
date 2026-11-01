#include "ResultJson.h"

#include <QDir>

using namespace Qt::StringLiterals;

namespace quarry {

QString kindOf(const ws::SearchResult& result)
{
    switch (result.app) {
    case ws::AppKind::None:
        return result.isDir ? u"folder"_s : u"file"_s;
    case ws::AppKind::Desktop:
    case ws::AppKind::Store:
    case ws::AppKind::System:
    case ws::AppKind::Package:
        return u"app"_s;
    case ws::AppKind::Setting:
    case ws::AppKind::ControlPanel:
    case ws::AppKind::Security:
    case ws::AppKind::Tool:
        return u"setting"_s;
    case ws::AppKind::Web:
        return u"web"_s;
    case ws::AppKind::Plugin:
        return u"plugin"_s;
    }
    return u"file"_s;
}

namespace {

QString placeKind(ws::AppKind kind)
{
    switch (kind) {
    case ws::AppKind::Setting: return u"settings"_s;
    case ws::AppKind::ControlPanel: return u"controlPanel"_s;
    case ws::AppKind::Security: return u"security"_s;
    case ws::AppKind::Tool: return u"tool"_s;
    case ws::AppKind::Store: return u"store"_s;
    case ws::AppKind::System: return u"system"_s;
    case ws::AppKind::Package: return u"package"_s;
    case ws::AppKind::Desktop: return u"desktop"_s;
    default: return {};
    }
}

} // namespace

QJsonObject toJson(const ws::SearchResult& result, const QString& handle)
{
    const QString kind = kindOf(result);
    QJsonObject o;
    o[u"id"_s] = handle;
    o[u"kind"_s] = kind;
    o[u"name"_s] = result.name;
    if (kind == u"file" || kind == u"folder") {
        const QString native = QDir::toNativeSeparators(result.path);
        o[u"path"_s] = native;
        const qsizetype slash = native.lastIndexOf(u'\\');
        o[u"folder"_s] = slash > 0 ? native.left(slash == 2 ? 3 : slash) : QString(); // "C:\" for a drive's own items
        if (result.size >= 0)
            o[u"size"_s] = static_cast<double>(result.size);
        if (result.modified != 0)
            o[u"modified"_s] = static_cast<double>(result.modified);
        if (result.offline)
            o[u"offline"_s] = true;
    } else {
        o[u"subkind"_s] = placeKind(result.app);
        if (result.elevatable)
            o[u"elevatable"_s] = true;
    }
    if (result.recent)
        o[u"recent"_s] = true;
    if (result.exact)
        o[u"exact"_s] = true;
    if (result.approximate)
        o[u"approximate"_s] = true;
    return o;
}

QString stateName(ws::IndexService::State state)
{
    switch (state) {
    case ws::IndexService::State::Idle: return u"idle"_s;
    case ws::IndexService::State::Loading: return u"loading"_s;
    case ws::IndexService::State::Building: return u"building"_s;
    case ws::IndexService::State::Ready: return u"ready"_s;
    }
    return u"idle"_s;
}

} // namespace quarry
