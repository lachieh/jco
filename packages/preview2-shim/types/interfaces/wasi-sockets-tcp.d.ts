export namespace WasiSocketsTcp {
  export { TcpSocket };
}
import type { InputStream } from './wasi-io-streams.js';
export { InputStream };
import type { OutputStream } from './wasi-io-streams.js';
export { OutputStream };
import type { Pollable } from './wasi-io-poll.js';
export { Pollable };
import type { Duration } from './wasi-clocks-monotonic-clock.js';
export { Duration };
import type { Network } from './wasi-sockets-network.js';
export { Network };
import type { ErrorCode } from './wasi-sockets-network.js';
export { ErrorCode };
import type { IpSocketAddress } from './wasi-sockets-network.js';
export { IpSocketAddress };
import type { IpAddressFamily } from './wasi-sockets-network.js';
export { IpAddressFamily };
/**
 * # Variants
 * 
 * ## `"receive"`
 * 
 * Similar to `SHUT_RD` in POSIX.
 * ## `"send"`
 * 
 * Similar to `SHUT_WR` in POSIX.
 * ## `"both"`
 * 
 * Similar to `SHUT_RDWR` in POSIX.
 */
export type ShutdownType = 'receive' | 'send' | 'both';

export class TcpSocket {
  /**
  * Bind the socket to a specific network on the provided IP address and port.
  * 
  * If the IP address is zero (`0.0.0.0` in IPv4, `::` in IPv6), it is left to the implementation to decide which
  * network interface(s) to bind to.
  * If the TCP/UDP port is zero, the socket will be bound to a random free port.
  * 
  * Bind can be attempted multiple times on the same socket, even with
  * different arguments on each iteration. But never concurrently and
  * only as long as the previous bind failed. Once a bind succeeds, the
  * binding can't be changed anymore.
  * 
  * # Typical errors
  * - `invalid-argument`:          The `local-address` has the wrong address family. (EAFNOSUPPORT, EFAULT on Windows)
  * - `invalid-argument`:          `local-address` is not a unicast address. (EINVAL)
  * - `invalid-argument`:          `local-address` is an IPv4-mapped IPv6 address. (EINVAL)
  * - `invalid-state`:             The socket is already bound. (EINVAL)
  * - `address-in-use`:            No ephemeral ports available. (EADDRINUSE, ENOBUFS on Windows)
  * - `address-in-use`:            Address is already in use. (EADDRINUSE)
  * - `address-not-bindable`:      `local-address` is not an address that the `network` can bind to. (EADDRNOTAVAIL)
  * - `not-in-progress`:           A `bind` operation is not in progress.
  * - `would-block`:               Can't finish the operation, it is still in progress. (EWOULDBLOCK, EAGAIN)
  * 
  * # Implementors note
  * When binding to a non-zero port, this bind operation shouldn't be affected by the TIME_WAIT
  * state of a recently closed socket on the same local address. In practice this means that the SO_REUSEADDR
  * socket option should be set implicitly on all platforms, except on Windows where this is the default behavior
  * and SO_REUSEADDR performs something different entirely.
  * 
  * Unlike in POSIX, in WASI the bind operation is async. This enables
  * interactive WASI hosts to inject permission prompts. Runtimes that
  * don't want to make use of this ability can simply call the native
  * `bind` as part of either `start-bind` or `finish-bind`.
  * 
  * # References
  * - <https://pubs.opengroup.org/onlinepubs/9699919799/functions/bind.html>
  * - <https://man7.org/linux/man-pages/man2/bind.2.html>
  * - <https://learn.microsoft.com/en-us/windows/win32/api/winsock/nf-winsock-bind>
  * - <https://man.freebsd.org/cgi/man.cgi?query=bind&sektion=2&format=html>
  */
  startBind(network: Network, localAddress: IpSocketAddress): void;
  finishBind(): void;
  /**
  * Connect to a remote endpoint.
  * 
  * On success:
  * - the socket is transitioned into the `connected` state.
  * - a pair of streams is returned that can be used to read & write to the connection
  * 
  * After a failed connection attempt, the socket will be in the `closed`
  * state and the only valid action left is to `drop` the socket. A single
  * socket can not be used to connect more than once.
  * 
  * # Typical errors
  * - `invalid-argument`:          The `remote-address` has the wrong address family. (EAFNOSUPPORT)
  * - `invalid-argument`:          `remote-address` is not a unicast address. (EINVAL, ENETUNREACH on Linux, EAFNOSUPPORT on MacOS)
  * - `invalid-argument`:          `remote-address` is an IPv4-mapped IPv6 address. (EINVAL, EADDRNOTAVAIL on Illumos)
  * - `invalid-argument`:          The IP address in `remote-address` is set to INADDR_ANY (`0.0.0.0` / `::`). (EADDRNOTAVAIL on Windows)
  * - `invalid-argument`:          The port in `remote-address` is set to 0. (EADDRNOTAVAIL on Windows)
  * - `invalid-argument`:          The socket is already attached to a different network. The `network` passed to `connect` must be identical to the one passed to `bind`.
  * - `invalid-state`:             The socket is already in the `connected` state. (EISCONN)
  * - `invalid-state`:             The socket is already in the `listening` state. (EOPNOTSUPP, EINVAL on Windows)
  * - `timeout`:                   Connection timed out. (ETIMEDOUT)
  * - `connection-refused`:        The connection was forcefully rejected. (ECONNREFUSED)
  * - `connection-reset`:          The connection was reset. (ECONNRESET)
  * - `connection-aborted`:        The connection was aborted. (ECONNABORTED)
  * - `remote-unreachable`:        The remote address is not reachable. (EHOSTUNREACH, EHOSTDOWN, ENETUNREACH, ENETDOWN, ENONET)
  * - `address-in-use`:            Tried to perform an implicit bind, but there were no ephemeral ports available. (EADDRINUSE, EADDRNOTAVAIL on Linux, EAGAIN on BSD)
  * - `not-in-progress`:           A connect operation is not in progress.
  * - `would-block`:               Can't finish the operation, it is still in progress. (EWOULDBLOCK, EAGAIN)
  * 
  * # Implementors note
  * The POSIX equivalent of `start-connect` is the regular `connect` syscall.
  * Because all WASI sockets are non-blocking this is expected to return
  * EINPROGRESS, which should be translated to `ok()` in WASI.
  * 
  * The POSIX equivalent of `finish-connect` is a `poll` for event `POLLOUT`
  * with a timeout of 0 on the socket descriptor. Followed by a check for
  * the `SO_ERROR` socket option, in case the poll signaled readiness.
  * 
  * # References
  * - <https://pubs.opengroup.org/onlinepubs/9699919799/functions/connect.html>
  * - <https://man7.org/linux/man-pages/man2/connect.2.html>
  * - <https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-connect>
  * - <https://man.freebsd.org/cgi/man.cgi?connect>
  */
  startConnect(network: Network, remoteAddress: IpSocketAddress): void;
  finishConnect(): [InputStream, OutputStream];
  /**
  * Start listening for new connections.
  * 
  * Transitions the socket into the `listening` state.
  * 
  * Unlike POSIX, the socket must already be explicitly bound.
  * 
  * # Typical errors
  * - `invalid-state`:             The socket is not bound to any local address. (EDESTADDRREQ)
  * - `invalid-state`:             The socket is already in the `connected` state. (EISCONN, EINVAL on BSD)
  * - `invalid-state`:             The socket is already in the `listening` state.
  * - `address-in-use`:            Tried to perform an implicit bind, but there were no ephemeral ports available. (EADDRINUSE)
  * - `not-in-progress`:           A listen operation is not in progress.
  * - `would-block`:               Can't finish the operation, it is still in progress. (EWOULDBLOCK, EAGAIN)
  * 
  * # Implementors note
  * Unlike in POSIX, in WASI the listen operation is async. This enables
  * interactive WASI hosts to inject permission prompts. Runtimes that
  * don't want to make use of this ability can simply call the native
  * `listen` as part of either `start-listen` or `finish-listen`.
  * 
  * # References
  * - <https://pubs.opengroup.org/onlinepubs/9699919799/functions/listen.html>
  * - <https://man7.org/linux/man-pages/man2/listen.2.html>
  * - <https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-listen>
  * - <https://man.freebsd.org/cgi/man.cgi?query=listen&sektion=2>
  */
  startListen(): void;
  finishListen(): void;
  /**
  * Accept a new client socket.
  * 
  * The returned socket is bound and in the `connected` state. The following properties are inherited from the listener socket:
  * - `address-family`
  * - `keep-alive-enabled`
  * - `keep-alive-idle-time`
  * - `keep-alive-interval`
  * - `keep-alive-count`
  * - `hop-limit`
  * - `receive-buffer-size`
  * - `send-buffer-size`
  * 
  * On success, this function returns the newly accepted client socket along with
  * a pair of streams that can be used to read & write to the connection.
  * 
  * # Typical errors
  * - `invalid-state`:      Socket is not in the `listening` state. (EINVAL)
  * - `would-block`:        No pending connections at the moment. (EWOULDBLOCK, EAGAIN)
  * - `connection-aborted`: An incoming connection was pending, but was terminated by the client before this listener could accept it. (ECONNABORTED)
  * - `new-socket-limit`:   The new socket resource could not be created because of a system limit. (EMFILE, ENFILE)
  * 
  * # References
  * - <https://pubs.opengroup.org/onlinepubs/9699919799/functions/accept.html>
  * - <https://man7.org/linux/man-pages/man2/accept.2.html>
  * - <https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-accept>
  * - <https://man.freebsd.org/cgi/man.cgi?query=accept&sektion=2>
  */
  accept(): [TcpSocket, InputStream, OutputStream];
  /**
  * Get the bound local address.
  * 
  * POSIX mentions:
  * > If the socket has not been bound to a local name, the value
  * > stored in the object pointed to by `address` is unspecified.
  * 
  * WASI is stricter and requires `local-address` to return `invalid-state` when the socket hasn't been bound yet.
  * 
  * # Typical errors
  * - `invalid-state`: The socket is not bound to any local address.
  * 
  * # References
  * - <https://pubs.opengroup.org/onlinepubs/9699919799/functions/getsockname.html>
  * - <https://man7.org/linux/man-pages/man2/getsockname.2.html>
  * - <https://learn.microsoft.com/en-us/windows/win32/api/winsock/nf-winsock-getsockname>
  * - <https://man.freebsd.org/cgi/man.cgi?getsockname>
  */
  localAddress(): IpSocketAddress;
  /**
  * Get the remote address.
  * 
  * # Typical errors
  * - `invalid-state`: The socket is not connected to a remote address. (ENOTCONN)
  * 
  * # References
  * - <https://pubs.opengroup.org/onlinepubs/9699919799/functions/getpeername.html>
  * - <https://man7.org/linux/man-pages/man2/getpeername.2.html>
  * - <https://learn.microsoft.com/en-us/windows/win32/api/winsock/nf-winsock-getpeername>
  * - <https://man.freebsd.org/cgi/man.cgi?query=getpeername&sektion=2&n=1>
  */
  remoteAddress(): IpSocketAddress;
  /**
  * Whether the socket is in the `listening` state.
  * 
  * Equivalent to the SO_ACCEPTCONN socket option.
  */
  isListening(): boolean;
  /**
  * Whether this is a IPv4 or IPv6 socket.
  * 
  * Equivalent to the SO_DOMAIN socket option.
  */
  addressFamily(): IpAddressFamily;
  /**
  * Hints the desired listen queue size. Implementations are free to ignore this.
  * 
  * If the provided value is 0, an `invalid-argument` error is returned.
  * Any other value will never cause an error, but it might be silently clamped and/or rounded.
  * 
  * # Typical errors
  * - `not-supported`:        (set) The platform does not support changing the backlog size after the initial listen.
  * - `invalid-argument`:     (set) The provided value was 0.
  * - `invalid-state`:        (set) The socket is in the `connect-in-progress` or `connected` state.
  */
  setListenBacklogSize(value: bigint): void;
  /**
  * Enables or disables keepalive.
  * 
  * The keepalive behavior can be adjusted using:
  * - `keep-alive-idle-time`
  * - `keep-alive-interval`
  * - `keep-alive-count`
  * These properties can be configured while `keep-alive-enabled` is false, but only come into effect when `keep-alive-enabled` is true.
  * 
  * Equivalent to the SO_KEEPALIVE socket option.
  */
  keepAliveEnabled(): boolean;
  setKeepAliveEnabled(value: boolean): void;
  /**
  * Amount of time the connection has to be idle before TCP starts sending keepalive packets.
  * 
  * If the provided value is 0, an `invalid-argument` error is returned.
  * Any other value will never cause an error, but it might be silently clamped and/or rounded.
  * I.e. after setting a value, reading the same setting back may return a different value.
  * 
  * Equivalent to the TCP_KEEPIDLE socket option. (TCP_KEEPALIVE on MacOS)
  * 
  * # Typical errors
  * - `invalid-argument`:     (set) The provided value was 0.
  */
  keepAliveIdleTime(): Duration;
  setKeepAliveIdleTime(value: Duration): void;
  /**
  * The time between keepalive packets.
  * 
  * If the provided value is 0, an `invalid-argument` error is returned.
  * Any other value will never cause an error, but it might be silently clamped and/or rounded.
  * I.e. after setting a value, reading the same setting back may return a different value.
  * 
  * Equivalent to the TCP_KEEPINTVL socket option.
  * 
  * # Typical errors
  * - `invalid-argument`:     (set) The provided value was 0.
  */
  keepAliveInterval(): Duration;
  setKeepAliveInterval(value: Duration): void;
  /**
  * The maximum amount of keepalive packets TCP should send before aborting the connection.
  * 
  * If the provided value is 0, an `invalid-argument` error is returned.
  * Any other value will never cause an error, but it might be silently clamped and/or rounded.
  * I.e. after setting a value, reading the same setting back may return a different value.
  * 
  * Equivalent to the TCP_KEEPCNT socket option.
  * 
  * # Typical errors
  * - `invalid-argument`:     (set) The provided value was 0.
  */
  keepAliveCount(): number;
  setKeepAliveCount(value: number): void;
  /**
  * Equivalent to the IP_TTL & IPV6_UNICAST_HOPS socket options.
  * 
  * If the provided value is 0, an `invalid-argument` error is returned.
  * 
  * # Typical errors
  * - `invalid-argument`:     (set) The TTL value must be 1 or higher.
  */
  hopLimit(): number;
  setHopLimit(value: number): void;
  /**
  * The kernel buffer space reserved for sends/receives on this socket.
  * 
  * If the provided value is 0, an `invalid-argument` error is returned.
  * Any other value will never cause an error, but it might be silently clamped and/or rounded.
  * I.e. after setting a value, reading the same setting back may return a different value.
  * 
  * Equivalent to the SO_RCVBUF and SO_SNDBUF socket options.
  * 
  * # Typical errors
  * - `invalid-argument`:     (set) The provided value was 0.
  */
  receiveBufferSize(): bigint;
  setReceiveBufferSize(value: bigint): void;
  sendBufferSize(): bigint;
  setSendBufferSize(value: bigint): void;
  /**
  * Create a `pollable` which can be used to poll for, or block on,
  * completion of any of the asynchronous operations of this socket.
  * 
  * When `finish-bind`, `finish-listen`, `finish-connect` or `accept`
  * return `error(would-block)`, this pollable can be used to wait for
  * their success or failure, after which the method can be retried.
  * 
  * The pollable is not limited to the async operation that happens to be
  * in progress at the time of calling `subscribe` (if any). Theoretically,
  * `subscribe` only has to be called once per socket and can then be
  * (re)used for the remainder of the socket's lifetime.
  * 
  * See <https://github.com/WebAssembly/wasi-sockets/blob/main/TcpSocketOperationalSemantics.md#pollable-readiness>
  * for more information.
  * 
  * Note: this function is here for WASI 0.2 only.
  * It's planned to be removed when `future` is natively supported in Preview3.
  */
  subscribe(): Pollable;
  /**
  * Initiate a graceful shutdown.
  * 
  * - `receive`: The socket is not expecting to receive any data from
  * the peer. The `input-stream` associated with this socket will be
  * closed. Any data still in the receive queue at time of calling
  * this method will be discarded.
  * - `send`: The socket has no more data to send to the peer. The `output-stream`
  * associated with this socket will be closed and a FIN packet will be sent.
  * - `both`: Same effect as `receive` & `send` combined.
  * 
  * This function is idempotent; shutting down a direction more than once
  * has no effect and returns `ok`.
  * 
  * The shutdown function does not close (drop) the socket.
  * 
  * # Typical errors
  * - `invalid-state`: The socket is not in the `connected` state. (ENOTCONN)
  * 
  * # References
  * - <https://pubs.opengroup.org/onlinepubs/9699919799/functions/shutdown.html>
  * - <https://man7.org/linux/man-pages/man2/shutdown.2.html>
  * - <https://learn.microsoft.com/en-us/windows/win32/api/winsock/nf-winsock-shutdown>
  * - <https://man.freebsd.org/cgi/man.cgi?query=shutdown&sektion=2>
  */
  shutdown(shutdownType: ShutdownType): void;
}
