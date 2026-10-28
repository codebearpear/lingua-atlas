// Typen voor de kopie van myanmar-tools in deze map.

export declare class ZawgyiDetector {
  /**
   * De kans, van 0 tot 1, dat de tekst Zawgyi is in plaats van Unicode. Zonder
   * Birmaanse tekens is de uitkomst -Infinity.
   */
  getZawgyiProbability(input: string): number
}

export declare class ZawgyiConverter {
  zawgyiToUnicode(input: string): string
  unicodeToZawgyi(input: string): string
  normalizeZawgyi(input: string): string
}
