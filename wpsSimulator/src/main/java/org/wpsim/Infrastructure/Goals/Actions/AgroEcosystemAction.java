package org.wpsim.Infrastructure.Goals.Actions;

import BESA.Emotional.EmotionalEvent;
import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.System.AdmBESA;
import org.wpsim.AgroEcosystem.Guards.AgroEcosystemGuard;
import org.wpsim.AgroEcosystem.Messages.AgroEcosystemMessage;
import org.wpsim.AgroEcosystem.Messages.AgroEcosystemMessageType;
import org.wpsim.CivicAuthority.Data.LandInfo;
import org.wpsim.PeasantFamily.Data.PeasantFamilyBelieves;
import org.wpsim.PeasantFamily.Data.Utils.SeasonType;
import org.wpsim.PeasantFamily.Data.Utils.TimeConsumedBy;
import org.wpsim.ViewerLens.Util.wpsReport;

/**
 * Generalized action for AgroEcosystem operations (Prepare, Plant, Harvest, Care).
 * Replaces the complex legacy Java tasks for Level 3 Development.
 */
public class AgroEcosystemAction implements PrimitiveAction {

    @Override
    public boolean execute(ActionContext context) {
        PeasantFamilyBelieves believes = context.getBeliefs();
        String operation = (String) context.getParameter("operation");
        
        if (operation == null) return false;

        switch (operation.toUpperCase()) {
            case "PREPARE":
                return handlePrepare(believes);
            case "PLANT":
                return handlePlant(believes);
            case "HARVEST":
                return handleHarvest(believes);
            case "SELL":
                return handleSell(believes);
            case "DEFOREST":
                return handleDeforest(believes);
            case "CHECK":
                return handleCheck(believes);
            case "IRRIGATE":
                return handleIrrigate(believes);
            case "PESTICIDE":
                return handlePesticide(believes);
            default:
                wpsReport.warn("Unknown AgroEcosystem operation: " + operation, believes.getAlias());
                return false;
        }
    }

    private boolean handlePrepare(PeasantFamilyBelieves believes) {
        for (LandInfo land : believes.getAssignedLands()) {
            if (land.getKind().equals("land") && land.getCurrentSeason() == SeasonType.NONE) {
                int totalRequired = 3360; // 56 hours * 60 min
                land.setTotalRequiredTime(totalRequired);
                
                int factor = believes.getPeasantFamilyHelper().isBlank() ? 1 : 2;
                int workTime = TimeConsumedBy.PrepareLandTask.getTime();
                
                land.increaseElapsedWorkTime(workTime * factor);
                believes.useTime(workTime);
                
                if (land.elapsedWorkTimeIsDone()) {
                    believes.getPeasantProfile().increaseSeedsNeeded(1);
                    land.setCurrentSeason(SeasonType.PLANTING);
                    land.resetElapsedWorkTime();
                    wpsReport.info("Land prepared for planting: " + land.getLandName(), believes.getAlias());
                }
                return true;
            }
        }
        return false;
    }

    private boolean handlePlant(PeasantFamilyBelieves believes) {
        for (LandInfo land : believes.getAssignedLands()) {
            if (land.getCurrentSeason() == SeasonType.PLANTING) {
                int workTime = TimeConsumedBy.PlantCropTask.getTime();
                land.increaseElapsedWorkTime(workTime);
                believes.useTime(workTime);

                if (land.elapsedWorkTimeIsDone()) {
                    // Legacy logic: Agent creation happens here usually
                    // For now, we transition to GROWING
                    land.setCurrentSeason(SeasonType.GROWING);
                    land.resetElapsedWorkTime();
                    wpsReport.info("Crop planted: " + land.getLandName(), believes.getAlias());
                }
                return true;
            }
        }
        return false;
    }

    private boolean handleHarvest(PeasantFamilyBelieves believes) {
        for (LandInfo land : believes.getAssignedLands()) {
            if (land.getCurrentSeason() == SeasonType.HARVEST) {
                int workTime = TimeConsumedBy.HarvestCropsTask.getTime();
                land.increaseElapsedWorkTime(workTime);
                believes.useTime(workTime);

                if (land.elapsedWorkTimeIsDone()) {
                    land.setCurrentSeason(SeasonType.SELL_CROP);
                    land.resetElapsedWorkTime();
                    // Weight is usually set by AgroEcosystem agent via guard
                    wpsReport.info("Crop harvested, ready to sell: " + land.getLandName(), believes.getAlias());
                }
                return true;
            }
        }
        return false;
    }

