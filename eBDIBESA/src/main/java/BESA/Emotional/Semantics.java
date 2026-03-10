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

/**
 * This class contains the constants used in the emotional component.
 */
public class Semantics {

    public static class People {
        public static String Seller = "Seller"; // Vendedor
        public static String Buyer = "Buyer"; // Comprador
        public static String Thief = "Thief"; // Ladrón
        public static String Neighbor = "Neighbor"; // Vecino
        public static String HealthWorker = "HealthWorker"; // Trabajador de Salud
        public static String CommunityLeader = "CommunityLeader"; // Líder Comunitario
        public static String PeasantFamilies = "PeasantFamilies"; // Campesino
        public static String BankOfficer = "BankOfficer"; // Funcionario de Banco
        public static String MarketVendor = "MarketVendor"; // Vendedor de Mercado
        public static String Landowner = "Landowner"; // Dueño de Tierra
    }

    public static class Objects {
        // Basic Needs and Infrastructure
        public static String Food = "Food"; // Alimento
        public static String HospitalFacility = "HospitalFacility"; // Instalación médica

        // Storage and Resources
        public static String Warehouse = "Warehouse"; // Almacén
        public static String Tools = "Tools"; // Herramienta Agrícola
        public static String Livestock = "Livestock"; // Ganado
        public static String Crop = "Crop"; // Cultivo
        public static String IrrigationSystem = "IrrigationSystem"; // Sistema de Riego
        public static String FertilizerResource = "FertilizerResource"; // Fertilizante
        public static String WaterResource = "WaterResource"; // Recurso Hídrico
        public static String SeedsResource = "SeedsResource"; // Plántulas
        public static String HarvestedProduce = "HarvestedProduce"; // Productos Cosechados
        public static String FarmMachinery = "FarmMachinery"; // Maquinaria Agrícola

        // Objects for Well-being
        public static String Housing = "Housing"; // Casa
        public static String Medicines = "Medicines"; // Medicamentos
        public static String RecreationalSpace = "RecreationalSpace"; // Espacio Recreativo
        public static String CommunityGarden = "CommunityGarden"; // Huerto Comunitario
    }


    public static class Events {
        public static String ReceivesNews = "ReceivesNews";
        public static String ReceivesOffer = "ReceivesOffer";
        public static String ObservesSell = "ObservesSell";
        public static String ObservesTheft = "ObservesTheft";
        public static String ObservesDisaster = "ObservesDisaster";
        public static String ObservesDirtiness = "ObservesDirtiness";
        public static String Eats = "Eats";
    }

    public static class ObjectRating {
        // Negative Ratings
        public static SemanticValue _1_Repulsive = new SemanticValue("_1_Repulsive", -1f); // Strongly Negative - Repulsive
        public static SemanticValue _2_NotValuable = new SemanticValue("_2_Not Valuable", -0.2f); // Negative - Not Valuable

        // Neutral Rating
        public static SemanticValue _3_Indifferent = new SemanticValue("_3_Indifferent", 0f); // Neutral - Indifferent

        // Positive Ratings
        public static SemanticValue _4_Valuable = new SemanticValue("_4_Valuable", 0.6f); // Positive - Valuable
        public static SemanticValue _5_Important = new SemanticValue("_5_Important", 0.8f); // Positive - Important
    }

    public static class PeopleRating {
        // Negative Ratings
        public static SemanticValue _1_Enemy = new SemanticValue("_1_Enemy", -1f); // Strongly Negative - Enemy
        public static SemanticValue _2_NotFriendly = new SemanticValue("_2_Not Friendly", -0.3f); // Negative - Not Friendly

        // Neutral Rating
        public static SemanticValue _3_Unknown = new SemanticValue("_3_Unknown", 0f); // Neutral - Unknown Relationship

        // Positive Ratings
        public static SemanticValue _4_Friend = new SemanticValue("_4_Friend", 0.7f); // Positive - Friend
        public static SemanticValue _5_Close = new SemanticValue("_5_Close", 0.8f); // Positive - Close Relationship
    }


