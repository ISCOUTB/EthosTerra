package BESA.Remote.RabbitMQ;

import BESA.ExceptionBESA;
import BESA.Kernel.System.Directory.AgHandlerBESA;
import BESA.Kernel.System.SystemExceptionBESA;
import BESA.Local.Directory.AgLocalHandlerBESA;
import BESA.Log.ReportBESA;
import BESA.Remote.Directory.RemoteAdmHandlerBESA;
import BESA.Remote.RemoteAdmBESA;
import com.rabbitmq.client.AMQP;
import com.rabbitmq.client.Channel;
import com.rabbitmq.client.DefaultConsumer;
import com.rabbitmq.client.Envelope;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.util.Enumeration;

/**
 * Fanout consumer that listens on the besa.discovery exchange and
 * registers newly discovered containers in the local remote directory.
 *
 * <p>When container B starts after container A:
 * <ol>
 *   <li>B publishes its announcement to besa.discovery.</li>
 *   <li>A's consumer receives it and registers B.</li>
 *   <li>A immediately pushes all its local agents to B so B can route
 *       messages back to them without waiting for a heartbeat cycle.</li>
 * </ol>
 */
public class RabbitMQDiscoveryConsumer extends DefaultConsumer {

    /** Name of the RabbitMQ fanout exchange used for container discovery. */
    public static final String DISCOVERY_EXCHANGE = "besa.discovery";

    private final RemoteAdmBESA localAdm;
    private final String localAlias;

    public RabbitMQDiscoveryConsumer(Channel channel, RemoteAdmBESA localAdm, String localAlias) {
        super(channel);
        this.localAdm   = localAdm;
        this.localAlias = localAlias;
    }

    @Override
    public void handleDelivery(String consumerTag, Envelope envelope,
                               AMQP.BasicProperties properties, byte[] body) throws IOException {
        try {
            ByteArrayInputStream bis = new ByteArrayInputStream(body);
            ObjectInputStream    ois = new ObjectInputStream(bis);
            ContainerAnnouncementBESA ann = (ContainerAnnouncementBESA) ois.readObject();

            if (localAlias.equals(ann.getAlias())) {
                return; // own echo — skip
            }

            // Only register if not already known (avoids duplicate entries)
            if (localAdm.getAdmByAlias(ann.getAlias()) == null) {
                localAdm.registerRemoteAdm(ann.getAdmId(), ann.getAlias(), "", 0);
                ReportBESA.info("Discovered container: " + ann.getAlias()
                        + " (admId=" + ann.getAdmId() + ")");

                // Push all local agents to the newly discovered container so it
                // can find them by alias without waiting for a heartbeat cycle.
                syncLocalAgentsTo(ann.getAlias());
            }

        } catch (ClassNotFoundException e) {
            ReportBESA.error("Discovery: unknown class in announcement — " + e.getMessage());
        } catch (SystemExceptionBESA e) {
            ReportBESA.error("Discovery: could not register container — " + e.getMessage());
        } catch (Exception e) {
            ReportBESA.error("Discovery: unexpected error — " + e.getMessage());
        }
    }

    /**
     * Sends the alias/id of every LOCAL agent in this container to the given
     * remote container via RabbitMQ, so that container can route events back.
     */
    private void syncLocalAgentsTo(String remoteAlias) {
        try {
            RemoteAdmHandlerBESA remoteHandler =
                    (RemoteAdmHandlerBESA) localAdm.getAdmByAlias(remoteAlias);
            if (remoteHandler == null) {
                return;
            }
            String localAdmId = localAdm.getAdmHandler().getAdmId();
            Enumeration ids = localAdm.getIdList();
            while (ids.hasMoreElements()) {
                String agId = (String) ids.nextElement();
                try {
                    AgHandlerBESA agh = localAdm.getHandlerByAid(agId);
                    if (agh instanceof AgLocalHandlerBESA) {
                        remoteHandler.getAdmRemote().registerRemoteAgents(
                                agh.getAlias(), agId, localAdmId);
                        ReportBESA.info("Discovery sync: pushed agent '"
                                + agh.getAlias() + "' to container '" + remoteAlias + "'");
                    }
                } catch (ExceptionBESA e) {
                    ReportBESA.error("Discovery sync: error reading agent "
                            + agId + ": " + e.getMessage());
                }
            }
        } catch (Exception e) {
            ReportBESA.error("Discovery sync: failed to push agents to '"
                    + remoteAlias + "': " + e.getMessage());
        }
    }
}
