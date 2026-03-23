/*
 * @(#)ConfigBESA.java 3.0	11/09/11
 *
 * Copyright 2011, Pontificia Universidad Javeriana, All rights reserved. Takina
 * and SIDRe PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 */
package BESA.Config;

import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.UnknownHostException;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

public class ConfigBESA {

    private String CONFIG_FILE = "confbesa.xml";
    private final String DEFAULT_IP_ADDRESS = "127.0.0.1";
    private final int DEFAULT_SEND_EVENT_ATTEMPS = 10;
    private final long DEFAULT_SEND_EVENT_TIMEOUT = 1;
    private EnvironmentCase environmentCase = EnvironmentCase.LOCAL;
    private String aliasContainer = "MAS";
    private double passwordContainer = 0.91;
    private String ipaddress = "127.0.0.1";
    private long sendEventTimeout = 1;
    private int sendEventAttemps = 10;
    private int bloport = 8080;
    private int bpoPort = 8000;
    
    // RabbitMQ Configuration
    private String rabbitmqHost = System.getenv("RABBITMQ_HOST") != null ? System.getenv("RABBITMQ_HOST") : "localhost";
    private int rabbitmqPort = System.getenv("RABBITMQ_PORT") != null ? Integer.parseInt(System.getenv("RABBITMQ_PORT")) : 5672;
    private String rabbitmqUsername = System.getenv("RABBITMQ_USERNAME") != null ? System.getenv("RABBITMQ_USERNAME") : "guest";
    private String rabbitmqPassword = System.getenv("RABBITMQ_PASSWORD") != null ? System.getenv("RABBITMQ_PASSWORD") : "guest";
    private String rabbitmqVirtualHost = System.getenv("RABBITMQ_VIRTUAL_HOST") != null ? System.getenv("RABBITMQ_VIRTUAL_HOST") : "/";
    /**
     * Checkpoint frequency in milliseconds
     */
    private int checkpointTime = 30000;

    public ConfigBESA() throws ConfigExceptionBESA {
        loadConfig();
    }

    public ConfigBESA(String configBESAPATH) throws ConfigExceptionBESA {
        CONFIG_FILE = configBESAPATH;                                           //Sets a new path.
        loadConfig();
    }

    protected ConfigBESA(Builder builder) {
        this.aliasContainer = builder.aliasContainer;
        this.passwordContainer = builder.passwordContainer;
        this.ipaddress = builder.ipaddress;
        this.environmentCase = builder.environmentCase;
        this.rabbitmqHost = builder.rabbitmqHost;
        this.rabbitmqPort = builder.rabbitmqPort;
        this.rabbitmqUsername = builder.rabbitmqUsername;
        this.rabbitmqPassword = builder.rabbitmqPassword;
        this.rabbitmqVirtualHost = builder.rabbitmqVirtualHost;
        this.sendEventTimeout = builder.sendEventTimeout;
        this.sendEventAttemps = builder.sendEventAttemps;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String aliasContainer = System.getenv("BESA_CONTAINER_ALIAS") != null ? System.getenv("BESA_CONTAINER_ALIAS") : "MAS";
        private double passwordContainer = 0.91;
        private String ipaddress = "127.0.0.1";
        private EnvironmentCase environmentCase = EnvironmentCase.REMOTE;
        private String rabbitmqHost = System.getenv("RABBITMQ_HOST") != null ? System.getenv("RABBITMQ_HOST") : "localhost";
        private int rabbitmqPort = System.getenv("RABBITMQ_PORT") != null ? Integer.parseInt(System.getenv("RABBITMQ_PORT")) : 5672;
        private String rabbitmqUsername = System.getenv("RABBITMQ_USERNAME") != null ? System.getenv("RABBITMQ_USERNAME") : "guest";
        private String rabbitmqPassword = System.getenv("RABBITMQ_PASSWORD") != null ? System.getenv("RABBITMQ_PASSWORD") : "guest";
        private String rabbitmqVirtualHost = System.getenv("RABBITMQ_VIRTUAL_HOST") != null ? System.getenv("RABBITMQ_VIRTUAL_HOST") : "/";
        private long sendEventTimeout = 1;
        private int sendEventAttemps = 10;

        public Builder alias(String alias) { this.aliasContainer = alias; return this; }
        public Builder password(double password) { this.passwordContainer = password; return this; }
        public Builder ipAddress(String ip) { this.ipaddress = ip; return this; }
        public Builder environmentCase(EnvironmentCase ec) { this.environmentCase = ec; return this; }
        public Builder rabbitmqHost(String host) { this.rabbitmqHost = host; return this; }
        
        public ConfigBESA build() {
            return new ConfigBESA(this);
        }
    }

