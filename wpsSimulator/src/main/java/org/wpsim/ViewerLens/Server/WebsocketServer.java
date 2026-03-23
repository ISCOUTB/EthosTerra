/**
 * ==========================================================================
 * __      __ _ __   ___  *    WellProdSim                                  *
 * \ \ /\ / /| '_ \ / __| *    @version 1.0                                 *
 * \ V  V / | |_) |\__ \  *    @since 2023                                  *
 * \_/\_/  | .__/ |___/   *                                                 *
 * | |                    *    @author Jairo Serrano                        *
 * |_|                    *    @author Enrique Gonzalez                     *
 * ==========================================================================
 * Social Simulator used to estimate productivity and well-being of peasant *
 * families. It is event oriented, high concurrency, heterogeneous time     *
 * management and emotional reasoning BDI.                                  *
 * ==========================================================================
 */
package org.wpsim.ViewerLens.Server;

import io.undertow.Undertow;
import io.undertow.websockets.core.AbstractReceiveListener;
import io.undertow.websockets.core.BufferedTextMessage;
import io.undertow.websockets.core.WebSocketChannel;
import io.undertow.websockets.core.WebSockets;
import io.undertow.websockets.WebSocketConnectionCallback;
import io.undertow.websockets.spi.WebSocketHttpExchange;

import java.util.Collections;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.LinkedList;
import java.util.concurrent.ConcurrentHashMap;

import org.wpsim.SimulationControl.Util.ControlCurrentDate;
import org.wpsim.WellProdSim.Config.wpsConfig;
import org.wpsim.WellProdSim.wpsStart;

import static io.undertow.Handlers.path;
import static io.undertow.Handlers.websocket;

/**
 * Websocket server for the wpsViewer agent
 */
public class WebsocketServer implements Runnable {

    private final List<WebSocketChannel> activeChannels = Collections.synchronizedList(new ArrayList<>());
    private static WebsocketServer instance;
    private final Map<String, String> agentStates = new ConcurrentHashMap<>();
    private final List<String> recentInteractions = Collections.synchronizedList(new LinkedList<>());

    /**
     * Websocket server instance
     * 
     * @return the websocket server
     */
    public static synchronized WebsocketServer getInstance() {
        if (wpsConfig.getInstance().getBooleanProperty("viewer.webui")) {
            if (instance == null) {
                instance = new WebsocketServer();
            }
            return instance;
        } else {
            return null;
        }
    }

    /**
     * Starts the broadcast server
     */
    @Override
    public void run() {

        /*
         * ResourceManager resourceManager = null;
         * try {
         * resourceManager = new
         * PathResourceManager(Paths.get(wpsStart.class.getClassLoader().getResource(
         * "web/").toURI()));
         * } catch (URISyntaxException e) {
         * throw new RuntimeException(e);
         * }
         */

        Undertow server = Undertow.builder()
                .addHttpListener(8000, "0.0.0.0")
                .setHandler(path()
                        .addPrefixPath("/wpsViewer", websocket(new WebSocketConnectionCallback() {
                            @Override
                            public void onConnect(WebSocketHttpExchange exchange, WebSocketChannel channel) {
                                activeChannels.add(channel);
                                channel.addCloseTask(ch -> activeChannels.remove(ch));
                                channel.getReceiveSetter().set(new AbstractReceiveListener() {
                                    @Override
                                    protected void onFullTextMessage(WebSocketChannel channel,
                                            BufferedTextMessage message) {
                                        String msg = message.getData();
                                        System.out.println("Received message: " + msg);

                                        if (msg.contains("start")) {
                                            // wpsStart.startAgents(); @TODO
                                        } else if (msg.contains("stop")) {
                                            wpsStart.stopSimulation();
                                        } else if (msg.contains("setup")) {
                                            WebSockets.sendText(
                                                    "d=" + ControlCurrentDate.getInstance().getCurrentDate(), channel,
                                                    null);
                                            WebSockets.sendText("q=" + wpsStart.peasantFamiliesAgents, channel, null);
                                            
                                            // Provide cached agents states immediately
                                            for (String cachedState : getInstance().agentStates.values()) {
                                                WebSockets.sendText(cachedState, channel, null);
                                            }
                                            // Provide recent interactions
                                            synchronized (getInstance().recentInteractions) {
                                                for (String inter : getInstance().recentInteractions) {
                                                    WebSockets.sendText(inter, channel, null);
                                                }
                                            }
                                        } else {
                                            System.out.println("Unknown message: " + msg);
                                        }

                                    }
                                });
                                channel.resumeReceives();
                            }
                        }))
                // .addPrefixPath("/",
                // resource(resourceManager).addWelcomeFiles("index-no.html"))
                )
                .build();
        System.out.println("WebSocket Server Started on port 8000");
        server.start();
    }

    /**
     * Sends a message to all connected clients
     * 
     * @param message the message
     */
    public void broadcastMessage(String message) {
        if (message.startsWith("j=")) {
            try {
                String jsonPart = message.substring(2);
                int nameIdx = jsonPart.indexOf("\"name\":\"");
                if (nameIdx != -1) {
                    int endIdx = jsonPart.indexOf("\"", nameIdx + 8);
                    if (endIdx != -1) {
                        String name = jsonPart.substring(nameIdx + 8, endIdx);
                        agentStates.put(name, message);
                    }
                }
            } catch (Exception e) {}
        } else if (message.startsWith("i=")) {
            synchronized (recentInteractions) {
                recentInteractions.add(message);
                if (recentInteractions.size() > 100) {
                    recentInteractions.remove(0);
                }
            }
        }

        synchronized (activeChannels) {
            for (WebSocketChannel channel : activeChannels) {
                if (channel.isOpen()) {
                    WebSockets.sendText(message, channel, null);
                }
            }
        }
    }
}
