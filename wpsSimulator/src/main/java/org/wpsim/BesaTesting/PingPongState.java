package org.wpsim.BesaTesting;

import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.Agent.StateBESA;
import java.io.Serializable;

public class PingPongState extends StateBESA implements Serializable {
    private int messagesExchanged = 0;
    private String targetAgentAlias;
    private String targetContainerAlias;

    public PingPongState(String targetAgentAlias, String targetContainerAlias) {
        this.targetAgentAlias = targetAgentAlias;
        this.targetContainerAlias = targetContainerAlias;
    }

    public int getMessagesExchanged() {
        return messagesExchanged;
    }

    public void incrementMessages() {
        this.messagesExchanged++;
    }

    public String getTargetAgentAlias() {
        return targetAgentAlias;
    }

    public String getTargetContainerAlias() {
        return targetContainerAlias;
    }
}
