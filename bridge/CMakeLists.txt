# wsbridge: WinShun's engine (wscore) served as JSON-RPC 2.0 lines over a
# named pipe, for the Electron shell (../shell). Built inside a local
# WinShun clone: the upstream top-level CMakeLists adds this folder when
# LODE_ROOT is set (patches/0001-add-bridge.patch, FORK-NOTES.md).
#
# Qt Core + Sql (through wscore) and Win32 only: no Qt Quick, no QML.

if(NOT DEFINED LODE_ROOT)
    message(FATAL_ERROR "LODE_ROOT is not set: configure through scripts/build-bridge.ps1")
endif()

file(READ "${LODE_ROOT}/identity.json" lode_identity)
string(JSON lode_name GET "${lode_identity}" name)
string(JSON lode_pipe_prefix GET "${lode_identity}" bridgePipePrefix)
set_property(DIRECTORY APPEND PROPERTY CMAKE_CONFIGURE_DEPENDS "${LODE_ROOT}/identity.json")

qt_add_executable(wsbridge
    main.cpp
    Bridge.cpp Bridge.h
    ClientCheck.cpp ClientCheck.h
    Launch.cpp Launch.h
    Params.cpp Params.h
    ResultJson.cpp ResultJson.h
)
# A console program: the shell starts it hidden (windowsHide) and reads its
# "ready" line and logs; it ends when the shell closes its stdin.
set_target_properties(wsbridge PROPERTIES WIN32_EXECUTABLE OFF)
target_compile_definitions(wsbridge PRIVATE
    LODE_NAME="${lode_name}"
    LODE_PIPE_PREFIX="${lode_pipe_prefix}")
# wsmcp: PipeServer, and through it wsmcp_proto (JsonRpc, LineChannel, Pipe) and wscore.
target_link_libraries(wsbridge PRIVATE wsmcp wscore winshun_options advapi32 shell32)
