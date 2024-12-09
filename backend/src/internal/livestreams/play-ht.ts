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

  public async convertTextToSpeech(text: string): Promise<Buffer> {
    try {
      const fileName = `${uuidv4()}.mp3`;
      const filePath = path.join(this.tempDir, fileName);

      const stream = await PlayHT.stream(text, {
        voiceEngine: "PlayHT1.0",
        voiceId:
          "s3://mockingbird-prod/agent_47_carmelo_pampillonio_58e796e1-0b87-4f3e-8b36-7def6d65ce66/voices/speaker/manifest.json",
      });

      // Guardar el audio y convertirlo a Buffer
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));

      await new Promise((resolve, reject) => {
        stream.on("end", resolve);
        stream.on("error", reject);
      });

      // Limpiar archivo temporal si se creó
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error("Error en PlayHT service:", error);
      throw new Error("Error al convertir texto a voz");
    }
  }

  public async convertTextToSpeechUrl(text: string): Promise<any> {
    const url = await PlayHT.generate(text);

    console.log(url);

    return url;
  }
}
