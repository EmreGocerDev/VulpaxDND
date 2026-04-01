; =============================================
; Vulpax DnD — Medieval Themed NSIS Installer
; =============================================

!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "LogicLib.nsh"

; ── Branding ──
!define MUI_ICON "${BUILD_RESOURCES_DIR}\logo.ico"
!define MUI_UNICON "${BUILD_RESOURCES_DIR}\logo.ico"

; Header image (top banner)
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "${BUILD_RESOURCES_DIR}\installer-header.bmp"
!define MUI_HEADERIMAGE_RIGHT

; Welcome/Finish page sidebar image
!define MUI_WELCOMEFINISHPAGE_BITMAP "${BUILD_RESOURCES_DIR}\installer-sidebar.bmp"

; Colors — dark medieval parchment
!define MUI_BGCOLOR "1A1410"
!define MUI_TEXTCOLOR "C4A97D"

; ── Welcome Page ──
!define MUI_WELCOMEPAGE_TITLE "Vulpax DnD Dünyasına Hoş Geldin!"
!define MUI_WELCOMEPAGE_TEXT "Bu sihirbaz seni Vulpax DnD'nin kurulumuna yönlendirecek.$\r$\n$\r$\nDevam etmeden önce tüm uygulamaları kapatmanı öneririz.$\r$\n$\r$\nDevam etmek için İleri'ye tıkla."

; ── License Page ──
!define MUI_LICENSEPAGE_TEXT_TOP "Kullanım Sözleşmesini okuyup kabul et."
!define MUI_LICENSEPAGE_TEXT_BOTTOM "Devam etmek için sözleşmeyi kabul etmelisin."
!define MUI_LICENSEPAGE_BUTTON "Kabul Ediyorum"
!define MUI_LICENSEPAGE_CHECKBOX
!define MUI_LICENSEPAGE_CHECKBOX_TEXT "Sözleşmeyi okudum ve kabul ediyorum"

; ── Finish Page ──
!define MUI_FINISHPAGE_TITLE "Kurulum Tamamlandı!"
!define MUI_FINISHPAGE_TEXT "Vulpax DnD başarıyla kuruldu.$\r$\n$\r$\nMaceraya başlamak için Bitir'e tıkla."
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
!define MUI_FINISHPAGE_RUN_TEXT "Vulpax DnD'yi Başlat"

; ── Abort Warning ──
!define MUI_ABORTWARNING
!define MUI_ABORTWARNING_TEXT "Kurulumdan çıkmak istediğine emin misin?"

; ── Pages ──
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "${BUILD_RESOURCES_DIR}\license.txt"
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; ── Uninstaller Pages ──
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; ── Language ──
!insertmacro MUI_LANGUAGE "Turkish"
