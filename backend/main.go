package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image/png"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"syscall"
	"time"
	"unsafe"

	"github.com/gorilla/websocket"
	"github.com/kbinani/screenshot"
	"github.com/lxn/win"
	"github.com/mdp/qrterminal/v3"
)

var (
	user32               = syscall.NewLazyDLL("user32.dll")
	procEnumWindows      = user32.NewProc("EnumWindows")
	procGetWindowTextW   = user32.NewProc("GetWindowTextW")
	procIsWindowVisible  = user32.NewProc("IsWindowVisible")
	procGetWindowRect    = user32.NewProc("GetWindowRect")
	procSetWindowPos     = user32.NewProc("SetWindowPos")
	procGetSystemMetrics = user32.NewProc("GetSystemMetrics")
	procGetWindow        = user32.NewProc("GetWindow")
	procGetWindowLongW   = user32.NewProc("GetWindowLongW")
	procPostMessageW     = user32.NewProc("PostMessageW")
	procSendMessageW     = user32.NewProc("SendMessageW")

	procGetCursorPos = user32.NewProc("GetCursorPos")
	procMouseEvent   = user32.NewProc("mouse_event")

	dwmapi                    = syscall.NewLazyDLL("dwmapi.dll")
	procDwmGetWindowAttribute = dwmapi.NewProc("DwmGetWindowAttribute")
	procSendInput             = user32.NewProc("SendInput")

	psapi                        = syscall.NewLazyDLL("psapi.dll")
	procGetModuleBaseNameW       = psapi.NewProc("GetModuleBaseNameW")
	kernel32                     = syscall.NewLazyDLL("kernel32.dll")
	procOpenProcess              = kernel32.NewProc("OpenProcess")
	procCloseHandle              = kernel32.NewProc("CloseHandle")
	procGetWindowThreadProcessId = user32.NewProc("GetWindowThreadProcessId")
	procGetForegroundWindow      = user32.NewProc("GetForegroundWindow")
)

type POINT struct {
	X, Y int32
}

const (
	GW_OWNER         = 4
	GWL_EXSTYLE      = int(-20)
	WS_EX_TOOLWINDOW = 0x00000080
	DWMWA_CLOAKED    = 14
	WM_CLOSE         = 0x0010

	INPUT_KEYBOARD    = 1
	KEYEVENTF_UNICODE = 0x0004
	KEYEVENTF_KEYUP   = 0x0002
	VK_BACK           = 0x08
	VK_RETURN         = 0x0D
	VK_MENU           = 0x12
	VK_TAB            = 0x09
	VK_VOLUME_MUTE    = 0xAD
	VK_VOLUME_DOWN    = 0xAE
	VK_VOLUME_UP      = 0xAF

	INPUT_MOUSE           = 0
	MOUSEEVENTF_MOVE      = 0x0001
	MOUSEEVENTF_LEFTDOWN  = 0x0002
	MOUSEEVENTF_LEFTUP    = 0x0004
	MOUSEEVENTF_RIGHTDOWN = 0x0008
	MOUSEEVENTF_RIGHTUP   = 0x0010
	MOUSEEVENTF_WHEEL     = 0x0800
)

type MOUSEINPUT struct {
	Dx        int32
	Dy        int32
	MouseData uint32
	Flags     uint32
	Time      uint32
	ExtraInfo uintptr
}

type KEYBDINPUT struct {
	Vk        uint16
	Scan      uint16
	Flags     uint32
	Time      uint32
	ExtraInfo uintptr
}

// Global INPUT struct that works on both 32-bit and 64-bit Windows
type INPUT struct {
	Type    uint32
	Padding uint32
	Data    [32]byte
}

func mouseEvent(flags uint32, dx, dy int32, data uint32) {
	procMouseEvent.Call(uintptr(flags), uintptr(dx), uintptr(dy), uintptr(data), 0)
}

func sendKey(vk uint16) {
	// Key Down
	var inputDown INPUT
	inputDown.Type = INPUT_KEYBOARD
	kiDown := (*KEYBDINPUT)(unsafe.Pointer(&inputDown.Data[0]))
	kiDown.Vk = vk
	kiDown.Flags = 0

	// Key Up
	var inputUp INPUT
	inputUp.Type = INPUT_KEYBOARD
	kiUp := (*KEYBDINPUT)(unsafe.Pointer(&inputUp.Data[0]))
	kiUp.Vk = vk
	kiUp.Flags = KEYEVENTF_KEYUP

	procSendInput.Call(1, uintptr(unsafe.Pointer(&inputDown)), uintptr(unsafe.Sizeof(inputDown)))
	procSendInput.Call(1, uintptr(unsafe.Pointer(&inputUp)), uintptr(unsafe.Sizeof(inputUp)))
}

func typeString(text string) {
	utf16Text := syscall.StringToUTF16(text)
	for i := 0; i < len(utf16Text)-1; i++ {
		char := utf16Text[i]

		// Key Down
		var inputDown INPUT
		inputDown.Type = INPUT_KEYBOARD
		kiDown := (*KEYBDINPUT)(unsafe.Pointer(&inputDown.Data[0]))
		kiDown.Scan = char
		kiDown.Flags = KEYEVENTF_UNICODE

		// Key Up
		var inputUp INPUT
		inputUp.Type = INPUT_KEYBOARD
		kiUp := (*KEYBDINPUT)(unsafe.Pointer(&inputUp.Data[0]))
		kiUp.Scan = char
		kiUp.Flags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP

		procSendInput.Call(1, uintptr(unsafe.Pointer(&inputDown)), uintptr(unsafe.Sizeof(inputDown)))
		procSendInput.Call(1, uintptr(unsafe.Pointer(&inputUp)), uintptr(unsafe.Sizeof(inputUp)))
	}
}

