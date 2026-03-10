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

public final class Utils {

    public static class Config {
        public static final float PersonWeight = 0.3f;
        public static final float EventWeight = 0.4f;
        public static final float ObjectWeight = 0.3f;
    }

    public static float checkZeroToOneLimits(float value) {
        return checkLimits(value, 0f, 1f);
    }

    public static float checkNegativeOneToOneLimits(float value) {
        return checkLimits(value, -1f, 1f);
    }

    private static float checkLimits(float value, float min, float max) {
        if (value < min) {
            value = min;
        }
        if (value > max) {
            value = max;
        }
        return value;
    }

    public static String formatKeyString(String str) {
        return str.toLowerCase().trim();
    }

}
