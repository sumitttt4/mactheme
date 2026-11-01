#pragma once

// The bridge's JSON-RPC 2.0 server, one line per message, on a named pipe
// (upstream ws::pipe::Server: the user's own DACL, medium label, no remote
// clients). On top of that:
//   - each client must be this user in this Windows session (ClientCheck)
//   - a fixed table of methods; anything else is kMethodNotFound
//   - strict params (Params), lines capped at kMaxLineBytes, a search that
//     does not answer in kSearchTimeoutMs fails
//   - actions name a row by the handle a search gave it, never by a path
//
// Methods (protocol 1):
//   bridge.hello   {}                              -> {name, protocol, access}
//   index.status   {}                              -> {state, items, access}
//   search.names   {text, scope?, limit?}          -> {results[], total, elapsedUs}
//   item.resolve   {id}                            -> {how, target?, arguments?, canReveal}
// Notifications to the client:
//   index.state    {state, items}

#include "IndexService.h"
#include "PipeServer.h"
#include "SearchEngine.h"

#include <QHash>
#include <QJsonObject>
#include <QJsonValue>
#include <QObject>
#include <QStringList>
#include <QTimer>

#include <deque>
#include <map>
#include <memory>
#include <optional>
#include <string>

namespace quarry {

inline constexpr int kProtocol = 1;
inline constexpr qsizetype kMaxLineBytes = 64 * 1024; // requests are small: a query, a handle
inline constexpr int kSearchTimeoutMs = 10'000;
inline constexpr int kMaxLimit = 200;
inline constexpr int kHandleGenerations = 3; // the rows of the last few searches can be acted on

class Bridge : public QObject {
    Q_OBJECT

public:
    // `access`: how the index reads NTFS volumes ("service", "walk").
    Bridge(ws::IndexService* index, ws::SearchEngine* engine, QString access, QObject* parent = nullptr);
    ~Bridge() override;

    bool start(const std::wstring& pipeName, DWORD* error);
    void stop();

private:
    using Id = ws::pipe::Server::Id;
    struct Session {
        Id id = 0;
        bool verified = false;
    };
    using Handler = void (Bridge::*)(Session& session, const QJsonValue& rpcId, const QJsonObject& params);

    void identified(Id id, HANDLE token);
    void received(Id id, const QByteArray& line);
    void reject(Id id, const QString& why);
    void send(const Session& session, const QByteArray& line);

    void hello(Session& session, const QJsonValue& rpcId, const QJsonObject& params);
    void indexStatus(Session& session, const QJsonValue& rpcId, const QJsonObject& params);
    void searchNames(Session& session, const QJsonValue& rpcId, const QJsonObject& params);
    void itemResolve(Session& session, const QJsonValue& rpcId, const QJsonObject& params);

    void namesReady(quint64 requestId, const ws::SearchResults& results, qint64 total, qint64 elapsedUs);
    void failPending(int code, const QString& message);
    void indexStateChanged();
    QJsonObject indexState() const;

    ws::IndexService* m_index;
    ws::SearchEngine* m_engine;
    QString m_access;
    QHash<QString, Handler> m_methods;
    std::unique_ptr<ws::pipe::Server> m_pipe;
    std::map<Id, Session> m_sessions;

    // The one search being waited for (the engine runs only the newest).
    struct Pending {
        Id session = 0;
        QJsonValue rpcId;
        quint64 requestId = 0;
    };
    std::optional<Pending> m_pending;
    QTimer m_searchTimeout;

    // Rows the client may act on, by handle; the oldest generation goes as a new one comes.
    QHash<QString, ws::SearchResult> m_rows;
    std::deque<QStringList> m_generations;
    quint64 m_generation = 0;
};

} // namespace quarry
