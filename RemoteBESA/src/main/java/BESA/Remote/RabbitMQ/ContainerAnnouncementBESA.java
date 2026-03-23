package BESA.Remote.RabbitMQ;

import java.io.Serializable;

/**
 * Serializable DTO broadcast on the besa.discovery fanout exchange so that
 * containers can locate each other without any pre-configuration.
 */
public class ContainerAnnouncementBESA implements Serializable {

    private static final long serialVersionUID = 1L;

    private final String alias;
    private final String admId;

    public ContainerAnnouncementBESA(String alias, String admId) {
        this.alias = alias;
        this.admId = admId;
    }

    public String getAlias() { return alias; }
    public String getAdmId()  { return admId;  }

    @Override
    public String toString() {
        return "ContainerAnnouncement{alias='" + alias + "', admId='" + admId + "'}";
    }
}
