package org.wpsim.BesaTesting;

import BESA.Kernel.Agent.AgentBESA;
import BESA.Kernel.Agent.KernelAgentExceptionBESA;
import BESA.Kernel.Agent.StateBESA;
import BESA.Kernel.Agent.StructBESA;
import BESA.Log.ReportBESA;

public class PingPongAgent extends AgentBESA {

    public PingPongAgent(String alias, StateBESA state, StructBESA structAgent, double passwd) throws KernelAgentExceptionBESA {
        super(alias, state, structAgent, passwd);
    }

    @Override
    public void setupAgent() {
        ReportBESA.trace("Agent " + this.getAlias() + " initialized.");
    }

    @Override
    public void shutdownAgent() {
        ReportBESA.trace("Agent " + this.getAlias() + " stopped.");
    }
}