    public static class EventRating {
        // Negative - Strongly Undesirable
        public static SemanticValue _1_Undesirable = new SemanticValue("_1_Undesirable", -1f);

        // Negative - Moderately Undesirable
        public static SemanticValue _2_SomewhatUndesirable = new SemanticValue("_2_Somewhat Undesirable", -0.4f);

        // Neutral - Neither Desirable nor Undesirable
        public static SemanticValue _3_Indifferent = new SemanticValue("_3_Indifferent", 0f);

        // Positive - Moderately Desirable
        public static SemanticValue _4_SomewhatDesirable = new SemanticValue("_4_Somewhat Desirable", 0.4f);

        // Positive - Strongly Desirable
        public static SemanticValue _5_Desirable = new SemanticValue("_5_Desirable", 0.1f);
    }


    public static class Emotions {
        // Positive Emotions
        public static String Happiness = "Happiness"; // Positive
        public static String Content = "Content"; // Positive
        public static String Hopeful = "Hopeful"; // Positive
        public static String Excited = "Excited"; // Positive

        // Negative Emotions
        public static String Frustrated = "Frustrated"; // Negative
        public static String Anxious = "Anxious"; // Negative
        public static String Uncertainty = "Uncertainty"; // Negative

        // Neutral Emotions
        public static String Indifferent = "Indifferent"; // Neutral

        // Mixed Emotions
        public static String Confident = "Confident"; // Mixed with Insecure
        public static String Secure = "Secure"; // Mixed with Insecure
        public static String Insecure = "Insecure"; // Mixed with Confident

        // Relief and Anger
        public static String Relieved = "Relieved"; // Relief
        public static String Angry = "Angry"; // Anger
        public static String Overwhelmed = "Overwhelmed"; // Overwhelmed

        // Calmness and Agitation
        public static String Calm = "Calm"; // Calmness
        public static String Agitated = "Agitated"; // Agitation
        public static String Focused = "Focused"; // Calmness
        public static String Distracted = "Distracted"; // Calmness

        // Based on objects
        public static String Like = "Like";
        public static String Dislike = "Dislike";
        
        // Emociones basadas en el modelo OCC
        // Emociones basadas en consecuencias de eventos
        public static String Joy = "Joy";
        public static String Sadness = "Sadness";
        public static String Hope = "Hope";
        public static String Fear = "Fear";
        public static String Relief = "Relief";
        public static String Disappointment = "Disappointment";

        // Emociones basadas en acciones de agentes o personas
        public static String Pride = "Pride";
        public static String Shame = "Shame";
        public static String Admiration = "Admiration";
        public static String Reproach = "Reproach"; // Desprecio
        public static String Gratitude = "Gratitude";
        public static String Anger = "Anger";

        // Emociones basadas en objetos
        public static String Liking = "Liking"; // Atracción
        public static String Disliking = "Disliking"; // Repulsión

        // Emociones compuestas
        public static String Optimism = "Optimism";
        public static String Pessimism = "Pessimism";
        public static String Love = "Love";
        public static String Hate = "Hate";
        public static String Envy = "Envy";
        public static String Jealousy = "Jealousy";
        public static String Remorse = "Remorse";
        public static String Agony = "Agony"; // Agobio
    }


    public static class Sensations {
        // Physiological States
        public static String Hunger = "Hunger"; // Physiological
        public static String NoHunger = "No Hunger"; // Physiological
        public static String Thirsty = "Thirsty"; // Physiological
        public static String Quenched = "Quenched"; // Physiological
        public static String Sick = "Sick"; // Physiological
        public static String Healthy = "Healthy"; // Physiological
        public static String Cold = "Cold"; // Physiological
        public static String Warm = "Warm"; // Physiological
        public static String Tired = "Tired"; // Physiological
        public static String Energized = "Energized"; // Physiological

        // Emotional States
        public static String Exhausted = "Exhausted"; // Emotional
        public static String Refreshed = "Refreshed"; // Emotional
    }
}

