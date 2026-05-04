/**
 * ==========================================================================
 * __      __ _ __   ___  *    WellProdSim                                  *
 * \ \ /\ / /| '_ \ / __| *    @version 1.0                                 *
 * \ V  V / | |_) |\__ \ *    @since 2023                                  *
 * \_/\_/  | .__/ |___/ *                                                 *
 * | |          *    @author Jairo Serrano                        *
 * |_|          *    @author Enrique Gonzalez                     *
 * ==========================================================================
 * Social Simulator used to estimate productivity and well-being of peasant *
 * families. It is event oriented, high concurrency, heterogeneous time     *
 * management and emotional reasoning BDI.                                  *
 * ==========================================================================
 */
package org.wpsim.PeasantFamily.Data;

import BESA.Emotional.EmotionAxis;
import BESA.Emotional.EmotionalEvent;
import BESA.Emotional.Semantics;
import BESA.ExceptionBESA;
import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.System.AdmBESA;
import BESA.Log.ReportBESA;
import org.json.JSONObject;
import org.wpsim.Infrastructure.Goals.GoalEngine;
import org.wpsim.PeasantFamily.Emotions.EmotionalEvaluator;
import org.wpsim.PeasantFamily.Guards.FromSimulationControl.ToControlMessage;
import org.wpsim.SimulationControl.Data.Coin;
import org.wpsim.SimulationControl.Guards.SimulationControlGuard;
import org.wpsim.SimulationControl.Util.ControlCurrentDate;
import org.wpsim.SimulationControl.Data.DateHelper;
import org.wpsim.CivicAuthority.Data.LandInfo;
import org.wpsim.PeasantFamily.Data.Utils.*;
import org.wpsim.PeasantFamily.Emotions.EmotionalComponent;
import org.wpsim.WellProdSim.wpsStart;
import org.wpsim.ViewerLens.Util.wpsReport;
import org.wpsim.Infrastructure.Beliefs.BeliefRepository;
import org.wpsim.Infrastructure.Beliefs.RedisBeliefRepository;
import org.wpsim.Infrastructure.Beliefs.RedisConnectionFactory;
import rational.data.InfoData;
import rational.mapping.Believes;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.wpsim.WellProdSim.wpsStart.params;

/**
 * @author jairo
 */
public class PeasantFamilyBelieves extends EmotionalComponent implements Believes {

    private PeasantFamilyProfile peasantProfile;
    /**
     * Redis-backed belief repository. Non-null only when REDIS_HOST env var is set.
     * In Stage 1 this is write-behind only — all reads still use Java fields.
     */
    private BeliefRepository beliefs;
    private SeasonType currentSeason;
    private MoneyOriginType currentMoneyOrigin;
    private PeasantActivityType currentPeasantActivityType;
    private PeasantLeisureType currentPeasantLeisureType;
    private ResourceNeededType currentResourceNeededType;
    private List<LandInfo> assignedLands = new CopyOnWriteArrayList<>();
    private int currentDay;
    private int robberyAccount;
    private double timeLeftOnDay;
    private boolean workerWithoutLand;
    private boolean newDay;
    private boolean haveLoan;
    private double toPay;
    private boolean loanDenied;
    private String internalCurrentDate;
    private String ptwDate;
    private Map<String, FarmingResource> priceList = new HashMap<>();
    private Map<String, Set<String>> taskLog = new ConcurrentHashMap<>();
    private int daysToWorkForOther;
    private String peasantFamilyHelper;
    private String Contractor;
    private boolean haveEmotions;
    private boolean askedForContractor;
    private boolean askedForCollaboration;
    private boolean wait;
    private boolean updatePriceList;
    private double personality;
    private double trainingLevel;
    private boolean trainingAvailable;
    private GoalEngine goalEngine;

    public List<Map<String, Object>> getLandsState() {
        List<Map<String, Object>> list = new ArrayList<>();
        for (LandInfo land : assignedLands) {
            Map<String, Object> map = new HashMap<>();
            map.put("name", land.getLandName());
            map.put("kind", land.getKind());
            map.put("season", land.getCurrentSeason().toString());
            map.put("crop", land.getCropName());
            map.put("work_done", land.getElapsedWorkTime());
            map.put("work_total", land.getTotalRequiredTime());
            map.put("is_used", land.isUsed());
            map.put("currentCropCareType", land.getCurrentCropCareType().toString());
            list.add(map);
        }
        return list;
    }

    public boolean hasLandWithSeason(String season) {
        for (LandInfo land : assignedLands) {
            if (land.getCurrentSeason().toString().equals(season)) {
                return true;
            }
        }
        return false;
    }

    public boolean hasLandWithKind(String kind) {
        for (LandInfo land : assignedLands) {
            if (land.getKind().equals(kind)) {
                return true;
            }
        }
        return false;
    }

    public boolean hasLandWithKindAndSeason(String kind, String season) {
        for (LandInfo land : assignedLands) {
            if (land.getKind().equals(kind) && land.getCurrentSeason().toString().equals(season)) {
                return true;
            }
        }
        return false;
    }

