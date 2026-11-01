#include "Params.h"

#include <QJsonValue>

#include <cmath>

using namespace Qt::StringLiterals;

namespace quarry::params {

bool onlyKeys(const QJsonObject& params, const QStringList& allowed, QString& problem)
{
    for (auto it = params.constBegin(); it != params.constEnd(); ++it) {
        if (!allowed.contains(it.key())) {
            problem = u"unknown parameter: "_s + it.key().left(64);
            return false;
        }
    }
    return true;
}

bool readString(const QJsonObject& params, const QString& key, qsizetype maxChars, bool required, QString& out,
    QString& problem)
{
    const QJsonValue value = params.value(key);
    if (value.isUndefined()) {
        if (required)
            problem = key + u" is required"_s;
        return !required;
    }
    if (!value.isString()) {
        problem = key + u" must be a string"_s;
        return false;
    }
    const QString text = value.toString();
    if (text.size() > maxChars) {
        problem = key + u" is longer than "_s + QString::number(maxChars) + u" characters"_s;
        return false;
    }
    for (const QChar c : text) {
        if (c.unicode() < 0x20 || c.unicode() == 0x7f) {
            problem = key + u" has a control character"_s;
            return false;
        }
    }
    out = text;
    return true;
}

bool readInt(const QJsonObject& params, const QString& key, int min, int max, int& out, QString& problem)
{
    const QJsonValue value = params.value(key);
    if (value.isUndefined())
        return true;
    const double number = value.toDouble(std::nan(""));
    if (!value.isDouble() || !std::isfinite(number) || std::floor(number) != number || number < min || number > max) {
        problem = key + u" must be a whole number from "_s + QString::number(min) + u" to "_s + QString::number(max);
        return false;
    }
    out = static_cast<int>(number);
    return true;
}

bool readEnum(const QJsonObject& params, const QString& key, const QStringList& allowed, QString& out, QString& problem)
{
    const QJsonValue value = params.value(key);
    if (value.isUndefined())
        return true;
    if (!value.isString() || !allowed.contains(value.toString())) {
        problem = key + u" must be one of: "_s + allowed.join(u", "_s);
        return false;
    }
    out = value.toString();
    return true;
}

} // namespace quarry::params
