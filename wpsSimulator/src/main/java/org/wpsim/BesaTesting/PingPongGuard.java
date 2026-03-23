package org.wpsim.BesaTesting;

import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.Agent.Event.DataBESA;
import BESA.Kernel.Agent.GuardBESA;
import BESA.Kernel.System.AdmBESA;
import BESA.Log.ReportBESA;

public class PingPongGuard extends GuardBESA {

    @Override
    public void funcExecGuard(EventBESA event) {
        PingPongState state = (PingPongState) this.getAgent().getState();
        PingPongData data = (PingPongData) event.getData();
        
        state.incrementMessages();
        ReportBESA.info("Agent " + this.getAgent().getAlias() + " received message " + state.getMessagesExchanged() + ": " + data.getMessage());

        if (state.getMessagesExchanged() < 100) {
            try {
                // Send reply back
                PingPongData replyData = new PingPongData("Reply " + state.getMessagesExchanged() + " from " + this.getAgent().getAlias());
                EventBESA replyEvent = new EventBESA(PingPongGuard.class.getName(), replyData);
                String targetAlias = state.getTargetAgentAlias();
                
                // Fetch ID
                String targetId = AdmBESA.getInstance().getHandlerByAlias(targetAlias).getAgId();
                AdmBESA.getInstance().getHandlerByAid(targetId).sendEvent(replyEvent);
                
            } catch (Exception e) {
                ReportBESA.error("Error sending reply: " + e.getMessage());
            }
        } else {
            ReportBESA.info("Agent " + this.getAgent().getAlias() + " reached 100 messages. Stopping ping-pong.");
            if (this.getAgent().getAlias().equals("PingAgent")) {
                try {
                    ReportBESA.info("Initiating mobility to " + state.getTargetContainerAlias());
                    AdmBESA.getInstance().moveAgent(this.getAgent().getAlias(), state.getTargetContainerAlias(), 0.0);
                } catch (Exception e) {
                    ReportBESA.error("Error moving agent: " + e.getMessage());
                }
            }
        }
    }
}
