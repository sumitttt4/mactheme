#pragma once

// Strict reading of a request's params: every key known, every value of the
// type and size it must be. Anything else is kInvalidParams, never guessed at.

#include <QJsonObject>
#include <QString>
#include <QStringList>

namespace lode::params {

inline constexpr qsizetype kMaxQueryChars = 512;
inline constexpr qsizetype kMaxHandleChars = 32;

// Every key of `params` is in `allowed`; otherwise `problem` names the first that is not.
bool onlyKeys(const QJsonObject& params, const QStringList& allowed, QString& problem);

// A string of at most `maxChars`, no control characters. Missing: `out`
// keeps its value, and that is an error only when `required`.
bool readString(const QJsonObject& params, const QString& key, qsizetype maxChars, bool required, QString& out,
    QString& problem);

// A whole number within [min, max]. Missing: `out` keeps its value.
bool readInt(const QJsonObject& params, const QString& key, int min, int max, int& out, QString& problem);

// One of `allowed`. Missing: `out` keeps its value.
bool readEnum(const QJsonObject& params, const QString& key, const QStringList& allowed, QString& out, QString& problem);

} // namespace lode::params
