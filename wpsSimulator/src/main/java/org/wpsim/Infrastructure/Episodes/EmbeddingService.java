package org.wpsim.Infrastructure.Episodes;

import ai.djl.inference.Predictor;
import ai.djl.repository.zoo.Criteria;
import ai.djl.repository.zoo.ZooModel;
import ai.djl.training.util.ProgressBar;
import ai.djl.translate.TranslateException;
import ai.djl.huggingface.translator.TextEmbeddingTranslatorFactory;

import java.util.logging.Logger;

/**
 * Service for generating text embeddings locally using DJL and a pre-trained model.
 * Uses all-MiniLM-L6-v2 which produces 384-dimensional vectors.
 * Model loading is lazy: the download only happens on the first call to getEmbedding().
 */
public class EmbeddingService {
    private static final Logger logger = Logger.getLogger(EmbeddingService.class.getName());
    private static EmbeddingService instance;
    private ZooModel<String, float[]> model;
    private boolean modelLoadAttempted = false;

    private EmbeddingService() {}

    public static synchronized EmbeddingService getInstance() {
        if (instance == null) {
            instance = new EmbeddingService();
        }
        return instance;
    }

    private synchronized void ensureModelLoaded() {
        if (modelLoadAttempted) return;
        modelLoadAttempted = true;
        try {
            Criteria<String, float[]> criteria = Criteria.builder()
                    .setTypes(String.class, float[].class)
                    .optModelUrls("djl://ai.djl.huggingface.pytorch/sentence-transformers/all-MiniLM-L6-v2")
                    .optEngine("PyTorch")
                    .optTranslatorFactory(new TextEmbeddingTranslatorFactory())
                    .optProgress(new ProgressBar())
                    .build();
            this.model = criteria.loadModel();
            logger.info("Embedding model loaded successfully.");
        } catch (Exception e) {
            logger.severe("Failed to load embedding model: " + e.getMessage());
        }
    }

    /**
     * Generates an embedding for the given text.
     * Triggers model download on first call.
     *
     * @return 384-dimensional float vector, or null if the model failed to load.
     */
    public float[] getEmbedding(String text) {
        ensureModelLoaded();
        if (model == null) return null;
        try (Predictor<String, float[]> predictor = model.newPredictor()) {
            return predictor.predict(text);
        } catch (TranslateException e) {
            logger.warning("Error generating embedding: " + e.getMessage());
            return null;
        }
    }
}
