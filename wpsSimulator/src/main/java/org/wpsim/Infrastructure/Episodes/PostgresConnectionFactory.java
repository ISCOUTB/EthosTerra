package org.wpsim.Infrastructure.Episodes;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

/**
 * Singleton factory for PostgreSQL connections using HikariCP.
 * Reads configuration from environment variables.
 */
public class PostgresConnectionFactory {
    private static final String ENV_HOST = "POSTGRES_HOST";
    private static final String ENV_PORT = "POSTGRES_PORT";
    private static final String ENV_DB   = "POSTGRES_DB";
    private static final String ENV_USER = "POSTGRES_USER";
    private static final String ENV_PASS = "POSTGRES_PASSWORD";

    private static volatile PostgresConnectionFactory INSTANCE;
    private final HikariDataSource dataSource;

    private PostgresConnectionFactory() {
        String host = System.getenv(ENV_HOST);
        String port = System.getenv(ENV_PORT);
        if (port == null || port.isBlank()) port = "5432";
        String db   = System.getenv(ENV_DB);
        String user = System.getenv(ENV_USER);
        String pass = System.getenv(ENV_PASS);

        if (host == null || db == null || user == null) {
            throw new RuntimeException("Postgres environment variables not fully set (POSTGRES_HOST, POSTGRES_DB, POSTGRES_USER)");
        }

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(String.format("jdbc:postgresql://%s:%s/%s", host, port, db));
        config.setUsername(user);
        config.setPassword(pass);
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        config.setIdleTimeout(300000);
        config.setConnectionTimeout(20000);
        config.addDataSourceProperty("cachePrepStmts", "true");
        config.addDataSourceProperty("prepStmtCacheSize", "250");
        config.addDataSourceProperty("prepStmtCacheSqlLimit", "2048");

        this.dataSource = new HikariDataSource(config);
    }

    public static PostgresConnectionFactory getInstance() {
        if (INSTANCE == null) {
            synchronized (PostgresConnectionFactory.class) {
                if (INSTANCE == null) {
                    INSTANCE = new PostgresConnectionFactory();
                }
            }
        }
        return INSTANCE;
    }

    public static boolean isAvailable() {
        return System.getenv(ENV_HOST) != null && !System.getenv(ENV_HOST).isBlank();
    }

    public Connection getConnection() throws SQLException {
        return dataSource.getConnection();
    }

    public DataSource getDataSource() {
        return dataSource;
    }

    public void close() {
        if (dataSource != null) {
            dataSource.close();
        }
    }
}
