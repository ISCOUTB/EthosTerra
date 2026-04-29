package org.wpsim.AgroEcosystem.layer.crop.cell.platano;

import org.wpsim.AgroEcosystem.Helper.Soil;
import org.wpsim.AgroEcosystem.layer.crop.cell.CropCell;
import org.wpsim.AgroEcosystem.layer.disease.DiseaseCell;

/**
 * Platano (plantain/banana) crop cell — PERENNIAL, Kc FAO-56 tropical Colombia.
 * Kc_ini=0.50, Kc_mid=1.10, Kc_end=1.00 (persistent canopy, ratoon system)
 * GDD_mid=1200, GDD_end=2800, Soil=LOAM, root=0.5m, p=0.35
 * After harvest the AgroEcosystem agent resets GDD and continues — it is never killed.
 */
public class PlatanoCell extends CropCell<PlatanoCellState> {

    private String id;

    public PlatanoCell(
            double cropFactor_ini,
            double cropFactor_mid,
            double cropFactor_end,
            double degreeDays_mid,
            double degreeDays_end,
            int cropArea,
            double maximumRootDepth,
            double depletionFraction,
            Soil soilType,
            boolean isActive,
            DiseaseCell diseaseCell,
            String id,
            String agentPeasantId) {
        super(cropFactor_ini, cropFactor_mid, cropFactor_end, degreeDays_mid, degreeDays_end,
                cropArea, maximumRootDepth, depletionFraction, soilType, isActive, diseaseCell, agentPeasantId);
        this.id = id;
    }

    @Override
    public String getId() {
        return this.id;
    }

    @Override
    public boolean isPerennial() {
        return true;
    }
}
