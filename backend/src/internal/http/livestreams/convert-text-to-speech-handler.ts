import { RequestHandler } from "express";
import { getIO } from "@internal/livestreams/socket";
import { Context } from "./routes";

export const convertTextToSpeechHandler = (ctx: Context): RequestHandler => {
  return async (req, res) => {
    try {
      const { text, streamId } = req.body;
      const audioBuffer = await ctx.livestreamService.convertTextToSpeech(text);

      // Emitir el audio como base64 y el texto
      const audioBase64 = audioBuffer.toString("base64");
      const io = getIO();
      io.to(streamId).emit("new-audio", {
        audio: audioBase64,
        text: text, // Agregamos el texto al evento
      });

      res.json({ success: true, data: audioBase64 });
    } catch (error) {
      console.error("Error en text-to-speech:", error);
      res.status(500).json({ error: "Error al convertir texto a voz" });
    }
  };
};
