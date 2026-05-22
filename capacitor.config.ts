import { CapacitorConfig } from '@capacitor/cli';

// ══════════════════════════════════════════════════════════════
//  CẤU HÌNH BẢO MẬT
//  - server: KHÔNG cho phép kết nối internet
//  - allowMixedContent: false → chặn HTTP
//  - Không khai báo permission nào trong manifest
// ══════════════════════════════════════════════════════════════
const config: CapacitorConfig = {
  appId: 'com.behocvui.app',
  appName: 'Bé Học Vui',
  webDir: 'dist',
  bundledWebRuntime: false,

  // Bảo mật: chỉ chạy file local, không gọi internet
  server: {
    androidScheme: 'https',
    allowNavigation: [],         // ❌ Không cho phép navigate ra URL ngoài
    cleartextTraffic: false,     // ❌ Chặn HTTP không bảo mật
  },

  android: {
    allowMixedContent: false,    // ❌ Không cho HTTP + HTTPS lẫn lộn
    captureInput: false,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#667eea',
  },

  plugins: {
    // Không thêm plugin nào → không xin quyền nào
  },
};

export default config;