    private boolean handleSell(PeasantFamilyBelieves believes) {
        for (LandInfo land : believes.getAssignedLands()) {
            if (land.getCurrentSeason() == SeasonType.SELL_CROP) {
                try {
                    // Send message to MarketPlace
                    org.wpsim.MarketPlace.Data.MarketPlaceMessage msg = new org.wpsim.MarketPlace.Data.MarketPlaceMessage(
                            org.wpsim.MarketPlace.Data.MarketPlaceMessageType.SELL_CROP,
                            believes.getPeasantProfile().getPeasantFamilyAlias(),
                            believes.getPeasantProfile().getHarvestedWeight(),
                            land.getCropName(),
                            believes.getInternalCurrentDate()
                    );
                    
                    AdmBESA.getInstance().getHandlerByAlias(
                            org.wpsim.WellProdSim.wpsStart.config.getMarketAgentName()
                    ).sendEvent(new EventBESA(org.wpsim.MarketPlace.Guards.MarketPlaceGuard.class.getName(), msg));

                    // Lifecycle management
                    java.util.Set<String> perennialCrops = new java.util.HashSet<>(java.util.Arrays.asList("cafe", "platano"));
                    if (perennialCrops.contains(land.getCropName())) {
                        land.setCurrentSeason(SeasonType.GROWING);
                    } else {
                        // Kill annual agent
                        try {
                            String agID = AdmBESA.getInstance().getHandlerByAlias(land.getLandName()).getAgId();
                            AdmBESA.getInstance().killAgent(agID, org.wpsim.WellProdSim.wpsStart.config.getDoubleProperty("control.passwd"));
                        } catch (Exception e) {
                            // Agent might already be gone
                        }
                        land.setCurrentSeason(SeasonType.NONE);
                    }

                    believes.getPeasantProfile().setHarvestedWeight(0);
                    believes.setUpdatePriceList(true);
                    believes.useTime(TimeConsumedBy.HarvestCropsTask.getTime()); // Selling also takes time
                    return true;
                } catch (Exception e) {
                    BESA.Log.ReportBESA.error(e);
                }
            }
        }
        return false;
    }

    private boolean handleDeforest(PeasantFamilyBelieves believes) {
        for (LandInfo land : believes.getAssignedLands()) {
            if ("forest".equals(land.getKind())) {
                land.setTotalRequiredTime(7200); // 120 hours * 60 min
                int factor = believes.getPeasantFamilyHelper().isBlank() ? 1 : 2;
                int workTime = TimeConsumedBy.DeforestingLandTask.getTime();
                
                land.increaseElapsedWorkTime(workTime * factor);
                believes.useTime(workTime);
                
                if (land.elapsedWorkTimeIsDone()) {
                    land.setKind("land");
                    land.resetElapsedWorkTime();
                    wpsReport.info("Land deforested: " + land.getLandName(), believes.getAlias());
                }
                return true;
            }
        }
        return false;
    }

    private boolean handleCheck(PeasantFamilyBelieves believes) {
        for (LandInfo land : believes.getAssignedLands()) {
            if (land.getCurrentSeason() == SeasonType.GROWING) {
                int workTime = TimeConsumedBy.CheckCropsTask.getTime();
                believes.useTime(workTime);
                try {
                    AdmBESA.getInstance().getHandlerByAlias(land.getLandName()).sendEvent(
                        new EventBESA(AgroEcosystemGuard.class.getName(),
                        new AgroEcosystemMessage(AgroEcosystemMessageType.CROP_INFORMATION, land.getCropName(), believes.getInternalCurrentDate(), land.getLandName()))
                    );
                    return true;
                } catch (Exception e) {
                    wpsReport.error(e, believes.getAlias());
                }
            }
        }
        return false;
    }

    private boolean handleIrrigate(PeasantFamilyBelieves believes) {
        for (LandInfo land : believes.getAssignedLands()) {
            if (land.getCurrentCropCareType().equals(org.wpsim.PeasantFamily.Data.Utils.CropCareType.IRRIGATION)) {
                int workTime = TimeConsumedBy.IrrigateCropsTask.getTime();
                believes.useTime(workTime);
                
                double waterUsed = believes.getPeasantProfile().getCropSizeHA() * 30;
                boolean hasWaterSource = believes.getAssignedLands().stream().anyMatch(l -> "water".equals(l.getKind()));
                if (hasWaterSource) waterUsed = 0;
                
                believes.getPeasantProfile().useWater((int) waterUsed);
                land.setCurrentCropCareType(org.wpsim.PeasantFamily.Data.Utils.CropCareType.NONE);
                
                try {
                    AdmBESA.getInstance().getHandlerByAlias(land.getLandName()).sendEvent(
                        new EventBESA(AgroEcosystemGuard.class.getName(),
                        new AgroEcosystemMessage(AgroEcosystemMessageType.CROP_IRRIGATION, land.getLandName(), believes.getInternalCurrentDate(), believes.getAlias()))
                    );
                    return true;
                } catch (Exception e) {
                    wpsReport.error(e, believes.getAlias());
                }
            }
        }
        return false;
    }

    private boolean handlePesticide(PeasantFamilyBelieves believes) {
        for (LandInfo land : believes.getAssignedLands()) {
            if (land.getCurrentSeason() == SeasonType.GROWING) {
                int workTime = TimeConsumedBy.ManagePestsTask.getTime();
                believes.useTime(workTime);
                try {
                    AdmBESA.getInstance().getHandlerByAlias(land.getLandName()).sendEvent(
                        new EventBESA(AgroEcosystemGuard.class.getName(),
                        new AgroEcosystemMessage(AgroEcosystemMessageType.CROP_PESTICIDE, land.getCropName(), believes.getInternalCurrentDate(), believes.getAlias()))
                    );
                    return true;
                } catch (Exception e) {
                    wpsReport.error(e, believes.getAlias());
                }
            }
        }
        return false;
    }
}
