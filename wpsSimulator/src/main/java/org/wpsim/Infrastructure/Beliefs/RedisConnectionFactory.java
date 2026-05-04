package org.wpsim.Infrastructure.Beliefs;

import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.api.sync.RedisCommands;

import java.time.Duration;

/**
 * Singleton that reads REDIS_HOST / REDIS_PORT from the environment and provides a
 * shared synchronous Lettuce connection.  Returns null when Redis is not configured
 * (REDIS_HOST unset) so callers can degrade gracefully.
 */
public class RedisConnectionFactory {

    private static final String ENV_HOST = "REDIS_HOST";
    private static final String ENV_PORT = "REDIS_PORT";
    private static final int    DEFAULT_PORT = 6379;

    private static volatile RedisConnectionFactory INSTANCE;

    private final RedisClient client;
    private final StatefulRedisConnection<String, String> connection;

    private RedisConnectionFactory(String host, int port) {
        RedisURI uri = RedisURI.builder()
                .withHost(host)
                .withPort(port)
                .withTimeout(Duration.ofSeconds(2))
                .build();
        this.client = RedisClient.create(uri);
        this.connection = client.connect();
    }

    public static RedisConnectionFactory getInstance() {
        if (INSTANCE == null) {
            synchronized (RedisConnectionFactory.class) {
                if (INSTANCE == null) {
                    String host = System.getenv(ENV_HOST);
                    if (host != null && !host.isBlank()) {
                        int port = DEFAULT_PORT;
                        String portEnv = System.getenv(ENV_PORT);
                        if (portEnv != null && !portEnv.isBlank()) {
                            try { port = Integer.parseInt(portEnv.trim()); }
                            catch (NumberFormatException ignored) {}
                        }
                        INSTANCE = new RedisConnectionFactory(host.trim(), port);
                    }
                }
            }
        }
        return INSTANCE;
    }

    /** Returns true when Redis was configured via environment variables. */
    public static boolean isAvailable() {
        return System.getenv(ENV_HOST) != null && !System.getenv(ENV_HOST).isBlank();
    }

    public RedisCommands<String, String> sync() {
        return connection.sync();
    }

    public void close() {
        try { connection.close(); } catch (Exception ignored) {}
        try { client.shutdown(); } catch (Exception ignored) {}
    }
}
