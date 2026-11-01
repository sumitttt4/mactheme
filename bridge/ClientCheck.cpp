#include "ClientCheck.h"

#include <cstddef>
#include <vector>

using namespace Qt::StringLiterals;

namespace quarry {

namespace {

std::vector<std::byte> tokenUser(HANDLE token)
{
    DWORD size = 0;
    ::GetTokenInformation(token, TokenUser, nullptr, 0, &size);
    if (size == 0)
        return {};
    std::vector<std::byte> buffer(size);
    if (!::GetTokenInformation(token, TokenUser, buffer.data(), size, &size))
        return {};
    return buffer;
}

} // namespace

bool sameUserAndSession(HANDLE clientToken, QString& why)
{
    if (!clientToken) {
        why = u"the client could not be identified"_s;
        return false;
    }
    HANDLE own = nullptr;
    if (!::OpenProcessToken(::GetCurrentProcess(), TOKEN_QUERY, &own)) {
        why = u"the bridge's own token cannot be read"_s;
        return false;
    }
    const std::vector<std::byte> ownUser = tokenUser(own);
    DWORD ownSession = 0;
    DWORD size = sizeof ownSession;
    const bool ownSessionOk = ::GetTokenInformation(own, TokenSessionId, &ownSession, size, &size);
    ::CloseHandle(own);

    const std::vector<std::byte> clientUser = tokenUser(clientToken);
    DWORD clientSession = 0;
    size = sizeof clientSession;
    const bool clientSessionOk = ::GetTokenInformation(clientToken, TokenSessionId, &clientSession, size, &size);

    if (ownUser.empty() || clientUser.empty() || !ownSessionOk || !clientSessionOk) {
        why = u"the tokens cannot be compared"_s;
        return false;
    }
    const PSID a = reinterpret_cast<const TOKEN_USER*>(ownUser.data())->User.Sid;
    const PSID b = reinterpret_cast<const TOKEN_USER*>(clientUser.data())->User.Sid;
    if (!::EqualSid(a, b)) {
        why = u"another account"_s;
        return false;
    }
    if (ownSession != clientSession) {
        why = u"another Windows session"_s;
        return false;
    }
    return true;
}

} // namespace quarry
