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

import BESA.Emotional.EmotionAxis;
import BESA.Emotional.EmotionalEvent;
import org.json.JSONArray;
import org.json.JSONObject;
import org.wpsim.FamilyContainer.Data.FamilyBelieves;
import org.wpsim.PeasantFamily.Emotions.EmotionalComponent;
import org.wpsim.SimulationControl.Util.ControlCurrentDate;
import org.wpsim.ViewerLens.Util.wpsReport;
import rational.data.InfoData;
import rational.mapping.Believes;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

/**
 * Beliefs (internal state) of an individual Person agent.
 *
 * Unlike PeasantFamilyBelieves, which models an entire household, PersonBelieves
 * models a single individual with their own health, energy, role, social network,
 * emotional state, and activity log.
 *
 * @author jairo
 */
public class PersonBelieves extends EmotionalComponent implements Believes {

    private PersonProfile profile;

    // Reference to the shared family state (same-JVM direct access; null in legacy mode)
    private FamilyBelieves familyBelieves;

    // Time & date management
    private String internalCurrentDate;
    private int currentDay;
    private double timeLeftOnDay;
    private boolean newDay;
    private boolean wait;

    // Emotions flag
    private boolean haveEmotions;

    // Activity tracking
    private Map<String, Set<String>> taskLog = new ConcurrentHashMap<>();
    private String currentActivity;

    // Social network: aliases of persons this individual knows
    private Set<String> socialNetwork = new CopyOnWriteArraySet<>();

    // Last interaction recorded (for reporting)
    private String lastInteractionWith;
    private int totalInteractions;

    /**
     * Creates a new set of beliefs for an individual person (legacy mode — no family container).
     */
    public PersonBelieves(String alias, PersonProfile profile) {
        this(alias, profile, null);
    }

    /**
     * Creates beliefs with a reference to the shared family container state.
     * The {@code familyBelieves} object is shared across all persons in the
     * same family — reads are direct (O(1)), writes go via the coordinator.
     *
     * @param alias          unique BESA alias
     * @param profile        individual profile
     * @param familyBelieves shared family state (may be null in legacy mode)
     */
    public PersonBelieves(String alias, PersonProfile profile, FamilyBelieves familyBelieves) {
        this.profile = profile;
        this.profile.setAlias(alias);
        this.familyBelieves = familyBelieves;

        this.internalCurrentDate = ControlCurrentDate.getInstance().getCurrentDate();
        this.currentDay = 1;
        this.timeLeftOnDay = 1440;
        this.newDay = true;
        this.wait = false;
        this.haveEmotions = true;
        this.currentActivity = "IDLE";
        this.lastInteractionWith = "";
        this.totalInteractions = 0;
        this.taskLog.clear();

        // Shift emotional baseline by personality
        changePersonalityBase((float) profile.getPersonality());
    }

    // ── Time management ───────────────────────────────────────────────────────

    public double getTimeLeftOnDay() { return timeLeftOnDay; }
    public void setTimeLeftOnDay(double timeLeftOnDay) { this.timeLeftOnDay = timeLeftOnDay; }

    /**
     * Consumes time for an activity. When a day ends (< 30 min left), advances
     * to the next simulation day automatically.
     *
     * @param minutes time consumed by the activity
     */
    public synchronized void useTime(double minutes) {
        timeLeftOnDay -= minutes;
        if (timeLeftOnDay <= 30) {
            makeNewDay();
        } else if (timeLeftOnDay < 120) {
            timeLeftOnDay = 120;
        }
    }

    public boolean haveTimeAvailable(double requiredMinutes) {
        return timeLeftOnDay >= requiredMinutes;
    }

    /**
     * Advances to the next simulation day, resetting daily counters.
     */
    public void makeNewDay() {
        this.currentDay++;
        this.timeLeftOnDay = 1440;
        this.newDay = true;
        this.internalCurrentDate = ControlCurrentDate.getInstance().getDatePlusOneDay(internalCurrentDate);

        if (ControlCurrentDate.getInstance().isFirstDayOfWeek(internalCurrentDate)) {
            wpsReport.ws(this.toJson(), this.getAlias());
        }
    }

    public boolean isNewDay() { return newDay; }
    public void setNewDay(boolean newDay) { this.newDay = newDay; }

    public int getCurrentDay() { return currentDay; }
    public void setCurrentDay(int currentDay) { this.currentDay = currentDay; }

    public String getInternalCurrentDate() { return internalCurrentDate; }
    public void setInternalCurrentDate(String internalCurrentDate) {
        this.internalCurrentDate = internalCurrentDate;
    }

    // ── Task log ─────────────────────────────────────────────────────────────

    /**
     * Records the current task in the log for a given date (auto-detects class name).
     */
    public void addTaskToLog(String date) {
        StackTraceElement[] stack = Thread.currentThread().getStackTrace();
        String fullClassName = stack[2].getClassName();
        String taskName = fullClassName.substring(fullClassName.lastIndexOf('.') + 1);
        taskLog.computeIfAbsent(date, k -> ConcurrentHashMap.newKeySet()).add(taskName);
    }

