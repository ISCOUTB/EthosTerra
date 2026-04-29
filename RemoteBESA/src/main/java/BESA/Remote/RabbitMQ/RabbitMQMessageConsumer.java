package BESA.Remote.RabbitMQ;

import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.Agent.StateBESA;
import BESA.Kernel.Agent.StructBESA;
import BESA.Log.ReportBESA;
import BESA.Remote.AdmRemoteImpBESA;
import com.rabbitmq.client.AMQP;
import com.rabbitmq.client.Channel;
import com.rabbitmq.client.DefaultConsumer;
import com.rabbitmq.client.Envelope;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.util.ArrayList;

/**
 * Consumer that listens to the container's RabbitMQ queue and dispatches the execution
 * to the AdmRemoteImpBESA instance.
 */
public class RabbitMQMessageConsumer extends DefaultConsumer {

    private AdmRemoteImpBESA admRemoteImp;

    public RabbitMQMessageConsumer(Channel channel, AdmRemoteImpBESA admRemoteImp) {
        super(channel);
        this.admRemoteImp = admRemoteImp;
    }

    @Override
    public void handleDelivery(String consumerTag, Envelope envelope, AMQP.BasicProperties properties, byte[] body) throws IOException {
        try {
            ByteArrayInputStream bis = new ByteArrayInputStream(body);
            ObjectInputStream ois = new ObjectInputStream(bis);
            RemoteMessageBESA message = (RemoteMessageBESA) ois.readObject();

            String methodName = message.getMethodName();
            Object[] args = message.getArgs();

            dispatchMethod(methodName, args);
            
        } catch (Exception e) {
            ReportBESA.error("Error processing RabbitMQ message: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void dispatchMethod(String methodName, Object[] args) throws Exception {
        switch (methodName) {
            case "registerRemoteAdm":
                admRemoteImp.registerRemoteAdm((String) args[0], (String) args[1], (String) args[2], (Integer) args[3]);
                break;
            case "registerRemoteAgent":
                admRemoteImp.registerRemoteAgent((String) args[0], (String) args[1], (String) args[2]);
                break;
            case "unregisterRemoteAgent":
                admRemoteImp.unregisterRemoteAgent((String) args[0], (String) args[1], (String) args[2]);
                break;
            case "createRemoteService":
                admRemoteImp.createRemoteService((String) args[0], (String) args[1], (ArrayList) args[2]);
                break;
            case "bindRemoteService":
                admRemoteImp.bindRemoteService((String) args[0], (String) args[1], (String) args[2]);
                break;
            case "registerRemoteAgents":
                admRemoteImp.registerRemoteAgents((String) args[0], (String) args[1], (String) args[2]);
                break;
            case "sendEvent":
                admRemoteImp.sendEvent((EventBESA) args[0], (String) args[1]);
                break;
            case "updateRemoteAgentDirectory":
                if (args[1] == null) args[1] = new ArrayList();
                if (args[2] == null) args[2] = new ArrayList();
                admRemoteImp.updateRemoteAgentDirectory((String) args[0], (ArrayList) args[1], (ArrayList) args[2]);
                break;
            case "synchronizeRemoteAgentDirectory":
                if (args[1] == null) args[1] = new ArrayList();
                if (args[2] == null) args[2] = new ArrayList();
                admRemoteImp.synchronizeRemoteAgentDirectory((String) args[0], (ArrayList) args[1], (ArrayList) args[2]);
                break;
            case "moveAgentReceive":
                admRemoteImp.moveAgentReceive((String) args[0], (StateBESA) args[1], (StructBESA) args[2], ((Number) args[3]).doubleValue(), (String) args[4]);
                break;
            case "moveAgentSend":
                admRemoteImp.moveAgentSend((String) args[0], (String) args[1], ((Number) args[2]).doubleValue());
                break;
            case "killRemoteAgent":
                admRemoteImp.killRemoteAgent((String) args[0], ((Number) args[1]).doubleValue());
                break;
            default:
                ReportBESA.error("Unknown method invoked via RabbitMQ: " + methodName);
        }
    }
}
