package org.wpsim.BesaTesting;

import BESA.Kernel.Agent.Event.DataBESA;

public class PingPongData extends DataBESA {
    private String message;
    
    public PingPongData(String message) {
        this.message = message;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
