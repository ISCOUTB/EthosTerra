package org.wpsim.FamilyContainer.Data;

import org.json.JSONArray;
import org.json.JSONObject;
import org.wpsim.SimulationControl.Util.ControlCurrentDate;
import rational.data.InfoData;
import rational.mapping.Believes;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Beliefs of the {@link org.wpsim.FamilyContainer.Agent.FamilyCoordinator} agent.
 *
 * <p>Extends {@link FamilyBelieves} (the shared family resource pool) with
 * coordinator-specific runtime state: time tracking, task log, and pending
 * lifecycle events (births/deaths). Also implements {@link Believes} so the
 * BDI engine can use it directly.</p>
 *
 * @author jairo
 */
public class FamilyCoordinatorBelieves extends FamilyBelieves implements Believes {

    private final String coordinatorAlias;

    // ── Time management ───────────────────────────────────────────────────────
    private String internalCurrentDate;
    private int    currentDay;
    private double timeLeftOnDay;
    private boolean newDay;

    // ── Task log ──────────────────────────────────────────────────────────────
    private final Map<String, Set<String>> taskLog = new ConcurrentHashMap<>();

    // ── Pending lifecycle events ──────────────────────────────────────────────
    private final Queue<String> pendingDeaths  = new LinkedList<>();
    private final Queue<BirthData>  pendingBirths = new LinkedList<>();

    // ─────────────────────────────────────────────────────────────────────────

    public FamilyCoordinatorBelieves(String coordinatorAlias,
                                     double initialMoney,
                                     int tools, int seeds, int water) {
        super(coordinatorAlias, initialMoney, tools, seeds, water);
        this.coordinatorAlias    = coordinatorAlias;
        this.internalCurrentDate = ControlCurrentDate.getInstance().getCurrentDate();
        this.currentDay          = 1;
        this.timeLeftOnDay       = 1440;
        this.newDay              = true;
    }

    // ── Time management ───────────────────────────────────────────────────────

    public String getInternalCurrentDate() { return internalCurrentDate; }
    public int    getCurrentDay()          { return currentDay; }
    public double getTimeLeftOnDay()       { return timeLeftOnDay; }
    public boolean isNewDay()              { return newDay; }
    public void setNewDay(boolean v)       { this.newDay = v; }

    public void makeNewDay() {
        this.currentDay++;
        this.timeLeftOnDay = 1440;
        this.newDay = true;
        this.internalCurrentDate = ControlCurrentDate.getInstance()
                .getDatePlusOneDay(internalCurrentDate);
    }

    public synchronized void useTime(double minutes) {
        timeLeftOnDay -= minutes;
        if (timeLeftOnDay <= 30) makeNewDay();
    }

    public boolean haveTimeAvailable(double required) {
        return timeLeftOnDay >= required;
    }

    // ── Task log ──────────────────────────────────────────────────────────────

    public void addTaskToLog(String date, String taskName) {
        taskLog.computeIfAbsent(date, k -> ConcurrentHashMap.newKeySet()).add(taskName);
    }

    public boolean isTaskExecutedOnDate(String date, String taskName) {
        return taskLog.getOrDefault(date, Set.of()).contains(taskName);
    }

    // ── Lifecycle queues ──────────────────────────────────────────────────────

    public void enqueueDeath(String personAlias) {
        pendingDeaths.offer(personAlias);
    }

    public String pollNextDeath() { return pendingDeaths.poll(); }

    public boolean hasPendingDeaths() { return !pendingDeaths.isEmpty(); }

    public void enqueueBirth(BirthData data) { pendingBirths.offer(data); }

    public BirthData pollNextBirth() { return pendingBirths.poll(); }

    public boolean hasPendingBirths() { return !pendingBirths.isEmpty(); }

    // ── Serialization ─────────────────────────────────────────────────────────

    public synchronized String toJson() {
        JSONObject data = new JSONObject();
        data.put("familyAlias",   getFamilyAlias());
        data.put("currentDay",    currentDay);
        data.put("date",          internalCurrentDate);
        data.put("familyMoney",   getFamilyMoney());
        data.put("tools",         getTools());
        data.put("seeds",         getSeeds());
        data.put("water",         getWater());
        data.put("livestock",     getLivestock());
        data.put("food",          getFood());
        data.put("memberCount",   getMemberCount());
        data.put("members",       new JSONArray(getMemberAliases()));
        data.put("landAlias",     getLandAlias() != null ? getLandAlias() : "");

        JSONObject wrapper = new JSONObject();
        wrapper.put("name",  coordinatorAlias);
        wrapper.put("state", data.toString());
        return wrapper.toString();
    }

    // ── Believes interface ────────────────────────────────────────────────────

    @Override
    public boolean update(InfoData infoData) { return true; }

    @Override
    public Believes clone() throws CloneNotSupportedException { return this; }
}
