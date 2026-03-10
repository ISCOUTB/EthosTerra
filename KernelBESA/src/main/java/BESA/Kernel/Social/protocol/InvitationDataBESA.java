/*
 * @(#)InvitationDataBESA.java 2.0	11/01/11
 *
 * Copyright 2011, Pontificia Universidad Javeriana, All rights reserved.
 * Takina and SIDRe PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 */
package BESA.Kernel.Social.protocol;

import BESA.Kernel.Agent.Event.DataBESA;

/**
 * This class represents 
 * 
 * @author  SIDRe - Pontificia Universidad Javeriana
 * @author  Takina  - Pontificia Universidad Javeriana
 * @version 2.0, 11/01/11
 * @since   JDK1.0
 */
public class InvitationDataBESA extends DataBESA {

    /**
     *
     */
    private String myId;

    /**
     * Constructor for InvitationDataBESA.
     *
     * @param myId The ID for this invitation data
     */
    public InvitationDataBESA(String myId) {
        this.myId = myId;
    }

    /**
     * @return  Returns the myId.
     */
    public String getMyId() {
        return myId;
    }

    /**
     * Sets the ID for this invitation data.
     *
     * @param myId The ID to set
     */
    public void setMyId(String myId) {
        this.myId = myId;
    }
}
