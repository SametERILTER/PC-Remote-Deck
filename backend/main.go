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
	Type uint32
	Padding uint32
	Data    [32]byte
}

func mouseEvent(flags uint32, dx, dy int32, data uint32) {
	var input INPUT
	input.Type = INPUT_MOUSE
	mi := (*MOUSEINPUT)(unsafe.Pointer(&input.Data[0]))
	mi.Flags = flags
	mi.Dx = dx
	mi.Dy = dy
	mi.MouseData = data

	procSendInput.Call(1, uintptr(unsafe.Pointer(&input)), uintptr(unsafe.Sizeof(input)))
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
		# Yüklenmesini bekle
		while ($player.Status -eq "Loading") { Start-Sleep -Milliseconds 100 }
		
		# Ses kanalını "ısıtma" (Warm-up) hilesi
		$player.Play()
		$player.Pause()
		$player.Position = New-Object System.TimeSpan(0,0,0,0,0)
		Start-Sleep -Milliseconds 600
		
		# Asıl çalma işlemi (Hızlandırma kaldırıldı, en stabil hal)
		$player.Play()
		
		# Ses bitene kadar bekle
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

	// Ses işleyiciyi başlat
	go volumeWorker()

	// API Rotaları
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
			// Hata olsa bile çıktıyı gönderiyoruz çünkü powershell hataları da çıktıda yazar
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

		// Kanal üzerinden worker'a gönderiyoruz
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

	// Chrome Özel Kısayollar
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

	// Spotify Özel Kısayollar
	mux.HandleFunc("/spotify-search", func(w http.ResponseWriter, r *http.Request) {
		runPowerShell("$w = New-Object -ComObject WScript.Shell; $w.SendKeys('^l')")
		fmt.Fprint(w, "Spotify Arama")
	})

	// Antigravity (Coding) Özel Kısayollar
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

	mux.HandleFunc("/press-combo", func(w http.ResponseWriter, r *http.Request) {
		keysStr := r.URL.Query().Get("keys")
		// Örn: ^+s (CTRL+SHIFT+S) veya %{F4} (ALT+F4)
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

		// Terminale log bas
		// log.Printf("[Stats] CPU:%s%%, RAM:%s%%, GPU:%s%% (%sC) Media: %s\n", stats["cpu"], stats["ram"], stats["gpuUse"], stats["gpuTemp"], stats["media"])

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(stats)
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

	mux.HandleFunc("/mouse-move", func(w http.ResponseWriter, r *http.Request) {
		dxStr := r.URL.Query().Get("dx")
		dyStr := r.URL.Query().Get("dy")
		dx, _ := strconv.ParseInt(dxStr, 10, 32)
		dy, _ := strconv.ParseInt(dyStr, 10, 32)

		// SetCursorPos yerine MOUSEEVENTF_MOVE kullanmak çok daha pürüzsüz sonuç verir
		// çünkü Windows bu yöntemle taşınan fareye kendi ivmeleme/yumuşatma kurallarını uygular.
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
		// mouse_event için wheel delta: MouseData (4. parametre)
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
			log.Println("Dosya alma hatası:", err)
			http.Error(w, "Dosya alınamadı", http.StatusInternalServerError)
			return
		}
		defer file.Close()

		log.Printf("Dosya alınıyor: %s (%d bytes)\n", handler.Filename, handler.Size)

		// User Desktop path
		homeDir, _ := os.UserHomeDir()
		desktopPath := homeDir + "\\Desktop\\" + handler.Filename
		dst, err := os.Create(desktopPath)
		if err != nil {
			log.Println("Dosya oluşturma hatası:", err)
			http.Error(w, "Dosya kaydedilemedi", http.StatusInternalServerError)
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		speak("Dosya başarıyla masaüstüne kaydedildi.")
		fmt.Fprintf(w, "Başarıyla kaydedildi: %s", handler.Filename)
	})

	mux.HandleFunc("/mode-study", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Study Mode activated")
		speak("Ders modu aktif ediliyor. İyi çalışmalar dilerim.")
		// Önce Gemini
		exec.Command("cmd", "/c", "start chrome https://gemini.google.com/app?hl=tr").Start()
		time.Sleep(500 * time.Millisecond)
		// Sonra Classroom
		exec.Command("cmd", "/c", "start chrome https://classroom.google.com/u/0/").Start()
		fmt.Fprint(w, "Study Mode activated")
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

	fmt.Printf("Remote Deck Sunucusu Başlatıldı\n")
	fmt.Printf("Dinlenen Port: %s\n", port)
	fmt.Printf("IP Adresi: %s\n", localIP)

	// QR Code Oluştur
	qrConfig := qrterminal.Config{
		Level:     qrterminal.L,
		Writer:    os.Stdout,
		BlackChar: qrterminal.BLACK,
		WhiteChar: qrterminal.WHITE,
		QuietZone: 1,
	}
	qrData := fmt.Sprintf("%s:%s", localIP, port)
	qrterminal.GenerateWithConfig(qrData, qrConfig)

	fmt.Println("Telefonunuzdan Pckontrol uygulamasını açın ve QR kodu okutun.")

	// Sunucuyu CORS desteğiyle başlat
	err = http.ListenAndServe("0.0.0.0:"+port, enableCORS(mux))
	if err != nil {
		log.Fatal("Sunucu başlatılamadı: ", err)
	}
}
