package org.wpsim.FamilyContainer.Data;

import BESA.Kernel.Agent.Event.DataBESA;

/**
 * Event payload sent to the FamilyCoordinator when a new child is born.
 *
 * <p>Carries the aliases of both parents and the family container. The
 * FamilyCoordinator uses this data to create a new Person agent with
 * INFANTE demographics and register it in the family.</p>
 *
 * @author jairo
 */
public class BirthData extends DataBESA {

    private final String motherAlias;
    private final String fatherAlias;
    private final String familyAlias;

    public BirthData(String motherAlias, String fatherAlias, String familyAlias) {
        this.motherAlias = motherAlias;
        this.fatherAlias = fatherAlias;
        this.familyAlias = familyAlias;
    }

    public String getMotherAlias() { return motherAlias; }
    public String getFatherAlias() { return fatherAlias; }
    public String getFamilyAlias() { return familyAlias; }

    @Override
    public String toString() {
        return "BirthData{mother=" + motherAlias + ", father=" + fatherAlias + "}";
    }
}
