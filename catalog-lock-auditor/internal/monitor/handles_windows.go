//go:build windows

package monitor

import (
	"syscall"
	"unsafe"
)

const processQueryLimitedInformation = 0x1000

var (
	modKernel32               = syscall.NewLazyDLL("kernel32.dll")
	procOpenProcess           = modKernel32.NewProc("OpenProcess")
	procCloseHandle           = modKernel32.NewProc("CloseHandle")
	procGetProcessHandleCount = modKernel32.NewProc("GetProcessHandleCount")
)

// ProcessHandleCount returns the current OS handle count for this process on Windows.
func ProcessHandleCount() (int, bool) {
	handle, err := syscall.GetCurrentProcess()
	if err != nil {
		return -1, false
	}
	var count uint32
	ret, _, _ := procGetProcessHandleCount.Call(uintptr(handle), uintptr(unsafe.Pointer(&count)))
	if ret == 0 {
		return -1, false
	}
	return int(count), true
}

// ProcessHandleCountByPID returns the current OS handle count of the target PID on Windows.
func ProcessHandleCountByPID(pid int) (int, bool) {
	if pid <= 0 {
		return -1, false
	}
	handle, _, _ := procOpenProcess.Call(processQueryLimitedInformation, 0, uintptr(pid))
	if handle == 0 {
		return -1, false
	}
	defer procCloseHandle.Call(handle)
	var count uint32
	ret, _, _ := procGetProcessHandleCount.Call(handle, uintptr(unsafe.Pointer(&count)))
	if ret == 0 {
		return -1, false
	}
	return int(count), true
}
