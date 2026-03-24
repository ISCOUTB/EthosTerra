package org.wpsim.AgroEcosystem.layer.crop.cell.frijol;

import org.wpsim.AgroEcosystem.Helper.Soil;
import org.wpsim.AgroEcosystem.layer.crop.cell.CropCell;
import org.wpsim.AgroEcosystem.layer.disease.DiseaseCell;

/**
 * Frijol (bean) crop cell — annual, Kc FAO-56 tropical Colombia.
 * Kc_ini=0.35, Kc_mid=1.15, Kc_end=0.35
 * GDD_mid=600, GDD_end=1400, Soil=CLAY, root=0.6m, p=0.45
 */
public class FrijolCell extends CropCell<FrijolCellState> {

    private String id;

    public FrijolCell(
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
}
