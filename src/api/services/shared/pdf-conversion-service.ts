import fs from "fs/promises";
import axios from "axios";
import { PDF_CONVERSION_URL } from "@/config";

export class PdfConverterIntegration {
  #endpoint;

  constructor() {
    this.#endpoint = PDF_CONVERSION_URL;
  }

  async #upload(fileStream: Buffer) {
    if (!fileStream) {
      return false;
    }

    try {
      let res = await axios
        .request({
          url: this.#endpoint,
          method: "POST",
          headers: {
            "Content-Type": "multipart/form-data",
          },
          data: {
            files: fileStream,
          },
          responseType: "arraybuffer",
        })
        .catch((err) => {
          throw err;
        });

      if (res.status == 200) {
        return res.data;
      }
    } catch (err) {
      // console.error(err);
    }

    return false;
  }

  async convert(filepath: string) {
    try {
      let inputStream = await fs.readFile(filepath);
      let outputStream = await this.#upload(inputStream);
      return outputStream;
    } catch (err) {
      // console.error(err);
    }

    return false;
  }

  async convertStream(inputStream: Buffer) {
    let outputStream = this.#upload(inputStream);
    return outputStream;
  }

  async convertTo(inputFilePath: string, outputFilePath: string) {
    try {
      let inputStream = await fs.readFile(inputFilePath);
      let outputStream = await this.#upload(inputStream);
      await fs.writeFile(outputFilePath, outputStream);
      return true;
    } catch (err) {
      // console.error(err);
    }

    return false;
  }
}