    public boolean isTaskExecutedOnDate(String date, String taskName) {
        Set<String> tasks = taskLog.getOrDefault(date, new HashSet<>());
        return tasks.contains(taskName);
    }

    public Map<String, Set<String>> getOrderedTasksByDateJson() {
        Map<LocalDate, Set<String>> sorted = new TreeMap<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        taskLog.forEach((ds, tasks) -> sorted.put(LocalDate.parse(ds, fmt), tasks));
        Map<String, Set<String>> out = new LinkedHashMap<>();
        sorted.forEach((d, t) -> out.put(d.format(fmt), t));
        return out;
    }

    // ── Social network ───────────────────────────────────────────────────────

    public Set<String> getSocialNetwork() { return socialNetwork; }

    public void addToSocialNetwork(String personAlias) {
        socialNetwork.add(personAlias);
    }

    public void removeFromSocialNetwork(String personAlias) {
        socialNetwork.remove(personAlias);
    }

    public boolean knowsPerson(String personAlias) {
        return socialNetwork.contains(personAlias);
    }

    public int getTotalInteractions() { return totalInteractions; }

    public void recordInteraction(String withAlias) {
        this.lastInteractionWith = withAlias;
        this.totalInteractions++;
        this.profile.increaseReputation(0.001);
        processEmotionalEvent(new EmotionalEvent("FAMILY", "HELPED", "TIME"));
    }

    public String getLastInteractionWith() { return lastInteractionWith; }

    // ── Activity ─────────────────────────────────────────────────────────────

    public String getCurrentActivity() { return currentActivity; }
    public void setCurrentActivity(String currentActivity) { this.currentActivity = currentActivity; }

    // ── State flags ──────────────────────────────────────────────────────────

    public boolean isWaiting() { return wait; }
    public void setWait(boolean wait) { this.wait = wait; }

    public boolean isHaveEmotions() { return haveEmotions; }
    public void setHaveEmotions(boolean haveEmotions) { this.haveEmotions = haveEmotions; }

    // ── Profile & family access ───────────────────────────────────────────────

    public PersonProfile getProfile() { return profile; }

    public String getAlias() { return profile.getAlias(); }

    public SocialRole getRole() { return profile.getRole(); }

    public FamilyBelieves getFamilyBelieves() { return familyBelieves; }
    public void setFamilyBelieves(FamilyBelieves familyBelieves) { this.familyBelieves = familyBelieves; }

    // ── Emotional helpers ────────────────────────────────────────────────────

    /**
     * Adjusts the emotional baseline for all axes by the personality value.
     * Higher personality → higher emotional baseline (more resilient).
     */
    public void changePersonalityBase(float value) {
        List<EmotionAxis> emotions = this.emotionalState.getEmotions();
        for (EmotionAxis emotion : emotions) {
            emotion.increaseBaseValue(value);
        }
    }

    // ── Serialization ────────────────────────────────────────────────────────

    /**
     * Serializes beliefs to JSON for WebSocket visualization.
     */
    public synchronized String toJson() {
        JSONObject data = new JSONObject();
        data.put("role", profile.getRole().name());
        data.put("familyAlias", profile.getFamilyAlias());
        data.put("age", profile.getAge());
        data.put("sex", profile.getSex() != null ? profile.getSex().name() : "MASCULINO");
        data.put("etapaVida", profile.getEtapaVida() != null ? profile.getEtapaVida().name() : "ADULTO");
        data.put("spouseAlias", profile.getSpouseAlias() != null ? profile.getSpouseAlias() : "");
        data.put("health", profile.getHealth());
        data.put("skills", profile.getSkills());
        data.put("reputation", profile.getReputation());
        data.put("money", profile.getMoney());
        data.put("currentDay", currentDay);
        data.put("internalCurrentDate", internalCurrentDate);
        data.put("timeLeftOnDay", timeLeftOnDay);
        data.put("currentActivity", currentActivity);
        data.put("totalInteractions", totalInteractions);
        data.put("lastInteractionWith", lastInteractionWith);
        data.put("socialNetworkSize", socialNetwork.size());
        data.put("socialNetwork", new JSONArray(socialNetwork));
        data.put("haveEmotions", haveEmotions);

        try {
            List<EmotionAxis> emotions = this.getEmotionsListCopy();
            emotions.forEach(e -> data.put(e.toString(), e.getCurrentValue()));
        } catch (Exception ignored) {}

        JSONObject wrapper = new JSONObject();
        wrapper.put("name", getAlias());
        wrapper.put("state", data.toString());
        wrapper.put("taskLog", getOrderedTasksByDateJson());
        return wrapper.toString();
    }

    // ── Believes interface ───────────────────────────────────────────────────

    @Override
    public boolean update(InfoData infoData) { return true; }

    @Override
    public Believes clone() throws CloneNotSupportedException { return this; }
}
