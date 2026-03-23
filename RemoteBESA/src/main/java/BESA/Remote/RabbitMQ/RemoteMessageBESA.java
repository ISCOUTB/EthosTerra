package BESA.Remote.RabbitMQ;

import java.io.Serializable;

/**
 * Encapsulates the method invocations into a serializable payload for RabbitMQ.
 */
public class RemoteMessageBESA implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private String methodName;
    private Object[] args;

    public RemoteMessageBESA(String methodName, Object[] args) {
        this.methodName = methodName;
        this.args = args;
    }

    public String getMethodName() {
        return methodName;
    }

    public Object[] getArgs() {
        return args;
    }
}