    public boolean hasLandWithCropCare(String careType) {
        for (LandInfo land : assignedLands) {
            if (land.getCurrentCropCareType().toString().equals(careType)) {
                return true;
            }
        }
        return false;
    }

    /**
     * @param alias          Peasant Family Alias
     * @param peasantProfile profile of the peasant family
     */
    public PeasantFamilyBelieves(String alias, PeasantFamilyProfile peasantProfile) {
        this.setPeasantProfile(peasantProfile);

        this.internalCurrentDate = ControlCurrentDate.getInstance().getCurrentDate();
        this.peasantProfile.setPeasantFamilyAlias(alias);
        this.taskLog.clear();

        this.currentDay = 1;
        this.timeLeftOnDay = 1440;
        this.haveLoan = false;
        this.newDay = true;
        this.wait = false;
        this.priceList.clear();
        this.loanDenied = false;
        this.ptwDate = "";
        this.peasantFamilyHelper = "";
        this.Contractor = "";

        this.currentMoneyOrigin = MoneyOriginType.NONE;
        this.currentPeasantActivityType = PeasantActivityType.NONE;
        this.currentPeasantLeisureType = PeasantLeisureType.NONE;
        this.setHaveEmotions(params.emotions == 1);

        if (params.personality != -1.0) {
            this.setPersonality(params.personality);
        } else {
            this.setPersonality(0.0);
        }

        if (params.training == 1) {
            this.trainingLevel = wpsStart.config.getDoubleProperty("pfagent.trainingLevel");
        } else {
            this.trainingLevel = 0.4;
        }

        changePersonalityBase(getPersonality());

        if (RedisConnectionFactory.isAvailable()) {
            this.beliefs = new RedisBeliefRepository(alias);
            
            // Subscribe to keys that can be updated by declarative goals
            this.beliefs.subscribe("new_day", (key, oldVal, newVal) -> {
                this.newDay = (boolean) newVal;
            });
            this.beliefs.subscribe("have_loan", (key, oldVal, newVal) -> {
                this.haveLoan = (boolean) newVal;
            });
            this.beliefs.subscribe("loan_denied", (key, oldVal, newVal) -> {
                this.loanDenied = (boolean) newVal;
            });
            this.beliefs.subscribe("purpose", (key, oldVal, newVal) -> {
                this.peasantProfile.setPurpose((String) newVal);
            });
            
            syncToRedis();
        }
    }

    /**
     * Returns the BeliefRepository for this agent, or null when Redis is not configured.
     * Intended for use by GoalEngine (Stage 4+) and external tooling.
     */
    public BeliefRepository getBeliefRepository() {
        return beliefs;
    }