func speak(text string) {
	text = strings.ReplaceAll(text, "\"", "'")
	psCommand := fmt.Sprintf(`
		$text = "%s"
		$url = "https://translate.google.com/translate_tts?ie=UTF-8&q=" + [uri]::EscapeDataString($text) + "&tl=tr&client=tw-ob"
		$file = "$env:TEMP\pckontrol_voice.mp3"
		Invoke-WebRequest -Uri $url -OutFile $file -ErrorAction SilentlyContinue
		Start-Sleep -Milliseconds 100
		Add-Type -AssemblyName presentationCore
		$player = New-Object System.Windows.Media.MediaPlayer
		$player.Open($file)

		while ($player.Status -eq "Loading") { Start-Sleep -Milliseconds 100 }
		
		$player.Play()
		$player.Pause()
		$player.Position = New-Object System.TimeSpan(0,0,0,0,0)
		Start-Sleep -Milliseconds 600
		
		$player.Play()
		
		while ($player.Position -lt $player.NaturalDuration.TimeSpan) {
			Start-Sleep -Milliseconds 100
		}
		Start-Sleep -Milliseconds 200
	`, text)

	exec.Command("powershell", "-Command", psCommand).Start()
}

type WindowInfo struct {
	Handle uintptr `json:"id"`
	Title  string  `json:"title"`
	X      int32   `json:"x"`
	Y      int32   `json:"y"`
	Width  int32   `json:"width"`
	Height int32   `json:"height"`
}

type Stats struct {
	CPU         string `json:"cpu"`
	RAM         string `json:"ram"`
	Media       string `json:"media"`
	ActiveApp   string `json:"activeApp"`
	ActiveTitle string `json:"activeTitle"`
}

func getWindows() []WindowInfo {
	var windows []WindowInfo
	cb := syscall.NewCallback(func(hwnd uintptr, lparam uintptr) uintptr {
		visible, _, _ := procIsWindowVisible.Call(hwnd)
		if visible != 0 {
			var cloaked int32
			procDwmGetWindowAttribute.Call(hwnd, DWMWA_CLOAKED, uintptr(unsafe.Pointer(&cloaked)), 4)
			if cloaked != 0 {
				return 1
			}

			owner, _, _ := procGetWindow.Call(hwnd, GW_OWNER)
			if owner != 0 {
				return 1
			}

			index := int32(GWL_EXSTYLE)
			exStyle, _, _ := procGetWindowLongW.Call(hwnd, uintptr(index))
			if int32(exStyle)&WS_EX_TOOLWINDOW != 0 {
				return 1
			}

			var rect win.RECT
			procGetWindowRect.Call(hwnd, uintptr(unsafe.Pointer(&rect)))

			title := make([]uint16, 256)
			procGetWindowTextW.Call(hwnd, uintptr(unsafe.Pointer(&title[0])), 256)
			tStr := syscall.UTF16ToString(title)

			if tStr != "" &&
				tStr != "Program Manager" &&
				tStr != "Start" &&
				tStr != "Task View" &&
				tStr != "Windows Shell Experience Host" &&
				tStr != "Windows Giriş Deneyimi" &&
				!strings.Contains(tStr, "NVIDIA GeForce Overlay") {
				windows = append(windows, WindowInfo{
					Handle: hwnd,
					Title:  tStr,
					X:      rect.Left,
					Y:      rect.Top,
					Width:  rect.Right - rect.Left,
					Height: rect.Bottom - rect.Top,
				})
			}
		}
		return 1
	})
	procEnumWindows.Call(cb, 0)
	return windows
}

func getForegroundWindowInfo() (string, string) {
	hwnd, _, _ := procGetForegroundWindow.Call()
	if hwnd == 0 {
		return "Unknown", "Unknown"
	}

	// 1. Get Process Name
	var processID uint32
	procGetWindowThreadProcessId.Call(hwnd, uintptr(unsafe.Pointer(&processID)))

	hProcess, _, _ := procOpenProcess.Call(uintptr(0x0400|0x0010), 0, uintptr(processID))
	defer procCloseHandle.Call(hProcess)

	var name [256]uint16
	n, _, _ := procGetModuleBaseNameW.Call(hProcess, 0, uintptr(unsafe.Pointer(&name[0])), uintptr(len(name)))

	processName := "Unknown"
	if n > 0 {
		processName = strings.ToLower(syscall.UTF16ToString(name[:n]))
	}

	// 2. Get Window Title
	var title [512]uint16
	tLen, _, _ := procGetWindowTextW.Call(hwnd, uintptr(unsafe.Pointer(&title[0])), uintptr(len(title)))

	windowTitle := ""
	if tLen > 0 {
		windowTitle = syscall.UTF16ToString(title[:tLen])
	}

	return processName, windowTitle
}

func getFocusedProcessName() string {
	hwnd, _, _ := procGetForegroundWindow.Call()
	if hwnd == 0 {
		return "desktop"
	}
	var pid uint32
	procGetWindowThreadProcessId.Call(hwnd, uintptr(unsafe.Pointer(&pid)))
	if pid == 0 {
		return "system"
	}

	// PROCESS_QUERY_INFORMATION (0x0400) | PROCESS_VM_READ (0x0010)
	hProcess, _, _ := procOpenProcess.Call(0x0400|0x0010, 0, uintptr(pid))
	if hProcess == 0 {
		return "unknown"
	}
	defer procCloseHandle.Call(hProcess)

	name := make([]uint16, 256)
	procGetModuleBaseNameW.Call(hProcess, 0, uintptr(unsafe.Pointer(&name[0])), 256)
	return strings.ToLower(syscall.UTF16ToString(name))
}

// CORS Middleware to allow requests from the phone
func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Helper to run powershell commands
func runPowerShell(command string) {
	exec.Command("powershell", "-Command", command).Run()
}

func volumeUp() {
	runPowerShell("$w = New-Object -ComObject WScript.Shell; $w.SendKeys([char]175)")
}

func volumeDown() {
	runPowerShell("$w = New-Object -ComObject WScript.Shell; $w.SendKeys([char]174)")
}

func muteVolume() {
	runPowerShell("$w = New-Object -ComObject WScript.Shell; $w.SendKeys([char]173)")
}

func mediaPlayPause() {
	runPowerShell("$w = New-Object -ComObject WScript.Shell; $w.SendKeys([char]179)")
}

func mediaNext() {
	runPowerShell("$w = New-Object -ComObject WScript.Shell; $w.SendKeys([char]176)")
}

func openUrl(url string) {
	exec.Command("cmd", "/C", "start", url).Run()
}

// Helper to run powershell and get output
func runPowerShellWithOutput(command string) (string, error) {
	out, err := exec.Command("powershell", "-Command", command).CombinedOutput()
	return string(out), err
}

