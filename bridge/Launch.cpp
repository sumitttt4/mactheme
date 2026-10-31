#include "Launch.h"

#include "SystemCatalog.h" // ws::splitCommand
#include "Win32Util.h"

#include <QDir>
#include <QJsonArray>

#include <shellapi.h>

using namespace Qt::StringLiterals;

namespace lode::launch {

namespace {

// "ms-settings:display", not "C:\..." and not a web or file address: those
// never come from the catalogs, and are refused rather than passed on.
bool isShellUri(const QString& text)
{
    const qsizetype colon = text.indexOf(u':');
    if (colon < 2) // "C:" is a drive
        return false;
    for (qsizetype i = 0; i < colon; ++i) {
        const QChar c = text[i];
        if (!(c.isLetterOrNumber() || c == u'-' || c == u'.' || c == u'+'))
            return false;
    }
    const QString scheme = text.left(colon).toLower();
    return scheme != u"http" && scheme != u"https" && scheme != u"file" && scheme != u"javascript"
        && scheme != u"data" && scheme != u"vbscript";
}

QStringList splitArguments(const QString& arguments)
{
    if (arguments.trimmed().isEmpty())
        return {};
    int count = 0;
    const std::wstring line = L"x " + arguments.toStdWString(); // argv[0] is parsed differently: give it a dummy
    LPWSTR* argv = ::CommandLineToArgvW(line.c_str(), &count);
    QStringList out;
    if (!argv)
        return out;
    for (int i = 1; i < count; ++i)
        out.append(QString::fromWCharArray(argv[i]));
    ::LocalFree(argv);
    return out;
}

QString explorer()
{
    return QString::fromStdWString(ws::win32::expandEnvironment(L"%SystemRoot%\\explorer.exe"));
}

} // namespace

Plan resolve(const ws::SearchResult& result)
{
    Plan plan;
    switch (result.app) {
    case ws::AppKind::None:
        plan.how = Plan::How::Path;
        plan.target = QDir::toNativeSeparators(result.path);
        plan.canReveal = true;
        break;
    case ws::AppKind::Desktop:
    case ws::AppKind::Store:
    case ws::AppKind::System:
    case ws::AppKind::Package:
        // "shell:AppsFolder\<AppUserModelID>": as the Start menu starts it.
        if (result.path.startsWith(u"shell:AppsFolder\\"_s, Qt::CaseInsensitive)) {
            plan.how = Plan::How::Program;
            plan.target = explorer();
            plan.arguments = {result.path};
        }
        break;
    case ws::AppKind::Setting:
    case ws::AppKind::ControlPanel:
    case ws::AppKind::Security:
    case ws::AppKind::Tool: {
        const auto [file, arguments] = ws::splitCommand(result.target);
        if (file.isEmpty())
            break;
        if (isShellUri(file) && arguments.isEmpty()) {
            plan.how = Plan::How::Uri;
            plan.target = file;
        } else if (!isShellUri(file)) {
            plan.how = Plan::How::Program;
            plan.target = QDir::toNativeSeparators(file);
            plan.arguments = splitArguments(arguments);
        }
        break;
    }
    case ws::AppKind::Web: // web shortcuts are off (network policy): none are listed
    case ws::AppKind::Plugin: // plugins: phase 5
        break;
    }
    return plan;
}

QJsonObject toJson(const Plan& plan)
{
    QJsonObject o;
    switch (plan.how) {
    case Plan::How::None: o[u"how"_s] = u"none"_s; break;
    case Plan::How::Path: o[u"how"_s] = u"path"_s; break;
    case Plan::How::Uri: o[u"how"_s] = u"uri"_s; break;
    case Plan::How::Program: o[u"how"_s] = u"program"_s; break;
    }
    if (plan.how != Plan::How::None)
        o[u"target"_s] = plan.target;
    if (plan.how == Plan::How::Program)
        o[u"arguments"_s] = QJsonArray::fromStringList(plan.arguments);
    o[u"canReveal"_s] = plan.canReveal;
    return o;
}

} // namespace lode::launch
