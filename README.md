# Worklog - 班次記錄器 / Shift Tracker

<div align="center">

**簡潔強大的工時與薪資追蹤工具**  
**A simple yet powerful work hours and wage tracking app**

[繁體中文](#繁體中文) | [English](#english)

</div>

---

## 繁體中文

### 📱 功能總覽

#### 核心功能
- **班次管理** - 新增、編輯、複製、刪除班次記錄
- **工時計算** - 自動計算有薪工時（扣除休息時間）
- **薪資計算** - 根據時薪自動計算薪資
- **年假追蹤** - 追蹤年假獲得與使用，顯示結餘

#### 檢視模式
- **列表檢視** - 傳統列表方式顯示班次
- **月曆檢視** - 月曆格式查看整月班次分佈
- **篩選功能** - 支援全部 / 週 / 月 / 年篩選

#### 照片附件
- **拍照上傳** - 直接拍攝工時單或相關文件
- **相簿選擇** - 從相簿選擇現有照片
- **照片預覽** - 在列表和月曆中快速查看照片

#### 資料管理
- **CSV 匯出** - 將班次資料匯出為 CSV 檔案
- **CSV 匯入** - 從 CSV 檔案匯入班次資料
- **本地儲存** - 資料安全儲存在裝置上

#### 使用者體驗
- **滑動切換** - 左右滑動底部區域切換月份
- **觸覺回饋** - 按鈕操作提供震動回饋
- **雙語介面** - 支援繁體中文 / English
- **主題切換** - 淺色 / 深色主題

#### 進階功能
- **英國稅務估算** - 自動估算 Tax, N.I., Pension（可選）
- **多日新增** - 一次新增多天的相同班次
- **快速日期選擇** - 點選星期幾快速選擇同週班次
- **一週的第一天** - 可設定週日或週一為一週的第一天

#### 提醒與計時器
- **上班提醒** - 設定上班前 1 小時 / 30 分鐘提醒通知
- **午休計時器** - 60 / 30 分鐘快速計時，支援背景運作
- **提前提醒** - 計時結束前 20 秒提醒準備打卡

---

### 🛠️ 技術棧

- **Frontend:** React 19, TypeScript
- **Styling:** TailwindCSS 4
- **Mobile:** Capacitor 8 (Android)
- **Date Handling:** date-fns
- **Icons:** Lucide React

---

### 📋 安裝與執行

#### 環境需求
- Node.js 18+
- Android Studio (for Android build)

#### 本地開發

```bash
# 安裝依賴
npm install

# 開發模式
npm run dev

# 建置生產版本
npm run build

# Android 建置
npx cap sync android
cd android && gradle assembleDebug
```

#### 安裝到 Android 裝置

```bash
# 建置 APK
cd android && gradle assembleDebug

# 安裝到連接的裝置
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

### 📸 使用說明

#### 新增班次
1. 點擊底部 **+** 按鈕
2. 選擇日期（可多選）
3. 設定開始/結束時間
4. 輸入休息時間（無薪）
5. 確認時薪
6. 可選擇拍照或從相簿選擇照片
7. 儲存

#### 查看統計
- **底部區域** 顯示當前篩選期間的總工時與薪資
- **年假結餘** 顯示累計年假時數

#### 切換月份
- 點擊 **<** / **>** 按鈕
- 或在底部區域 **左右滑動**

#### 設定上班提醒
1. 新增或編輯班次
2. 在「提醒」區塊勾選 1 小時前 / 30 分鐘前
3. 儲存後，系統會在指定時間發送通知

#### 使用午休計時器
1. 點擊底部橘色計時器按鈕
2. 選擇 60 分鐘或 30 分鐘
3. 點擊開始
4. 即使切換到其他 App（如 YouTube），計時仍會在背景運作
5. 結束前 20 秒會收到「準備打卡」通知
6. 計時結束會收到「午休結束」通知

---

## English

### 📱 Features Overview

#### Core Features
- **Shift Management** - Add, edit, duplicate, and delete shift records
- **Hours Calculation** - Automatic paid hours calculation (minus break time)
- **Wage Calculation** - Automatic wage calculation based on hourly rate
- **Annual Leave Tracking** - Track earned and used annual leave with balance

#### View Modes
- **List View** - Traditional list format for shifts
- **Calendar View** - Monthly calendar format to see shift distribution
- **Filtering** - Support for All / Week / Month / Year filters

#### Photo Attachments
- **Take Photo** - Directly capture timesheet or related documents
- **Choose from Gallery** - Select existing photos from album
- **Photo Preview** - Quick view photos in list and calendar views

#### Data Management
- **CSV Export** - Export shifts to CSV file
- **CSV Import** - Import shifts from CSV file
- **Local Storage** - Data securely stored on device

#### User Experience
- **Swipe Navigation** - Swipe left/right on bottom area to change month
- **Haptic Feedback** - Vibration feedback on button actions
- **Bilingual Interface** - Support for 繁體中文 / English
- **Theme Toggle** - Light / Dark theme

#### Advanced Features
- **UK Tax Estimation** - Auto estimate Tax, N.I., Pension (optional)
- **Multi-day Entry** - Add same shift for multiple days at once
- **Quick Date Selection** - Click weekday to quickly select same week shifts
- **First Day of Week** - Customize whether week starts on Sunday or Monday

#### Reminders & Timer
- **Work Reminders** - Set notifications 1 hour / 30 min before shift starts
- **Break Timer** - 60 / 30 min quick timer with background support
- **Early Warning** - 20 seconds advance notice before timer ends

---

### 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript
- **Styling:** TailwindCSS 4
- **Mobile:** Capacitor 8 (Android)
- **Date Handling:** date-fns
- **Icons:** Lucide React

---

### 📋 Installation & Running

#### Requirements
- Node.js 18+
- Android Studio (for Android build)

#### Local Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build production version
npm run build

# Android build
npx cap sync android
cd android && gradle assembleDebug
```

#### Install to Android Device

```bash
# Build APK
cd android && gradle assembleDebug

# Install to connected device
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

### 📸 Usage Guide

#### Add Shift
1. Tap the **+** button at bottom
2. Select date(s) (multiple selection supported)
3. Set start/end time
4. Enter break time (unpaid)
5. Confirm hourly wage
6. Optionally take photo or choose from gallery
7. Save

#### View Statistics
- **Bottom area** shows total hours and wages for current filter period
- **Leave Balance** shows accumulated annual leave hours

#### Change Month
- Tap **<** / **>** buttons
- Or **swipe left/right** on the bottom area

#### Set Work Reminders
1. Add or edit a shift
2. In the "Reminders" section, check 1 hour before / 30 min before
3. After saving, notifications will be sent at the specified times

#### Use Break Timer
1. Tap the orange timer button at the bottom
2. Select 60 minutes or 30 minutes
3. Tap Start
4. Timer runs in background even when switching to other apps (e.g., YouTube)
5. 20 seconds before end, you'll receive a "Get Ready" notification
6. When timer ends, you'll receive a "Break Ended" notification

---

## License

MIT License - feel free to use and modify as needed.

---

<div align="center">

**Made with ❤️ for shift workers everywhere**

</div>
