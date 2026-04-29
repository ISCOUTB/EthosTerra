/*
 * @(#)DistributedInitBESA.java 2.0	11/01/11
 *
 * Copyright 2011, Pontificia Universidad Javeriana, All rights reserved.
 * Takina and SIDRe PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 */
package BESA.Remote;

import BESA.Kernel.Agent.AgentBESA;
import BESA.Kernel.System.Directory.AdmHandlerBESA;
import BESA.Kernel.System.SystemExceptionBESA;
import BESA.Log.ReportBESA;
import BESA.Remote.Directory.RemoteAdmHandlerBESA;
import BESA.Remote.RabbitMQ.ContainerAnnouncementBESA;
import BESA.Remote.RabbitMQ.RabbitMQDiscoveryConsumer;
import BESA.Remote.RabbitMQ.RabbitMQManager;
import BESA.Remote.RabbitMQ.RabbitMQMessageConsumer;
import com.rabbitmq.client.Channel;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.ObjectOutputStream;
import java.net.InetAddress;
import java.net.MulticastSocket;
import java.net.Socket;
import java.net.UnknownHostException;
import java.util.Timer;
import java.util.TimerTask;

/**
 * Initializes distributed (multi-container) BESA using RabbitMQ.
 *
 * <p>Each container:
 * <ul>
 *   <li>Declares a durable, addressable queue {@code besa.container.<alias>}
 *       bound to the direct exchange {@code besa.exchange}.</li>
 *   <li>Joins the fanout exchange {@code besa.discovery} for zero-config
 *       peer discovery.</li>
 *   <li>Publishes its own {@link ContainerAnnouncementBESA} on startup and
 *       every 30 s so late-joining peers can learn about it.</li>
 * </ul>
 *
 * @author  SIDRe - Pontificia Universidad Javeriana
 * @author  Takina  - Pontificia Universidad Javeriana
 * @version 3.0
 */
public class DistributedInitBESA {

    /** Interval (ms) at which each container re-broadcasts its announcement. */
    private static final long HEARTBEAT_INTERVAL_MS = 30_000;

    public DistributedInitBESA(RemoteAdmBESA admBesa, RemoteAdmHandlerBESA admHandler,
                                int portRmiRegistry, String multicastAddr, int multicastPort)
            throws DistributedExceptionBESA {

        boolean isMulticastAddress = false;
        try {
            isMulticastAddress = InetAddress.getByName(multicastAddr).isMulticastAddress();
        } catch (Exception e) {
            ReportBESA.error("Couldn't check the multicast address");
            throw new DistributedExceptionBESA("Couldn't check the multicast address: " + e.toString());
        }

        if (isMulticastAddress) {
            initWithMulticast(admBesa, admHandler, portRmiRegistry, multicastAddr, multicastPort);
        } else {
            initWithSockets(admBesa, admHandler, portRmiRegistry, multicastAddr, multicastPort);
        }
    }

    // -------------------------------------------------------------------------
    // Multicast-address path (standard Docker / cloud deployment)
    // -------------------------------------------------------------------------

    private static void initWithMulticast(RemoteAdmBESA admBesa, RemoteAdmHandlerBESA admHandler,
                                           int portRmiRegistry, String multicastAddr, int multicastPort)
            throws DistributedExceptionBESA {

        admBesa.setMulticastPort(multicastPort);
        try {
            admBesa.setMulticastInetAddr(InetAddress.getByName(multicastAddr));
            admBesa.setMulticastSocket(new MulticastSocket(multicastPort));
            admBesa.getMulticastSocket().joinGroup(admBesa.getMulticastInetAddr());
        } catch (UnknownHostException e) {
            throw new DistributedExceptionBESA("Couldn't get the multicast address: " + e.toString());
        } catch (IOException e) {
            throw new DistributedExceptionBESA("Couldn't start the multicast socket: " + e.toString());
        }
        ReportBESA.trace("BESA multicast socket: "
                + admBesa.getMulticastInetAddr() + ":" + admBesa.getMulticastPort());

        AgentBESA.initAdmLocal(admBesa);
        AdmRemoteImpBESA.initAdmLocal(admBesa);

        initRabbitMQ(admBesa, admHandler);
    }

    // -------------------------------------------------------------------------
    // Socket/unicast path (loopback or direct-IP deployments)
    // -------------------------------------------------------------------------