func setVolumeAbsolute(level float32) error {
	psCommand := fmt.Sprintf(`
		$code = @"
		using System;
		using System.Runtime.InteropServices;
		[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
		interface IAudioEndpointVolume {
			int f1(); int f2(); int f3(); int f4();
			int SetMasterVolumeLevelScalar(float fLevel, Guid pguidEventContext);
		}
		[Guid("D6660639-8265-4514-B690-72147CC0E1BD"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
		interface IMMDevice { int Activate(ref Guid id, int clsCtx, IntPtr p, [MarshalAs(UnmanagedType.IUnknown)] out object ptr); }
		[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
		interface IMMDeviceEnumerator { int f1(); int GetDefaultAudioEndpoint(int flow, int role, out IMMDevice dev); }
		[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDE {}
		public class Vol {
			public static void Set(float v) {
				try {
					var e = (IMMDeviceEnumerator)new MMDE();
					e.GetDefaultAudioEndpoint(0, 1, out var d);
					d.Activate(new Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), 1, IntPtr.Zero, out var o);
					((IAudioEndpointVolume)o).SetMasterVolumeLevelScalar(v / 100f, Guid.Empty);
				} catch {}
			}
		}
"@
		if (-not ([System.Management.Automation.PSTypeName]"Vol").Type) {
			Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
		}
		[Vol]::Set(%f)
	`, level)

	return exec.Command("powershell", "-Command", psCommand).Run()
}

var volumeChan = make(chan int, 1)

func volumeWorker() {
	for vol := range volumeChan {
		for len(volumeChan) > 0 {
			vol = <-volumeChan
		}
		setVolumeAbsolute(float32(vol))
	}
}