    /**
     * Mirrors the agent's current state snapshot to Redis as a write-behind update.
     * Called at the end of makeNewDay() so Redis always has a fresh daily snapshot.
     * All reads still use Java fields — this does NOT change simulation behaviour.
     */
    private void syncToRedis() {
        if (beliefs == null) return;
        RedisBeliefRepository repo = (RedisBeliefRepository) beliefs;

        Map<String, String> state = new LinkedHashMap<>();
        state.put("money",              String.valueOf(peasantProfile.getMoney()));
        state.put("health",             String.valueOf(peasantProfile.getHealth()));
        state.put("loan_amount_to_pay", String.valueOf(peasantProfile.getLoanAmountToPay()));
        state.put("have_loan",          String.valueOf(haveLoan));
        state.put("loan_denied",        String.valueOf(loanDenied));
        state.put("new_day",            String.valueOf(newDay));
        state.put("current_day",        String.valueOf(currentDay));
        state.put("time_left_on_day",   String.valueOf(timeLeftOnDay));
        state.put("worker_without_land",String.valueOf(workerWithoutLand));
        state.put("seeds",              String.valueOf(peasantProfile.getSeeds()));
        state.put("tools",              String.valueOf(peasantProfile.getTools()));
        state.put("water_available",    String.valueOf(peasantProfile.getWaterAvailable()));
        state.put("pesticides_available", String.valueOf(peasantProfile.getPesticidesAvailable()));
        state.put("supplies",           String.valueOf(peasantProfile.getSupplies()));
        state.put("harvested_weight",   String.valueOf(peasantProfile.getHarvestedWeight()));
        state.put("total_harvested_weight", String.valueOf(peasantProfile.getTotalHarvestedWeight()));
        state.put("crop_health",        String.valueOf(peasantProfile.getCropHealth()));
        state.put("farm_ready",         String.valueOf(peasantProfile.getFarmReady()));
        state.put("has_farm",           String.valueOf(peasantProfile.getFarmName()));
        state.put("resource_needed_type", currentResourceNeededType != null ? currentResourceNeededType.toString() : "NONE");
        state.put("crop_size",          String.valueOf(peasantProfile.getCropSize()));
        state.put("training_level",     String.valueOf(trainingLevel));
        state.put("training_available", String.valueOf(trainingAvailable));
        state.put("minimum_vital",      String.valueOf(peasantProfile.getMinimumVital()));
        state.put("purpose",            peasantProfile.getPurpose());
        state.put("waiting",            String.valueOf(wait));
        state.put("assigned_lands_count", String.valueOf(assignedLands.size()));
        state.put("has_helper",         String.valueOf(peasantFamilyHelper != null && !peasantFamilyHelper.isEmpty()));
        state.put("asked_for_collaboration", String.valueOf(askedForCollaboration));
        state.put("asked_for_contractor", String.valueOf(askedForContractor));
        
        // Add execution flags for all registered goals
        for (org.wpsim.Infrastructure.Goals.GoalSpec spec : org.wpsim.Infrastructure.Goals.GoalRegistry.getInstance().getAllGoals().values()) {
            state.put("already_executed_" + spec.getId(), String.valueOf(isTaskExecutedOnDate(internalCurrentDate, spec.getId())));
        }

        repo.bulkSet(repo.stateHash(), state);

        Map<String, String> pers = new LinkedHashMap<>();
        pers.put("personality",             String.valueOf(this.personality));
        pers.put("peasant_family_affinity",  String.valueOf(peasantProfile.getPeasantFamilyAffinity()));
        pers.put("social_affinity",          String.valueOf(peasantProfile.getSocialAffinity()));
        pers.put("live_stock_affinity",      String.valueOf(peasantProfile.getLiveStockAffinity()));
        pers.put("peasant_leisure_affinity", String.valueOf(peasantProfile.getPeasantLeisureAffinity()));
        pers.put("peasant_friends_affinity", String.valueOf(peasantProfile.getPeasantFriendsAffinity()));
        repo.bulkSet(repo.personalityHash(), pers);

        Map<String, String> emotional = new LinkedHashMap<>();
        if (isHaveEmotions()) {
            EmotionalEvaluator evaluator = new EmotionalEvaluator("EmotionalRulesFull");
            double emotionalIndex = evaluator.evaluate(getEmotionsListCopy());
            emotional.put("emotional_index", String.valueOf(emotionalIndex));
        } else {
            emotional.put("emotional_index", "0.5");
        }
        emotional.put("happiness", String.valueOf(getEmotionCurrentValue("Happiness")));
        emotional.put("hopeful",   String.valueOf(getEmotionCurrentValue("Hopeful")));
        emotional.put("security",  String.valueOf(getEmotionCurrentValue("Secure")));
        repo.bulkSet(repo.emotionalHash(), emotional);

        // Sync lands state as a JSON array for MVEL complex evaluations
        try {
            org.json.JSONArray landsArray = new org.json.JSONArray();
            for (LandInfo land : assignedLands) {
                org.json.JSONObject landObj = new org.json.JSONObject();
                landObj.put("name", land.getLandName());
                landObj.put("kind", land.getKind());
                landObj.put("season", land.getCurrentSeason().toString());
                landObj.put("crop", land.getCropName());
                landObj.put("work_done", land.getElapsedWorkTime());
                landObj.put("work_total", land.getTotalRequiredTime());
                landObj.put("is_used", land.isUsed());
                landsArray.put(landObj);
            }
            repo.set("lands", landsArray.toString());
        } catch (Exception e) {
            // Log but don't fail
        }
    }

    public boolean isTrainingAvailable() {
        return trainingAvailable;
    }

    public void setTrainingAvailable(boolean trainingAvailable) {
        this.trainingAvailable = trainingAvailable;
    }

    public double getTrainingLevel() {
        return trainingLevel;
    }

    public void increaseTrainingLevel() {
        trainingLevel += 0.1;
        setTrainingAvailable(false);
    }

    public boolean isHaveEmotions() {
        return haveEmotions;
    }

    public void setHaveEmotions(boolean haveEmotions) {
        this.haveEmotions = haveEmotions;
    }

    public boolean isAskedForContractor() {
        return askedForContractor;
    }

    public void setAskedForContractor(boolean askedForContractor) {
        this.askedForContractor = askedForContractor;
    }

    public String getContractor() {
        return Contractor;
    }

    public void setContractor(String peasantFamilyToHelp) {
        this.Contractor = peasantFamilyToHelp;
    }

    public boolean isWorkerWithoutLand() {
        return workerWithoutLand;
    }

    public void setWorkerWithoutLand() {
        this.workerWithoutLand = true;
        peasantProfile.setPurpose("worker");
    }

    public List<LandInfo> getAssignedLands() {
        return assignedLands;
    }

    /**
     * Establece los terrenos asignados a partir de un mapa proporcionado.
     * Limpia la lista actual y la llena con objetos LandInfo basados en las entradas del mapa.
     *
     * @param lands Un mapa con nombres de terrenos como claves y tipos de terreno como valores.
     */
    public void setAssignedLands(Map<String, String> lands) {
        if (lands == null) {
            return;
        }

        List<LandInfo> newAssignedLands = new ArrayList<>();

        for (Map.Entry<String, String> entry : lands.entrySet()) {
            newAssignedLands.add(
                    new LandInfo(
                            entry.getKey(),
                            entry.getValue(),
                            getPeasantProfile().getPeasantFamilyLandAlias(),
                            ControlCurrentDate.getInstance().getCurrentYear()
                    )
            );
        }

        this.assignedLands.clear();
        this.assignedLands.addAll(newAssignedLands);
    }