    private static void initWithSockets(RemoteAdmBESA admBesa, RemoteAdmHandlerBESA admHandler,
                                         int portRmiRegistry, String multicastAddr, int multicastPort)
            throws DistributedExceptionBESA {

        admBesa.setMulticastPort(multicastPort);
        try {
            admBesa.setMulticastInetAddr(InetAddress.getByName(multicastAddr));
        } catch (UnknownHostException ex) {
            throw new DistributedExceptionBESA("Couldn't get the address: " + ex.toString());
        }

        if (admBesa.getMulticastInetAddr().isLoopbackAddress()) {
            SocketServer ss = new SocketServer(admBesa, admBesa.getMulticastPort());
            if (ss.startServerSocket()) {
                ss.start();
            }
        }

        Socket socket;
        try {
            socket = new Socket(admBesa.getMulticastInetAddr(), admBesa.getMulticastPort());
            admBesa.setSocketPingPong(socket);
        } catch (UnknownHostException e) {
            throw new DistributedExceptionBESA("Don't know about host: " + multicastAddr + ": " + e.toString());
        } catch (IOException e) {
            throw new DistributedExceptionBESA("Couldn't get I/O for connection to: " + multicastAddr + ": " + e.toString());
        }

        ReportBESA.trace("BESA socket: "
                + admBesa.getMulticastInetAddr() + ":" + admBesa.getMulticastPort());

        AgentBESA.initAdmLocal(admBesa);
        AdmRemoteImpBESA.initAdmLocal(admBesa);

        initRabbitMQ(admBesa, admHandler);

        admBesa.setPong(new PongSocketThread(admBesa));
        admBesa.getPong().start();
        try {
            admBesa.setPing(new PingSocketThread(admBesa));
        } catch (SystemExceptionBESA ex) {
            ex.printStackTrace();
        }
        admBesa.getPing().start();
    }

    // -------------------------------------------------------------------------
    // Shared RabbitMQ initialisation
    // -------------------------------------------------------------------------

    /**
     * Connects to RabbitMQ, declares the container's addressable queue and
     * wires up the discovery exchange.
     *
     * <p>Queue naming convention: {@code besa.container.<alias>}
     * (predictable; no UUID — enables static routing keys).
     */
    private static void initRabbitMQ(RemoteAdmBESA admBesa, RemoteAdmHandlerBESA admHandler)
            throws DistributedExceptionBESA {
        try {
            RabbitMQManager.getInstance().init(admBesa.getConfigBESA());
            Channel channel = RabbitMQManager.getInstance().getChannel();

            // --- Addressable queue (direct exchange) -------------------------
            String alias     = admHandler.getAlias();
            String queueName = "besa.container." + alias;

            channel.queueDeclare(queueName, false, false, false, null);
            channel.queueBind(queueName, RabbitMQManager.EXCHANGE_NAME, queueName);

            AdmRemoteImpBESA server = new AdmRemoteImpBESA();
            channel.basicConsume(queueName, true, new RabbitMQMessageConsumer(channel, server));
            ReportBESA.trace("RabbitMQ consumer on queue: " + queueName);

            // --- Discovery (fanout exchange) ----------------------------------
            channel.exchangeDeclare(RabbitMQDiscoveryConsumer.DISCOVERY_EXCHANGE, "fanout", true);

            // Exclusive, auto-delete queue — lives only as long as this container
            String discoveryQueue = channel.queueDeclare("", false, true, true, null).getQueue();
            channel.queueBind(discoveryQueue, RabbitMQDiscoveryConsumer.DISCOVERY_EXCHANGE, "");
            channel.basicConsume(discoveryQueue, true,
                    new RabbitMQDiscoveryConsumer(channel, admBesa, alias));

            // Publish own announcement immediately and schedule a heartbeat
            publishAnnouncement(channel, admHandler);
            scheduleHeartbeat(channel, admHandler);

            ReportBESA.trace("Container '" + alias + "' ready for discovery.");

        } catch (Exception ex) {
            ReportBESA.error("Couldn't initialise RabbitMQ: " + ex.getMessage());
            throw new DistributedExceptionBESA("Couldn't initialise RabbitMQ: " + ex.toString());
        }
    }

    // -------------------------------------------------------------------------
    // Discovery helpers
    // -------------------------------------------------------------------------

    private static void publishAnnouncement(Channel channel, RemoteAdmHandlerBESA admHandler)
            throws IOException {
        ContainerAnnouncementBESA ann =
                new ContainerAnnouncementBESA(admHandler.getAlias(), admHandler.getAdmId());
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        ObjectOutputStream    oos = new ObjectOutputStream(bos);
        oos.writeObject(ann);
        oos.flush();
        channel.basicPublish(RabbitMQDiscoveryConsumer.DISCOVERY_EXCHANGE, "", null, bos.toByteArray());
        ReportBESA.trace("Discovery announcement published: " + admHandler.getAlias());
    }

    private static void scheduleHeartbeat(Channel channel, RemoteAdmHandlerBESA admHandler) {
        Timer timer = new Timer("besa-discovery-heartbeat", true /* daemon */);
        timer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                try {
                    publishAnnouncement(channel, admHandler);
                } catch (Exception e) {
                    ReportBESA.error("Discovery heartbeat failed: " + e.getMessage());
                }
            }
        }, HEARTBEAT_INTERVAL_MS, HEARTBEAT_INTERVAL_MS);
    }
}
