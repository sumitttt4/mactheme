#include "Bridge.h"

#include "ClientCheck.h"
#include "JsonRpc.h"
#include "Launch.h"
#include "Params.h"
#include "ResultJson.h"

#include <QJsonArray>
#include <QMetaObject>

#include <cstdio>

using namespace Qt::StringLiterals;
namespace rpc = ws::jsonrpc;

namespace quarry {

Bridge::Bridge(ws::IndexService* index, ws::SearchEngine* engine, QString access, QObject* parent)
    : QObject(parent)
    , m_index(index)
    , m_engine(engine)
    , m_access(std::move(access))
{
    // The whole surface. Nothing runs a command, reads a file or takes a path.
    m_methods = {
        {u"bridge.hello"_s, &Bridge::hello},
        {u"index.status"_s, &Bridge::indexStatus},
        {u"search.names"_s, &Bridge::searchNames},
        {u"item.resolve"_s, &Bridge::itemResolve},
    };
    m_searchTimeout.setSingleShot(true);
    m_searchTimeout.setInterval(kSearchTimeoutMs);
    connect(&m_searchTimeout, &QTimer::timeout, this, [this] {
        m_engine->cancel();
        failPending(rpc::kUnavailable, u"the search did not finish in time"_s);
    });
    // The engine emits on its worker threads: queued to this one.
    connect(m_engine, &ws::SearchEngine::resultsReady, this, &Bridge::namesReady, Qt::QueuedConnection);
    connect(m_index, &ws::IndexService::stateChanged, this, &Bridge::indexStateChanged, Qt::QueuedConnection);
}

Bridge::~Bridge()
{
    stop();
}

bool Bridge::start(const std::wstring& pipeName, DWORD* error)
{
    ws::pipe::Server::Callbacks callbacks;
    // On the pipe's threads: over to this one, in order (identified comes before the first line).
    callbacks.connected = [this](Id id) {
        QMetaObject::invokeMethod(this, [this, id] { m_sessions[id] = Session {id, false}; }, Qt::QueuedConnection);
    };
    callbacks.identified = [this](Id id, HANDLE token) {
        QMetaObject::invokeMethod(this, [this, id, token] { identified(id, token); }, Qt::QueuedConnection);
    };
    callbacks.line = [this](Id id, QByteArray line) {
        QMetaObject::invokeMethod(this, [this, id, line = std::move(line)] { received(id, line); }, Qt::QueuedConnection);
    };
    callbacks.disconnected = [this](Id id) {
        QMetaObject::invokeMethod(this, [this, id] {
            m_sessions.erase(id);
            if (m_pending && m_pending->session == id) {
                m_engine->cancel();
                m_pending.reset();
                m_searchTimeout.stop();
            }
        }, Qt::QueuedConnection);
    };
    auto server = std::make_unique<ws::pipe::Server>(pipeName, std::move(callbacks));
    if (!server->start(error))
        return false;
    m_pipe = std::move(server);
    return true;
}

void Bridge::stop()
{
    if (!m_pipe)
        return;
    m_pipe->stop();
    m_pipe.reset();
    m_sessions.clear();
    m_pending.reset();
    m_searchTimeout.stop();
}

void Bridge::identified(Id id, HANDLE token)
{
    QString why;
    const bool ok = sameUserAndSession(token, why);
    if (token)
        ::CloseHandle(token);
    const auto it = m_sessions.find(id);
    if (it == m_sessions.end())
        return; // gone already
    if (!ok) {
        reject(id, why);
        return;
    }
    it->second.verified = true;
}

void Bridge::reject(Id id, const QString& why)
{
    std::fprintf(stderr, "wsbridge: client %llu turned away: %s\n", static_cast<unsigned long long>(id), qUtf8Printable(why));
    m_sessions.erase(id);
    if (m_pipe)
        m_pipe->close(id);
}

void Bridge::send(const Session& session, const QByteArray& line)
{
    if (m_pipe)
        m_pipe->send(session.id, line);
}

void Bridge::received(Id id, const QByteArray& line)
{
    const auto it = m_sessions.find(id);
    if (it == m_sessions.end())
        return;
    Session& session = it->second;
    if (!session.verified) {
        reject(id, u"spoke before it was identified"_s);
        return;
    }
    if (line.size() > kMaxLineBytes) {
        send(session, rpc::errorResponse(QJsonValue(), rpc::kInvalidRequest, u"message too large"_s));
        reject(id, u"a line over the size limit"_s);
        return;
    }
    QString problem;
    const std::optional<rpc::Message> message = rpc::parse(line, &problem);
    if (!message) {
        send(session, rpc::errorResponse(QJsonValue(), rpc::kParseError, problem));
        return;
    }
    if (!message->isRequest())
        return; // the client sends no notifications, and answers nothing of ours: ignored
    const auto handler = m_methods.constFind(message->method);
    if (handler == m_methods.constEnd()) {
        send(session, rpc::errorResponse(message->id, rpc::kMethodNotFound, u"unknown method"_s));
        return;
    }
    (this->*handler.value())(session, message->id, message->params);
}

void Bridge::hello(Session& session, const QJsonValue& rpcId, const QJsonObject& params)
{
    QString problem;
    if (!params::onlyKeys(params, {}, problem)) {
        send(session, rpc::errorResponse(rpcId, rpc::kInvalidParams, problem));
        return;
    }
    QJsonObject result;
    result[u"name"_s] = QStringLiteral(QUARRY_NAME);
    result[u"protocol"_s] = kProtocol;
    result[u"engine"_s] = QStringLiteral(WINSHUN_VERSION);
    result[u"access"_s] = m_access;
    send(session, rpc::response(rpcId, result));
}

QJsonObject Bridge::indexState() const
{
    QJsonObject o;
    o[u"state"_s] = stateName(m_index->state());
    o[u"items"_s] = static_cast<double>(m_index->itemCount());
    o[u"access"_s] = m_access;
    return o;
}

void Bridge::indexStatus(Session& session, const QJsonValue& rpcId, const QJsonObject& params)
{
    QString problem;
    if (!params::onlyKeys(params, {}, problem)) {
        send(session, rpc::errorResponse(rpcId, rpc::kInvalidParams, problem));
        return;
    }
    send(session, rpc::response(rpcId, indexState()));
}

void Bridge::indexStateChanged()
{
    const QByteArray line = rpc::notification(u"index.state"_s, indexState());
    for (const auto& [id, session] : m_sessions) {
        if (session.verified)
            send(session, line);
    }
}

void Bridge::searchNames(Session& session, const QJsonValue& rpcId, const QJsonObject& params)
{
    QString problem;
    QString text;
    QString scope = u"all"_s;
    int limit = 50;
    if (!params::onlyKeys(params, {u"text"_s, u"scope"_s, u"limit"_s}, problem)
        || !params::readString(params, u"text"_s, params::kMaxQueryChars, true, text, problem)
        || !params::readEnum(params, u"scope"_s, {u"all"_s, u"files"_s, u"folders"_s}, scope, problem)
        || !params::readInt(params, u"limit"_s, 1, kMaxLimit, limit, problem)) {
        send(session, rpc::errorResponse(rpcId, rpc::kInvalidParams, problem));
        return;
    }
    // Only the newest search matters: the one waited for until now is over.
    failPending(rpc::kCancelled, u"a newer search replaced it"_s);

    ws::SearchEngine::Request request;
    request.text = text;
    request.scope = scope == u"files" ? ws::Scope::Files : scope == u"folders" ? ws::Scope::Folders : ws::Scope::All;
    request.limit = limit;
    // Names only (Scope::Content, the one that reads files, is not offered
    // until phase 3). `web` stays empty: no web shortcuts (network policy).
    // No history or favorites yet (phase 2).
    m_pending = Pending {session.id, rpcId, m_engine->submit(std::move(request))};
    m_searchTimeout.start();
}

void Bridge::failPending(int code, const QString& message)
{
    if (!m_pending)
        return;
    const Pending pending = *m_pending;
    m_pending.reset();
    m_searchTimeout.stop();
    if (const auto it = m_sessions.find(pending.session); it != m_sessions.end())
        send(it->second, rpc::errorResponse(pending.rpcId, code, message));
}

void Bridge::namesReady(quint64 requestId, const ws::SearchResults& results, qint64 total, qint64 elapsedUs)
{
    if (!m_pending || m_pending->requestId != requestId)
        return; // an older search's, or nobody waits for it any more
    const Pending pending = *m_pending;
    m_pending.reset();
    m_searchTimeout.stop();
    const auto it = m_sessions.find(pending.session);
    if (it == m_sessions.end())
        return;

    const QString prefix = QString::number(++m_generation) + u'.';
    QStringList handles;
    handles.reserve(results.size());
    QJsonArray rows;
    for (qsizetype i = 0; i < results.size(); ++i) {
        const QString handle = prefix + QString::number(i);
        handles.append(handle);
        m_rows.insert(handle, results[i]);
        rows.append(toJson(results[i], handle));
    }
    m_generations.push_back(std::move(handles));
    while (m_generations.size() > static_cast<std::size_t>(kHandleGenerations)) {
        for (const QString& old : m_generations.front())
            m_rows.remove(old);
        m_generations.pop_front();
    }

    QJsonObject result;
    result[u"results"_s] = rows;
    result[u"total"_s] = static_cast<double>(total);
    result[u"elapsedUs"_s] = static_cast<double>(elapsedUs);
    send(it->second, rpc::response(pending.rpcId, result));
}

void Bridge::itemResolve(Session& session, const QJsonValue& rpcId, const QJsonObject& params)
{
    QString problem;
    QString handle;
    if (!params::onlyKeys(params, {u"id"_s}, problem)
        || !params::readString(params, u"id"_s, params::kMaxHandleChars, true, handle, problem)) {
        send(session, rpc::errorResponse(rpcId, rpc::kInvalidParams, problem));
        return;
    }
    const auto row = m_rows.constFind(handle);
    if (row == m_rows.constEnd()) {
        send(session, rpc::errorResponse(rpcId, rpc::kInvalidParams, u"no such row (stale or never listed)"_s));
        return;
    }
    send(session, rpc::response(rpcId, launch::toJson(launch::resolve(row.value()))));
}

} // namespace quarry
