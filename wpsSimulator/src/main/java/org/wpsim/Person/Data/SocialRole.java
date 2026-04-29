/**
 * ==========================================================================
 * __      __ _ __   ___  *    WellProdSim                                  *
 * \ \ /\ / /| '_ \ / __| *    @version 1.0                                 *
 * \ V  V / | |_) |\__ \  *    @since 2023                                  *
 * \_/\_/  | .__/ |___/   *                                                 *
 * | |                    *    @author Jairo Serrano                        *
 * |_|                    *    @author Enrique Gonzalez                     *
 * ==========================================================================
 * Social Simulator used to estimate productivity and well-being of peasant *
 * families. It is event oriented, high concurrency, heterogeneous time     *
 * management and emotional reasoning BDI.                                  *
 * ==========================================================================
 */
package org.wpsim.Person.Data;

/**
 * Defines the social roles that an individual Person agent can hold within
 * the rural community. Each role unlocks a specific set of BDI goals and
 * determines how the agent interacts with other persons and service agents.
 *
 * @author jairo
 */
public enum SocialRole {

    /** Cultivates their own or family land. Main farming activities. */
    AGRICULTOR("Farmer who cultivates land"),

    /** Day laborer working on others' land for wages. */
    JORNALERO("Day laborer working for hire"),

    /** Buys and sells agricultural products at market. */
    COMERCIANTE("Agricultural product trader"),

    /** Raises and manages livestock. */
    GANADERO("Livestock farmer"),

    /** Organizes collective community work (mingas, convites). */
    LIDER_COMUNITARIO("Community leader organizing collective work"),

    /** Provides traditional health care and medicine to community. */
    CURANDERA("Traditional healer providing health services"),

    /** Guides community spiritual and religious activities. */
    CATEQUISTA("Religious and spiritual community guide"),

    /** Teaches and trains others in agricultural or artisan skills. */
    MAESTRA("Trainer sharing knowledge and skills"),

    /** Manages the household, food production, and domestic economy. */
    AMA_DE_CASA("Homemaker managing household economy"),

    /** Seeks work outside the local area; may send remittances. */
    MIGRANTE("Migrant worker seeking outside employment"),

    /** Generates non-agricultural income through small business. */
    EMPRENDEDOR("Entrepreneur with non-agricultural income");

    private final String description;

    SocialRole(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
