package org.wpsim.AgroEcosystem.layer.crop.cell.cafe;

import org.wpsim.AgroEcosystem.Helper.Soil;
import org.wpsim.AgroEcosystem.layer.crop.cell.CropCell;
import org.wpsim.AgroEcosystem.layer.disease.DiseaseCell;

/**
 * Cafe (coffee) crop cell — PERENNIAL, Kc FAO-56 Colombia cafetera.
 * Kc_ini=0.90, Kc_mid=0.95, Kc_end=0.95 (evergreen canopy)
 * GDD_mid=3000, GDD_end=6500, Soil=LOAM, root=1.5m, p=0.40
 * After harvest the AgroEcosystem agent resets GDD and continues — it is never killed.
 */
public class CafeCell extends CropCell<CafeCellState> {

    private String id;

    public CafeCell(
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