    private boolean loadConfig() throws ConfigExceptionBESA {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            DocumentBuilder builder = factory.newDocumentBuilder();

            InputStream inputStream = null;

            // Intentar cargar desde dentro del JAR
            inputStream = getClass().getClassLoader().getResourceAsStream(CONFIG_FILE);

            // Si no se encuentra dentro del JAR, intentar cargarlo desde el sistema de archivos
            if (inputStream == null) {
                File file = new File(CONFIG_FILE);
                if (file.exists()) {
                    try {
                        inputStream = new FileInputStream(file);
                    } catch (FileNotFoundException e) {
                        throw new FileNotFoundException("No se pudo encontrar " + CONFIG_FILE + " ni dentro del JAR ni en el sistema de archivos");
                    }
                } else {
                    throw new FileNotFoundException("No se pudo encontrar " + CONFIG_FILE + " ni dentro del JAR ni en el sistema de archivos");
                }
            }

            Document document = builder.parse(inputStream);

            document.getDocumentElement().normalize();
            Element root = document.getDocumentElement();
            NodeList containerList = root.getElementsByTagName("container");

            if (containerList.getLength() > 0) {
                Element containerElement = (Element) containerList.item(0);
                Container container = new Container();
                container.setAlias(containerElement.getAttribute("alias"));
                container.setPassword(Double.parseDouble(containerElement.getAttribute("password")));
                container.setIpaddress(containerElement.getAttribute("ipaddress"));

                NodeList environmentList = containerElement.getElementsByTagName("environment");
                if (environmentList.getLength() > 0) {
                    Element environmentElement = (Element) environmentList.item(0);
                    Environment environment = new Environment();
                    environment.setSeneventattemps(Integer.parseInt(environmentElement.getAttribute("seneventattemps")));
                    environment.setSendeventtimeout(Long.parseLong(environmentElement.getAttribute("sendeventtimeout")));

                    NodeList remoteList = environmentElement.getElementsByTagName("remote");
                    if (remoteList.getLength() > 0) {
                        Element remoteElement = (Element) remoteList.item(0);
                        // Legacy RMI properties are ignored; RabbitMQ is preferred
                        // Parse RabbitMQ properties if they exist
                        if (remoteElement.hasAttribute("rabbitmqHost")) {
                            this.rabbitmqHost = remoteElement.getAttribute("rabbitmqHost");
                        }
                        if (remoteElement.hasAttribute("rabbitmqPort")) {
                            this.rabbitmqPort = Integer.parseInt(remoteElement.getAttribute("rabbitmqPort"));
                        }
                        if (remoteElement.hasAttribute("rabbitmqUsername")) {
                            this.rabbitmqUsername = remoteElement.getAttribute("rabbitmqUsername");
                        }
                        if (remoteElement.hasAttribute("rabbitmqPassword")) {
                            this.rabbitmqPassword = remoteElement.getAttribute("rabbitmqPassword");
                        }
                        if (remoteElement.hasAttribute("rabbitmqVirtualHost")) {
                            this.rabbitmqVirtualHost = remoteElement.getAttribute("rabbitmqVirtualHost");
                        }

                        container.setEnvironment(environment);
                    }

                    updateConfigFromXML(container);
                }
            } else {
                throw new ConfigExceptionBESA("Missing the Container tag.");
            }
        } catch (ParserConfigurationException | SAXException | IOException e) {
            throw new ConfigExceptionBESA("Error reading the configuration file: " + e.getMessage());
        }

