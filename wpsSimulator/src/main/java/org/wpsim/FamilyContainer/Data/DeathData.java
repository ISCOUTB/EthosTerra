package org.wpsim.FamilyContainer.Data;

import BESA.Kernel.Agent.Event.DataBESA;

/**
 * Event payload sent to the FamilyCoordinator when a Person agent dies.
 *
 * <p>Triggers {@link org.wpsim.FamilyContainer.Guards.DeathGuard} which
 * removes the agent from the BESA directory, unbinds it from the family
 * service registry, and updates {@link FamilyBelieves#getMemberAliases()}.</p>
 *
 * @author jairo
 */
public class DeathData extends DataBESA {

    /** Alias of the dying person agent. */
    private final String personAlias;

    /**
     * Cause of death — informational only.
     * Examples: {@code "HEALTH"}, {@code "AGE"}, {@code "STARVATION"}.
     */
    private final String cause;

    public DeathData(String personAlias, String cause) {
        this.personAlias = personAlias;
        this.cause       = cause;
    }

    public String getPersonAlias() { return personAlias; }
    public String getCause()       { return cause; }

    @Override
    public String toString() {
        return "DeathData{person=" + personAlias + ", cause=" + cause + "}";
    }
}
