/*
 * @(#)Main.java 2.0	11/01/11
 *
 * Copyright 2011, Pontificia Universidad Javeriana, All rights reserved.
 * Takina and SIDRe PROPRIETARY/CONFIDENTIAL. Use is subject to license terms.
 */
package BESA.Remote.Directory;

import BESA.Config.ConfigBESA;
import java.io.Serializable;
import BESA.Remote.AdmRemoteInterfaceBESA;
import BESA.Kernel.System.Directory.AdmHandlerBESA;
import BESA.Log.ReportBESA;
import java.net.InetAddress;
import java.util.UUID;

/**
 * This class provides methods to use the remote administrators handlers.
 *
 * @author  SIDRe - Pontificia Universidad Javeriana
 * @author  Takina  - Pontificia Universidad Javeriana
 * @version 2.0, 11/01/11
 * @since   JDK1.0
 */
public class RemoteAdmHandlerBESA extends AdmHandlerBESA implements Serializable {

    public static final long serialVersionUID = "AdmRemoteHandler".hashCode();

    private AdmRemoteInterfaceBESA admRemote;

    public static final String ID_DELIMITER = "_";

    /**
     * Creates a handler for the local container, generating its admId from alias + IP + UUID.
     */
    public RemoteAdmHandlerBESA(ConfigBESA configBESA) {
        this.alias = configBESA.getAliasContainer();
        String localIp = "127.0.0.1";
        try {
            localIp = InetAddress.getLocalHost().getHostAddress();
        } catch (Exception e) {
            ReportBESA.error(e);
        }
        this.admId = alias + ID_DELIMITER + localIp + ID_DELIMITER + "0" + ID_DELIMITER + UUID.randomUUID().toString();
    }

    /**
     * Creates a handler for a known remote container and wires up the RabbitMQ proxy.
     *
     * @param admId     Identifier of the remote container.
     * @param aliasAdm  Alias of the remote container.
     * @param ipAddress IP address (kept for API compatibility, not used for routing).
     * @param port      Port (kept for API compatibility, not used for routing).
     * @throws DistributedDirectoryExceptionBESA if the RabbitMQ proxy cannot be initialized.
     */
    public RemoteAdmHandlerBESA(String admId, String aliasAdm, String ipAddress, int port) throws DistributedDirectoryExceptionBESA {
        this.alias = aliasAdm;
        this.admId = admId;
        try {
            this.admRemote = new BESA.Remote.RabbitMQ.RabbitMQAdmRemoteProxy(aliasAdm);
        } catch (Exception ex) {
            ReportBESA.error("Couldn't initialize the RabbitMQ proxy for remote container administrator.");
            throw new DistributedDirectoryExceptionBESA("Couldn't initialize the RabbitMQ proxy for remote container administrator: " + ex.toString());
        }
    }

    /**
     * Returns the RabbitMQ proxy that implements the remote admin interface.
     *
     * @return The remote administrator interface (backed by RabbitMQ).
     * @throws DistributedDirectoryExceptionBESA if the handler has not been initialized.
     */
    public AdmRemoteInterfaceBESA getAdmRemote() throws DistributedDirectoryExceptionBESA {
        if (this.admRemote == null) {
            ReportBESA.error("Uninitialized handler.");
            throw new DistributedDirectoryExceptionBESA("Uninitialized handler.");
        }
        return admRemote;
    }
}
