package BESA.Remote.RabbitMQ;

import BESA.Config.ConfigBESA;
import BESA.Log.ReportBESA;
import com.rabbitmq.client.Channel;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.ConnectionFactory;

import java.io.IOException;
import java.util.concurrent.TimeoutException;

/**
 * Singleton managing the RabbitMQ connection and channel for the BESA Container.
 */
public class RabbitMQManager {
    private static RabbitMQManager instance;
    private Connection connection;
    private Channel channel;
    
    public static final String EXCHANGE_NAME = "besa.exchange";

    private RabbitMQManager() {}

    public static synchronized RabbitMQManager getInstance() {
        if (instance == null) {
            instance = new RabbitMQManager();
        }
        return instance;
    }

    public void init(ConfigBESA config) throws IOException, TimeoutException {
        if (connection != null && connection.isOpen()) {
            return;
        }
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost(config.getRabbitmqHost());
        factory.setPort(config.getRabbitmqPort());
        factory.setUsername(config.getRabbitmqUsername());
        factory.setPassword(config.getRabbitmqPassword());
        factory.setVirtualHost(config.getRabbitmqVirtualHost());
        
        this.connection = factory.newConnection();
        this.channel = connection.createChannel();
        
        // Declare the direct exchange
        this.channel.exchangeDeclare(EXCHANGE_NAME, "direct", true);
        ReportBESA.trace("RabbitMQ Manager initialized on HOST: " + config.getRabbitmqHost() + " PORT: " + config.getRabbitmqPort());
    }

    public Channel getChannel() {
        return channel;
    }

    public void close() {
        try {
            if (channel != null && channel.isOpen()) channel.close();
            if (connection != null && connection.isOpen()) connection.close();
        } catch (Exception e) {
            ReportBESA.error("Error closing RabbitMQ Manager: " + e.getMessage());
        }
    }
}
