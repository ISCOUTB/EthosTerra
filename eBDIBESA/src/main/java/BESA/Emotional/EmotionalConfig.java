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


public class EmotionalConfig {

    public static enum People {
        Enemy(-1f),
        Unfriendly(-0.3f),
        Stranger(0f),
        Friend(0.7f),
        Close(0.8f);

        private final float value;

        People(float value) {
            this.value = value;
        }

        public float getValue() {
            return value;
        }
    }

    public static enum Events {
        Undesirable(-1),
        SomewhatUndesirable(-0.4f),
        Indifferent(0f),
        SomewhatDesirable(0.4f),
        Desirable(0.1f);

        private final float value;

        Events(float value) {
            this.value = value;
        }

        public float getValue() {
            return value;
        }

    }

    public static enum Objects {
        Repulsive(-1f),
        Valueless(-0.2f),
        Neutral(0),
        Valuable(0.6f),
        Important(0.8f);

        private final float value;

        Objects(float value) {
            this.value = value;
        }

        public float getValue() {
            return value;
        }
    }
}

