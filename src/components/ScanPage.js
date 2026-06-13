// Entrada por URL: /#/scan?need=mex:0 o /#/scan?give=mex:0
import { parseScanUrl } from '../data/TradeEncoder.js';
import { openStickerScanner } from './StickerScanner.js';

export function handleScanRoute(path) {
  const tradeData = parseScanUrl(path);
  openStickerScanner(tradeData || null);
}
