/*
 * @(#)ServiceProviderDescriptor.java 2.0	11/01/11
 *
 * Copyright 2011, Pontificia Universidad Javeriana, All rights reserved.
 * Takina and SIDRe PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 */
package BESA.Kernel.Social.ServiceProvider.agent;

import java.util.Hashtable;
import BESA.Log.ReportBESA;

/**
 * This class represents 
 * 
 * @author  SIDRe - Pontificia Universidad Javeriana
 * @author  Takina  - Pontificia Universidad Javeriana
 * @version 2.0, 11/01/11
 * @since   JDK1.0
 */
public class ServiceProviderDescriptor {

    /**
     *
     */
    private Hashtable<String, SPService> serviceAccessTable;

    /**
     *
     */
    public ServiceProviderDescriptor() {
        serviceAccessTable = new Hashtable<String, SPService>();
    }

    /**
     * Method that includes a service in the table.
     *
     * @param theService The service to be added to the service providers table
     * @return true if the service could be added to the table,
     *         false if the service could not be added to the table
     */
    public boolean addSPService(SPService theService) throws ServiceProviderAgentExceptionBESA {
        try {
            getServiceAccessTable().put(theService.getName(), theService);
            return true;
        } catch (Exception e) {
            ReportBESA.error("Couldn't add the service to the service provider table.");
            throw new ServiceProviderAgentExceptionBESA("Couldn't add the service to the service provider table.");
        }
    }

    /**
     * @return the serviceAccessTable
     */
    public Hashtable<String, SPService> getServiceAccessTable() {
        return serviceAccessTable;
    }
}