func main() {
	port := "9090"
	mux := http.NewServeMux()

	go volumeWorker()

	mux.HandleFunc("/set-clipboard", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, "Sadece POST", http.StatusMethodNotAllowed)
			return
		}
		var reqBody struct {
			Text string `json:"text"`
		}
		if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
			http.Error(w, "Bad Request", http.StatusBadRequest)
			return
		}

		encoded := base64.StdEncoding.EncodeToString([]byte(reqBody.Text))
		psCmd := fmt.Sprintf("[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('%s')) | Set-Clipboard", encoded)
		exec.Command("powershell", "-Command", psCmd).Run()

		fmt.Fprint(w, "Panoya kopyalandı")
	})

	mux.HandleFunc("/windows", func(w http.ResponseWriter, r *http.Request) {
		windows := getWindows()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(windows)
	})

	mux.HandleFunc("/move-window", func(w http.ResponseWriter, r *http.Request) {
		idStr := r.URL.Query().Get("id")
		xStr := r.URL.Query().Get("x")
		yStr := r.URL.Query().Get("y")

		id, _ := strconv.ParseUint(idStr, 10, 64)
		x, _ := strconv.ParseInt(xStr, 10, 32)
		y, _ := strconv.ParseInt(yStr, 10, 32)

		// SWP_NOSIZE = 0x0001 (Don't change size)
		// SWP_NOZORDER = 0x0004
		procSetWindowPos.Call(uintptr(id), 0, uintptr(int32(x)), uintptr(int32(y)), 0, 0, 0x0001|0x0004)
		fmt.Fprint(w, "Moved")
	})

	mux.HandleFunc("/close-window-by-handle", func(w http.ResponseWriter, r *http.Request) {
		idStr := r.URL.Query().Get("id")
		id, _ := strconv.ParseUint(idStr, 10, 64)
		procPostMessageW.Call(uintptr(id), WM_CLOSE, 0, 0)
		fmt.Fprint(w, "Close command sent")
	})

	mux.HandleFunc("/screen-info", func(w http.ResponseWriter, r *http.Request) {
		w1, _, _ := procGetSystemMetrics.Call(0) // SM_CXSCREEN
		h1, _, _ := procGetSystemMetrics.Call(1) // SM_CYSCREEN
		json.NewEncoder(w).Encode(map[string]int{"width": int(w1), "height": int(h1)})
	})

	mux.HandleFunc("/run-command", func(w http.ResponseWriter, r *http.Request) {
		command := r.URL.Query().Get("cmd")
		if command == "" {
			http.Error(w, "Command is empty", http.StatusBadRequest)
			return
		}

		output, err := runPowerShellWithOutput(command)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprint(w, output)
			return
		}

		fmt.Fprint(w, output)
	})

	mux.HandleFunc("/screenshot", func(w http.ResponseWriter, r *http.Request) {
		img, err := screenshot.CaptureDisplay(0)
		if err != nil {
			http.Error(w, "Screenshot error: "+err.Error(), http.StatusInternalServerError)
			return
		}

		var buf bytes.Buffer
		err = png.Encode(&buf, img)
		if err != nil {
			http.Error(w, "Encode error: "+err.Error(), http.StatusInternalServerError)
			return
		}

		encoded := base64.StdEncoding.EncodeToString(buf.Bytes())

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"image": encoded,
		})
	})

	mux.HandleFunc("/vol-up", func(w http.ResponseWriter, r *http.Request) {
		volumeUp()
		fmt.Fprint(w, "Ses Arttırıldı")
	})

	mux.HandleFunc("/vol-down", func(w http.ResponseWriter, r *http.Request) {
		volumeDown()
		fmt.Fprint(w, "Ses Kısıldı")
	})

	mux.HandleFunc("/mute", func(w http.ResponseWriter, r *http.Request) {
		muteVolume()
		fmt.Fprint(w, "Sessize Alındı")
	})

	mux.HandleFunc("/set-volume", func(w http.ResponseWriter, r *http.Request) {
		volStr := r.URL.Query().Get("level")
		vol, err := strconv.Atoi(volStr)
		if err != nil || vol < 0 || vol > 100 {
			http.Error(w, "Hata", http.StatusBadRequest)
			return
		}

		select {
		case volumeChan <- vol:
		default:
			<-volumeChan
			volumeChan <- vol
		}
		fmt.Fprint(w, "OK")
	})

	mux.HandleFunc("/play-pause", func(w http.ResponseWriter, r *http.Request) {
		mediaPlayPause()
		fmt.Fprint(w, "Oynat/Durdur")
	})

	mux.HandleFunc("/prev", func(w http.ResponseWriter, r *http.Request) {
		runPowerShell("$w = New-Object -ComObject WScript.Shell; $w.SendKeys([char]177)")
		fmt.Fprint(w, "Önceki Şarkı")
	})

	mux.HandleFunc("/next", func(w http.ResponseWriter, r *http.Request) {
		mediaNext()
		fmt.Fprint(w, "Sonraki Şarkı")
	})

	mux.HandleFunc("/chrome-new-tab", func(w http.ResponseWriter, r *http.Request) {
		runPowerShell("$w = New-Object -ComObject WScript.Shell; $w.SendKeys('^t')")
		fmt.Fprint(w, "Chrome Yeni Sekme")
	})

	mux.HandleFunc("/chrome-close-tab", func(w http.ResponseWriter, r *http.Request) {
		runPowerShell("$w = New-Object -ComObject WScript.Shell; $w.SendKeys('^w')")
		fmt.Fprint(w, "Chrome Sekme Kapat")
	})

	mux.HandleFunc("/chrome-refresh", func(w http.ResponseWriter, r *http.Request) {
		runPowerShell("$w = New-Object -ComObject WScript.Shell; $w.SendKeys('{F5}')")
		fmt.Fprint(w, "Chrome Yenile")
	})

	mux.HandleFunc("/chrome-next-tab", func(w http.ResponseWriter, r *http.Request) {
		runPowerShell("$w = New-Object -ComObject WScript.Shell; $w.SendKeys('^{TAB}')")
		fmt.Fprint(w, "Chrome Sonraki Sekme")
	})

	mux.HandleFunc("/chrome-prev-tab", func(w http.ResponseWriter, r *http.Request) {
		runPowerShell("$w = New-Object -ComObject WScript.Shell; $w.SendKeys('^+{TAB}')")
		fmt.Fprint(w, "Chrome Önceki Sekme")
	})

	mux.HandleFunc("/chrome-incognito", func(w http.ResponseWriter, r *http.Request) {
		runPowerShell("$w = New-Object -ComObject WScript.Shell; $w.SendKeys('^+n')")
		fmt.Fprint(w, "Chrome Gizli Sekme")
	})

	mux.HandleFunc("/chrome-back", func(w http.ResponseWriter, r *http.Request) {
		runPowerShell("$w = New-Object -ComObject WScript.Shell; $w.SendKeys('%{LEFT}')")
		fmt.Fprint(w, "Chrome Geri Git")
	})

	mux.HandleFunc("/spotify-search", func(w http.ResponseWriter, r *http.Request) {
		runPowerShell("$w = New-Object -ComObject WScript.Shell; $w.SendKeys('^l')")
		fmt.Fprint(w, "Spotify Arama")
	})

	mux.HandleFunc("/code-terminal", func(w http.ResponseWriter, r *http.Request) {
		runPowerShell("$w = New-Object -ComObject WScript.Shell; $w.SendKeys('^{`}')")
		fmt.Fprint(w, "Terminal Aç")
	})

	mux.HandleFunc("/open-path", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Query().Get("path")
		if path != "" {
			err := exec.Command("cmd", "/C", "start", "", path).Run()
			if err != nil {
				fmt.Fprintf(w, "Hata: %s", err.Error())
				return
			}
			fmt.Fprint(w, "Açıldı")
		}
	})

	mux.HandleFunc("/installed-apps", func(w http.ResponseWriter, r *http.Request) {
		out, err := exec.Command("powershell", "-NoProfile", "-Command", "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-StartApps | ConvertTo-Json").Output()
		if err != nil {
			http.Error(w, "Uygulamalar listelenemedi", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(out)
	})

	mux.HandleFunc("/press-combo", func(w http.ResponseWriter, r *http.Request) {
		keysStr := r.URL.Query().Get("keys")
		if keysStr != "" {
			runPowerShell(fmt.Sprintf("$w = New-Object -ComObject WScript.Shell; $w.SendKeys('%s')", keysStr))
			fmt.Fprint(w, "Kombinasyon Gönderildi")
		}
	})

	mux.HandleFunc("/code-save-all", func(w http.ResponseWriter, r *http.Request) {
		runPowerShell("$w = New-Object -ComObject WScript.Shell; $w.SendKeys('^+s')")
		fmt.Fprint(w, "Hepsini Kaydet")
	})

	mux.HandleFunc("/code-format", func(w http.ResponseWriter, r *http.Request) {
		runPowerShell("$w = New-Object -ComObject WScript.Shell; $w.SendKeys('%+f')")
		fmt.Fprint(w, "Formatla")
	})

	mux.HandleFunc("/code-find-file", func(w http.ResponseWriter, r *http.Request) {
		runPowerShell("$w = New-Object -ComObject WScript.Shell; $w.SendKeys('^p')")
		fmt.Fprint(w, "Dosya Bul")
	})

	mux.HandleFunc("/code-run", func(w http.ResponseWriter, r *http.Request) {
		runPowerShell("$w = New-Object -ComObject WScript.Shell; $w.SendKeys('{F5}')")
		fmt.Fprint(w, "Çalıştır")
	})

	mux.HandleFunc("/weather", func(w http.ResponseWriter, r *http.Request) {
		openUrl("https://www.google.com/search?q=hava+durumu")
		fmt.Fprint(w, "Hava Durumu Açıldı")
	})

	mux.HandleFunc("/press-key", func(w http.ResponseWriter, r *http.Request) {
		key := r.URL.Query().Get("key")
		if key != "" {
			runPowerShell(fmt.Sprintf("$w = New-Object -ComObject WScript.Shell; $w.SendKeys('%s')", key))
			fmt.Fprintf(w, "Tuş Basıldı: %s", key)
		}
	})

	mux.HandleFunc("/open-browser", func(w http.ResponseWriter, r *http.Request) {
		openUrl("https://www.google.com")
		fmt.Fprint(w, "Tarayıcı Açıldı")
	})

	mux.HandleFunc("/open-youtube", func(w http.ResponseWriter, r *http.Request) {
		openUrl("https://www.youtube.com")
		fmt.Fprint(w, "YouTube Açıldı")
	})

	mux.HandleFunc("/open-spotify", func(w http.ResponseWriter, r *http.Request) {
		exec.Command("cmd", "/C", "start spotify:").Run()
		fmt.Fprint(w, "Spotify Açıldı")
	})

	mux.HandleFunc("/close-window", func(w http.ResponseWriter, r *http.Request) {
		runPowerShell("$w = New-Object -ComObject WScript.Shell; $w.SendKeys('%{F4}')")
		fmt.Fprint(w, "Pencere Kapatıldı")
	})

	mux.HandleFunc("/open-chrome", func(w http.ResponseWriter, r *http.Request) {
		exec.Command("cmd", "/C", "start chrome").Run()
		fmt.Fprint(w, "Chrome Açıldı")
	})

	mux.HandleFunc("/open-notepad", func(w http.ResponseWriter, r *http.Request) {
		exec.Command("cmd", "/C", "start notepad").Run()
		fmt.Fprint(w, "Notepad Açıldı")
	})

	mux.HandleFunc("/lock-pc", func(w http.ResponseWriter, r *http.Request) {
		exec.Command("rundll32.exe", "user32.dll,LockWorkStation").Run()
		fmt.Fprint(w, "PC Kilitlendi")
	})

	mux.HandleFunc("/show-desktop", func(w http.ResponseWriter, r *http.Request) {
		runPowerShell(`(New-Object -ComObject Shell.Application).ToggleDesktop()`)
		fmt.Fprint(w, "Masaüstü Gösterildi")
	})

	mux.HandleFunc("/task-manager", func(w http.ResponseWriter, r *http.Request) {
		exec.Command("cmd", "/C", "start taskmgr").Run()
		fmt.Fprint(w, "Görev Yöneticisi Açıldı")
	})

	mux.HandleFunc("/toggle-mic", func(w http.ResponseWriter, r *http.Request) {
		// WM_APPCOMMAND = 0x0319
		// APPCOMMAND_MICROPHONE_VOLUME_MUTE = 24
		// HWND_BROADCAST = 0xFFFF
		procSendMessageW.Call(uintptr(0xFFFF), uintptr(0x0319), 0, uintptr(24<<16))
		fmt.Fprint(w, "Mikrofon Aç/Kapatıldı")
	})

	mux.HandleFunc("/active-app", func(w http.ResponseWriter, r *http.Request) {
		activeApp, activeTitle := getForegroundWindowInfo()
		data := map[string]string{
			"activeApp":   activeApp,
			"activeTitle": activeTitle,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(data)
	})

	mux.HandleFunc("/stats", func(w http.ResponseWriter, r *http.Request) {
		psCommand := `
			$cpuObj = Get-CimInstance Win32_Processor | Select-Object -First 1
			$cpuName = $cpuObj.Name
			$cpu = $cpuObj.LoadPercentage

			$mem = Get-CimInstance Win32_OperatingSystem
			$ram = [math]::Round((($mem.TotalVisibleMemorySize - $mem.FreePhysicalMemory) / $mem.TotalVisibleMemorySize) * 100, 1)
			$ramTot = [math]::Round($mem.TotalVisibleMemorySize / 1MB, 1)
			$ramUse = [math]::Round(($mem.TotalVisibleMemorySize - $mem.FreePhysicalMemory) / 1MB, 1)

			$gpuName = "GPU"
			$gpuTemp = "0"
			$gpuUse = "0"
			try {
				$nvidia = & nvidia-smi --query-gpu=name,temperature.gpu,utilization.gpu --format=csv,noheader
				if ($nvidia) {
					$gpuParts = $nvidia.Split(',')
					if ($gpuParts.Length -ge 3) {
						$gpuName = $gpuParts[0].Trim()
						$gpuTemp = $gpuParts[1].Trim()
						$gpuUse = $gpuParts[2].Replace('%', '').Trim()
					}
				}
			} catch {}

			$media = ""
			$spotify = Get-Process spotify -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -and $_.MainWindowTitle -ne "Spotify" -and $_.MainWindowTitle -ne "Spotify Free" -and $_.MainWindowTitle -ne "Spotify Premium" } | Select-Object -First 1
			if ($spotify) { 
				$media = $spotify.MainWindowTitle 
			} else {
				$browsers = Get-Process chrome, msedge, firefox -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "* - YouTube*" -or $_.MainWindowTitle -like "* - Spotify*" } | Select-Object -First 1
				if ($browsers) {
					$media = $browsers.MainWindowTitle -replace " - YouTube", "" -replace " - Spotify", ""
				}
			}
			Write-Output "$cpu|$ram|$media|$gpuTemp|$gpuUse|$cpuName|$ramTot|$ramUse|$gpuName"
		`

		activeApp, activeTitle := getForegroundWindowInfo()

		out, _ := exec.Command("powershell", "-Command", psCommand).Output()
		outputStr := strings.TrimSpace(string(out))
		parts := strings.Split(outputStr, "|")

		stats := map[string]string{
			"cpu":         "0",
			"ram":         "0",
			"media":       "",
			"gpuTemp":     "0",
			"gpuUse":      "0",
			"cpuName":     "CPU",
			"ramTot":      "0",
			"ramUse":      "0",
			"gpuName":     "GPU",
			"activeApp":   activeApp,
			"activeTitle": activeTitle,
		}

		if len(parts) >= 9 {
			stats["cpu"] = parts[0]
			stats["ram"] = parts[1]
			stats["media"] = parts[2]
			stats["gpuTemp"] = parts[3]
			stats["gpuUse"] = parts[4]
			stats["cpuName"] = parts[5]
			stats["ramTot"] = parts[6]
			stats["ramUse"] = parts[7]
			stats["gpuName"] = parts[8]
		}

		// log.Printf("[Stats] CPU:%s%%, RAM:%s%%, GPU:%s%% (%sC) Media: %s\n", stats["cpu"], stats["ram"], stats["gpuUse"], stats["gpuTemp"], stats["media"])

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(stats)
	})

	mux.HandleFunc("/windows-tab", func(w http.ResponseWriter, r *http.Request) {
		var inputDownWin INPUT
		inputDownWin.Type = INPUT_KEYBOARD
		kiDownWin := (*KEYBDINPUT)(unsafe.Pointer(&inputDownWin.Data[0]))
		kiDownWin.Vk = 0x5B // VK_LWIN
		kiDownWin.Flags = 0

		var inputDownTab INPUT
		inputDownTab.Type = INPUT_KEYBOARD
		kiDownTab := (*KEYBDINPUT)(unsafe.Pointer(&inputDownTab.Data[0]))
		kiDownTab.Vk = 0x09 // VK_TAB
		kiDownTab.Flags = 0

		var inputUpTab INPUT
		inputUpTab.Type = INPUT_KEYBOARD
		kiUpTab := (*KEYBDINPUT)(unsafe.Pointer(&inputUpTab.Data[0]))
		kiUpTab.Vk = 0x09
		kiUpTab.Flags = KEYEVENTF_KEYUP

		var inputUpWin INPUT
		inputUpWin.Type = INPUT_KEYBOARD
		kiUpWin := (*KEYBDINPUT)(unsafe.Pointer(&inputUpWin.Data[0]))
		kiUpWin.Vk = 0x5B
		kiUpWin.Flags = KEYEVENTF_KEYUP

		procSendInput.Call(1, uintptr(unsafe.Pointer(&inputDownWin)), uintptr(unsafe.Sizeof(inputDownWin)))
		procSendInput.Call(1, uintptr(unsafe.Pointer(&inputDownTab)), uintptr(unsafe.Sizeof(inputDownTab)))
		procSendInput.Call(1, uintptr(unsafe.Pointer(&inputUpTab)), uintptr(unsafe.Sizeof(inputUpTab)))
		procSendInput.Call(1, uintptr(unsafe.Pointer(&inputUpWin)), uintptr(unsafe.Sizeof(inputUpWin)))
		fmt.Fprint(w, "Windows Tab Gönderildi")
	})

	mux.HandleFunc("/send-key", func(w http.ResponseWriter, r *http.Request) {
		vkStr := r.URL.Query().Get("vk")
		vk, _ := strconv.ParseUint(vkStr, 0, 16)
		sendKey(uint16(vk))
		fmt.Fprint(w, "Key sent")
	})

	mux.HandleFunc("/backspace", func(w http.ResponseWriter, r *http.Request) {
		sendKey(VK_BACK)
		fmt.Fprint(w, "Backspace sent")
	})

	mux.HandleFunc("/enter", func(w http.ResponseWriter, r *http.Request) {
		sendKey(VK_RETURN)
		fmt.Fprint(w, "Enter sent")
	})

	mux.HandleFunc("/alt-tab", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Alt+Tab command received")
		// Alt Down
		var inputAltDown INPUT
		inputAltDown.Type = INPUT_KEYBOARD
		kiAltDown := (*KEYBDINPUT)(unsafe.Pointer(&inputAltDown.Data[0]))
		kiAltDown.Vk = VK_MENU
		kiAltDown.Flags = 0
		procSendInput.Call(1, uintptr(unsafe.Pointer(&inputAltDown)), uintptr(unsafe.Sizeof(inputAltDown)))
		time.Sleep(50 * time.Millisecond)

		// Tab Down
		var inputTabDown INPUT
		inputTabDown.Type = INPUT_KEYBOARD
		kiTabDown := (*KEYBDINPUT)(unsafe.Pointer(&inputTabDown.Data[0]))
		kiTabDown.Vk = VK_TAB
		kiTabDown.Flags = 0
		procSendInput.Call(1, uintptr(unsafe.Pointer(&inputTabDown)), uintptr(unsafe.Sizeof(inputTabDown)))
		time.Sleep(50 * time.Millisecond)

		// Tab Up
		var inputTabUp INPUT
		inputTabUp.Type = INPUT_KEYBOARD
		kiTabUp := (*KEYBDINPUT)(unsafe.Pointer(&inputTabUp.Data[0]))
		kiTabUp.Vk = VK_TAB
		kiTabUp.Flags = KEYEVENTF_KEYUP
		procSendInput.Call(1, uintptr(unsafe.Pointer(&inputTabUp)), uintptr(unsafe.Sizeof(inputTabUp)))
		time.Sleep(50 * time.Millisecond)

		// Alt Up
		var inputAltUp INPUT
		inputAltUp.Type = INPUT_KEYBOARD
		kiAltUp := (*KEYBDINPUT)(unsafe.Pointer(&inputAltUp.Data[0]))
		kiAltUp.Vk = VK_MENU
		kiAltUp.Flags = KEYEVENTF_KEYUP
		procSendInput.Call(1, uintptr(unsafe.Pointer(&inputAltUp)), uintptr(unsafe.Sizeof(inputAltUp)))

		fmt.Fprint(w, "Alt+Tab sent")
	})

	var wsUpgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all local network connections
		},
		ReadBufferSize:  2048,
		WriteBufferSize: 2048,
	}

	mux.HandleFunc("/ws/mouse", func(w http.ResponseWriter, r *http.Request) {
		conn, err := wsUpgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println("[WebSocket] Upgrade error:", err)
			return
		}
		defer conn.Close()

		for {
			messageType, p, err := conn.ReadMessage()
			if err != nil {
				break
			}

			if messageType == websocket.TextMessage {
				msg := strings.TrimSpace(string(p))
				if msg == "" {
					continue
				}

				// Ultra-fast compact text protocol:
				// "m <dx> <dy>" -> move
				// "c <left|right|middle>" -> click
				// "d <left|right>" -> button down (drag)
				// "u <left|right>" -> button up (drop)
				// "s <delta>" -> scroll
				if strings.HasPrefix(msg, "m ") {
					parts := strings.Split(msg, " ")
					if len(parts) >= 3 {
						dx, _ := strconv.ParseFloat(parts[1], 64)
						dy, _ := strconv.ParseFloat(parts[2], 64)
						mouseEvent(MOUSEEVENTF_MOVE, int32(dx), int32(dy), 0)
					}
				} else if strings.HasPrefix(msg, "c ") {
					btn := strings.TrimPrefix(msg, "c ")
					switch btn {
					case "left":
						procMouseEvent.Call(uintptr(MOUSEEVENTF_LEFTDOWN), 0, 0, 0, 0)
						procMouseEvent.Call(uintptr(MOUSEEVENTF_LEFTUP), 0, 0, 0, 0)
					case "right":
						procMouseEvent.Call(uintptr(MOUSEEVENTF_RIGHTDOWN), 0, 0, 0, 0)
						procMouseEvent.Call(uintptr(MOUSEEVENTF_RIGHTUP), 0, 0, 0, 0)
					case "middle":
						procMouseEvent.Call(uintptr(0x0020), 0, 0, 0, 0) // MOUSEEVENTF_MIDDLEDOWN
						procMouseEvent.Call(uintptr(0x0040), 0, 0, 0, 0) // MOUSEEVENTF_MIDDLEUP
					}
				} else if strings.HasPrefix(msg, "d ") {
					btn := strings.TrimPrefix(msg, "d ")
					if btn == "left" {
						procMouseEvent.Call(uintptr(MOUSEEVENTF_LEFTDOWN), 0, 0, 0, 0)
					} else if btn == "right" {
						procMouseEvent.Call(uintptr(MOUSEEVENTF_RIGHTDOWN), 0, 0, 0, 0)
					}
				} else if strings.HasPrefix(msg, "u ") {
					btn := strings.TrimPrefix(msg, "u ")
					if btn == "left" {
						procMouseEvent.Call(uintptr(MOUSEEVENTF_LEFTUP), 0, 0, 0, 0)
					} else if btn == "right" {
						procMouseEvent.Call(uintptr(MOUSEEVENTF_RIGHTUP), 0, 0, 0, 0)
					}
				} else if strings.HasPrefix(msg, "s ") {
					deltaStr := strings.TrimPrefix(msg, "s ")
					delta, _ := strconv.ParseInt(deltaStr, 10, 32)
					procMouseEvent.Call(uintptr(MOUSEEVENTF_WHEEL), 0, 0, uintptr(int32(delta*120)), 0)
				} else if msg == "ping" {
					conn.WriteMessage(websocket.TextMessage, []byte("pong"))
				} else if strings.HasPrefix(msg, "{") {
					// Fallback for JSON messages
					var data struct {
						Type   string  `json:"type"`
						Dx     float64 `json:"dx"`
						Dy     float64 `json:"dy"`
						Button string  `json:"button"`
						Delta  int     `json:"delta"`
					}
					if json.Unmarshal(p, &data) == nil {
						switch data.Type {
						case "move":
							mouseEvent(MOUSEEVENTF_MOVE, int32(data.Dx), int32(data.Dy), 0)
						case "click":
							if data.Button == "right" {
								procMouseEvent.Call(uintptr(MOUSEEVENTF_RIGHTDOWN), 0, 0, 0, 0)
								procMouseEvent.Call(uintptr(MOUSEEVENTF_RIGHTUP), 0, 0, 0, 0)
							} else {
								procMouseEvent.Call(uintptr(MOUSEEVENTF_LEFTDOWN), 0, 0, 0, 0)
								procMouseEvent.Call(uintptr(MOUSEEVENTF_LEFTUP), 0, 0, 0, 0)
							}
						case "scroll":
							procMouseEvent.Call(uintptr(MOUSEEVENTF_WHEEL), 0, 0, uintptr(int32(data.Delta*120)), 0)
						}
					}
				}
			}
		}
	})

	mux.HandleFunc("/mouse-move", func(w http.ResponseWriter, r *http.Request) {
		dxStr := r.URL.Query().Get("dx")
		dyStr := r.URL.Query().Get("dy")
		dx, _ := strconv.ParseInt(dxStr, 10, 32)
		dy, _ := strconv.ParseInt(dyStr, 10, 32)

		mouseEvent(MOUSEEVENTF_MOVE, int32(dx), int32(dy), 0)

		fmt.Fprint(w, "Moved")
	})

	mux.HandleFunc("/mouse-click", func(w http.ResponseWriter, r *http.Request) {
		btn := r.URL.Query().Get("button")
		log.Printf("[Mouse] Click: %s\n", btn)

		switch btn {
		case "left":
			procMouseEvent.Call(uintptr(MOUSEEVENTF_LEFTDOWN), 0, 0, 0, 0)
			procMouseEvent.Call(uintptr(MOUSEEVENTF_LEFTUP), 0, 0, 0, 0)
		case "right":
			procMouseEvent.Call(uintptr(MOUSEEVENTF_RIGHTDOWN), 0, 0, 0, 0)
			procMouseEvent.Call(uintptr(MOUSEEVENTF_RIGHTUP), 0, 0, 0, 0)
		}
		fmt.Fprint(w, "Clicked")
	})

	mux.HandleFunc("/mouse-scroll", func(w http.ResponseWriter, r *http.Request) {
		delta, _ := strconv.ParseInt(r.URL.Query().Get("delta"), 10, 32)
		procMouseEvent.Call(uintptr(MOUSEEVENTF_WHEEL), 0, 0, uintptr(int32(delta*120)), 0)
		fmt.Fprint(w, "Scrolled")
	})

	mux.HandleFunc("/upload", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, "Sadece POST", http.StatusMethodNotAllowed)
			return
		}

		// 32MB max dosya boyutu
		r.ParseMultipartForm(32 << 20)

		file, handler, err := r.FormFile("file")
		if err != nil {
			log.Println("File upload error:", err)
			http.Error(w, "Dosya alınamadı", http.StatusInternalServerError)
			return
		}
		defer file.Close()

		log.Printf("Receiving file: %s (%d bytes)\n", handler.Filename, handler.Size)

		// User Desktop path
		homeDir, _ := os.UserHomeDir()
		desktopPath := homeDir + "\\Desktop\\" + handler.Filename
		dst, err := os.Create(desktopPath)
		if err != nil {
			log.Println("File creation error:", err)
			http.Error(w, "Dosya kaydedilemedi", http.StatusInternalServerError)
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		//speak("Dosya başarıyla masaüstüne kaydedildi.")
		fmt.Fprintf(w, "Başarıyla kaydedildi: %s", handler.Filename)
	})

	mux.HandleFunc("/mode-study", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Study Mode activated")

		speak("Ders modu aktif ediliyor. İyi çalışmalar dilerim.")

		exec.Command("cmd", "/c", "start chrome https://gemini.google.com/app?hl=tr").Start()
		time.Sleep(500 * time.Millisecond)
		exec.Command("cmd", "/c", "start chrome https://classroom.google.com/u/0/").Start()
		fmt.Fprint(w, "Study Mode activated")
	})

	mux.HandleFunc("/speak", func(w http.ResponseWriter, r *http.Request) {
		text := r.URL.Query().Get("text")
		if text != "" {
			go speak(text)
		}
		fmt.Fprint(w, "Konuşma başlatıldı")
	})

	mux.HandleFunc("/shutdown", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Shutting down computer in 3 seconds!")
		fmt.Println("Shutting down computer in 3 seconds!")
		exec.Command("cmd", "/c", "shutdown /s /f /t 3").Start()
		fmt.Fprint(w, "Bilgisayar kapatılıyor")
	})

	mux.HandleFunc("/shutdown-timer", func(w http.ResponseWriter, r *http.Request) {
		minutes := r.URL.Query().Get("minutes")
		if minutes == "" {
			http.Error(w, "Süre (minutes) gerekli", http.StatusBadRequest)
			return
		}

		var m int
		fmt.Sscanf(minutes, "%d", &m)
		seconds := m * 60

		log.Printf("Computer scheduled to shut down in %d minute(s)\n", m)
		fmt.Printf("Computer scheduled to shut down in %d minute(s)\n", m)

		cmdStr := fmt.Sprintf("shutdown /s /f /t %d", seconds)
		exec.Command("cmd", "/c", cmdStr).Start()
		fmt.Fprintf(w, "%d dakika sonra kapatılacak", m)
	})

	mux.HandleFunc("/shutdown-abort", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Shutdown timer aborted")
		fmt.Println("Shutdown timer aborted")
		exec.Command("cmd", "/c", "shutdown /a").Start()
		fmt.Fprint(w, "Kapatma iptal edildi")
	})

	mux.HandleFunc("/type-text", func(w http.ResponseWriter, r *http.Request) {
		text := r.URL.Query().Get("text")
		if text != "" {
			typeString(text)
		}
		fmt.Fprint(w, "Typed")
	})

	mux.HandleFunc("/what-is-playing", func(w http.ResponseWriter, r *http.Request) {
		psCommand := `
			$media = ""
			$spotify = Get-Process spotify -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -and $_.MainWindowTitle -ne "Spotify" -and $_.MainWindowTitle -ne "Spotify Free" -and $_.MainWindowTitle -ne "Spotify Premium" } | Select-Object -First 1
			if ($spotify) { 
				$media = $spotify.MainWindowTitle 
			} else {
				$browsers = Get-Process chrome, msedge, firefox -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "* - YouTube*" -or $_.MainWindowTitle -like "* - Spotify*" } | Select-Object -First 1
				if ($browsers) {
					$media = $browsers.MainWindowTitle -replace " - YouTube", "" -replace " - Spotify", ""
				}
			}

			if ($media -ne "") {
				Write-Output $media
			} else {
				Write-Output "Şu an ne çaldığını bulamadım."
			}
		`
		output, _ := runPowerShellWithOutput(psCommand)
		info := strings.TrimSpace(output)

		var message string
		if info == "Şu an ne çaldığını bulamadım." {
			message = info
		} else {
			message = "Şu an çalıyor: " + info
		}

		//speak(message)
		fmt.Fprint(w, message)
	})

	mux.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "OK")
	})

	mux.HandleFunc("/drives", func(w http.ResponseWriter, r *http.Request) {
		var drives []string
		for _, drive := range "ABCDEFGHIJKLMNOPQRSTUVWXYZ" {
			d := string(drive) + ":\\"
			_, err := os.Stat(d)
			if err == nil {
				drives = append(drives, d)
			}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(drives)
	})

	mux.HandleFunc("/list-dir", func(w http.ResponseWriter, r *http.Request) {
		dirPath := r.URL.Query().Get("path")
		if dirPath == "" {
			http.Error(w, "Path is required", http.StatusBadRequest)
			return
		}

		entries, err := os.ReadDir(dirPath)
		if err != nil {
			http.Error(w, "Cannot read directory: "+err.Error(), http.StatusInternalServerError)
			return
		}

		type FileInfo struct {
			Name    string `json:"name"`
			IsDir   bool   `json:"isDir"`
			Size    int64  `json:"size"`
			ModTime string `json:"modTime"`
		}

		var files []FileInfo
		count := 0
		for _, entry := range entries {
			if count >= 500 { // Limit list to 500 items to prevent performance issues
				break
			}
			info, err := entry.Info()
			var size int64
			var modTime string
			if err == nil {
				size = info.Size()
				modTime = info.ModTime().Format(time.RFC3339)
			}
			files = append(files, FileInfo{
				Name:    entry.Name(),
				IsDir:   entry.IsDir(),
				Size:    size,
				ModTime: modTime,
			})
			count++
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(files)
	})

	mux.HandleFunc("/delete-file", func(w http.ResponseWriter, r *http.Request) {
		targetPath := r.URL.Query().Get("path")
		if targetPath == "" {
			http.Error(w, "Path is required", http.StatusBadRequest)
			return
		}
		err := os.RemoveAll(targetPath)
		if err != nil {
			http.Error(w, "Cannot delete file: "+err.Error(), http.StatusInternalServerError)
			return
		}
		fmt.Fprint(w, "Deleted")
	})

	go func() {
		for {
			time.Sleep(5 * time.Second)
		}
	}()

	// Get Local IP
	localIP := "127.0.0.1"
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err == nil {
		defer conn.Close()
		localAddr := conn.LocalAddr().(*net.UDPAddr)
		localIP = localAddr.IP.String()
	}

	asciiArt := `
██████╗  ██████╗     ██████╗ ██████╗ ███╗   ██╗████████╗██████╗  ██████╗ ██╗     
██╔══██╗██╔════╝    ██╔════╝██╔═══██╗████╗  ██║╚══██╔══╝██╔══██╗██╔═══██╗██║     
██████╔╝██║         ██║     ██║   ██║██╔██╗ ██║   ██║   ██████╔╝██║   ██║██║     
██╔═══╝ ██║         ██║     ██║   ██║██║╚██╗██║   ██║   ██╔══██╗██║   ██║██║     
██║     ╚██████╗    ╚██████╗╚██████╔╝██║ ╚████║   ██║   ██║  ██║╚██████╔╝███████╗
╚═╝      ╚═════╝     ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝                                                                                                                                                                                                  
`
	fmt.Println(asciiArt)
	fmt.Printf("PC Control Server Started\n")
	fmt.Printf("Listening Port: %s\n", port)
	fmt.Printf("IP Address: %s\n", localIP)

	qrConfig := qrterminal.Config{
		Level:     qrterminal.L,
		Writer:    os.Stdout,
		BlackChar: qrterminal.BLACK,
		WhiteChar: qrterminal.WHITE,
		QuietZone: 1,
	}
	qrData := fmt.Sprintf("%s:%s", localIP, port)
	qrterminal.GenerateWithConfig(qrData, qrConfig)

	fmt.Println("Open the PC Control app on your phone and scan the QR code.")

	err = http.ListenAndServe("0.0.0.0:"+port, enableCORS(mux))
	if err != nil {
		log.Fatal("Failed to start server: ", err)
	}
}
