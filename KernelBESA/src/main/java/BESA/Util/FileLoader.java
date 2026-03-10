/**
 * ==========================================================================
 * __      __ _ __   ___  *    WellProdSim                                  *
 * \ \ /\ / /| '_ \ / __| *    @version 1.0                                 *
 *  \ V  V / | |_) |\__ \ *    @since 2023                                  *
 *   \_/\_/  | .__/ |___/ *                                                 *
 *           | |          *    @author Jairo Serrano                        *
 *           |_|          *    @author Enrique Gonzalez                     *
 * ==========================================================================
 * Social Simulator used to estimate productivity and well-being of peasant *
 * families. It is event oriented, high concurrency, heterogeneous time     *
 * management and emotional reasoning BDI.                                  *
 * ==========================================================================
 */
package BESA.Util;

import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

public class FileLoader {

    public static String readFile(String fileName) throws IOException {
        String data = readFileFromResources("resources/" + fileName);
        if (data != null) {
            return data;
        }

        data = readFileDirectly(fileName);
        if (data != null) {
            return data;
        }

        data = readFileFromClassloader(fileName);
        if (data != null) {
            return data;
        }
        throw new IOException("File not found in any location");
    }

    public static FileInputStream readFileToFileInputStream(String fileName) throws IOException {
        Path filePath = Paths.get("resources/" + fileName);
        if (Files.exists(filePath)) {
            return new FileInputStream(filePath.toFile());
        }

        filePath = Paths.get(fileName);
        if (Files.exists(filePath)) {
            return new FileInputStream(filePath.toFile());
        }
        throw new IOException("File not found in any location " + fileName);
    }

    private static String readFileDirectly(String fileName) {
        Path filePath = Paths.get(fileName);
        if (Files.exists(filePath)) {
            return readFromFile(filePath);
        }
        return null;
    }

    private static String readFileFromResources(String fileName) {
        URL resource = FileLoader.class.getResource(fileName);
        if (resource != null) {
            Path filePath = Paths.get(resource.getPath());
            if (Files.exists(filePath)) {
                return readFromFile(filePath);
            }
        }
        return null;
    }

    private static String readFileFromClassloader(String fileName) {
        InputStream in = FileLoader.class.getClassLoader().getResourceAsStream(fileName);
        if (in != null) {
            return readFromInputStream(in);
        }
        return null;
    }

    private static String readFromFile(Path filePath) {
        try {
            return Files.readString(filePath);
        } catch (IOException e) {
            return null;
        }
    }

    private static String readFromInputStream(InputStream in) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(in))) {
            StringBuilder data = new StringBuilder();
            String line;

            while ((line = reader.readLine()) != null) {
                data.append(line);
                data.append("\n");
            }
            return data.toString();
        } catch (IOException e) {
            return null;
        }
    }
}
