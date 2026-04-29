package BESA.Remote.RabbitMQ;

import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.Agent.StateBESA;
import BESA.Kernel.Agent.StructBESA;
import BESA.Log.ReportBESA;
import BESA.Remote.AdmRemoteInterfaceBESA;

import java.io.ByteArrayOutputStream;
import java.io.ObjectOutputStream;
import java.rmi.RemoteException;
import java.util.ArrayList;

/**
 * Acts as the proxy substituting the RMI stub. Serializes method configurations and sends them to RabbitMQ.
 */
public class RabbitMQAdmRemoteProxy implements AdmRemoteInterfaceBESA {

    /** Alias of the target container — used as the routing key. */
    private final String targetAlias;

    public RabbitMQAdmRemoteProxy(String targetAlias) {
        this.targetAlias = targetAlias;
    }

    private void sendMessage(String methodName, Object... args) throws RemoteException {
        try {
            RemoteMessageBESA message = new RemoteMessageBESA(methodName, args);
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            ObjectOutputStream oos = new ObjectOutputStream(bos);
            oos.writeObject(message);
            oos.flush();
            byte[] body = bos.toByteArray();

            RabbitMQManager.getInstance().getChannel().basicPublish(
                    RabbitMQManager.EXCHANGE_NAME,
                    "besa.container." + targetAlias,
                    null,
                    body
            );
        } catch (Exception e) {
            ReportBESA.error("Error sending RabbitMQ message to " + targetAlias + ": " + e.getMessage());
            throw new RemoteException("Error sending RabbitMQ message to " + targetAlias + ": " + e.getMessage(), e);
        }
    }

    @Override
    public void registerRemoteAdm(String admId, String admAlias, String ipAddress, int rmiPort) throws RemoteException {
        sendMessage("registerRemoteAdm", admId, admAlias, ipAddress, rmiPort);
    }

    @Override
    public boolean registerRemoteAgent(String password, String administratorName, String aid) throws RemoteException {
        sendMessage("registerRemoteAgent", password, administratorName, aid);
        return true;
    }

    @Override
    public void unregisterRemoteAgent(String password, String administratorName, String aid) throws RemoteException {
        sendMessage("unregisterRemoteAgent", password, administratorName, aid);
    }

    @Override
    public void createRemoteService(String password, String servName, ArrayList descriptors) throws RemoteException {
        sendMessage("createRemoteService", password, servName, descriptors);
    }

    @Override
    public boolean bindRemoteService(String password, String aid, String servName) throws RemoteException {
        sendMessage("bindRemoteService", password, aid, servName);
        return true;
    }

    @Override
    public void registerRemoteAgents(String agAlias, String agId, String admId) throws RemoteException {
        sendMessage("registerRemoteAgents", agAlias, agId, admId);
    }

    @Override
    public void sendEvent(EventBESA ev, String aid) throws RemoteException {
        sendMessage("sendEvent", ev, aid);
    }

    @Override
    public void updateRemoteAgentDirectory(String admAlias, ArrayList agIdList, ArrayList agAliasList) throws RemoteException {
        sendMessage("updateRemoteAgentDirectory", admAlias, agIdList, agAliasList);
    }

    @Override
    public void synchronizeRemoteAgentDirectory(String admId, ArrayList agIdList, ArrayList aliasList) throws RemoteException {
        sendMessage("synchronizeRemoteAgentDirectory", admId, agIdList, aliasList);
    }

    @Override
    public void moveAgentReceive(String aliasAg, StateBESA stateAg, StructBESA structAg, double passwdAg, String nameClassAgent) throws RemoteException {
        sendMessage("moveAgentReceive", aliasAg, stateAg, structAg, passwdAg, nameClassAgent);
    }

    @Override
    public void moveAgentSend(String agId, String aliasDestinationAdm, double passwdAg) throws RemoteException {
        sendMessage("moveAgentSend", agId, aliasDestinationAdm, passwdAg);
    }

    @Override
    public void killRemoteAgent(String agId, double agentPassword) throws RemoteException {
        sendMessage("killRemoteAgent", agId, agentPassword);
    }
}
