# Rotalog — Shift & Wage Tracker

<div align="center">

**Version:** 1.8.3 | **Platform:** Android (Google Play) · iOS (coming soon)

[![Latest Release](https://img.shields.io/github/v/release/long535/rotalog?label=Latest&color=4CAF50)](https://github.com/long535/rotalog/releases/latest)
[![Android APK](https://img.shields.io/badge/Download-APK-brightgreen)](https://github.com/long535/rotalog/releases/latest)

**A simple yet powerful app for tracking shift hours, wages, breaks, and leave — built for real shift workers.**

[English](#english) | [繁體中文](#繁體中文)

</div>

---

## English

### 📱 Features

#### Core Shift Management
- **Add / Edit / Duplicate / Delete** shifts with full control
- **Multi-date Entry** — add the same shift across multiple days at once
- **No accidental date pre-selection** — calendar opens blank, you choose the date intentionally
- **Paid Hours Calculation** — automatically deducts unpaid breaks from total hours
- **Wage Calculation** — real-time pay based on hourly rate

#### Smart Home Screen
- **Auto-scroll to Next Shift** — on launch or tapping Home, the list scrolls straight to your next upcoming shift with a brief highlight effect
- **Live Earning Banner** — during an active shift, displays real-time earnings (slot-machine style), countdown to end, and projected total

#### Calendar Page
- Full-screen **dedicated Calendar view** — tap a date to see its shifts, tap again to add
- Accessible from the bottom navigation as an independent page (not an overlay)

#### Mood Tracking
- Tap the shift icon directly on the Home screen to open an **iOS-style drum roller** emoji picker
- Select from 10 mood emojis: 😊 💪 😐 😓 🥱 😤 🤩 😌 🤒 😴
- Mood emoji replaces the briefcase icon on the shift card

#### Break & Timer System
- **Paid Coffee Breaks** — set count and duration per break, with optional reminders
- **Unpaid Lunch Break** — separate unpaid break deduction
- **Break Timer** — 60 / 30 min countdown with background operation, pause/resume
- **Early Warning** — notification 20 seconds before break ends

#### Reminders
- **Work Reminders** — 1 hour / 30 min before shift (system-level alarms, works when app is closed)
- **Coffee Break Reminders** — prompt to take your paid break at the right time

#### Leave & Sick Leave
- **Annual Leave Tracking** — earned, used, and balance displayed as progress bars
- **Sick Leave Management** — log unpaid sick hours; deducted automatically from wages
- **Annual Leave Shifts** — mark shifts as annual leave for accurate accrual

#### Statistics Dashboard
- Weekly / Monthly / Yearly / Custom date range views
- Bar charts for hours and earnings trends (pure CSS/SVG, no libraries)
- Key metrics: daily averages, longest shift, total earnings
- Job breakdown: hours and pay by job with comparison charts

#### Multiple Jobs
- Add unlimited job profiles, each with its own hourly wage, color, and break settings
- Filter and group the home list by job
- Visual job color indicators on every shift card

#### Data Management
- **CSV Export** — export all records for spreadsheets
- **CSV Import** — import with conflict detection (Skip / Overwrite / Add All)
- **Local Storage Only** — all data stays on your device, never sent to any server

#### Overlap Detection
- Warns if a new shift overlaps with an existing one, with a "Save Anyway / Go Back" prompt

#### UK Tax Estimation *(optional)*
- Estimates Tax, National Insurance, and Pension contribution

#### UX Details
- Light / Dark theme
- Bilingual: English / 繁體中文
- Haptic feedback
- Swipe left/right to navigate months

---

### 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Styling | TailwindCSS 4 |
| Mobile | Capacitor 8 |
| Date | date-fns |
| Icons | Lucide React |
| State | Zustand |
| Build | Vite |

---

### 📋 Development Setup

#### Requirements
- Node.js 18+
- Android Studio (for Android)
- Xcode 15+ on macOS (for iOS — see [iOS Setup](#ios-setup))

#### Local Development

```bash
# Install dependencies
npm install

# Dev server
npm run dev

# Production build
npm run build

# Sync to Android / iOS
npx cap sync android
npx cap sync ios
```

#### Android Build

```bash
# Release APK
cd android && ./gradlew assembleRelease

# Release AAB (for Google Play)
cd android && ./gradlew bundleRelease
```

#### <a name="ios-setup"></a>iOS Setup (macOS required)

> **Prerequisites before moving to Mac:**

```bash
# 1. Install CocoaPods (on Mac)
sudo gem install cocoapods

# 2. Add iOS platform (if not already added)
npx cap add ios

# 3. Sync and open in Xcode
npx cap sync ios
npx cap open ios
```

**What to prepare before switching to Mac:**
1. Ensure the project is pushed to GitHub (latest commit on `main`)
2. Clone the repo on the Mac: `git clone https://github.com/long535/rotalog.git`
3. Run `npm install` on the Mac
4. Run `npm run build` then `npx cap sync ios`
5. Open `ios/App/App.xcworkspace` in Xcode (**not** `.xcodeproj`)
6. Set your **Apple Developer Team** in Xcode → Signing & Capabilities
7. Build and run on a connected iPhone or iOS Simulator

**Apple Developer Account required** for:
- Running on a real device (free account works for development)
- Submitting to the App Store (paid account: $99/yr)

---

### 📸 Screenshots

<img src="https://raw.githubusercontent.com/long535/rotalog/main/screenshot/1000068062.png" width="250" />
<img src="https://raw.githubusercontent.com/long535/rotalog/main/screenshot/1000068063.png" width="250" />

---

### 📥 Download

| Platform | Link |
|---|---|
| Android APK | [rotalog-v1.8.3.apk](https://github.com/long535/rotalog/releases/latest) |
| Google Play | Coming soon |
| iOS App Store | Coming soon |

---

## 繁體中文

### 📱 功能總覽

#### 核心班次管理
- **新增 / 編輯 / 複製 / 刪除**班次，完整掌控記錄
- **多日新增** — 一次將相同班次加入多天
- **不自動選擇日期** — 月曆開啟時無預設選取，防止錯誤輸入
- **有薪工時計算** — 自動扣除無薪休息時間
- **薪資計算** — 根據時薪即時計算

#### 智慧首頁
- **自動定位下個班次** — 打開 APP 或點擊 Home，列表自動滾動到你的下一個班次並短暫高亮提示
- **即時薪資橫幅** — 班次進行中，頂部如老虎機般顯示即時收入、剩餘時間及預計總收入

#### 月曆頁面
- 獨立的**全螢幕月曆視圖** — 不再浮疊在列表上
- 點選日期可查看當日班次，再次點擊可快速新增

#### 心情記錄
- 在主畫面直接 tap 班次圖示，彈出 **iOS 鼓輪式** Emoji 選取器
- 十種心情：😊 💪 😐 😓 🥱 😤 🤩 😌 🤒 😴
- 選定的 Emoji 會在班次卡上取代行李圖示顯示

#### 休息與計時器
- **帶薪咖啡 Break** — 可設定次數與時長，附提醒功能
- **無薪午休** — 獨立設定，自動從工時扣除
- **休息計時器** — 60 / 30 分鐘倒數，支援背景運作及暫停/繼續
- **提前 20 秒提醒** — 休息結束前通知準備打卡

#### 提醒
- **上班提醒** — 班次前 1 小時 / 30 分鐘（系統鬧鐘，APP 關閉也能觸發）
- **咖啡 Break 提醒** — 提醒你準時去休息

#### 年假與病假
- **年假追蹤** — 獲得、使用與結餘以進度條顯示
- **病假管理** — 輸入無薪病假時數，自動從薪資扣除
- **年假班次** — 標記年假，精確計算假期累積

#### 統計儀表板
- 支援週 / 月 / 年 / 自訂時段
- 工時與薪資柱形圖（純 CSS/SVG）
- 關鍵指標：日均工時、最長班次、總收入
- 各工作佔比圖表

#### 多工作地點
- 無限新增工作，各自設定時薪、顏色與休息時間
- 首頁可依工作篩選或分組顯示

#### 資料管理
- **CSV 匯出** — 匯出全部記錄
- **CSV 匯入** — 自動偵測衝突（跳過 / 覆蓋 / 全部新增）
- **本地儲存** — 所有資料存於裝置，不上傳伺服器

#### 班次時間重疊偵測
- 新增班次時自動檢查重疊，彈出「仍然儲存 / 返回修改」提示

#### 英國稅務估算（可選）
- 自動估算 Tax、National Insurance、Pension

---

### 🛠️ 技術棧

| 層級 | 技術 |
|---|---|
| 框架 | React 19 + TypeScript |
| 樣式 | TailwindCSS 4 |
| 行動端 | Capacitor 8 |
| 日期 | date-fns |
| 圖示 | Lucide React |
| 狀態管理 | Zustand |
| 建置工具 | Vite |

---

### 📋 開發環境設定

#### 環境需求
- Node.js 18+
- Android Studio（Android 建置用）
- macOS + Xcode 15+（iOS 建置用，需搬移到 Mac）

#### 本地開發

```bash
# 安裝依賴
npm install

# 開發模式
npm run dev

# 建置生產版本
npm run build

# 同步到 Android / iOS
npx cap sync android
npx cap sync ios
```

#### Android 建置

```bash
# Release APK
cd android && ./gradlew assembleRelease

# Release AAB（上傳 Google Play 用）
cd android && ./gradlew bundleRelease
```

#### iOS 建置（搬到 Mac 前的準備）

1. 確保 GitHub 上的 `main` 分支是最新版本
2. 在 Mac 上 `git clone https://github.com/long535/rotalog.git`
3. 執行 `npm install` 和 `npm run build`
4. 執行 `npx cap add ios`（若尚未加入）然後 `npx cap sync ios`
5. 用 Xcode 開啟 `ios/App/App.xcworkspace`
6. 在 Xcode 的「Signing & Capabilities」設定你的 Apple Developer Team
7. 連接 iPhone 或使用模擬器進行建置與測試

---

## License

MIT License — free to use and modify.

---

<div align="center">

**Made with ❤️ for shift workers everywhere**

</div>