        return false;
    }

    private void updateConfigFromXML(Container xMLcontainer) throws ConfigExceptionBESA {
        aliasContainer = xMLcontainer.getAlias();
        passwordContainer = xMLcontainer.getPassword();
        ipaddress = xMLcontainer.getIpaddress();

        if (aliasContainer == null || aliasContainer.isEmpty()) {
            throw new ConfigExceptionBESA("Missing the property \"alias\" in the Container tag.");
        }
        if (passwordContainer == 0.0) {
            throw new ConfigExceptionBESA("Missing the property \"password\" in the Container tag.");
        }
        if (ipaddress == null || ipaddress.isEmpty()) {
            try {
                ipaddress = InetAddress.getLocalHost().getHostAddress();
            } catch (UnknownHostException ex) {
                ipaddress = DEFAULT_IP_ADDRESS;
            }
        }
    }


    // Add other getter and setter methods for the ConfigBESA properties here
    /**
     * Sets the send event time-out.
     *
     * @param t Send event time-out.
     */
    public void setSendEventTimeout(long t) {
        this.sendEventTimeout = t;
    }

    /**
     * Sets the send event attemps.
     *
     * @param t Send event attemps.
     */
    public void setSendEventAttemps(int t) {
        this.sendEventAttemps = t;
    }

    /**
     * Gets send event time-out.
     *
     * @return Send event time-out.
     */
    public long getSendEventTimeout() {
        return this.sendEventTimeout;
    }



    /**
     * Gets the send event attemps.
     *
     * @return Send event attemps.
     */
    public int getSendEventAttemps() {
        return this.sendEventAttemps;
    }

    /**
     * Gets the alias container.
     *
     * @return Alias container.
     */
    public String getAliasContainer() {
        return aliasContainer;
    }

    /**
     * Sets alias container.
     *
     * @param aliasContainer Alias container.
     */
    public void setAliasContainer(String aliasContainer) {
        this.aliasContainer = aliasContainer;
    }

    /**
     * Gets the IP Address.
     *
     * @return IP Address.
     */
    public String getIpaddress() {
        return ipaddress;
    }

    /**
     * Sets the IP Addess.
     *
     * @param ipaddress IP Address.
     */
    public void setIpaddress(String ipaddress) {
        this.ipaddress = ipaddress;
    }

    /**
     * Gets the password container.
     *
     * @return Password container.
     */
    public double getPasswordContainer() {
        return passwordContainer;
    }

    /**
     * Sets the passsword container.
     *
     * @param passwordContainer
     */
    public void setPasswordContainer(double passwordContainer) {
        this.passwordContainer = passwordContainer;
    }



    /**
     * Gets the environment type.
     *
     * @return environment type.
     */
    public EnvironmentCase getEnvironmentCase() {
        return environmentCase;
    }



    /**
     *
     * @return
     */
    public int getCheckpointTime() {
        return checkpointTime;
    }

    /**
     *
     * @param checkpointTime
     */
    public void setCheckpointTime(int checkpointTime) {
        this.checkpointTime = checkpointTime;
    }

    public String getRabbitmqHost() {
        return rabbitmqHost;
    }

    public void setRabbitmqHost(String rabbitmqHost) {
        this.rabbitmqHost = rabbitmqHost;
    }

    public int getRabbitmqPort() {
        return rabbitmqPort;
    }

    public void setRabbitmqPort(int rabbitmqPort) {
        this.rabbitmqPort = rabbitmqPort;
    }

    public String getRabbitmqUsername() {
        return rabbitmqUsername;
    }

    public void setRabbitmqUsername(String rabbitmqUsername) {
        this.rabbitmqUsername = rabbitmqUsername;
    }

    public String getRabbitmqPassword() {
        return rabbitmqPassword;
    }

    public void setRabbitmqPassword(String rabbitmqPassword) {
        this.rabbitmqPassword = rabbitmqPassword;
    }

    public String getRabbitmqVirtualHost() {
        return rabbitmqVirtualHost;
    }

    public void setRabbitmqVirtualHost(String rabbitmqVirtualHost) {
        this.rabbitmqVirtualHost = rabbitmqVirtualHost;
    }

    @Override
    public String toString() {
        return "ConfigBESA{"
                + "CONFIG_FILE='" + CONFIG_FILE + '\''
                + ", DEFAULT_IP_ADDRESS='" + DEFAULT_IP_ADDRESS + '\''
                + ", DEFAULT_SEND_EVENT_ATTEMPS=" + DEFAULT_SEND_EVENT_ATTEMPS
                + ", DEFAULT_SEND_EVENT_TIMEOUT=" + DEFAULT_SEND_EVENT_TIMEOUT
                + ", environmentCase=" + environmentCase
                + ", aliasContainer='" + aliasContainer + '\''
                + ", passwordContainer=" + passwordContainer
                + ", ipaddress='" + ipaddress + '\''
                + ", sendEventTimeout=" + sendEventTimeout
                + ", sendEventAttemps=" + sendEventAttemps
                + ", checkpointTime=" + checkpointTime
                + ", rabbitmqHost='" + rabbitmqHost + '\''
                + ", rabbitmqPort=" + rabbitmqPort
                + ", rabbitmqUsername='" + rabbitmqUsername + '\''
                + ", rabbitmqPassword='" + rabbitmqPassword + '\''
                + ", rabbitmqVirtualHost='" + rabbitmqVirtualHost + '\''
                + '}';
    }

}