    /**
     * Actualiza la información del terreno en la lista.
     * Si el terreno con el mismo nombre ya existe en la lista, se actualiza con la nueva información.
     *
     * @param newLandInfo La nueva información del terreno.
     */
    public void updateAssignedLands(LandInfo newLandInfo) {
        assignedLands.remove(newLandInfo);
        assignedLands.add(newLandInfo);
    }

    /**
     * Verifica si hay algún terreno disponible en la lista que no sea de tipo "water" y no esté en uso.
     * Imprime información sobre cada terreno durante la verificación.
     *
     * @return true si hay un terreno disponible, false en caso contrario.
     */
    public boolean isLandAvailable() {
        for (LandInfo landInfo : assignedLands) {
            if (!landInfo.getKind().equals("water") && !landInfo.isUsed()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Busca y devuelve un terreno disponible en la lista que no sea de tipo "water" y no esté en uso.
     * El terreno devuelto se marca como usado.
     *
     * @return El terreno disponible o null si no hay ninguno.
     */
    public boolean getLandAvailable() {
        for (LandInfo landInfo : assignedLands) {
            if (!landInfo.getKind().equals("water")
                    && !landInfo.getKind().equals("forest")
                    && landInfo.getCurrentSeason().equals(SeasonType.NONE)) {
                return true;
            }
        }
        return false;
    }


    public synchronized LandInfo getLandInfo(String landName) {
        for (LandInfo landInfo : assignedLands) {
            if (landInfo.getLandName().equals(landName)) {
                return landInfo;
            }
        }
        return null;
    }

    /**
     * Establece la temporada actual para un terreno específico basado en su nombre.
     * Si se encuentra el terreno en la lista, se actualiza su temporada.
     *
     * @param landName      El nombre del terreno cuya temporada se desea actualizar.
     * @param currentSeason La nueva temporada que se desea establecer para el terreno.
     */
    public void setCurrentSeason(String landName, SeasonType currentSeason) {
        LandInfo landInfo = getLandInfo(landName);
        if (landInfo != null) {
            landInfo.setCurrentSeason(currentSeason);
        }
        this.currentSeason = currentSeason;
        this.currentSeason = currentSeason;
    }

    public void setCurrentLandKind(String landName, String currentKind) {
        LandInfo landInfo = getLandInfo(landName);
        if (landInfo != null) {
            landInfo.setKind(currentKind);
        }
    }


    /**
     * Sets the current crop care type for the specified land.
     *
     * @param landName            the name of the land
     * @param currentCropCareType the new crop care type
     */
    public void setCurrentCropCareType(String landName, CropCareType currentCropCareType) {
        LandInfo landInfo = getLandInfo(landName);
        landInfo.setCurrentCropCareType(currentCropCareType);
    }

    /**
     * Adds a task to the log for the specified date.
     *
     * @param date the date of the task
     */
    public void addTaskToLog(String date) {
        StackTraceElement[] stackTraceElements = Thread.currentThread().getStackTrace();
        String fullClassName = stackTraceElements[2].getClassName();
        String[] parts = fullClassName.split("\\.");
        String taskName = parts[parts.length - 1];
        taskLog.computeIfAbsent(date, k -> ConcurrentHashMap.newKeySet()).add(taskName);
    }

    public void addNamedTaskToLog(String date, String taskName) {
        taskLog.computeIfAbsent(date, k -> ConcurrentHashMap.newKeySet()).add(taskName);
    }

    public void addTaskToLog(String date, String landName) {
        StackTraceElement[] stackTraceElements = Thread.currentThread().getStackTrace();
        String fullClassName = stackTraceElements[2].getClassName();
        String[] parts = fullClassName.split("\\.");
        String taskName = parts[parts.length - 1];
        taskLog.computeIfAbsent(date, k -> ConcurrentHashMap.newKeySet()).add(taskName);
        taskLog.computeIfAbsent(date, k -> ConcurrentHashMap.newKeySet()).add(taskName + landName);
    }

    /**
     * Checks if the specified task was executed on the specified date.
     *
     * @param date     Date to check
     * @param taskName Name of the task
     * @return true if the task was executed on the specified date, false otherwise
     */
    public boolean isTaskExecutedOnDate(String date, String taskName) {
        Set<String> tasks = taskLog.getOrDefault(date, new HashSet<>());
        //System.out.println(tasks + " " + taskName + " on " + date + " r " + tasks.contains(taskName));
        return tasks.contains(taskName);
    }

    public boolean isTaskExecutedOnDateWithLand(String date, String taskName, String landName) {
        Set<String> tasks = taskLog.getOrDefault(date, new HashSet<>());
        //ReportBESA.info(tasks + " " + (taskName+landName) + " on " + date + " r " + tasks.contains(taskName+landName));
        return tasks.contains(taskName + landName);
    }

    public boolean isTaskExecutedToday(String taskName) {
        return isTaskExecutedOnDate(getInternalCurrentDate(), taskName);
    }

    public boolean hasMoney(double amount) {
        return getPeasantProfile().getMoney() >= amount;
    }

    public boolean hasHealthBelow(double threshold) {
        return getPeasantProfile().getHealth() < threshold;
    }

    public boolean hasHarvestedWeight() {
        return getPeasantProfile().getHarvestedWeight() > 0;
    }

    public boolean hasPurpose() {
        return getPeasantProfile().getPurpose() != null && !getPeasantProfile().getPurpose().isEmpty();
    }

    public boolean needsSeeds() {
        return getPeasantProfile().getSeeds() < getPeasantProfile().getSeedsNeeded();
    }

    public boolean needsTools() {
        return getPeasantProfile().getTools() < getPeasantProfile().getToolsNeeded();
    }

    public boolean needsWater() {
        // Water is needed if any land has irrigation care type and water is low (arbitrary threshold 10)
        return hasLandWithCropCare("IRRIGATION") && getPeasantProfile().getWaterAvailable() < 10;
    }

    public boolean needsPesticides() {
        // Pesticides are needed if any land is growing and pesticides are low (arbitrary threshold 5)
        return hasLandWithSeason("GROWING") && getPeasantProfile().getPesticidesAvailable() < 5;
    }

    public boolean isPriceListAvailable() {
        return !getPriceList().isEmpty();
    }

    public boolean hasHelper() {
        return getPeasantFamilyHelper() != null && !getPeasantFamilyHelper().isEmpty();
    }

    public boolean hasContractor() {
        return getContractor() != null && !getContractor().isEmpty();
    }

    public boolean isWorker() {
        return "worker".equals(getPeasantProfile().getPurpose());
    }

    public boolean hasMoneyBelow(double amount) {
        return getPeasantProfile().getMoney() <= amount;
    }

    public boolean hasLoan() {
        return isHaveLoan();
    }

    public boolean isHaveLoan() {
        return haveLoan;
    }

    public void setHaveLoan(boolean haveLoan) {
        this.haveLoan = haveLoan;
    }

    public int getRobberyAccount() {
        return robberyAccount;
    }

    public void increaseRobberyAccount() {
        this.robberyAccount++;
    }

    public String getPtwDate() {
        return ptwDate;
    }

    public void setPtwDate(String ptwDate) {
        this.ptwDate = ptwDate;
    }

    /**
     * @return
     */
    public int getCurrentDay() {
        return currentDay;
    }

    /**
     * @param currentDay
     */
    public void setCurrentDay(int currentDay) {
        this.currentDay = currentDay;
    }

    /**
     * @return
     */
    public double getTimeLeftOnDay() {
        return timeLeftOnDay;
    }

    /**
     * @param timeLeftOnDay
     */
    public void setTimeLeftOnDay(double timeLeftOnDay) {
        this.timeLeftOnDay = timeLeftOnDay;
    }

    /**
     * @return
     */
    public String getInternalCurrentDate() {
        return internalCurrentDate;
    }

    /**
     * @param internalCurrentDate
     */
    public void setInternalCurrentDate(String internalCurrentDate) {
        this.internalCurrentDate = internalCurrentDate;
    }

    /**
     * Time unit defined by hours spent on activities.
     *
     * @param time
     */
    public void useTime(double time) {
        EmotionalEvaluator evaluator = new EmotionalEvaluator("EmotionalRulesFull");
        double factor = 1;
        if (isHaveEmotions()) {
            factor = evaluator.emotionalFactor(getEmotionsListCopy(), Semantics.Emotions.Happiness);
            time = (int) Math.ceil(time - ((factor - 1) * time));
            //ReportBESA.info(this.getAlias() + " tiene " + this.timeLeftOnDay + " descuenta con emociones " + time);
            decreaseTime(time);
        } else {
            //System.out.println(this.getAlias() + " tiene " + this.timeLeftOnDay + " descuenta " + time);
            decreaseTime(time);
        }
    }

    /**
     * Make variable reset Every Day and increment date
     */
    public void makeNewDay() {
        this.currentDay++;
        this.timeLeftOnDay = 1440;
        this.newDay = true;
        this.internalCurrentDate = ControlCurrentDate.getInstance().getDatePlusOneDay(internalCurrentDate);

        notifyInternalCurrentDay();
        if (ControlCurrentDate.getInstance().isFirstDayOfWeek(internalCurrentDate)) {
            // Report the agent's beliefs to the wpsViewer
            wpsReport.ws(this.toJson(), this.getAlias());
            // Report the agent's beliefs to the wpsViewer
            wpsReport.mental(Instant.now() + "," + this.toCSV(), this.getAlias());
        }
        syncToRedis();
    }

    private void notifyInternalCurrentDay() {
        // Update the internal current date
        try {
            AdmBESA.getInstance().getHandlerByAlias(
                    wpsStart.config.getControlAgentName()
            ).sendEvent(
                    new EventBESA(
                            SimulationControlGuard.class.getName(),
                            new ToControlMessage(
                                    getAlias(),
                                    getInternalCurrentDate(),
                                    getCurrentDay()
                            )
                    )
            );
        } catch (ExceptionBESA ex) {
            ReportBESA.error(ex);
        }
    }

    /**
     * Time unit defined by hours spent on activities.
     *
     * @param time
     */
    public synchronized void decreaseTime(double time) {

        timeLeftOnDay = (int) (timeLeftOnDay - time);
        if (timeLeftOnDay <= 30) {
            this.makeNewDay();
        } else if (timeLeftOnDay < 120) {
            timeLeftOnDay = 120;
        }
        //ReportBESA.info("decreaseTime: " + time + ", Queda " + timeLeftOnDay + " para " + getPeasantProfile().getPeasantFamilyAlias());
    }

    /**
     * @param time
     * @return
     */
    public boolean haveTimeAvailable(TimeConsumedBy time) {
        return this.timeLeftOnDay - time.getTime() >= 0;
    }

    /**
     * Check if is a new Day
     *
     * @return true if is a new day
     */
    public boolean isNewDay() {
        return this.newDay;
    }

    /**
     * Set a new Day false
     *
     * @param newDay
     */
    public void setNewDay(boolean newDay) {
        this.newDay = newDay;
    }


    /**
     * @return
     */
    public ResourceNeededType getCurrentResourceNeededType() {
        return currentResourceNeededType;
    }

    /**
     *
     */
    public void setCurrentResourceNeededType(ResourceNeededType currentResourceNeededType) {
        this.currentResourceNeededType = currentResourceNeededType;
    }

    /**
     * @return
     */
    public PeasantLeisureType getCurrentPeasantLeisureType() {
        return currentPeasantLeisureType;
    }

    /**
     * @param currentPeasantLeisureType
     */
    public void setCurrentPeasantLeisureType(PeasantLeisureType currentPeasantLeisureType) {
        this.currentPeasantLeisureType = currentPeasantLeisureType;
    }

    /**
     * @return
     */
    public SeasonType getCurrentSeason() {
        return currentSeason;
    }

    /**
     * @return
     */
    public MoneyOriginType getCurrentMoneyOrigin() {
        return currentMoneyOrigin;
    }

    /**
     * @param currentMoneyOrigin the currentMoneyOrigin to set
     */
    public void setCurrentMoneyOrigin(MoneyOriginType currentMoneyOrigin) {
        this.currentMoneyOrigin = currentMoneyOrigin;
    }

    public PeasantActivityType getCurrentActivity() {
        return this.currentPeasantActivityType;
    }

    public void setCurrentActivity(PeasantActivityType peasantActivityType) {
        this.currentPeasantActivityType = peasantActivityType;
    }

    /**
     * @return the currentPeasantActivityType
     */
    public PeasantFamilyProfile getPeasantProfile() {
        return peasantProfile;
    }

    /**
     * @param peasantProfile the peasantProfile to set
     */
    private void setPeasantProfile(PeasantFamilyProfile peasantProfile) {
        this.peasantProfile = peasantProfile;
    }

    /**
     * @param infoData
     * @return
     */
    @Override
    public boolean update(InfoData infoData) {
        return true;
    }

    /**
     * @return the priceList
     */
    public Map<String, FarmingResource> getPriceList() {
        return priceList;
    }

    /**
     * @param priceList the priceList to set
     */
    public void setPriceList(Map<String, FarmingResource> priceList) {
        this.priceList = priceList;
        for (Map.Entry<String, FarmingResource> price : priceList.entrySet()) {
            if (price.getValue().getBehavior() > 0) {
                processEmotionalEvent(new EmotionalEvent("FAMILY", "PLANTING", "MONEY"));
            } else if (price.getValue().getBehavior() < 0) {
                processEmotionalEvent(new EmotionalEvent("FAMILY", "PLANTINGFAILED", "MONEY"));
            }
        }
    }

    /**
     * @return @throws CloneNotSupportedException
     */
    @Override
    public Believes clone() throws CloneNotSupportedException {
        return this;
    }

    /**
     * @return
     */
    public synchronized String toJson() {
        JSONObject dataObject = new JSONObject();
        dataObject.put("money", peasantProfile.getMoney());
        dataObject.put("initialMoney", peasantProfile.getInitialMoney());
        dataObject.put("health", peasantProfile.getHealth());
        dataObject.put("initialHealth", peasantProfile.getInitialHealth());
        dataObject.put("timeLeftOnDay", timeLeftOnDay);
        dataObject.put("newDay", newDay);
        dataObject.put("currentSeason", currentSeason);
        dataObject.put("robberyAccount", robberyAccount);
        dataObject.put("purpose", peasantProfile.getPurpose());
        dataObject.put("peasantFamilyAffinity", peasantProfile.getPeasantFamilyAffinity());
        dataObject.put("peasantLeisureAffinity", peasantProfile.getPeasantLeisureAffinity());
        dataObject.put("peasantFriendsAffinity", peasantProfile.getPeasantFriendsAffinity());
        dataObject.put("currentPeasantLeisureType", currentPeasantLeisureType);
        dataObject.put("currentResourceNeededType", currentResourceNeededType);
        dataObject.put("currentDay", currentDay);
        dataObject.put("internalCurrentDate", internalCurrentDate);
        dataObject.put("toPay", toPay);
        dataObject.put("peasantKind", peasantProfile.getPeasantKind());
        dataObject.put("peasantFamilyMinimalVital", wpsStart.config.getIntProperty("pfagent.minimalVital"));
        dataObject.put("peasantFamilyLandAlias", peasantProfile.getPeasantFamilyLandAlias());
        dataObject.put("currentActivity", currentPeasantActivityType);
        dataObject.put("farm", peasantProfile.getFarmName());
        dataObject.put("cropSize", peasantProfile.getCropSize());
        dataObject.put("loanAmountToPay", peasantProfile.getLoanAmountToPay());
        dataObject.put("tools", peasantProfile.getTools());
        dataObject.put("seeds", peasantProfile.getSeeds());
        dataObject.put("waterAvailable", peasantProfile.getWaterAvailable());
        dataObject.put("pesticidesAvailable", peasantProfile.getPesticidesAvailable());
        dataObject.put("totalHarvestedWeight", peasantProfile.getTotalHarvestedWeight());
        dataObject.put("contractor", getContractor());
        dataObject.put("daysToWorkForOther", getDaysToWorkForOther());
        dataObject.put("peasantFamilyHelper", getPeasantFamilyHelper());
        dataObject.put("waitStatus", isWaiting());
        dataObject.put("haveEmotions", isHaveEmotions());

        if (!getAssignedLands().isEmpty()) {
            dataObject.put("assignedLands", getAssignedLands());
        } else {
            dataObject.put("assignedLands", Collections.emptyList());
        }

        try {
            List<EmotionAxis> emotions = this.getEmotionsListCopy();
            emotions.forEach(emotion -> {
                dataObject.put(emotion.toString(), emotion.getCurrentValue());
            });
        } catch (Exception e) {
            dataObject.put("emotions", 0);
        }

        JSONObject finalDataObject = new JSONObject();
        finalDataObject.put("name", peasantProfile.getPeasantFamilyAlias());
        finalDataObject.put("state", dataObject.toString());

        finalDataObject.put("taskLog", getOrderedTasksByDateJson());

        return finalDataObject.toString();
    }

    public Map<String, Set<String>> getOrderedTasksByDateJson() {
        Map<LocalDate, Set<String>> sortedTasks = new TreeMap<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        // Convertir y ordenar
        taskLog.forEach((dateString, tasks) -> {
            LocalDate date = LocalDate.parse(dateString, formatter);
            sortedTasks.put(date, tasks);
        });

        // Convertir de vuelta a String y crear JSON
        Map<String, Set<String>> finalData = new LinkedHashMap<>();
        sortedTasks.forEach((date, tasks) -> {
            finalData.put(date.format(formatter), tasks);
        });

        return finalData;
    }

    public Map<String, Set<String>> getTasksBySpecificDate(String specificDate) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        LocalDate dateToFind = LocalDate.parse(specificDate, formatter);

        Map<String, Set<String>> tasksForSpecificDate = new LinkedHashMap<>();

        taskLog.forEach((dateString, tasks) -> {
            LocalDate date = LocalDate.parse(dateString, formatter);
            if (date.equals(dateToFind)) {
                tasksForSpecificDate.put(date.format(formatter), tasks);
            }
        });

        return tasksForSpecificDate;
    }

    public double getToPay() {
        return toPay;
    }

    public void setToPay(double toPay) {
        this.toPay = toPay;
    }

    public void discountToPay(double toPay) {
        this.toPay -= toPay;
    }

    public boolean isLoanDenied() {
        return loanDenied;
    }

    public void setLoanDenied(boolean loanDenied) {
        this.loanDenied = loanDenied;
    }

    public void decreaseHealth() {
        this.peasantProfile.decreaseHealth();
        /*if (this.getPeasantProfile().getHealth() <= 0) {
            try {
                wpsReport.debug("👻👻 murió agente " + this.peasantProfile.getPeasantFamilyAlias() + " 👻👻", this.peasantProfile.getPeasantFamilyAlias());
                AdmBESA adm = AdmBESA.getInstance();
                AgHandlerBESA agHandler = adm.getHandlerByAlias(this.peasantProfile.getPeasantFamilyAlias());
                adm.killAgent(agHandler.getAgId(), wpsStart.PASSWD);
                this.processEmotionalEvent(
                        new EmotionalEvent("FAMILY", "STARVING", "FOOD")
                );
            } catch (ExceptionBESA ex) {
                wpsReport.error(ex, this.peasantProfile.getPeasantFamilyAlias());
            }
        }*/
    }

    public boolean isPlantingSeason() {
        return DateHelper.getMonthFromStringDate(getInternalCurrentDate()) == 0 ||
                DateHelper.getMonthFromStringDate(getInternalCurrentDate()) == 3 ||
                DateHelper.getMonthFromStringDate(getInternalCurrentDate()) == 6 ||
                DateHelper.getMonthFromStringDate(getInternalCurrentDate()) == 8;
    }

    public int getDaysToWorkForOther() {
        return daysToWorkForOther;
    }

    public void setDaysToWorkForOther(int daysToWorkForOther) {
        this.daysToWorkForOther = daysToWorkForOther;
    }

    public void decreaseDaysToWorkForOther() {
        this.daysToWorkForOther = this.daysToWorkForOther - 1;
    }

    public String getPeasantFamilyHelper() {
        return peasantFamilyHelper;
    }

    public void setPeasantFamilyHelper(String peasantFamilyHelper) {
        this.peasantFamilyHelper = peasantFamilyHelper;
    }

    public String getAlias() {
        return peasantProfile.getPeasantFamilyAlias();
    }

    public synchronized String toCSV() {
        StringBuilder csvData = new StringBuilder();

        try {
            List<EmotionAxis> emotions = this.getEmotionsListCopy();
            emotions.forEach(emotion -> {
                csvData.append(getOrDefault(emotion.getCurrentValue())).append(',');
            });
        } catch (Exception e) {
            //csvData.append("NONE").append(',');
        }

        // Agregar los datos
        csvData.append(getOrDefault(peasantProfile.getMoney())).append(',')
                .append(getOrDefault(peasantProfile.getHealth())).append(',')
                .append(getOrDefault(currentSeason)).append(',')
                .append(getOrDefault(robberyAccount)).append(',')
                .append(getOrDefault(peasantProfile.getPurpose())).append(',')
                .append(getOrDefault(peasantProfile.getPeasantFamilyAffinity())).append(',')
                .append(getOrDefault(peasantProfile.getPeasantLeisureAffinity())).append(',')
                .append(getOrDefault(peasantProfile.getPeasantFriendsAffinity())).append(',')
                .append(getOrDefault(currentPeasantLeisureType)).append(',')
                .append(getOrDefault(currentResourceNeededType)).append(',')
                .append(getOrDefault(currentDay)).append(',')
                .append(getOrDefault(internalCurrentDate)).append(',')
                .append(getOrDefault(toPay)).append(',')
                .append(getOrDefault(peasantProfile.getPeasantKind())).append(',')
                .append(getOrDefault(wpsStart.config.getIntProperty("pfagent.minimalVital"))).append(',')
                .append(getOrDefault(peasantProfile.getPeasantFamilyLandAlias())).append(',')
                .append(getOrDefault(currentPeasantActivityType)).append(',')
                .append(getOrDefault(peasantProfile.getFarmName())).append(',')
                .append(getOrDefault(peasantProfile.getLoanAmountToPay())).append(',')
                .append(getOrDefault(peasantProfile.getTools())).append(',')
                .append(getOrDefault(peasantProfile.getSeeds())).append(',')
                .append(getOrDefault(peasantProfile.getWaterAvailable())).append(',')
                .append(getOrDefault(peasantProfile.getPesticidesAvailable())).append(',')
                .append(getOrDefault(peasantProfile.getHarvestedWeight())).append(',')
                .append(getOrDefault(peasantProfile.getTotalHarvestedWeight())).append(',')
                .append(getOrDefault(getContractor())).append(',')
                .append(getOrDefault(getDaysToWorkForOther())).append(',')
                .append(getOrDefault(getAlias())).append(',')
                .append(getOrDefault(isHaveEmotions())).append(',')
                .append(getOrDefault(getPeasantFamilyHelper())).append(',')
                .append(getOrDefault(isHaveEmotions()));

        //csvData.append('\n');
        return csvData.toString();
    }

    private String getOrDefault(Object value) {
        if (value == null) {
            return "NONE";
        } else if (value == "") {
            return "NONE";
        } else {
            return value.toString();
        }
    }

    public void setWait(boolean waitStatus) {
        this.wait = waitStatus;
    }

    public boolean isWaiting() {
        return this.wait;
    }

    public String getCurrentCropName() {
        String[] sellable = {"rice", "roots", "maiz", "frijol", "cafe", "platano"};
        String best = "roots";
        int bestPrice = 0;
        for (String crop : sellable) {
            FarmingResource r = priceList.get(crop);
            if (r != null && r.getCost() > bestPrice) {
                bestPrice = r.getCost();
                best = crop;
            }
        }
        return best;
    }

    public void setUpdatePriceList(boolean updatePriceList) {
        this.updatePriceList = updatePriceList;
    }

    public boolean isUpdatePriceList() {
        return updatePriceList;
    }

    public boolean isAskedForCollaboration() {
        return askedForCollaboration;
    }

    public void setAskedForCollaboration(boolean collaboration) {
        this.askedForCollaboration = collaboration;
    }

    public void changePersonalityBase(float value) {
        List<EmotionAxis> emotions = this.emotionalState.getEmotions();
        for (EmotionAxis emotion : emotions) {
            emotion.increaseBaseValue(value);
        }
    }

    public void changeHappinessBase(float value) {
        List<EmotionAxis> emotions = this.emotionalState.getEmotions();
        for (EmotionAxis emotion : emotions) {
            if (emotion.toString().equals("Happiness/Sadness")) {
                emotion.increaseBaseValue(value);
            }
        }
    }

    public float getPersonality() {
        return (float) personality;
    }

    public void setPersonality(Double personality) {
        this.personality = personality;
    }
    public GoalEngine getGoalEngine() {
        return goalEngine;
    }

    public void setGoalEngine(GoalEngine goalEngine) {
        this.goalEngine = goalEngine;
    }

    // Transient bindings shared across DeclarativeTask steps within one plan execution.
    private transient Map<String, Object> planBindings = new HashMap<>();

    public Map<String, Object> getPlanBindings() {
        if (planBindings == null) planBindings = new HashMap<>();
        return planBindings;
    }

    public void clearPlanBindings() {
        planBindings = new HashMap<>();
    }
}

