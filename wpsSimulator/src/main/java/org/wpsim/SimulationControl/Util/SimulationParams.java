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
package org.wpsim.SimulationControl.Util;

public class SimulationParams {
    /** Container alias used as the BESA container name and RabbitMQ routing key. */
    public String mode = "single";
    /**
     * Node role: {@code primary} creates services + peasants (default),
     * {@code worker} creates only peasants (for distributed deployments).
     * Inferred from mode if not supplied explicitly.
     */
    public String role = null;
    public String env;
    public int money = -1;
    public int land = -1;
    public double personality = -1.0;
    public int tools = -1;
    public int seeds = -1;
    public int water = -1;
    public int irrigation = -1;
    public int emotions = -1;
    public int training = -1;
    public int nodes = 0;
    public int steptime = 50;
    public int years = 1;
    public String world;

}