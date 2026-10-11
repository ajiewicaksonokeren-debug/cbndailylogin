// Messages to the native CBN app. The app's stack is unknown, so try the common webview bridges.
export type AppMsg =
  | { type: 'close' } // close this webview
  | { type: 'open'; path: string } // open another check-in page, e.g. /app
  | { type: 'openPopup' } // show /app/popup as an overlay
  | { type: 'claimed'; total: number; streak: number }; // refresh native Beranda card/badges

export function postToApp(msg: AppMsg): boolean {
  const w = window as any, s = JSON.stringify(msg);
  if (w.ReactNativeWebView) w.ReactNativeWebView.postMessage(s);
  else if (w.webkit?.messageHandlers?.cbnCheckin) w.webkit.messageHandlers.cbnCheckin.postMessage(msg);
  else if (w.CbnCheckin?.postMessage) w.CbnCheckin.postMessage(s);
  else if (w.flutter_inappwebview?.callHandler) w.flutter_inappwebview.callHandler('cbnCheckin', msg);
  else if (window.parent !== window) window.parent.postMessage({ cbnCheckin: msg }, '*');
  else return false;
  return true;
}
