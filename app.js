const { app, BrowserWindow } = require("electron");
const path = require("path");

const createWindow = () => {
  const win = new BrowserWindow({
    width: 600,
    height: 250,
    webPreferences: {
      // 보안 정책 해제
      webSecurity: false,
      // node.js 기능 사용
      nodeIntegration: true,
      contextIsolation: false,
    },
    //사이즈 변경 불가
    resizable: false,
    icon: path.join(__dirname, "build/icon/1024x1024.png"),
  });

  win.loadFile("index.html");
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
