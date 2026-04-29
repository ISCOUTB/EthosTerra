package org.wpsim.BesaTesting;

import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.Agent.StructBESA;
import BESA.Kernel.System.AdmBESA;
import BESA.Log.ReportBESA;

public class MainTest {

    public static void main(String[] args) {
        if (args.length < 1) {
            System.err.println("Please provide a container alias: ContainerA, ContainerB, ContainerC");
            System.exit(1);
        }

        String containerAlias = args[0];
        BESA.Config.ConfigBESA config = BESA.Config.ConfigBESA.builder()
                .alias(containerAlias)
                .environmentCase(BESA.Config.EnvironmentCase.REMOTE)
                .build();
        AdmBESA adm = AdmBESA.getInstance(config);
        
        try {
            StructBESA struct = new StructBESA();
            struct.addBehavior("PingPongBehavior");
            struct.bindGuard("PingPongBehavior", PingPongGuard.class);

            if ("ContainerA".equals(containerAlias)) {
                ReportBESA.info("Starting Container A...");
                PingPongState stateA = new PingPongState("PongAgent", "ContainerB");
                PingPongAgent pingAgent = new PingPongAgent("PingAgent", stateA, struct, 0.0);
                pingAgent.start();
                
                // Wait for B to connect
                Thread.sleep(15000);
                
                ReportBESA.info("Sending initial ping to PongAgent...");
                PingPongData data = new PingPongData("Initial Ping");
                EventBESA ev = new EventBESA(PingPongGuard.class.getName(), data);
                
                // Send remote event
                String targetId = AdmBESA.getInstance().getHandlerByAlias("PongAgent").getAgId();
                AdmBESA.getInstance().getHandlerByAid(targetId).sendEvent(ev);
                
            } else if ("ContainerB".equals(containerAlias)) {
                ReportBESA.info("Starting Container B...");
                PingPongState stateB = new PingPongState("PingAgent", "ContainerC"); // B tells agent to move to C when it finishes
                PingPongAgent pongAgent = new PingPongAgent("PongAgent", stateB, struct, 0.0);
                pongAgent.start();
                
            } else if ("ContainerC".equals(containerAlias)) {
                ReportBESA.info("Starting Container C...");
            }
            
            // Keep alive
            while (true) {
                Thread.sleep(1000);
            }
            
        } catch (Exception e) {
            ReportBESA.error("Error setting up test agents: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
