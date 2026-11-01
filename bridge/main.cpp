// wsbridge: WinShun's search engine for the Electron shell.
//
//   wsbridge.exe --pipe <name> [--walk] [--index-dir <folder>]
//
// Started by the shell's main process, hidden, with its stdin, stdout and
// stderr piped. Prints "ready <pipe>" once the pipe is up; ends when its
// stdin closes (the shell quit or crashed). One at a time per session.

#include "AppCatalog.h"
#include "Bridge.h"
#include "IndexService.h"
#include "Pipe.h"
#include "SearchEngine.h"
#include "ServiceVolumeAccess.h"
#include "SystemCatalog.h"

#include <QCoreApplication>
#include <QDir>
#include <QStringList>

#include <windows.h>

#include <cstdio>
#include <memory>
#include <string>
#include <thread>

using namespace Qt::StringLiterals;

namespace {

// The shell makes the name: "<prefix>.<random>". Letters, digits, '.', '-', '_' only.
bool validPipeName(const QString& name)
{
    const QString prefix = QStringLiteral(QUARRY_PIPE_PREFIX) + u'.';
    if (!name.startsWith(prefix) || name.size() > 200 || name.size() <= prefix.size())
        return false;
    for (const QChar c : name) {
        if (!(c.isLetterOrNumber() && c.unicode() < 0x80) && c != u'.' && c != u'-' && c != u'_')
            return false;
    }
    return true;
}

QString defaultIndexDir()
{
    const QString local = qEnvironmentVariable("LOCALAPPDATA");
    return QDir(local).filePath(QStringLiteral(QUARRY_NAME) + u"/index"_s);
}

// How NTFS volumes are read: through the index service when it answers
// (WinShunService.exe, installed once with administrator consent), otherwise
// every volume is walked and watched with the user's own rights. Never
// directly: the bridge runs as the invoker.
std::shared_ptr<ws::ntfs::VolumeAccess> chooseAccess(bool walk, QString& name)
{
    if (!walk) {
        const ws::ntfs::ServiceState state = ws::ntfs::ServiceVolumeAccess::state();
        if (state != ws::ntfs::ServiceState::NotInstalled && state != ws::ntfs::ServiceState::Disabled) {
            auto service = std::make_shared<ws::ntfs::ServiceVolumeAccess>();
            if (service->probe()) {
                name = u"service"_s;
                return service;
            }
            std::fprintf(stderr, "wsbridge: index service not used: %ls (pipe %ls)\n", service->lastError().c_str(),
                service->pipeName().c_str());
        }
    }
    name = u"walk"_s;
    return std::make_shared<ws::ntfs::NoVolumeAccess>();
}

// Quits the event loop once stdin ends: the shell that started us is gone.
void watchStdin()
{
    const HANDLE in = ::GetStdHandle(STD_INPUT_HANDLE);
    if (in == nullptr || in == INVALID_HANDLE_VALUE)
        return;
    std::thread([in] {
        char buffer[256];
        DWORD got = 0;
        while (::ReadFile(in, buffer, sizeof buffer, &got, nullptr) && got > 0) {
        }
        QMetaObject::invokeMethod(QCoreApplication::instance(), &QCoreApplication::quit, Qt::QueuedConnection);
    }).detach();
}

} // namespace

int main(int argc, char* argv[])
{
    QCoreApplication app(argc, argv);
    QCoreApplication::setApplicationName(QStringLiteral(QUARRY_NAME));

    const QStringList args = QCoreApplication::arguments();
    QString pipeName;
    QString indexDir = defaultIndexDir();
    bool walk = false;
    for (qsizetype i = 1; i < args.size(); ++i) {
        if (args[i] == u"--pipe" && i + 1 < args.size())
            pipeName = args[++i];
        else if (args[i] == u"--index-dir" && i + 1 < args.size())
            indexDir = args[++i];
        else if (args[i] == u"--walk")
            walk = true;
        else {
            std::fprintf(stderr, "wsbridge: unknown argument: %s\n", qUtf8Printable(args[i]));
            return 2;
        }
    }
    if (pipeName.isEmpty()) // run by hand: the user's own name
        pipeName = QStringLiteral(QUARRY_PIPE_PREFIX) + u'.' + QString::fromStdWString(ws::pipe::userSid());
    if (!validPipeName(pipeName)) {
        std::fprintf(stderr, "wsbridge: bad pipe name\n");
        return 2;
    }

    // One bridge per Windows session.
    const std::wstring mutexName = L"Local\\" + QStringLiteral(QUARRY_NAME).toStdWString() + L".Bridge.Instance";
    const HANDLE instance = ::CreateMutexW(nullptr, TRUE, mutexName.c_str());
    if (!instance || ::GetLastError() == ERROR_ALREADY_EXISTS) {
        std::fprintf(stderr, "wsbridge: already running in this session\n");
        return 3;
    }

    if (!QDir().mkpath(indexDir)) {
        std::fprintf(stderr, "wsbridge: cannot make the index folder %s\n", qUtf8Printable(indexDir));
        return 4;
    }

    QString access;
    ws::IndexService::Options options;
    options.volumeAccess = chooseAccess(walk, access);
    options.content.enabled = false; // content search: phase 3
    ws::IndexService index(indexDir, options);
    ws::AppCatalog apps;
    ws::SystemCatalog places;
    ws::SearchEngine engine(&index, &apps, &places);

    quarry::Bridge bridge(&index, &engine, access);
    DWORD error = 0;
    if (!bridge.start(pipeName.toStdWString(), &error)) {
        std::fprintf(stderr, "wsbridge: cannot serve the pipe (Win32 error %lu)\n", error);
        return 5;
    }
    index.start();
    apps.refresh(true);
    places.refresh(true);

    std::printf("ready %s\n", qUtf8Printable(pipeName));
    std::fflush(stdout);
    watchStdin();

    QObject::connect(&app, &QCoreApplication::aboutToQuit, [&] {
        bridge.stop();
        engine.cancel();
        index.shutdown(); // saves the snapshot
    });
    const int code = app.exec();
    ::ReleaseMutex(instance);
    ::CloseHandle(instance);
    return code;
}
