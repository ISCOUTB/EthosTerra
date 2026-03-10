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

public class SemanticValue {
    private final String name;
    private final float value;
    
    public SemanticValue(String name, float value) {
        this.name = name;
        this.value = Utils.checkNegativeOneToOneLimits(value);
    }

    public String getName() {
        return name;
    }

    public float getValue() {
        return value;
    }
    
    @Override
    public String toString() {
        return name + ": " + value;
    }
}
