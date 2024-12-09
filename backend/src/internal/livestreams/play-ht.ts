import * as PlayHT from "playht";

import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

export class PlayHtService {
  private readonly tempDir = path.join(process.cwd(), "temp");

  constructor() {
    // Inicializar PlayHT con las credenciales
    PlayHT.init({
      userId: "KeQqKrHv2JcpUQgHLLNptqfD9Tu1",
      apiKey: "196a520af9784b7d820aba4835909716",
    });

    // Crear directorio temporal si no existe
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  public async convertTextToSpeech(text: string): Promise<string> {
    try {
      const fileName = `${uuidv4()}.mp3`;
      const filePath = path.join(this.tempDir, fileName);

      const stream = await PlayHT.stream(text, {
        voiceEngine: "Play3.0-mini",
        // voiceId: "victor",
        // quality: "high",
      });

      // Crear write stream
      const fileStream = fs.createWriteStream(filePath);

      // Guardar el audio
      await new Promise((resolve, reject) => {
        stream.pipe(fileStream);
        stream.on("end", resolve);
        stream.on("error", reject);
      });

      return filePath;
    } catch (error) {
      console.error("Error en PlayHT service:", error);
      throw new Error("Error al convertir texto a voz");
    }
  }

  // Método para limpiar archivos temporales
  public cleanupTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error("Error al limpiar archivo temporal:", error);
    }
  }

  public async getAvailableVoices() {
    try {
      const voices = await PlayHT.listVoices();
      return voices;
    } catch (error) {
      console.error("Error al obtener voces disponibles:", error);
      throw new Error("Error al obtener voces disponibles");
    }
  }
}
