/**
 * ==========================================================================
 * eBDIBESA, Emotional Component for BESA Agents                            *
 * @version 1.0                                                             *
 * @since 2023                                                              *
 * @author Daniel Valencia                                                  *
 * @author Juan Leon                                                        *
 * @author Jairo Serrano                                                    *
 * @author Enrique Gonzalez                                                 *
 * ==========================================================================
 */
package BESA.Emotional;

public class EmotionalEvent {

    protected String person;
    protected String event;
    protected String object;

    public EmotionalEvent() {
    }

    public EmotionalEvent(String person, String event, String object) {
        this.person = person;
        this.event = event;
        this.object = object;
    }

    public String getPerson() {
        return person;
    }

    public void setPerson(String person) {
        this.person = person;
    }

    public String getEvent() {
        return event;
    }

    public void setEvent(String event) {
        this.event = event;
    }

    public String getObject() {
        return object;
    }

    public void setObject(String object) {
        this.object = object;
    }

    @Override
    public String toString() {
        return "Person: " + this.person + " Event: " + this.event + " Object: " + this.object;
    }
    
}
